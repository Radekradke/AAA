-- =====================================================================
-- FICHA VIVA — MULTIPLAYER: SESSÃO / ENCONTRO / COMBATENTES (Fases 0–2)
-- Script re-executável: rode DEPOIS do script da seção 5 de docs/SUPABASE.md
-- (usa campaigns, campaign_members, shared_sheets, sheets e as funções
-- is_campaign_master / is_campaign_member de lá).
--
-- Princípios:
-- · A sessão é ONLINE-FIRST e separada da ficha (que continua offline-first
--   em sheets.snapshot). Nada aqui escreve no snapshot do jogador.
-- · Leitura via RLS; ESCRITA só por RPCs SECURITY DEFINER que validam papel
--   (mestre/membro/dono) no banco — a interface nunca é a única barreira.
-- · encounters.revision + SELECT ... FOR UPDATE: dois navegadores apertando
--   "próximo turno" ao mesmo tempo não pulam dois turnos — o segundo recebe
--   STALE_REVISION e recarrega.
-- =====================================================================

-- configurações no nível da campanha (futuro: regras da mesa, rolagens compartilhadas…)
alter table public.campaigns add column if not exists settings jsonb not null default '{}'::jsonb;

-- mestre OU jogador da campanha (o mestre não fica em campaign_members)
create or replace function public.is_campaign_participant(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_campaign_master(cid) or public.is_campaign_member(cid);
$$;
grant execute on function public.is_campaign_participant(uuid) to authenticated;

-- ===== TABELAS =====
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('planned', 'active', 'paused', 'finished')),
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- no máximo UMA sessão ao vivo (ativa ou pausada) por campanha
create unique index if not exists sessions_one_live_per_campaign
  on public.sessions (campaign_id) where status in ('active', 'paused');
create index if not exists sessions_campaign_idx on public.sessions (campaign_id, created_at desc);

create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null,
  status text not null default 'preparing' check (status in ('preparing', 'active', 'paused', 'finished')),
  round int not null default 0,
  active_combatant_id uuid,
  revision int not null default 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- no máximo UM encontro aberto por sessão
create unique index if not exists encounters_one_open_per_session
  on public.encounters (session_id) where status in ('preparing', 'active', 'paused');

create table if not exists public.combatants (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  type text not null check (type in ('player', 'monster', 'npc')),
  sheet_id text references public.sheets (id) on delete set null,
  -- dono da ficha (jogador) — pode rolar a própria iniciativa
  owner_id uuid references auth.users (id) on delete set null,
  monster_instance_id uuid,
  name text not null,
  initiative int,
  initiative_bonus int not null default 0,
  turn_order int not null default 0,
  hp_current int,
  hp_max int,
  armor_class int,
  conditions jsonb not null default '[]'::jsonb,
  hidden boolean not null default false,
  -- monstros iguais que agem juntos ("Goblins ×4") compartilham a chave
  group_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists combatants_encounter_idx on public.combatants (encounter_id, turn_order);
create index if not exists combatants_session_idx on public.combatants (session_id);

create table if not exists public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  type text not null,
  actor_id uuid references auth.users (id) on delete set null,
  target_id text,
  payload jsonb not null default '{}'::jsonb,
  -- public: todos · master: autor + mestre · private: só o autor
  visibility text not null default 'public' check (visibility in ('public', 'master', 'private')),
  created_at timestamptz not null default now()
);
create index if not exists session_events_session_idx on public.session_events (session_id, created_at desc);

-- ===== RLS (leitura) =====
alter table public.sessions enable row level security;
alter table public.encounters enable row level security;
alter table public.combatants enable row level security;
alter table public.session_events enable row level security;

drop policy if exists "sessions_participant_read" on public.sessions;
create policy "sessions_participant_read" on public.sessions for select
  using (public.is_campaign_participant(campaign_id));

drop policy if exists "encounters_participant_read" on public.encounters;
create policy "encounters_participant_read" on public.encounters for select
  using (public.is_campaign_participant(campaign_id));

-- combatentes ocultos (emboscada) só o mestre vê
drop policy if exists "combatants_participant_read" on public.combatants;
create policy "combatants_participant_read" on public.combatants for select
  using (
    public.is_campaign_master(campaign_id)
    or (public.is_campaign_member(campaign_id) and not hidden)
  );

drop policy if exists "events_read" on public.session_events;
create policy "events_read" on public.session_events for select
  using (
    actor_id = auth.uid()
    or (visibility = 'public' and public.is_campaign_participant(campaign_id))
    or (visibility = 'master' and public.is_campaign_master(campaign_id))
  );
-- participantes registram as PRÓPRIAS rolagens/eventos (Fase 3); nunca em nome de outro
drop policy if exists "events_insert_own" on public.session_events;
create policy "events_insert_own" on public.session_events for insert
  with check (
    actor_id = auth.uid()
    and public.is_campaign_participant(campaign_id)
    and exists (select 1 from public.sessions s where s.id = session_id and s.campaign_id = session_events.campaign_id)
  );
-- sessions/encounters/combatants: SEM policies de escrita — só as RPCs abaixo escrevem.

-- ===== FUNÇÕES INTERNAS =====
create or replace function public._fv_log(p_session uuid, p_campaign uuid, p_type text, p_target text, p_payload jsonb, p_visibility text default 'public')
returns void language sql security definer set search_path = public as $$
  insert into session_events (session_id, campaign_id, type, actor_id, target_id, payload, visibility)
  values (p_session, p_campaign, p_type, auth.uid(), p_target, coalesce(p_payload, '{}'::jsonb), p_visibility);
$$;
revoke execute on function public._fv_log(uuid, uuid, text, text, jsonb, text) from public, anon, authenticated;

-- ordem: iniciativa (maior primeiro; sem iniciativa vai ao fim) → bônus → grupo junto
create or replace function public._fv_recompute_order(p_encounter uuid)
returns void language sql security definer set search_path = public as $$
  update combatants c set turn_order = o.rn, updated_at = now()
  from (
    select id, row_number() over (
      order by initiative desc nulls last, initiative_bonus desc, coalesce(group_key, id::text), created_at, id
    ) as rn
    from combatants where encounter_id = p_encounter
  ) o
  where c.id = o.id and c.turn_order is distinct from o.rn;
$$;
revoke execute on function public._fv_recompute_order(uuid) from public, anon, authenticated;

-- próximo/anterior "lugar" na ordem: grupos contam como um só turno;
-- monstros/NPCs derrotados (PV ≤ 0) são pulados; jogadores caídos não.
create or replace function public._fv_step(p_encounter uuid, p_current uuid, p_dir int, out next_id uuid, out wrapped boolean)
language plpgsql security definer set search_path = public as $$
declare
  ids uuid[]; keys text[]; os int[];
  n int; idx int; cur_key text; cur_o int; i int;
begin
  wrapped := false;
  select array_agg(first_id order by o), array_agg(slot order by o), array_agg(o order by o)
    into ids, keys, os
  from (
    select coalesce(group_key, id::text) as slot, min(turn_order) as o,
           (array_agg(id order by turn_order))[1] as first_id
    from combatants
    where encounter_id = p_encounter
      and not (type <> 'player' and hp_current is not null and hp_current <= 0)
    group by coalesce(group_key, id::text)
  ) s;
  n := coalesce(array_length(ids, 1), 0);
  if n = 0 then next_id := null; return; end if;
  if p_current is null then next_id := ids[1]; return; end if;

  select coalesce(group_key, id::text), turn_order into cur_key, cur_o from combatants where id = p_current;
  idx := array_position(keys, cur_key);
  if idx is null then
    -- o atual saiu da lista (removido/derrotado): segue a partir da posição dele
    if p_dir > 0 then
      for i in 1..n loop
        if os[i] > coalesce(cur_o, -1) then next_id := ids[i]; return; end if;
      end loop;
      next_id := ids[1]; wrapped := true; return;
    else
      for i in reverse n..1 loop
        if os[i] < coalesce(cur_o, 2147483647) then next_id := ids[i]; return; end if;
      end loop;
      next_id := ids[n]; wrapped := true; return;
    end if;
  end if;

  if p_dir > 0 then
    if idx < n then next_id := ids[idx + 1]; else next_id := ids[1]; wrapped := true; end if;
  else
    if idx > 1 then next_id := ids[idx - 1]; else next_id := ids[n]; wrapped := true; end if;
  end if;
end $$;
revoke execute on function public._fv_step(uuid, uuid, int) from public, anon, authenticated;

create or replace function public._fv_require_master(p_campaign uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  if not public.is_campaign_master(p_campaign) then raise exception 'Só o mestre da mesa pode fazer isso.'; end if;
end $$;
revoke execute on function public._fv_require_master(uuid) from public, anon, authenticated;

-- ===== RPCs: SESSÃO =====
create or replace function public.start_session(p_campaign uuid, p_name text default null)
returns public.sessions language plpgsql security definer set search_path = public as $$
declare s public.sessions; n int;
begin
  perform public._fv_require_master(p_campaign);
  select * into s from sessions where campaign_id = p_campaign and status in ('active', 'paused') limit 1;
  if found then return s; end if; -- idempotente: já existe uma ao vivo
  select count(*) + 1 into n from sessions where campaign_id = p_campaign;
  insert into sessions (campaign_id, name, status, started_at, created_by)
  values (p_campaign, coalesce(nullif(trim(p_name), ''), 'Sessão ' || n), 'active', now(), auth.uid())
  returning * into s;
  perform public._fv_log(s.id, p_campaign, 'session_started', null, jsonb_build_object('name', s.name));
  return s;
end $$;

create or replace function public.set_session_status(p_session uuid, p_status text)
returns public.sessions language plpgsql security definer set search_path = public as $$
declare s public.sessions;
begin
  select * into s from sessions where id = p_session for update;
  if not found then raise exception 'Sessão não encontrada.'; end if;
  perform public._fv_require_master(s.campaign_id);
  if p_status not in ('active', 'paused', 'finished') then raise exception 'Status inválido.'; end if;
  if s.status = 'finished' then raise exception 'Esta sessão já terminou.'; end if;
  update sessions set status = p_status, updated_at = now(),
    ended_at = case when p_status = 'finished' then now() else ended_at end
  where id = p_session returning * into s;
  if p_status = 'finished' then
    update encounters set status = 'finished', active_combatant_id = null, ended_at = now(), updated_at = now(), revision = revision + 1
    where session_id = p_session and status <> 'finished';
  end if;
  perform public._fv_log(s.id, s.campaign_id, 'session_' || p_status, null, '{}'::jsonb);
  return s;
end $$;

-- ===== RPCs: ENCONTRO =====
create or replace function public.create_encounter(p_session uuid, p_name text default null)
returns public.encounters language plpgsql security definer set search_path = public as $$
declare s public.sessions; e public.encounters; n int;
begin
  select * into s from sessions where id = p_session;
  if not found then raise exception 'Sessão não encontrada.'; end if;
  perform public._fv_require_master(s.campaign_id);
  if s.status not in ('active', 'paused') then raise exception 'A sessão não está ao vivo.'; end if;
  select * into e from encounters where session_id = p_session and status in ('preparing', 'active', 'paused') limit 1;
  if found then return e; end if;
  select count(*) + 1 into n from encounters where session_id = p_session;
  insert into encounters (session_id, campaign_id, name)
  values (p_session, s.campaign_id, coalesce(nullif(trim(p_name), ''), 'Encontro ' || n))
  returning * into e;
  perform public._fv_log(s.id, s.campaign_id, 'encounter_created', e.id::text, jsonb_build_object('name', e.name));
  return e;
end $$;

create or replace function public.add_combatant(
  p_encounter uuid, p_type text, p_name text, p_sheet_id text default null,
  p_initiative_bonus int default 0, p_hp_current int default null, p_hp_max int default null,
  p_armor_class int default null, p_hidden boolean default false, p_group_key text default null
) returns public.combatants language plpgsql security definer set search_path = public as $$
declare e public.encounters; c public.combatants; v_owner uuid;
begin
  select * into e from encounters where id = p_encounter for update;
  if not found then raise exception 'Encontro não encontrado.'; end if;
  perform public._fv_require_master(e.campaign_id);
  if e.status = 'finished' then raise exception 'Este encontro já terminou.'; end if;
  if p_type not in ('player', 'monster', 'npc') then raise exception 'Tipo inválido.'; end if;
  if p_sheet_id is not null then
    -- a ficha precisa estar vinculada a ESTA mesa; o dono vem do vínculo (não do cliente)
    select owner_id into v_owner from shared_sheets where campaign_id = e.campaign_id and sheet_id = p_sheet_id;
    if v_owner is null then raise exception 'Esta ficha não está vinculada à mesa.'; end if;
    select * into c from combatants where encounter_id = p_encounter and sheet_id = p_sheet_id;
    if found then return c; end if;
  end if;
  insert into combatants (encounter_id, session_id, campaign_id, type, sheet_id, owner_id, name,
    initiative_bonus, hp_current, hp_max, armor_class, hidden, group_key)
  values (p_encounter, e.session_id, e.campaign_id, p_type, p_sheet_id, v_owner, left(trim(p_name), 60),
    coalesce(p_initiative_bonus, 0), p_hp_current, p_hp_max, p_armor_class, coalesce(p_hidden, false), nullif(trim(p_group_key), ''))
  returning * into c;
  perform public._fv_recompute_order(p_encounter);
  update encounters set revision = revision + 1, updated_at = now() where id = p_encounter;
  select * into c from combatants where id = c.id;
  return c;
end $$;

create or replace function public.remove_combatant(p_combatant uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.combatants; e public.encounters; v_next uuid; v_wrapped boolean;
begin
  select * into c from combatants where id = p_combatant;
  if not found then return; end if;
  select * into e from encounters where id = c.encounter_id for update;
  perform public._fv_require_master(e.campaign_id);
  if e.active_combatant_id = c.id then
    select next_id, wrapped into v_next, v_wrapped from public._fv_step(e.id, c.id, 1);
    if v_next = c.id then v_next := null; end if;
  end if;
  delete from combatants where id = p_combatant;
  perform public._fv_recompute_order(e.id);
  update encounters set revision = revision + 1, updated_at = now(),
    active_combatant_id = case when active_combatant_id = c.id then v_next else active_combatant_id end,
    round = case when active_combatant_id = c.id and coalesce(v_wrapped, false) then round + 1 else round end
  where id = e.id;
end $$;

-- jogador rola a PRÓPRIA iniciativa; o mestre pode definir de qualquer um
create or replace function public.set_initiative(p_combatant uuid, p_value int)
returns public.combatants language plpgsql security definer set search_path = public as $$
declare c public.combatants; e public.encounters;
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  select * into c from combatants where id = p_combatant;
  if not found then raise exception 'Combatente não encontrado.'; end if;
  select * into e from encounters where id = c.encounter_id for update;
  if not (public.is_campaign_master(e.campaign_id) or c.owner_id = auth.uid()) then
    raise exception 'Você só pode rolar a iniciativa do seu personagem.';
  end if;
  if e.status = 'finished' then raise exception 'Este encontro já terminou.'; end if;
  if p_value is null or p_value < -10 or p_value > 60 then raise exception 'Valor de iniciativa inválido.'; end if;
  update combatants set initiative = p_value, updated_at = now() where id = p_combatant;
  perform public._fv_recompute_order(e.id);
  update encounters set revision = revision + 1, updated_at = now() where id = e.id;
  perform public._fv_log(e.session_id, e.campaign_id, 'initiative_rolled', c.id::text,
    jsonb_build_object('name', c.name, 'value', p_value), case when c.hidden then 'master' else 'public' end);
  select * into c from combatants where id = p_combatant;
  return c;
end $$;

-- mestre: várias iniciativas de uma vez (inimigos, grupos) numa só revisão
create or replace function public.set_initiatives(p_encounter uuid, p_values jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare e public.encounters; item jsonb;
begin
  select * into e from encounters where id = p_encounter for update;
  if not found then raise exception 'Encontro não encontrado.'; end if;
  perform public._fv_require_master(e.campaign_id);
  for item in select * from jsonb_array_elements(coalesce(p_values, '[]'::jsonb)) loop
    update combatants set initiative = (item->>'value')::int, updated_at = now()
    where id = (item->>'id')::uuid and encounter_id = p_encounter;
  end loop;
  perform public._fv_recompute_order(p_encounter);
  update encounters set revision = revision + 1, updated_at = now() where id = p_encounter;
  perform public._fv_log(e.session_id, e.campaign_id, 'initiative_batch', e.id::text,
    jsonb_build_object('count', jsonb_array_length(coalesce(p_values, '[]'::jsonb))), 'master');
end $$;

-- mestre ajusta PV, CA, condições, nome ou visibilidade (não mexe na ordem)
create or replace function public.update_combatant(p_combatant uuid, p_patch jsonb)
returns public.combatants language plpgsql security definer set search_path = public as $$
declare c public.combatants;
begin
  select * into c from combatants where id = p_combatant;
  if not found then raise exception 'Combatente não encontrado.'; end if;
  perform public._fv_require_master(c.campaign_id);
  update combatants set
    name = coalesce(left(p_patch->>'name', 60), name),
    hp_current = case when p_patch ? 'hp_current' then (p_patch->>'hp_current')::int else hp_current end,
    hp_max = case when p_patch ? 'hp_max' then (p_patch->>'hp_max')::int else hp_max end,
    armor_class = case when p_patch ? 'armor_class' then (p_patch->>'armor_class')::int else armor_class end,
    conditions = case when p_patch ? 'conditions' then p_patch->'conditions' else conditions end,
    hidden = case when p_patch ? 'hidden' then (p_patch->>'hidden')::boolean else hidden end,
    updated_at = now()
  where id = p_combatant returning * into c;
  -- avisa todos pelo encontro: quem deixou de ver um combatente oculto não recebe o UPDATE dele (RLS)
  update encounters set updated_at = now() where id = c.encounter_id;
  return c;
end $$;

create or replace function public.start_combat(p_encounter uuid, p_revision int)
returns public.encounters language plpgsql security definer set search_path = public as $$
declare e public.encounters; nx record;
begin
  select * into e from encounters where id = p_encounter for update;
  if not found then raise exception 'Encontro não encontrado.'; end if;
  perform public._fv_require_master(e.campaign_id);
  if e.revision <> p_revision then raise exception 'STALE_REVISION'; end if;
  if e.status = 'finished' then raise exception 'Este encontro já terminou.'; end if;
  if not exists (select 1 from combatants where encounter_id = p_encounter) then
    raise exception 'Adicione participantes antes de iniciar o combate.';
  end if;
  select * into nx from public._fv_step(p_encounter, e.active_combatant_id, 0);
  update encounters set
    status = 'active',
    round = greatest(round, 1),
    active_combatant_id = coalesce(active_combatant_id, nx.next_id),
    started_at = coalesce(started_at, now()),
    revision = revision + 1,
    updated_at = now()
  where id = p_encounter returning * into e;
  perform public._fv_log(e.session_id, e.campaign_id, 'combat_started', e.id::text, jsonb_build_object('name', e.name, 'round', e.round));
  return e;
end $$;

-- avança (+1) ou volta (−1) o turno; controla a rodada. Autoritativo e à prova de corrida.
create or replace function public.advance_turn(p_encounter uuid, p_direction int, p_revision int)
returns public.encounters language plpgsql security definer set search_path = public as $$
declare e public.encounters; nx record; v_round int; who text;
begin
  select * into e from encounters where id = p_encounter for update;
  if not found then raise exception 'Encontro não encontrado.'; end if;
  perform public._fv_require_master(e.campaign_id);
  if e.revision <> p_revision then raise exception 'STALE_REVISION'; end if;
  if e.status <> 'active' then raise exception 'O combate não está em andamento.'; end if;
  select * into nx from public._fv_step(p_encounter, e.active_combatant_id, case when p_direction < 0 then -1 else 1 end);
  v_round := e.round;
  if nx.wrapped then v_round := greatest(1, e.round + case when p_direction < 0 then -1 else 1 end); end if;
  update encounters set active_combatant_id = nx.next_id, round = v_round, revision = revision + 1, updated_at = now()
  where id = p_encounter returning * into e;
  select name into who from combatants where id = nx.next_id;
  if nx.wrapped and p_direction >= 0 then
    perform public._fv_log(e.session_id, e.campaign_id, 'round_started', e.id::text, jsonb_build_object('round', e.round));
  end if;
  perform public._fv_log(e.session_id, e.campaign_id, 'turn_changed', nx.next_id::text,
    jsonb_build_object('round', e.round, 'name', who),
    case when exists (select 1 from combatants where id = nx.next_id and hidden) then 'master' else 'public' end);
  return e;
end $$;

-- pausar / retomar / encerrar o encontro
create or replace function public.set_encounter_status(p_encounter uuid, p_status text, p_revision int)
returns public.encounters language plpgsql security definer set search_path = public as $$
declare e public.encounters;
begin
  select * into e from encounters where id = p_encounter for update;
  if not found then raise exception 'Encontro não encontrado.'; end if;
  perform public._fv_require_master(e.campaign_id);
  if e.revision <> p_revision then raise exception 'STALE_REVISION'; end if;
  if p_status not in ('active', 'paused', 'finished') then raise exception 'Status inválido.'; end if;
  if e.status = 'finished' then raise exception 'Este encontro já terminou.'; end if;
  if p_status = 'active' and e.round = 0 then raise exception 'Use Iniciar combate.'; end if;
  update encounters set status = p_status, revision = revision + 1, updated_at = now(),
    ended_at = case when p_status = 'finished' then now() else ended_at end,
    active_combatant_id = case when p_status = 'finished' then null else active_combatant_id end
  where id = p_encounter returning * into e;
  perform public._fv_log(e.session_id, e.campaign_id, 'encounter_' || p_status, e.id::text, jsonb_build_object('name', e.name, 'round', e.round));
  return e;
end $$;

grant execute on function public.start_session(uuid, text) to authenticated;
grant execute on function public.set_session_status(uuid, text) to authenticated;
grant execute on function public.create_encounter(uuid, text) to authenticated;
grant execute on function public.add_combatant(uuid, text, text, text, int, int, int, int, boolean, text) to authenticated;
grant execute on function public.remove_combatant(uuid) to authenticated;
grant execute on function public.set_initiative(uuid, int) to authenticated;
grant execute on function public.set_initiatives(uuid, jsonb) to authenticated;
grant execute on function public.update_combatant(uuid, jsonb) to authenticated;
grant execute on function public.start_combat(uuid, int) to authenticated;
grant execute on function public.advance_turn(uuid, int, int) to authenticated;
grant execute on function public.set_encounter_status(uuid, text, int) to authenticated;

-- ===== REALTIME =====
-- mudanças de estado (respeitam o RLS de leitura acima)
do $$ begin alter publication supabase_realtime add table public.sessions; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.encounters; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.combatants; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.session_events; exception when duplicate_object then null; end $$;

-- canal PRIVADO da sessão (Presence + Broadcast): tópico
-- "campaign:<campaignId>:session:<sessionId>" — só participantes da campanha.
do $$ begin
  execute $p$drop policy if exists "fv_session_channel_read" on realtime.messages$p$;
  execute $p$create policy "fv_session_channel_read" on realtime.messages for select to authenticated using (
    split_part(realtime.topic(), ':', 1) = 'campaign'
    and split_part(realtime.topic(), ':', 2) ~ '^[0-9a-fA-F-]{36}$'
    and public.is_campaign_participant(split_part(realtime.topic(), ':', 2)::uuid)
  )$p$;
  execute $p$drop policy if exists "fv_session_channel_write" on realtime.messages$p$;
  execute $p$create policy "fv_session_channel_write" on realtime.messages for insert to authenticated with check (
    split_part(realtime.topic(), ':', 1) = 'campaign'
    and split_part(realtime.topic(), ':', 2) ~ '^[0-9a-fA-F-]{36}$'
    and public.is_campaign_participant(split_part(realtime.topic(), ':', 2)::uuid)
  )$p$;
exception when undefined_table or invalid_schema_name or undefined_function then
  raise notice 'Realtime Authorization indisponível neste projeto — o canal da sessão vai rodar como público (o estado continua protegido pelo RLS).';
end $$;
