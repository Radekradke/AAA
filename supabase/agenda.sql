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
