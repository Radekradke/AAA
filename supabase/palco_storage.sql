-- =====================================================================
-- Ficha Viva — só o ESPAÇO DE IMAGENS do palco (bucket "campaign-media").
-- Use se o app disser: falta o espaço de imagens "campaign-media".
-- Sem "engolir" erros: se algo falhar, o Supabase mostra o motivo exato.
-- Rode depois do supabase/palco.sql. Traz junto as funções de permissão,
-- então funciona mesmo se o palco.sql tiver parado no meio.
-- =====================================================================

-- 0) funções de permissão (quem é mestre da pasta / quem já pode ver a imagem)
alter table public.scene_tokens add column if not exists image_path text;

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
