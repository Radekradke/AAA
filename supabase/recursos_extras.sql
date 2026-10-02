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
