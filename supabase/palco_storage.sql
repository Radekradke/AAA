-- =====================================================================
-- Ficha Viva — ESPAÇO DE IMAGENS do palco (bucket "campaign-media").
-- Autossuficiente: não depende de nenhuma função extra. As regras usam o
-- próprio RLS das tabelas do palco (quem vê a cena/peão/handout vê a imagem).
-- Rode depois do supabase/palco.sql. Pode rodar mais de uma vez.
-- =====================================================================

-- 1) o bucket (privado, até 10 MB, só imagens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-media', 'campaign-media', false, 10485760, array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 2) leitura: mestre da pasta, ou algo que o jogador já pode ver
drop policy if exists "fv_media_read" on storage.objects;
create policy "fv_media_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'campaign-media'
    and (
      exists (select 1 from public.campaigns c where c.id::text = split_part(objects.name, '/', 1) and c.master_id = auth.uid())
      or exists (select 1 from public.campaign_scenes s
                  where s.image_path = objects.name
                     or s.beats @> jsonb_build_array(jsonb_build_object('path', objects.name)))
      or exists (select 1 from public.scene_tokens t where t.image_path = objects.name)
      or exists (select 1 from public.campaign_handouts h where h.image_path = objects.name and h.shown_at is not null)
    )
  );

-- 3) enviar / trocar / apagar: só o mestre, na pasta da própria campanha
drop policy if exists "fv_media_insert" on storage.objects;
create policy "fv_media_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'campaign-media'
    and exists (select 1 from public.campaigns c where c.id::text = split_part(objects.name, '/', 1) and c.master_id = auth.uid()));

drop policy if exists "fv_media_update" on storage.objects;
create policy "fv_media_update" on storage.objects for update to authenticated
  using (bucket_id = 'campaign-media'
    and exists (select 1 from public.campaigns c where c.id::text = split_part(objects.name, '/', 1) and c.master_id = auth.uid()));

drop policy if exists "fv_media_delete" on storage.objects;
create policy "fv_media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'campaign-media'
    and exists (select 1 from public.campaigns c where c.id::text = split_part(objects.name, '/', 1) and c.master_id = auth.uid()));

-- 4) conferência: 1 linha do bucket e 4 regras
select id, public, file_size_limit from storage.buckets where id = 'campaign-media';
select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'fv_media_%';
