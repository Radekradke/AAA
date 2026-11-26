-- =====================================================================
-- Ficha Viva — TUDO O SQL DO SUPABASE NUM ARQUIVO SÓ
-- Gerado por `npm run sql:tudo` (não edite à mão: edite os arquivos de
-- supabase/ e a seção 5 de docs/SUPABASE.md e gere de novo).
--
-- Como usar: Supabase → SQL Editor → aba nova → cole TUDO → Run, sem nada
-- selecionado. Pode rodar de novo sem apagar dados. Se o editor parar no
-- meio, rode de novo: o que já foi feito é pulado.
-- =====================================================================

-- =====================================================================
-- 1/14 · base: fichas, campanhas, crônica, políticas, realtime
-- =====================================================================
-- ===== FICHAS =====
create table if not exists public.sheets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  character_name text not null,
  class_id text not null,
  race_id text not null,
  level int not null default 1,
  sheet_version int not null default 3,
  snapshot jsonb not null,
  created_at bigint not null,
  updated_at bigint not null,
  last_played_at bigint
);
alter table public.sheets enable row level security;
drop policy if exists "sheets_select_own" on public.sheets;
create policy "sheets_select_own" on public.sheets for select using (auth.uid() = user_id);
drop policy if exists "sheets_insert_own" on public.sheets;
create policy "sheets_insert_own" on public.sheets for insert with check (auth.uid() = user_id);
drop policy if exists "sheets_update_own" on public.sheets;
create policy "sheets_update_own" on public.sheets for update using (auth.uid() = user_id);
drop policy if exists "sheets_delete_own" on public.sheets;
create policy "sheets_delete_own" on public.sheets for delete using (auth.uid() = user_id);
create index if not exists sheets_user_idx on public.sheets (user_id, updated_at desc);

-- ===== CAMPANHAS =====
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at bigint not null,
  updated_at bigint not null
);
create table if not exists public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('master', 'player')),
  joined_at bigint not null,
  unique (campaign_id, user_id)
);
create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users (id),
  expires_at bigint,
  max_uses int,
  uses int not null default 0
);
create table if not exists public.shared_sheets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  sheet_id text not null references public.sheets (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  permissions jsonb not null default '{"view":true,"editInventory":false,"editCampaignNotes":true,"editProgression":false}',
  shared_at bigint not null,
  unique (campaign_id, sheet_id)
);
create table if not exists public.campaign_notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('nota', 'npc', 'missao')),
  title text not null,
  body text not null default '',
  created_at bigint not null
);
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.invite_links enable row level security;
alter table public.shared_sheets enable row level security;
alter table public.campaign_notes enable row level security;

-- Funções auxiliares SECURITY DEFINER: rodam como DONO da função, então
-- IGNORAM o RLS das tabelas que consultam. Isto quebra a recursão infinita:
-- sem elas, a policy de `campaigns` consultava `campaign_members` e a de
-- `campaign_members` consultava `campaigns` — cada uma disparando a outra,
-- gerando "infinite recursion detected in policy" (erro 500 em QUALQUER
-- leitura de campaigns e, por tabela, também de `sheets`, quebrando a sync).
create or replace function public.is_campaign_master(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from campaigns where id = cid and master_id = auth.uid());
$$;
create or replace function public.is_campaign_member(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from campaign_members where campaign_id = cid and user_id = auth.uid());
$$;
grant execute on function public.is_campaign_master(uuid) to authenticated;
grant execute on function public.is_campaign_member(uuid) to authenticated;

drop policy if exists "campaigns_member_read" on public.campaigns;
create policy "campaigns_member_read" on public.campaigns for select using (
  auth.uid() = master_id or public.is_campaign_member(id)
);
drop policy if exists "campaigns_master_write" on public.campaigns;
create policy "campaigns_master_write" on public.campaigns
  for all using (auth.uid() = master_id) with check (auth.uid() = master_id);

drop policy if exists "members_read" on public.campaign_members;
create policy "members_read" on public.campaign_members for select using (
  user_id = auth.uid() or public.is_campaign_master(campaign_id)
);

drop policy if exists "invites_master_all" on public.invite_links;
create policy "invites_master_all" on public.invite_links for all
  using (public.is_campaign_master(campaign_id))
  with check (public.is_campaign_master(campaign_id));

drop policy if exists "shared_owner_all" on public.shared_sheets;
create policy "shared_owner_all" on public.shared_sheets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "shared_master_read" on public.shared_sheets;
create policy "shared_master_read" on public.shared_sheets for select
  using (public.is_campaign_master(campaign_id));

drop policy if exists "sheets_master_read_shared" on public.sheets;
create policy "sheets_master_read_shared" on public.sheets for select using (
  exists (
    select 1 from public.shared_sheets ss
    where ss.sheet_id = sheets.id
      and public.is_campaign_master(ss.campaign_id)
      and coalesce((ss.permissions->>'view')::boolean, false)
  )
);

-- notas com visibility = 'master' são o caderno privado do mestre (console do mestre)
alter table public.campaign_notes add column if not exists visibility text not null default 'shared';
drop policy if exists "notes_member_read" on public.campaign_notes;
create policy "notes_member_read" on public.campaign_notes for select using (
  public.is_campaign_master(campaign_id)
  or (public.is_campaign_member(campaign_id) and visibility = 'shared')
);
drop policy if exists "notes_master_write" on public.campaign_notes;
create policy "notes_master_write" on public.campaign_notes for all
  using (public.is_campaign_master(campaign_id))
  with check (public.is_campaign_master(campaign_id));

create or replace function public.join_campaign(invite_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare inv record;
begin
  if auth.uid() is null then raise exception 'Faça login para entrar na sala.'; end if;
  select * into inv from invite_links where token = invite_token;
  if inv is null then raise exception 'Convite inválido.'; end if;
  if inv.expires_at is not null and inv.expires_at < (extract(epoch from now()) * 1000) then
    raise exception 'Convite expirado.';
  end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then
    raise exception 'Convite esgotado.';
  end if;
  insert into campaign_members (campaign_id, user_id, role, joined_at)
  values (inv.campaign_id, auth.uid(), 'player', extract(epoch from now()) * 1000)
  on conflict (campaign_id, user_id) do nothing;
  update invite_links set uses = uses + 1 where id = inv.id;
  return inv.campaign_id;
end $$;
grant execute on function public.join_campaign(text) to authenticated;

-- ===== REALTIME (ignora se já adicionado) =====
do $$ begin
  alter publication supabase_realtime add table public.sheets;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.shared_sheets;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.campaign_notes;
exception when duplicate_object then null; end $$;
-- ---------------------------------------------------------------------
-- versão do banco: registra que este script rodou (o app avisa o mestre
-- do que falta). Idempotente.
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (step text primary key, applied_at timestamptz not null default now());
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('base') on conflict (step) do update set applied_at = now();

-- =====================================================================
-- 2/14 · supabase/multiplayer_session.sql · mesa ao vivo: sessão, encontro, iniciativa
-- =====================================================================
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
returns boolean language sql security definer stable set search_path = public as $fn$
  select public.is_campaign_master(cid) or public.is_campaign_member(cid);
$fn$;
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
-- ficha do bestiário (id do SRD) — só referência; os números ficam na linha
alter table public.combatants add column if not exists monster_ref text;
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
-- sessão em preparação ('planned') só o mestre vê (o nome pode ser spoiler)
create policy "sessions_participant_read" on public.sessions for select
  using (
    public.is_campaign_master(campaign_id)
    or (public.is_campaign_member(campaign_id) and status <> 'planned')
  );

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
returns void language sql security definer set search_path = public as $fn$
  insert into session_events (session_id, campaign_id, type, actor_id, target_id, payload, visibility)
  values (p_session, p_campaign, p_type, auth.uid(), p_target, coalesce(p_payload, '{}'::jsonb), p_visibility);
$fn$;
revoke execute on function public._fv_log(uuid, uuid, text, text, jsonb, text) from public, anon, authenticated;

-- ordem: iniciativa (maior primeiro; sem iniciativa vai ao fim) → bônus → grupo junto
create or replace function public._fv_recompute_order(p_encounter uuid)
returns void language sql security definer set search_path = public as $fn$
  update combatants c set turn_order = o.rn, updated_at = now()
  from (
    select id, row_number() over (
      order by initiative desc nulls last, initiative_bonus desc, coalesce(group_key, id::text), created_at, id
    ) as rn
    from combatants where encounter_id = p_encounter
  ) o
  where c.id = o.id and c.turn_order is distinct from o.rn;
$fn$;
revoke execute on function public._fv_recompute_order(uuid) from public, anon, authenticated;

-- próximo/anterior "lugar" na ordem: grupos contam como um só turno;
-- monstros/NPCs derrotados (PV ≤ 0) são pulados; jogadores caídos não.
create or replace function public._fv_step(p_encounter uuid, p_current uuid, p_dir int, out next_id uuid, out wrapped boolean)
language plpgsql security definer set search_path = public as $fn$
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
end $fn$;
revoke execute on function public._fv_step(uuid, uuid, int) from public, anon, authenticated;

create or replace function public._fv_require_master(p_campaign uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  if not public.is_campaign_master(p_campaign) then raise exception 'Só o mestre da mesa pode fazer isso.'; end if;
end $fn$;
revoke execute on function public._fv_require_master(uuid) from public, anon, authenticated;

-- ===== RPCs: SESSÃO =====
create or replace function public.start_session(p_campaign uuid, p_name text default null)
returns public.sessions language plpgsql security definer set search_path = public as $fn$
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
end $fn$;

create or replace function public.set_session_status(p_session uuid, p_status text)
returns public.sessions language plpgsql security definer set search_path = public as $fn$
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
end $fn$;

-- ===== RPCs: ENCONTRO =====
create or replace function public.create_encounter(p_session uuid, p_name text default null)
returns public.encounters language plpgsql security definer set search_path = public as $fn$
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
end $fn$;

-- a assinatura ganhou p_monster_ref (bestiário): remove a antiga antes de recriar
do $fn$ begin execute 'drop function if exists public.add_combatant(uuid, text, text, text, int, int, int, int, boolean, text)'; end $fn$;
create or replace function public.add_combatant(
  p_encounter uuid, p_type text, p_name text, p_sheet_id text default null,
  p_initiative_bonus int default 0, p_hp_current int default null, p_hp_max int default null,
  p_armor_class int default null, p_hidden boolean default false, p_group_key text default null,
  p_monster_ref text default null
) returns public.combatants language plpgsql security definer set search_path = public as $fn$
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
    initiative_bonus, hp_current, hp_max, armor_class, hidden, group_key, monster_ref)
  values (p_encounter, e.session_id, e.campaign_id, p_type, p_sheet_id, v_owner, left(trim(p_name), 60),
    coalesce(p_initiative_bonus, 0), p_hp_current, p_hp_max, p_armor_class, coalesce(p_hidden, false), nullif(trim(p_group_key), ''),
    nullif(trim(p_monster_ref), ''))
  returning * into c;
  perform public._fv_recompute_order(p_encounter);
  update encounters set revision = revision + 1, updated_at = now() where id = p_encounter;
  select * into c from combatants where id = c.id;
  return c;
end $fn$;

create or replace function public.remove_combatant(p_combatant uuid)
returns void language plpgsql security definer set search_path = public as $fn$
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
end $fn$;

-- jogador rola a PRÓPRIA iniciativa; o mestre pode definir de qualquer um
create or replace function public.set_initiative(p_combatant uuid, p_value int)
returns public.combatants language plpgsql security definer set search_path = public as $fn$
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
end $fn$;

-- mestre: várias iniciativas de uma vez (inimigos, grupos) numa só revisão
create or replace function public.set_initiatives(p_encounter uuid, p_values jsonb)
returns void language plpgsql security definer set search_path = public as $fn$
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
end $fn$;

-- mestre ajusta PV, CA, condições, nome ou visibilidade (não mexe na ordem)
create or replace function public.update_combatant(p_combatant uuid, p_patch jsonb)
returns public.combatants language plpgsql security definer set search_path = public as $fn$
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
end $fn$;

create or replace function public.start_combat(p_encounter uuid, p_revision int)
returns public.encounters language plpgsql security definer set search_path = public as $fn$
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
end $fn$;

-- avança (+1) ou volta (−1) o turno; controla a rodada. Autoritativo e à prova de corrida.
create or replace function public.advance_turn(p_encounter uuid, p_direction int, p_revision int)
returns public.encounters language plpgsql security definer set search_path = public as $fn$
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
end $fn$;

-- pausar / retomar / encerrar o encontro
create or replace function public.set_encounter_status(p_encounter uuid, p_status text, p_revision int)
returns public.encounters language plpgsql security definer set search_path = public as $fn$
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
end $fn$;

grant execute on function public.start_session(uuid, text) to authenticated;
grant execute on function public.set_session_status(uuid, text) to authenticated;
grant execute on function public.create_encounter(uuid, text) to authenticated;
grant execute on function public.add_combatant(uuid, text, text, text, int, int, int, int, boolean, text, text) to authenticated;
grant execute on function public.remove_combatant(uuid) to authenticated;
grant execute on function public.set_initiative(uuid, int) to authenticated;
grant execute on function public.set_initiatives(uuid, jsonb) to authenticated;
grant execute on function public.update_combatant(uuid, jsonb) to authenticated;
grant execute on function public.start_combat(uuid, int) to authenticated;
grant execute on function public.advance_turn(uuid, int, int) to authenticated;
grant execute on function public.set_encounter_status(uuid, text, int) to authenticated;

-- ===== REALTIME =====
-- mudanças de estado (respeitam o RLS de leitura acima)
do $fn$ begin alter publication supabase_realtime add table public.sessions; exception when duplicate_object then null; end $fn$;
do $fn$ begin alter publication supabase_realtime add table public.encounters; exception when duplicate_object then null; end $fn$;
do $fn$ begin alter publication supabase_realtime add table public.combatants; exception when duplicate_object then null; end $fn$;
do $fn$ begin alter publication supabase_realtime add table public.session_events; exception when duplicate_object then null; end $fn$;

-- canal PRIVADO da sessão (Presence + Broadcast): tópico
-- "campaign:<campaignId>:session:<sessionId>" — só participantes da campanha.
do $fn$ begin
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
end $fn$;

-- =====================================================================
-- NPCs DA CAMPANHA
-- Duas tabelas de propósito: o que os JOGADORES podem saber (nome, retrato,
-- papel, resumo) e o que só o MESTRE sabe (segredos, estatísticas). Assim o
-- RLS protege os segredos linha a linha — a interface não precisa "esconder".
-- =====================================================================
create table if not exists public.campaign_npcs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  role text,
  summary text,
  -- retrato pequeno (WebP em data URL, ~20–60 KB)
  portrait text check (portrait is null or length(portrait) < 400000),
  -- revelado: jogadores veem na galeria e nas menções do diário
  revealed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_npcs_campaign_idx on public.campaign_npcs (campaign_id, name);

create table if not exists public.campaign_npc_secrets (
  npc_id uuid primary key references public.campaign_npcs (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  notes text,
  -- { monsterRef, ac, hp, hpMax, initiativeBonus, level, sheetId, abilities… }
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.campaign_npcs enable row level security;
alter table public.campaign_npc_secrets enable row level security;

drop policy if exists "npcs_read" on public.campaign_npcs;
create policy "npcs_read" on public.campaign_npcs for select
  using (public.is_campaign_master(campaign_id) or (revealed and public.is_campaign_member(campaign_id)));
drop policy if exists "npcs_master_write" on public.campaign_npcs;
create policy "npcs_master_write" on public.campaign_npcs for all
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));

-- segredos: SÓ o mestre lê e escreve
drop policy if exists "npc_secrets_master" on public.campaign_npc_secrets;
create policy "npc_secrets_master" on public.campaign_npc_secrets for all
  using (public.is_campaign_master(campaign_id))
  with check (
    public.is_campaign_master(campaign_id)
    and exists (select 1 from public.campaign_npcs n where n.id = npc_id and n.campaign_id = campaign_npc_secrets.campaign_id)
  );

grant select, insert, update, delete on public.campaign_npcs to authenticated;
grant select, insert, update, delete on public.campaign_npc_secrets to authenticated;

do $fn$ begin alter publication supabase_realtime add table public.campaign_npcs; exception when duplicate_object then null; end $fn$;

-- a API do Supabase (PostgREST) passa a enxergar as tabelas novas na hora
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- versão do banco: registra que este script rodou (o app avisa o mestre
-- do que falta). Idempotente.
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (step text primary key, applied_at timestamptz not null default now());
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('multiplayer') on conflict (step) do update set applied_at = now();

-- =====================================================================
-- 3/14 · supabase/atualizacao_npcs_bestiario.sql · NPCs e bestiário da campanha
-- =====================================================================
-- =====================================================================
-- Ficha Viva — ATUALIZAÇÃO: bestiário + NPCs da campanha
-- Para quem já rodou o multiplayer_session.sql antes. Pode rodar mais de uma
-- vez sem problema. Cole TUDO numa aba nova do SQL Editor e clique em Run
-- sem nada selecionado.
-- =====================================================================

-- ficha do bestiário (id do SRD) — só referência; os números ficam na linha
alter table public.combatants add column if not exists monster_ref text;

-- a assinatura ganhou p_monster_ref: remove a antiga antes de recriar
do $fn$ begin execute 'drop function if exists public.add_combatant(uuid, text, text, text, int, int, int, int, boolean, text)'; end $fn$;

create or replace function public.add_combatant(
  p_encounter uuid, p_type text, p_name text, p_sheet_id text default null,
  p_initiative_bonus int default 0, p_hp_current int default null, p_hp_max int default null,
  p_armor_class int default null, p_hidden boolean default false, p_group_key text default null,
  p_monster_ref text default null
) returns public.combatants language plpgsql security definer set search_path = public as $fn$
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
    initiative_bonus, hp_current, hp_max, armor_class, hidden, group_key, monster_ref)
  values (p_encounter, e.session_id, e.campaign_id, p_type, p_sheet_id, v_owner, left(trim(p_name), 60),
    coalesce(p_initiative_bonus, 0), p_hp_current, p_hp_max, p_armor_class, coalesce(p_hidden, false), nullif(trim(p_group_key), ''),
    nullif(trim(p_monster_ref), ''))
  returning * into c;
  perform public._fv_recompute_order(p_encounter);
  update encounters set revision = revision + 1, updated_at = now() where id = p_encounter;
  select * into c from combatants where id = c.id;
  return c;
end $fn$;

grant execute on function public.add_combatant(uuid, text, text, text, int, int, int, int, boolean, text, text) to authenticated;

-- mestre ajusta PV, CA, condições, nome ou visibilidade (não mexe na ordem)
create or replace function public.update_combatant(p_combatant uuid, p_patch jsonb)
returns public.combatants language plpgsql security definer set search_path = public as $fn$
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
end $fn$;

-- =====================================================================
-- NPCs DA CAMPANHA
-- Duas tabelas de propósito: o que os JOGADORES podem saber (nome, retrato,
-- papel, resumo) e o que só o MESTRE sabe (segredos, estatísticas). Assim o
-- RLS protege os segredos linha a linha — a interface não precisa "esconder".
-- =====================================================================
create table if not exists public.campaign_npcs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  role text,
  summary text,
  -- retrato pequeno (WebP em data URL, ~20–60 KB)
  portrait text check (portrait is null or length(portrait) < 400000),
  -- revelado: jogadores veem na galeria e nas menções do diário
  revealed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_npcs_campaign_idx on public.campaign_npcs (campaign_id, name);

create table if not exists public.campaign_npc_secrets (
  npc_id uuid primary key references public.campaign_npcs (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  notes text,
  -- { monsterRef, ac, hp, hpMax, initiativeBonus, level, sheetId, abilities… }
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.campaign_npcs enable row level security;
alter table public.campaign_npc_secrets enable row level security;

drop policy if exists "npcs_read" on public.campaign_npcs;
create policy "npcs_read" on public.campaign_npcs for select
  using (public.is_campaign_master(campaign_id) or (revealed and public.is_campaign_member(campaign_id)));
drop policy if exists "npcs_master_write" on public.campaign_npcs;
create policy "npcs_master_write" on public.campaign_npcs for all
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));

-- segredos: SÓ o mestre lê e escreve
drop policy if exists "npc_secrets_master" on public.campaign_npc_secrets;
create policy "npc_secrets_master" on public.campaign_npc_secrets for all
  using (public.is_campaign_master(campaign_id))
  with check (
    public.is_campaign_master(campaign_id)
    and exists (select 1 from public.campaign_npcs n where n.id = npc_id and n.campaign_id = campaign_npc_secrets.campaign_id)
  );

grant select, insert, update, delete on public.campaign_npcs to authenticated;
grant select, insert, update, delete on public.campaign_npc_secrets to authenticated;

do $fn$ begin alter publication supabase_realtime add table public.campaign_npcs; exception when duplicate_object then null; end $fn$;

-- a API do Supabase (PostgREST) passa a enxergar as tabelas novas na hora
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- versão do banco: registra que este script rodou (o app avisa o mestre
-- do que falta). Idempotente.
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (step text primary key, applied_at timestamptz not null default now());
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('npcs_bestiario') on conflict (step) do update set applied_at = now();

-- =====================================================================
-- 4/14 · supabase/palco.sql · palco: mapas, cenas, cutscenes, pistas e imagens
-- =====================================================================
-- =====================================================================
-- Ficha Viva — PALCO DA MESA
-- Cenas (mapa tático, imagem, cutscene), o que está "no ar" para todos,
-- peões do mapa e handouts (cartas, pistas, mapas do tesouro).
--
-- Rode DEPOIS do multiplayer_session.sql (e da atualização de NPCs).
-- Pode rodar mais de uma vez. Cole TUDO numa aba nova do SQL Editor e
-- clique em Run sem nada selecionado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- CENAS: o mestre prepara antes da sessão. Jogadores só enxergam uma cena
-- depois que ela vai ao ar pela primeira vez (revealed).
-- ---------------------------------------------------------------------
create table if not exists public.campaign_scenes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  kind text not null check (kind in ('map', 'image', 'cutscene')),
  name text not null check (length(trim(name)) between 1 and 80),
  -- caminho no Storage (bucket campaign-media): "<campaign_id>/<arquivo>"
  image_path text,
  -- mapa: { size: px da casa na imagem, ox, oy: deslocamento, show: bool }
  grid jsonb not null default '{}'::jsonb,
  -- cutscene: [{ path, text }]
  beats jsonb not null default '[]'::jsonb,
  revealed boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_scenes_campaign_idx on public.campaign_scenes (campaign_id, sort);

-- o que está na tela de todo mundo agora (uma linha por campanha)
create table if not exists public.campaign_stage (
  campaign_id uuid primary key references public.campaigns (id) on delete cascade,
  scene_id uuid references public.campaign_scenes (id) on delete set null,
  -- quadro atual da cutscene
  beat int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PEÕES DO MAPA (posição em casas da grade)
-- ---------------------------------------------------------------------
create table if not exists public.scene_tokens (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.campaign_scenes (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  kind text not null check (kind in ('hero', 'npc', 'monster', 'marker')),
  label text not null default '' check (length(label) <= 60),
  sheet_id text,
  -- quem pode mover além do mestre (o dono da ficha do herói)
  owner_id uuid,
  npc_id uuid,
  combatant_id uuid,
  monster_ref text,
  color text check (color is null or length(color) <= 20),
  x real not null default 0,
  y real not null default 0,
  size real not null default 1 check (size between 0.5 and 6),
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists scene_tokens_scene_idx on public.scene_tokens (scene_id);
-- retrato do peão (inimigo, NPC ou herói) enviado pelo mestre: "<campaign_id>/<arquivo>"
alter table public.scene_tokens add column if not exists image_path text;

-- ---------------------------------------------------------------------
-- HANDOUTS: cartas, pistas e imagens entregues a todos ou a alguns
-- ---------------------------------------------------------------------
create table if not exists public.campaign_handouts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 80),
  body text check (body is null or length(body) <= 4000),
  image_path text,
  -- null = todos da mesa; senão, só estes jogadores
  recipients uuid[],
  -- null = ainda na gaveta do mestre
  shown_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists campaign_handouts_campaign_idx on public.campaign_handouts (campaign_id, shown_at);

alter table public.campaign_scenes enable row level security;
alter table public.campaign_stage enable row level security;
alter table public.scene_tokens enable row level security;
alter table public.campaign_handouts enable row level security;

drop policy if exists "scenes_read" on public.campaign_scenes;
create policy "scenes_read" on public.campaign_scenes for select
  using (public.is_campaign_master(campaign_id) or (revealed and public.is_campaign_member(campaign_id)));
drop policy if exists "scenes_master" on public.campaign_scenes;
create policy "scenes_master" on public.campaign_scenes for all
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));

drop policy if exists "stage_read" on public.campaign_stage;
create policy "stage_read" on public.campaign_stage for select
  using (public.is_campaign_master(campaign_id) or public.is_campaign_member(campaign_id));
drop policy if exists "stage_master" on public.campaign_stage;
create policy "stage_master" on public.campaign_stage for all
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));

drop policy if exists "tokens_read" on public.scene_tokens;
create policy "tokens_read" on public.scene_tokens for select
  using (
    public.is_campaign_master(campaign_id)
    or (not hidden and public.is_campaign_member(campaign_id)
        and exists (select 1 from public.campaign_scenes s where s.id = scene_id and s.revealed))
  );
drop policy if exists "tokens_master" on public.scene_tokens;
create policy "tokens_master" on public.scene_tokens for all
  using (public.is_campaign_master(campaign_id))
  with check (
    public.is_campaign_master(campaign_id)
    and exists (select 1 from public.campaign_scenes s where s.id = scene_id and s.campaign_id = scene_tokens.campaign_id)
  );

drop policy if exists "handouts_read" on public.campaign_handouts;
create policy "handouts_read" on public.campaign_handouts for select
  using (
    public.is_campaign_master(campaign_id)
    or (shown_at is not null and public.is_campaign_member(campaign_id)
        and (recipients is null or auth.uid() = any (recipients)))
  );
drop policy if exists "handouts_master" on public.campaign_handouts;
create policy "handouts_master" on public.campaign_handouts for all
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));

grant select, insert, update, delete on public.campaign_scenes, public.campaign_stage, public.scene_tokens, public.campaign_handouts to authenticated;

-- jogador move SÓ o próprio peão (e só a posição); o mestre move qualquer um.
-- Função SQL de um comando só, com o corpo entre aspas simples: o editor do
-- Supabase não consegue cortá-la no meio. Sem permissão → não volta linha.
drop function if exists public.move_token(uuid, real, real);
create function public.move_token(p_token uuid, p_x real, p_y real)
returns setof public.scene_tokens language sql security definer set search_path = public as '
  update public.scene_tokens
     set x = greatest(-2, least(400, p_x)), y = greatest(-2, least(400, p_y)), updated_at = now()
   where id = p_token
     and (public.is_campaign_master(campaign_id) or (owner_id = auth.uid() and not hidden))
  returning *
';
grant execute on function public.move_token(uuid, real, real) to authenticated;

-- peão escondido/revelado: o jogador não recebe o UPDATE de uma linha que
-- deixou de ver (RLS), então o palco "cutuca" todo mundo para recarregar
create or replace function public._fv_token_visibility_touch()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if tg_op = 'DELETE' or new.hidden is distinct from old.hidden then
    update campaign_stage set updated_at = now()
     where campaign_id = coalesce(new.campaign_id, old.campaign_id);
  end if;
  return null;
end $fn$;
drop trigger if exists scene_tokens_visibility on public.scene_tokens;
create trigger scene_tokens_visibility after update or delete on public.scene_tokens
  for each row execute function public._fv_token_visibility_touch();

-- ---------------------------------------------------------------------
-- IMAGENS (Supabase Storage, bucket privado "campaign-media")
-- O mestre envia para a pasta da campanha; cada jogador só baixa o que já
-- está visível para ele (cena revelada ou handout entregue a ele).
-- ---------------------------------------------------------------------
create or replace function public.fv_media_master(p_name text)
returns boolean language sql security definer stable set search_path = public as $fn$
  select exists (select 1 from campaigns c where c.id::text = split_part(p_name, '/', 1) and c.master_id = auth.uid());
$fn$;

create or replace function public.fv_media_readable(p_name text)
returns boolean language sql security definer stable set search_path = public as $fn$
  select public.fv_media_master(p_name)
    or exists (
      select 1 from campaign_scenes s
       where s.campaign_id::text = split_part(p_name, '/', 1)
         and s.revealed and public.is_campaign_member(s.campaign_id)
         and (s.image_path = p_name or s.beats @> jsonb_build_array(jsonb_build_object('path', p_name)))
    )
    or exists (
      select 1 from scene_tokens t join campaign_scenes s on s.id = t.scene_id
       where t.campaign_id::text = split_part(p_name, '/', 1)
         and t.image_path = p_name and not t.hidden and s.revealed
         and public.is_campaign_member(t.campaign_id)
    )
    or exists (
      select 1 from campaign_handouts h
       where h.campaign_id::text = split_part(p_name, '/', 1)
         and h.image_path = p_name and h.shown_at is not null
         and public.is_campaign_member(h.campaign_id)
         and (h.recipients is null or auth.uid() = any (h.recipients))
    );
$fn$;
grant execute on function public.fv_media_master(text) to authenticated;
grant execute on function public.fv_media_readable(text) to authenticated;

do $fn$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('campaign-media', 'campaign-media', false, 10485760, array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
  on conflict (id) do nothing;

  execute $p$drop policy if exists "fv_media_read" on storage.objects$p$;
  execute $p$create policy "fv_media_read" on storage.objects for select to authenticated
    using (bucket_id = 'campaign-media' and (exists (select 1 from public.campaigns c where c.id::text = split_part(objects.name, '/', 1) and c.master_id = auth.uid()) or exists (select 1 from public.campaign_scenes s where s.image_path = objects.name or s.beats @> jsonb_build_array(jsonb_build_object('path', objects.name))) or exists (select 1 from public.scene_tokens t where t.image_path = objects.name) or exists (select 1 from public.campaign_handouts h where h.image_path = objects.name and h.shown_at is not null)))$p$;
  execute $p$drop policy if exists "fv_media_insert" on storage.objects$p$;
  execute $p$create policy "fv_media_insert" on storage.objects for insert to authenticated
    with check (bucket_id = 'campaign-media' and exists (select 1 from public.campaigns c where c.id::text = split_part(objects.name, '/', 1) and c.master_id = auth.uid()))$p$;
  execute $p$drop policy if exists "fv_media_update" on storage.objects$p$;
  execute $p$create policy "fv_media_update" on storage.objects for update to authenticated
    using (bucket_id = 'campaign-media' and exists (select 1 from public.campaigns c where c.id::text = split_part(objects.name, '/', 1) and c.master_id = auth.uid()))$p$;
  execute $p$drop policy if exists "fv_media_delete" on storage.objects$p$;
  execute $p$create policy "fv_media_delete" on storage.objects for delete to authenticated
    using (bucket_id = 'campaign-media' and exists (select 1 from public.campaigns c where c.id::text = split_part(objects.name, '/', 1) and c.master_id = auth.uid()))$p$;
exception
  when undefined_table or invalid_schema_name then
    raise notice 'Storage indisponível neste projeto — mapas e imagens não vão subir.';
  -- nunca derruba o resto do script (tabelas do palco) por causa do Storage
  when others then
    raise warning 'Palco criado, mas o Storage recusou a configuração (%). Mapas e imagens podem não subir.', sqlerrm;
end $fn$;

-- tempo real
do $fn$ begin alter publication supabase_realtime add table public.campaign_scenes; exception when duplicate_object then null; end $fn$;
do $fn$ begin alter publication supabase_realtime add table public.campaign_stage; exception when duplicate_object then null; end $fn$;
do $fn$ begin alter publication supabase_realtime add table public.scene_tokens; exception when duplicate_object then null; end $fn$;
do $fn$ begin alter publication supabase_realtime add table public.campaign_handouts; exception when duplicate_object then null; end $fn$;

-- a API do Supabase (PostgREST) passa a enxergar as tabelas novas na hora
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- versão do banco: registra que este script rodou (o app avisa o mestre
-- do que falta). Idempotente.
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (step text primary key, applied_at timestamptz not null default now());
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('palco') on conflict (step) do update set applied_at = now();

-- =====================================================================
-- 5/14 · supabase/mestre_console.sql · console do mestre
-- =====================================================================
-- =====================================================================
-- Ficha Viva — CONSOLE DO MESTRE
-- Preparação de sessão (bandeja), notas privadas do mestre e conteúdo
-- improvisado (NPCs e pistas criados durante a sessão).
--
-- Requer: o SQL base (docs/SUPABASE.md §5) e supabase/multiplayer_session.sql.
-- As partes de pistas usam o palco (supabase/palco.sql) se ele já existir.
-- Idempotente: pode rodar mais de uma vez. Cole TUDO numa aba nova do SQL
-- Editor e clique em Run sem nada selecionado. Não apaga dados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SESSÃO PLANEJADA: o mestre prepara antes de começar.
--    O nome da sessão preparada pode ser spoiler ("A traição de Roland"),
--    então o jogador só enxerga sessões que já começaram.
-- ---------------------------------------------------------------------
drop policy if exists "sessions_participant_read" on public.sessions;
create policy "sessions_participant_read" on public.sessions for select
  using (
    public.is_campaign_master(campaign_id)
    or (public.is_campaign_member(campaign_id) and status <> 'planned')
  );

-- prepara uma sessão sem começá-la (pode haver várias preparadas)
create or replace function public.plan_session(p_campaign uuid, p_name text default null)
returns public.sessions language plpgsql security definer set search_path = public as $fn$
declare s public.sessions; n int;
begin
  perform public._fv_require_master(p_campaign);
  select count(*) + 1 into n from sessions where campaign_id = p_campaign;
  insert into sessions (campaign_id, name, status, created_by)
  values (p_campaign, coalesce(nullif(trim(p_name), ''), 'Sessão ' || n), 'planned', auth.uid())
  returning * into s;
  return s;
end $fn$;

-- começa uma sessão preparada (a bandeja continua ligada a ela)
create or replace function public.start_planned_session(p_session uuid)
returns public.sessions language plpgsql security definer set search_path = public as $fn$
declare s public.sessions;
begin
  select * into s from sessions where id = p_session for update;
  if not found then raise exception 'Sessão não encontrada.'; end if;
  perform public._fv_require_master(s.campaign_id);
  if s.status <> 'planned' then raise exception 'Esta sessão não está em preparação.'; end if;
  if exists (select 1 from sessions where campaign_id = s.campaign_id and status in ('active', 'paused')) then
    raise exception 'Já existe uma sessão ao vivo nesta mesa — encerre-a antes.';
  end if;
  update sessions set status = 'active', started_at = now(), updated_at = now()
  where id = p_session returning * into s;
  perform public._fv_log(s.id, s.campaign_id, 'session_started', null, jsonb_build_object('name', s.name));
  return s;
end $fn$;

-- renomear / descartar uma sessão ainda em preparação
create or replace function public.rename_session(p_session uuid, p_name text)
returns public.sessions language plpgsql security definer set search_path = public as $fn$
declare s public.sessions;
begin
  select * into s from sessions where id = p_session for update;
  if not found then raise exception 'Sessão não encontrada.'; end if;
  perform public._fv_require_master(s.campaign_id);
  if nullif(trim(p_name), '') is null then raise exception 'Dê um nome à sessão.'; end if;
  update sessions set name = left(trim(p_name), 80), updated_at = now() where id = p_session returning * into s;
  return s;
end $fn$;

create or replace function public.discard_planned_session(p_session uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare s public.sessions;
begin
  select * into s from sessions where id = p_session for update;
  if not found then raise exception 'Sessão não encontrada.'; end if;
  perform public._fv_require_master(s.campaign_id);
  if s.status <> 'planned' then raise exception 'Só dá para descartar uma sessão ainda em preparação.'; end if;
  delete from sessions where id = p_session;
end $fn$;

grant execute on function public.plan_session(uuid, text), public.start_planned_session(uuid),
  public.rename_session(uuid, text), public.discard_planned_session(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. BANDEJA DA SESSÃO: atalhos que o mestre separou (sem ordem nenhuma).
--    Tabela própria, SÓ do mestre: a linha da sessão é lida pelos
--    jogadores, a bandeja não (ela revela NPCs, criaturas e pistas futuras).
--    tray = { npcs: [uuid], scenes: [uuid], handouts: [uuid], monsters: [srd-id] }
-- ---------------------------------------------------------------------
create table if not exists public.session_prep (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  tray jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.session_prep enable row level security;
drop policy if exists "session_prep_master" on public.session_prep;
create policy "session_prep_master" on public.session_prep for all
  using (public.is_campaign_master(campaign_id))
  with check (
    public.is_campaign_master(campaign_id)
    and exists (select 1 from public.sessions s where s.id = session_id and s.campaign_id = session_prep.campaign_id)
  );
grant select, insert, update, delete on public.session_prep to authenticated;

-- ---------------------------------------------------------------------
-- 3. NOTAS PRIVADAS DO MESTRE: a mesma tabela da crônica, com visibilidade.
--    'shared' = crônica que todos leem · 'master' = caderno do mestre.
--    O RLS impede a linha de chegar ao jogador (não é só esconder na tela).
-- ---------------------------------------------------------------------
alter table public.campaign_notes add column if not exists visibility text not null default 'shared';
do $fn$ begin
  alter table public.campaign_notes add constraint campaign_notes_visibility_chk check (visibility in ('shared', 'master'));
exception when duplicate_object then null; end $fn$;
alter table public.campaign_notes add column if not exists session_id uuid references public.sessions (id) on delete set null;
alter table public.campaign_notes add column if not exists updated_at bigint;

drop policy if exists "notes_member_read" on public.campaign_notes;
create policy "notes_member_read" on public.campaign_notes for select using (
  public.is_campaign_master(campaign_id)
  or (public.is_campaign_member(campaign_id) and visibility = 'shared')
);

-- ---------------------------------------------------------------------
-- 4. IMPROVISO: NPCs e pistas criados durante a sessão ficam marcados com
--    a sessão e NÃO aparecem na galeria da campanha até o mestre guardar
--    ("Guardar na campanha" zera a marca). Nada é apagado.
-- ---------------------------------------------------------------------
alter table public.campaign_npcs add column if not exists improvised_in uuid references public.sessions (id) on delete set null;
alter table if exists public.campaign_handouts add column if not exists improvised_in uuid references public.sessions (id) on delete set null;

do $fn$ begin alter publication supabase_realtime add table public.session_prep; exception when duplicate_object or undefined_object then null; end $fn$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- versão do banco: registra que este script rodou (o app avisa o mestre
-- do que falta). Idempotente.
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (step text primary key, applied_at timestamptz not null default now());
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('mestre_console') on conflict (step) do update set applied_at = now();

-- =====================================================================
-- 6/14 · supabase/recursos_extras.sql · convite por código, ficha compartilhada, registro de erros
-- =====================================================================
-- =====================================================================
-- Ficha Viva — RECURSOS EXTRAS
--  1) versão do banco (o app avisa o mestre se faltar algum script)
--  2) registro de erros do app (client_errors)
--  3) convite por CÓDIGO curto (XXXX-XXXX) e QR code
--  4) ficha compartilhada por link (só leitura, revogável)
--
-- Requer: o SQL base (docs/SUPABASE.md §5). O resto é opcional.
-- Idempotente: pode rodar mais de uma vez. Cole TUDO numa aba nova do SQL
-- Editor e clique em Run sem nada selecionado. Não apaga dados.
-- Sem blocos $$: o editor do Supabase não consegue cortá-lo no meio.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) VERSÃO DO BANCO: cada script registra que rodou. O app compara com o
--    que precisa e diz ao mestre exatamente qual arquivo falta.
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (
  step text primary key,
  applied_at timestamptz not null default now()
);
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;

-- quem já rodou os scripts antigos (antes deste registro existir) não
-- precisa rodá-los de novo: reconhece pelo que já está no banco
insert into public.app_schema_steps (step) select 'base' where to_regclass('public.sheets') is not null on conflict (step) do nothing;
insert into public.app_schema_steps (step) select 'multiplayer' where to_regclass('public.encounters') is not null on conflict (step) do nothing;
insert into public.app_schema_steps (step)
  select 'npcs_bestiario' where exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'combatants' and column_name = 'monster_ref'
  ) and to_regclass('public.campaign_npcs') is not null
on conflict (step) do nothing;
insert into public.app_schema_steps (step) select 'palco' where to_regclass('public.campaign_scenes') is not null on conflict (step) do nothing;
insert into public.app_schema_steps (step) select 'mestre_console' where to_regclass('public.session_prep') is not null on conflict (step) do nothing;

-- ---------------------------------------------------------------------
-- 2) REGISTRO DE ERROS: o que quebra na mão do jogador chega aqui (só
--    contas logadas; cada um só insere o próprio; ninguém lê pelo app —
--    o dono do projeto vê no painel do Supabase → Table Editor).
-- ---------------------------------------------------------------------
create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  message text not null check (char_length(message) <= 600),
  stack text check (char_length(stack) <= 4000),
  route text check (char_length(route) <= 300),
  kind text check (char_length(kind) <= 20),
  scope text check (char_length(scope) <= 120),
  app_version text check (char_length(app_version) <= 40),
  user_agent text check (char_length(user_agent) <= 300)
);
alter table public.client_errors enable row level security;
drop policy if exists "client_errors_insert_own" on public.client_errors;
create policy "client_errors_insert_own" on public.client_errors for insert to authenticated
  with check (user_id = auth.uid());
grant insert on public.client_errors to authenticated;
create index if not exists client_errors_created_idx on public.client_errors (created_at desc);

-- ---------------------------------------------------------------------
-- 3) CONVITE POR CÓDIGO: 8 caracteres sem ambíguos (sem 0/O, 1/I/L),
--    mostrado como XXXX-XXXX e no QR code. O mestre pode trocar o código
--    (o antigo para de funcionar). Função separada do join_campaign: rodar
--    o script base de novo não desliga o código.
-- ---------------------------------------------------------------------
alter table public.invite_links add column if not exists code text;
create unique index if not exists invite_links_code_key on public.invite_links (code) where code is not null;

drop function if exists public.join_campaign_code(text);
create function public.join_campaign_code(p_code text)
returns uuid language sql security definer set search_path = public as '
  select public.join_campaign(coalesce(
    (select token from public.invite_links
      where code = upper(regexp_replace(coalesce(p_code, ''''), ''[^A-Za-z0-9]'', '''', ''g''))
      limit 1),
    ''codigo-invalido''
  ));
';
grant execute on function public.join_campaign_code(text) to authenticated;

-- ---------------------------------------------------------------------
-- 4) FICHA COMPARTILHADA: link /f/<token> mostra a ficha (a última versão
--    sincronizada) para quem tiver o link — sem conta. O dono revoga quando
--    quiser. O token é longo e aleatório (mín. 16 caracteres).
-- ---------------------------------------------------------------------
create table if not exists public.sheet_shares (
  token text primary key check (char_length(token) >= 16),
  sheet_id text not null,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  revoked_at bigint
);
create index if not exists sheet_shares_owner_idx on public.sheet_shares (owner_id, sheet_id);
alter table public.sheet_shares enable row level security;
drop policy if exists "sheet_shares_owner_read" on public.sheet_shares;
create policy "sheet_shares_owner_read" on public.sheet_shares for select to authenticated using (owner_id = auth.uid());
drop policy if exists "sheet_shares_owner_insert" on public.sheet_shares;
create policy "sheet_shares_owner_insert" on public.sheet_shares for insert to authenticated with check (
  owner_id = auth.uid()
  and exists (select 1 from public.sheets s where s.id = sheet_id and s.user_id = auth.uid())
);
drop policy if exists "sheet_shares_owner_update" on public.sheet_shares;
create policy "sheet_shares_owner_update" on public.sheet_shares for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "sheet_shares_owner_delete" on public.sheet_shares;
create policy "sheet_shares_owner_delete" on public.sheet_shares for delete to authenticated using (owner_id = auth.uid());
grant select, insert, update, delete on public.sheet_shares to authenticated;

-- leitura pública só pelo token (nunca lista nada; revogado → nada)
drop function if exists public.shared_sheet(text);
create function public.shared_sheet(p_token text)
returns table (snapshot jsonb, updated_at bigint, character_name text)
language sql stable security definer set search_path = public as '
  select s.snapshot, s.updated_at, s.character_name
  from public.sheet_shares sh
  join public.sheets s on s.id = sh.sheet_id and s.user_id = sh.owner_id
  where sh.token = p_token and sh.revoked_at is null
  limit 1;
';
grant execute on function public.shared_sheet(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- registro deste script
-- ---------------------------------------------------------------------
insert into public.app_schema_steps (step) values ('recursos_extras')
on conflict (step) do update set applied_at = now();

-- =====================================================================
-- 7/14 · supabase/agenda.sql · agenda da campanha
-- =====================================================================
-- =====================================================================
-- Ficha Viva — AGENDA DA CAMPANHA
-- O mestre marca a próxima sessão (dia, hora, lugar) e cada jogador
-- confirma presença: Vou / Talvez / Não vou. A data aparece na sala da
-- campanha e na tela inicial de todo mundo da mesa.
--
-- Separado de `sessions` de propósito: a sessão PLANEJADA do console do
-- mestre pode ter nome de spoiler e o jogador não a enxerga; a agenda é
-- pública para a mesa.
--
-- Requer: o SQL base (docs/SUPABASE.md §5).
-- Idempotente: pode rodar mais de uma vez. Cole TUDO numa aba nova do SQL
-- Editor e clique em Run sem nada selecionado. Não apaga dados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ENCONTROS MARCADOS: o mestre cria, edita, cancela e apaga; todos
--    da mesa leem.
-- ---------------------------------------------------------------------
create table if not exists public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  starts_at timestamptz not null,
  duration_min int not null default 240 check (duration_min between 15 and 1440),
  title text check (char_length(title) <= 80),
  place text check (char_length(place) <= 120),
  note text check (char_length(note) <= 600),
  canceled boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_events_when_idx on public.campaign_events (campaign_id, starts_at);
alter table public.campaign_events enable row level security;

drop policy if exists "campaign_events_read" on public.campaign_events;
create policy "campaign_events_read" on public.campaign_events for select to authenticated
  using (public.is_campaign_master(campaign_id) or public.is_campaign_member(campaign_id));
drop policy if exists "campaign_events_master_insert" on public.campaign_events;
create policy "campaign_events_master_insert" on public.campaign_events for insert to authenticated
  with check (public.is_campaign_master(campaign_id));
drop policy if exists "campaign_events_master_update" on public.campaign_events;
create policy "campaign_events_master_update" on public.campaign_events for update to authenticated
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));
drop policy if exists "campaign_events_master_delete" on public.campaign_events;
create policy "campaign_events_master_delete" on public.campaign_events for delete to authenticated
  using (public.is_campaign_master(campaign_id));
grant select, insert, update, delete on public.campaign_events to authenticated;

-- ---------------------------------------------------------------------
-- 2) PRESENÇA: uma resposta por pessoa por encontro. Cada um grava só a
--    própria, só em encontro da própria mesa e que não foi cancelado.
--    O nome vai junto (o app não tem tabela de perfis).
-- ---------------------------------------------------------------------
create table if not exists public.campaign_rsvps (
  event_id uuid not null references public.campaign_events (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  status text not null check (status in ('yes', 'maybe', 'no')),
  display_name text check (char_length(display_name) <= 60),
  hero_name text check (char_length(hero_name) <= 60),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists campaign_rsvps_campaign_idx on public.campaign_rsvps (campaign_id);
alter table public.campaign_rsvps enable row level security;

drop policy if exists "campaign_rsvps_read" on public.campaign_rsvps;
create policy "campaign_rsvps_read" on public.campaign_rsvps for select to authenticated
  using (public.is_campaign_master(campaign_id) or public.is_campaign_member(campaign_id));
drop policy if exists "campaign_rsvps_own_insert" on public.campaign_rsvps;
create policy "campaign_rsvps_own_insert" on public.campaign_rsvps for insert to authenticated
  with check (
    user_id = auth.uid()
    and (public.is_campaign_master(campaign_id) or public.is_campaign_member(campaign_id))
    and exists (select 1 from public.campaign_events e where e.id = event_id and e.campaign_id = campaign_rsvps.campaign_id and not e.canceled)
  );
drop policy if exists "campaign_rsvps_own_update" on public.campaign_rsvps;
create policy "campaign_rsvps_own_update" on public.campaign_rsvps for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.campaign_events e where e.id = event_id and e.campaign_id = campaign_rsvps.campaign_id and not e.canceled)
  );
drop policy if exists "campaign_rsvps_own_delete" on public.campaign_rsvps;
create policy "campaign_rsvps_own_delete" on public.campaign_rsvps for delete to authenticated
  using (user_id = auth.uid());
grant select, insert, update, delete on public.campaign_rsvps to authenticated;

-- ao vivo: a data marcada e as confirmações aparecem sem recarregar
do $fn$ begin alter publication supabase_realtime add table public.campaign_events; exception when duplicate_object or undefined_object then null; end $fn$;
do $fn$ begin alter publication supabase_realtime add table public.campaign_rsvps; exception when duplicate_object or undefined_object then null; end $fn$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- versão do banco: registra que este script rodou (o app avisa o mestre
-- do que falta). Idempotente.
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (step text primary key, applied_at timestamptz not null default now());
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('agenda')
on conflict (step) do update set applied_at = now();

-- =====================================================================
-- 8/14 · supabase/bestiario.sql · bestiário da mesa
-- =====================================================================
-- =====================================================================
-- Ficha Viva — BESTIÁRIO DA MESA
-- O mestre personaliza as criaturas de cada campanha: foto e nome (a mesa
-- vê — iniciativa, mapa, cards) e notas (só o mestre vê). A criatura
-- continua com as regras do bestiário; aqui mora só a aparência.
--
-- `monster_ref` é o id da criatura no bestiário do app ("goblin",
-- "young-red-dragon"). Criaturas próprias do mestre (homebrew, valendo para
-- todas as mesas dele) virão num script à parte, com ids "hb:<uuid>" — esta
-- tabela já aceita esse formato.
--
-- Requer: o SQL base (docs/SUPABASE.md §5).
-- Idempotente: pode rodar mais de uma vez. Cole TUDO numa aba nova do SQL
-- Editor e clique em Run sem nada selecionado. Não apaga dados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) APARÊNCIA (a mesa vê): foto leve (data URL, ~30–80 KB) e nome.
-- ---------------------------------------------------------------------
create table if not exists public.campaign_monsters (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  monster_ref text not null check (char_length(monster_ref) between 1 and 80),
  name text check (char_length(name) <= 80),
  portrait text check (portrait is null or (portrait like 'data:image/%' and char_length(portrait) <= 400000)),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (campaign_id, monster_ref)
);
alter table public.campaign_monsters enable row level security;

drop policy if exists "campaign_monsters_read" on public.campaign_monsters;
create policy "campaign_monsters_read" on public.campaign_monsters for select to authenticated
  using (public.is_campaign_master(campaign_id) or public.is_campaign_member(campaign_id));
drop policy if exists "campaign_monsters_master_insert" on public.campaign_monsters;
create policy "campaign_monsters_master_insert" on public.campaign_monsters for insert to authenticated
  with check (public.is_campaign_master(campaign_id));
drop policy if exists "campaign_monsters_master_update" on public.campaign_monsters;
create policy "campaign_monsters_master_update" on public.campaign_monsters for update to authenticated
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));
drop policy if exists "campaign_monsters_master_delete" on public.campaign_monsters;
create policy "campaign_monsters_master_delete" on public.campaign_monsters for delete to authenticated
  using (public.is_campaign_master(campaign_id));
grant select, insert, update, delete on public.campaign_monsters to authenticated;

-- ---------------------------------------------------------------------
-- 2) NOTAS DO MESTRE (só ele vê): táticas, ganchos, o que a criatura sabe.
--    Tabela separada: o jogador não recebe nem a linha.
-- ---------------------------------------------------------------------
create table if not exists public.campaign_monster_notes (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  monster_ref text not null check (char_length(monster_ref) between 1 and 80),
  notes text not null default '' check (char_length(notes) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, monster_ref)
);
alter table public.campaign_monster_notes enable row level security;

drop policy if exists "campaign_monster_notes_master" on public.campaign_monster_notes;
create policy "campaign_monster_notes_master" on public.campaign_monster_notes for all to authenticated
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));
grant select, insert, update, delete on public.campaign_monster_notes to authenticated;

-- ao vivo: trocou a foto, a iniciativa e o mapa de todos atualizam
do $fn$ begin alter publication supabase_realtime add table public.campaign_monsters; exception when duplicate_object or undefined_object then null; end $fn$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- versão do banco: registra que este script rodou (o app avisa o mestre
-- do que falta). Idempotente.
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (step text primary key, applied_at timestamptz not null default now());
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('bestiario')
on conflict (step) do update set applied_at = now();

-- =====================================================================
-- 9/14 · supabase/diario_privado.sql · diário que só o jogador lê
-- =====================================================================
-- =====================================================================
-- Ficha Viva — DIÁRIO PRIVADO
--  O diário do jogador (rabiscos, crônica, missões, pistas e pessoas)
--  sai de dentro da ficha — que o MESTRE e o LINK de compartilhamento
--  leem — e vai para uma tabela que só o DONO lê e escreve. As imagens
--  das pistas ganham uma pasta privada (bucket "diario").
--
--  1) tabela sheet_diaries (uma linha por ficha, só o dono)
--  2) bucket "diario" (imagens das pistas; cada jogador só na própria pasta)
--  3) migração: copia o diário que já está nas fichas e limpa os snapshots
--     (sem mudar a versão das fichas — nenhum aparelho vê "mudança")
--
-- Requer: o SQL base (docs/SUPABASE.md §5).
-- Idempotente: pode rodar mais de uma vez. Cole TUDO numa aba nova do SQL
-- Editor e clique em Run sem nada selecionado. Não apaga dados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) O DIÁRIO, à parte da ficha
-- ---------------------------------------------------------------------
create table if not exists public.sheet_diaries (
  sheet_id text primary key references public.sheets (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  -- a mesma versão (updated_at) da ficha a que pertence
  updated_at bigint not null
);
create index if not exists sheet_diaries_user_idx on public.sheet_diaries (user_id);
alter table public.sheet_diaries enable row level security;

-- só o dono: ninguém mais (nem o mestre da mesa) lê o diário
drop policy if exists "diaries_own" on public.sheet_diaries;
create policy "diaries_own" on public.sheet_diaries for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.sheets s where s.id = sheet_id and s.user_id = auth.uid())
  );
grant select, insert, update, delete on public.sheet_diaries to authenticated;

-- ---------------------------------------------------------------------
-- 2) IMAGENS DAS PISTAS (privadas, até 2 MB, pasta = id do jogador)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('diario', 'diario', false, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fv_diario_read" on storage.objects;
create policy "fv_diario_read" on storage.objects for select to authenticated
  using (bucket_id = 'diario' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "fv_diario_insert" on storage.objects;
create policy "fv_diario_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'diario' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "fv_diario_update" on storage.objects;
create policy "fv_diario_update" on storage.objects for update to authenticated
  using (bucket_id = 'diario' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "fv_diario_delete" on storage.objects;
create policy "fv_diario_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'diario' and split_part(name, '/', 1) = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 3) MIGRAÇÃO: o diário que já está dentro das fichas vai para a tabela
--    privada (com a mesma versão) e sai do snapshot. updated_at da ficha
--    NÃO muda: os aparelhos não veem "mudança" e não há conflito.
-- ---------------------------------------------------------------------
insert into public.sheet_diaries (sheet_id, user_id, data, updated_at)
select
  s.id,
  s.user_id,
  (case when s.snapshot ? 'diary' then jsonb_build_object('diary', s.snapshot -> 'diary') else '{}'::jsonb end)
    || jsonb_build_object(
      'journal', coalesce(s.snapshot -> 'journal', '[]'::jsonb),
      'notes', coalesce(s.snapshot -> 'notes', '""'::jsonb)
    ),
  s.updated_at
from public.sheets s
where s.snapshot ? 'diary'
   or jsonb_array_length(coalesce(s.snapshot -> 'journal', '[]'::jsonb)) > 0
   or coalesce(s.snapshot ->> 'notes', '') <> ''
on conflict (sheet_id) do nothing;

update public.sheets s
set snapshot = (s.snapshot - 'diary') || '{"journal": [], "notes": ""}'::jsonb
where exists (select 1 from public.sheet_diaries d where d.sheet_id = s.id)
  and (
    s.snapshot ? 'diary'
    or jsonb_array_length(coalesce(s.snapshot -> 'journal', '[]'::jsonb)) > 0
    or coalesce(s.snapshot ->> 'notes', '') <> ''
  );

-- ---------------------------------------------------------------------
-- 4) registra a versão do banco (o app para de avisar que falta este script)
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (
  step text primary key,
  applied_at timestamptz not null default now()
);
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('diario_privado') on conflict (step) do nothing;

-- conferência: a tabela, o bucket e as 4 regras de imagem
select count(*) as diarios from public.sheet_diaries;
select id, public, file_size_limit from storage.buckets where id = 'diario';
select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'fv_diario_%';

-- =====================================================================
-- 10/14 · supabase/mesa_vida.sql · PV do herói igual para mestre e jogador
-- =====================================================================
-- =====================================================================
-- Ficha Viva · Mesa ao vivo: PV e condições do herói sempre iguais
-- =====================================================================
-- Rode DEPOIS de multiplayer_session.sql. Pode rodar mais de uma vez.
--
-- O problema: o PV que o mestre vê na linha do encontro só mudava quando
-- ERA ELE quem aplicava o dano. Poção, descanso ou dano tomado na própria
-- ficha deixavam o número do mestre velho (e o PV temporário nunca entrava
-- na conta). A ficha do jogador é a verdade sobre o herói; agora ela manda
-- PV e condições para o próprio combatente.
--
-- Regras: só o DONO do combatente (owner_id) usa esta função, e ela só mexe
-- em PV atual, PV máximo e condições — nunca em nome, CA, ordem ou
-- visibilidade, que continuam sendo do mestre.
-- =====================================================================

create or replace function public.update_own_combatant(p_combatant uuid, p_patch jsonb)
returns public.combatants language plpgsql security definer set search_path = public as $fn$
declare c public.combatants; v_hp int; v_max int;
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  select * into c from combatants where id = p_combatant;
  if not found then raise exception 'Combatente não encontrado.'; end if;
  if c.owner_id is distinct from auth.uid() then
    raise exception 'Você só pode atualizar o seu próprio herói.';
  end if;

  v_max := case when p_patch ? 'hp_max' then greatest(1, least(9999, (p_patch->>'hp_max')::int)) else c.hp_max end;
  v_hp := case when p_patch ? 'hp_current' then greatest(0, least(coalesce(v_max, 9999), (p_patch->>'hp_current')::int)) else c.hp_current end;

  update combatants set
    hp_current = v_hp,
    hp_max = v_max,
    conditions = case
      when p_patch ? 'conditions' and jsonb_typeof(p_patch->'conditions') = 'array' then p_patch->'conditions'
      else conditions end,
    updated_at = now()
  where id = p_combatant returning * into c;

  -- avisa a mesa pelo encontro (mesmo caminho do update_combatant do mestre)
  update encounters set updated_at = now() where id = c.encounter_id;
  return c;
end $fn$;

revoke all on function public.update_own_combatant(uuid, jsonb) from public;
grant execute on function public.update_own_combatant(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- registra a versão do banco (o app para de avisar que falta este script)
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (
  step text primary key,
  applied_at timestamptz not null default now()
);
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('mesa_vida') on conflict (step) do nothing;

-- conferência: a função existe
select proname from pg_proc where proname = 'update_own_combatant';

-- =====================================================================
-- 11/14 · supabase/discord.sql · rolagens no Discord da mesa
-- =====================================================================
-- =====================================================================
-- Ficha Viva — DISCORD DA MESA
-- O mestre cola o webhook de um canal do Discord e as rolagens PÚBLICAS
-- da mesa ao vivo aparecem lá. O endereço do webhook é segredo: só o
-- mestre da campanha lê e grava (nem os jogadores, nem o link da ficha).
-- O envio sai do navegador do mestre enquanto a mesa está aberta.
--
-- Requer: o SQL base (docs/SUPABASE.md §5).
-- Idempotente: pode rodar mais de uma vez. Cole TUDO numa aba nova do SQL
-- Editor e clique em Run sem nada selecionado. Não apaga dados.
-- =====================================================================

create table if not exists public.campaign_discord (
  campaign_id uuid primary key references public.campaigns (id) on delete cascade,
  webhook_url text not null check (
    webhook_url ~ '^https://(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$'
    and char_length(webhook_url) <= 300
  ),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.campaign_discord enable row level security;

drop policy if exists "campaign_discord_master_read" on public.campaign_discord;
create policy "campaign_discord_master_read" on public.campaign_discord for select to authenticated
  using (public.is_campaign_master(campaign_id));
drop policy if exists "campaign_discord_master_insert" on public.campaign_discord;
create policy "campaign_discord_master_insert" on public.campaign_discord for insert to authenticated
  with check (public.is_campaign_master(campaign_id));
drop policy if exists "campaign_discord_master_update" on public.campaign_discord;
create policy "campaign_discord_master_update" on public.campaign_discord for update to authenticated
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));
drop policy if exists "campaign_discord_master_delete" on public.campaign_discord;
create policy "campaign_discord_master_delete" on public.campaign_discord for delete to authenticated
  using (public.is_campaign_master(campaign_id));
revoke all on public.campaign_discord from anon;
grant select, insert, update, delete on public.campaign_discord to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- versão do banco: registra que este script rodou (o app avisa o mestre
-- do que falta). Idempotente.
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (step text primary key, applied_at timestamptz not null default now());
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('discord')
on conflict (step) do update set applied_at = now();

-- =====================================================================
-- 12/14 · supabase/mesa_membros.sql · sair, remover e lista de jogadores
-- =====================================================================
-- =====================================================================
-- Ficha Viva · Membros da mesa: sair, remover jogador e lista do mestre
-- =====================================================================
-- Rode DEPOIS do SQL base (docs/SUPABASE.md seção 5) e de
-- multiplayer_session.sql. Pode rodar mais de uma vez.
--
-- O problema: quem entrava numa mesa ficava nela para sempre — o jogador
-- não tinha como sair, e o mestre não tinha como tirar quem deixou o grupo
-- (a pessoa continuava vendo a sala, os NPCs e a sessão ao vivo).
--
-- Regras:
--   · o jogador sai sozinho (leave_campaign); as fichas que ele vinculou
--     saem junto — o mestre deixa de ver a cópia;
--   · o mestre remove um jogador (remove_campaign_member), nunca a si mesmo;
--   · só o mestre lê a lista de jogadores com o nome da conta
--     (campaign_roster) — e-mails nunca saem do banco.
-- Combatentes de um encontro aberto ficam onde estão (o mestre decide).
-- =====================================================================

create or replace function public.leave_campaign(p_campaign uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  if exists (select 1 from campaigns where id = p_campaign and master_id = auth.uid()) then
    raise exception 'O mestre não sai da própria mesa.';
  end if;
  if not exists (select 1 from campaign_members where campaign_id = p_campaign and user_id = auth.uid()) then
    raise exception 'Você não faz parte desta mesa.';
  end if;
  delete from shared_sheets where campaign_id = p_campaign and owner_id = auth.uid();
  delete from campaign_members where campaign_id = p_campaign and user_id = auth.uid();
end $fn$;

create or replace function public.remove_campaign_member(p_campaign uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  if not exists (select 1 from campaigns where id = p_campaign and master_id = auth.uid()) then
    raise exception 'Só o mestre remove jogadores.';
  end if;
  if p_user = auth.uid() then raise exception 'O mestre não sai da própria mesa.'; end if;
  delete from shared_sheets where campaign_id = p_campaign and owner_id = p_user;
  delete from campaign_members where campaign_id = p_campaign and user_id = p_user;
end $fn$;

-- nome da conta (o que a pessoa escolheu no cadastro ou no Google), nunca o e-mail
create or replace function public.campaign_roster(p_campaign uuid)
returns table (user_id uuid, display_name text, joined_at bigint, heroes int)
language plpgsql security definer stable set search_path = public as $fn$
begin
  if auth.uid() is null or not exists (select 1 from campaigns where id = p_campaign and master_id = auth.uid()) then
    raise exception 'Só o mestre vê a lista de jogadores.';
  end if;
  return query
    select m.user_id,
           coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), nullif(trim(u.raw_user_meta_data->>'name'), ''), 'Jogador')::text,
           m.joined_at,
           (select count(*)::int from shared_sheets s where s.campaign_id = p_campaign and s.owner_id = m.user_id)
      from campaign_members m
      left join auth.users u on u.id = m.user_id
     where m.campaign_id = p_campaign and m.role = 'player'
     order by m.joined_at, m.user_id;
end $fn$;

revoke all on function public.leave_campaign(uuid) from public;
revoke all on function public.remove_campaign_member(uuid, uuid) from public;
revoke all on function public.campaign_roster(uuid) from public;
grant execute on function public.leave_campaign(uuid) to authenticated;
grant execute on function public.remove_campaign_member(uuid, uuid) to authenticated;
grant execute on function public.campaign_roster(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- desempenho: "ordens do mestre" (dano, XP, itens) de toda a campanha são
-- buscadas por campanha + tipo. Sem este índice, a busca varre a tabela de
-- eventos inteira (todas as rolagens de todas as mesas).
-- ---------------------------------------------------------------------
create index if not exists session_events_campaign_type_idx
  on public.session_events (campaign_id, type, created_at desc);

-- ---------------------------------------------------------------------
-- registra a versão do banco (o app para de avisar que falta este script)
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (
  step text primary key,
  applied_at timestamptz not null default now()
);
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('mesa_membros') on conflict (step) do nothing;

-- conferência: as funções existem
select proname from pg_proc where proname in ('leave_campaign', 'remove_campaign_member', 'campaign_roster');

-- =====================================================================
-- 13/14 · supabase/segredos.sql · segredos do mapa e loot nas pistas
-- =====================================================================
-- =====================================================================
-- Ficha Viva — SEGREDOS DO MAPA
-- Baús, armadilhas, portas secretas e pistas que só o mestre vê, com o
-- loot e as condições para aparecer (proximidade, Percepção passiva,
-- teste, item, gatilho). Os jogadores NÃO leem esta tabela: só recebem o
-- peão revelado e a pista com o loot.
--
-- Rode DEPOIS do palco.sql. Pode rodar mais de uma vez. Cole TUDO numa
-- aba nova do SQL Editor e clique em Run sem nada selecionado.
-- =====================================================================

create table if not exists public.scene_secrets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  scene_id uuid not null references public.campaign_scenes (id) on delete cascade,
  -- o marcador escondido no mapa (aparece para a mesa quando o segredo é achado)
  token_id uuid references public.scene_tokens (id) on delete set null,
  kind text not null default 'chest' check (kind in ('chest', 'trap', 'door', 'clue', 'item')),
  title text not null check (length(trim(title)) between 1 and 80),
  -- o que os jogadores leem ao achar
  reveal_text text check (reveal_text is null or length(reveal_text) <= 4000),
  -- anotações só do mestre
  notes text check (notes is null or length(notes) <= 4000),
  -- [{ name, qty, itemId? }]
  loot jsonb not null default '[]'::jsonb,
  -- { pp, gp, ep, sp, cp }
  coins jsonb not null default '{}'::jsonb,
  -- { mode, near, passive, check, item, flag, auto, to }
  rules jsonb not null default '{}'::jsonb,
  found_by text,
  found_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scene_secrets_scene_idx on public.scene_secrets (scene_id);
create index if not exists scene_secrets_campaign_idx on public.scene_secrets (campaign_id);

alter table public.scene_secrets enable row level security;
drop policy if exists "secrets_master" on public.scene_secrets;
create policy "secrets_master" on public.scene_secrets for all
  using (public.is_campaign_master(campaign_id))
  with check (
    public.is_campaign_master(campaign_id)
    and exists (select 1 from public.campaign_scenes s where s.id = scene_id and s.campaign_id = scene_secrets.campaign_id)
  );
grant select, insert, update, delete on public.scene_secrets to authenticated;

-- realtime: o console do mestre acompanha os próprios segredos
do $fn$ begin alter publication supabase_realtime add table public.scene_secrets; exception when duplicate_object then null; end $fn$;

-- ---------------------------------------------------------------------
-- LOOT NAS PISTAS: a pista do achado leva os itens; quem recebeu pega uma
-- vez só (claimed_by), direto para a mochila da ficha.
-- ---------------------------------------------------------------------
alter table public.campaign_handouts add column if not exists loot jsonb;
alter table public.campaign_handouts add column if not exists claimed_by uuid;

drop function if exists public.claim_handout_loot(uuid);
create function public.claim_handout_loot(p_handout uuid)
returns setof public.campaign_handouts language sql security definer set search_path = public as '
  update public.campaign_handouts
     set claimed_by = auth.uid()
   where id = p_handout
     and claimed_by is null
     and loot is not null
     and shown_at is not null
     and public.is_campaign_member(campaign_id)
     and (recipients is null or auth.uid() = any (recipients))
  returning *;
';
grant execute on function public.claim_handout_loot(uuid) to authenticated;

-- =====================================================================
-- 14/14 · supabase/mesa_dezembro.sql · PV confirmados e permissões de recompensa
-- =====================================================================
-- Mesa de dezembro. Rode depois de mesa_vida.sql e dos scripts do palco.
begin;

alter table public.combatants add column if not exists hp_event_id uuid;

create or replace function public.update_own_combatant(p_combatant uuid, p_patch jsonb)
returns public.combatants language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  c public.combatants;
  v_hp int;
  v_max int;
  v_conditions jsonb;
  v_event uuid;
  v_before int;
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  select * into c from public.combatants where id = p_combatant for update;
  if not found then raise exception 'Combatente não encontrado.'; end if;
  if c.type <> 'player' or c.owner_id is distinct from auth.uid() then
    raise exception 'Você só pode atualizar o seu próprio herói.';
  end if;
  if not exists (
    select 1 from public.encounters e
    join public.sessions s on s.id = e.session_id
    join public.shared_sheets l on l.campaign_id = c.campaign_id and l.sheet_id = c.sheet_id and l.owner_id = c.owner_id
    where e.id = c.encounter_id and e.status in ('preparing', 'active', 'paused')
      and s.status in ('active', 'paused') and public.is_campaign_participant(c.campaign_id)
  ) then raise exception 'O herói não está vinculado a um encontro aberto.'; end if;

  if p_patch ? 'hp_event_id' then
    select incoming.id into v_event from public.session_events incoming
    where incoming.id = (p_patch->>'hp_event_id')::uuid and incoming.session_id = c.session_id
      and incoming.target_id = c.id::text and incoming.payload->>'sheetId' = c.sheet_id
      and incoming.type in ('hero_hp', 'hero_hp_correction')
      and incoming.actor_id = (select master_id from public.campaigns where id = c.campaign_id)
      and not exists (
        select 1 from public.session_events confirmed where confirmed.id = c.hp_event_id
          and (confirmed.created_at, confirmed.id) > (incoming.created_at, incoming.id)
      );
    if v_event is null then raise exception 'A ordem de PV já mudou. Confira o encontro e tente de novo.'; end if;
  end if;

  v_max := case when p_patch ? 'hp_max' then greatest(1, least(9999, (p_patch->>'hp_max')::int)) else c.hp_max end;
  v_hp := case when p_patch ? 'hp_current' then greatest(0, least(coalesce(v_max, 9999), (p_patch->>'hp_current')::int)) else c.hp_current end;
  v_conditions := case when jsonb_typeof(p_patch->'conditions') = 'array' then p_patch->'conditions' else c.conditions end;
  if (v_hp, v_max, v_conditions, coalesce(v_event, c.hp_event_id)) is not distinct from
     (c.hp_current, c.hp_max, c.conditions, c.hp_event_id) then return c; end if;

  v_before := c.hp_current;
  update public.combatants set
    hp_current = v_hp, hp_max = v_max, conditions = v_conditions,
    hp_event_id = coalesce(v_event, c.hp_event_id), updated_at = now()
  where id = p_combatant returning * into c;

  if v_event is null and v_hp is distinct from v_before then
    perform public._fv_log(c.session_id, c.campaign_id, 'hero_vitals', c.id::text,
      jsonb_build_object('name', c.name, 'before', v_before, 'after', v_hp),
      case when c.hidden then 'master' else 'public' end);
  end if;
  return c;
end;
$fn$;
revoke all on function public.update_own_combatant(uuid, jsonb) from public, anon;
grant execute on function public.update_own_combatant(uuid, jsonb) to authenticated;

-- A inserção de recompensa exige permissão atual do dono da ficha, inclusive
-- quando o mestre estiver em uma versão antiga do app.
drop policy if exists fv_session_events_inventory_guard on public.session_events;
create policy fv_session_events_inventory_guard on public.session_events as restrictive for insert to authenticated
with check (
  type <> 'hero_item' or (
    public.is_campaign_master(campaign_id) and exists (
      select 1 from public.shared_sheets links where links.campaign_id = session_events.campaign_id
        and links.sheet_id = session_events.payload->>'sheetId'
        and links.permissions @> '{"editInventory":true}'::jsonb
    )
  )
);

-- Mantém a regra de destinatários mesmo se outra policy permissiva for instalada.
drop policy if exists fv_handouts_recipient_guard on public.campaign_handouts;
create policy fv_handouts_recipient_guard on public.campaign_handouts as restrictive for select to authenticated
using (
  public.is_campaign_master(campaign_id) or (
    shown_at is not null and public.is_campaign_member(campaign_id)
    and (recipients is null or auth.uid() = any(recipients))
  )
);

insert into public.app_schema_steps (step) values ('mesa_dezembro') on conflict (step) do nothing;
commit;

