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
