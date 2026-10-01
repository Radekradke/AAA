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
