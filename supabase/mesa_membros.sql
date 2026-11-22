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
