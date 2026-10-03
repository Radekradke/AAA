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
