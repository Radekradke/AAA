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
