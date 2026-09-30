-- =====================================================================
-- Ficha Viva — só o ESPAÇO DE IMAGENS do palco (bucket "campaign-media").
-- Use se o app disser: falta o espaço de imagens "campaign-media".
-- Sem "engolir" erros: se algo falhar, o Supabase mostra o motivo exato.
-- Rode depois do supabase/palco.sql (usa fv_media_readable/fv_media_master).
-- =====================================================================

-- 1) o bucket (privado, até 10 MB, só imagens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-media', 'campaign-media', false, 10485760, array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 2) quem lê e quem envia
drop policy if exists "fv_media_read" on storage.objects;
create policy "fv_media_read" on storage.objects for select to authenticated
  using (bucket_id = 'campaign-media' and public.fv_media_readable(name));

drop policy if exists "fv_media_insert" on storage.objects;
create policy "fv_media_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'campaign-media' and public.fv_media_master(name));

drop policy if exists "fv_media_update" on storage.objects;
create policy "fv_media_update" on storage.objects for update to authenticated
  using (bucket_id = 'campaign-media' and public.fv_media_master(name));

drop policy if exists "fv_media_delete" on storage.objects;
create policy "fv_media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'campaign-media' and public.fv_media_master(name));

-- 3) conferência: deve mostrar 1 linha do bucket e 4 políticas
select id, public, file_size_limit from storage.buckets where id = 'campaign-media';
select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'fv_media_%';
