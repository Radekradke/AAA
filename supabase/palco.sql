-- =====================================================================
-- Ficha Viva — PALCO DA MESA
-- Cenas (mapa tático, imagem, cutscene), o que está "no ar" para todos,
-- peões do mapa e handouts (cartas, pistas, mapas do tesouro).
--
-- Rode DEPOIS do multiplayer_session.sql (e da atualização de NPCs).
-- Pode rodar mais de uma vez. Cole TUDO numa aba nova do SQL Editor e
-- clique em Run sem nada selecionado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- CENAS: o mestre prepara antes da sessão. Jogadores só enxergam uma cena
-- depois que ela vai ao ar pela primeira vez (revealed).
-- ---------------------------------------------------------------------
create table if not exists public.campaign_scenes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  kind text not null check (kind in ('map', 'image', 'cutscene')),
  name text not null check (length(trim(name)) between 1 and 80),
  -- caminho no Storage (bucket campaign-media): "<campaign_id>/<arquivo>"
  image_path text,
  -- mapa: { size: px da casa na imagem, ox, oy: deslocamento, show: bool }
  grid jsonb not null default '{}'::jsonb,
  -- cutscene: [{ path, text }]
  beats jsonb not null default '[]'::jsonb,
  revealed boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_scenes_campaign_idx on public.campaign_scenes (campaign_id, sort);

-- o que está na tela de todo mundo agora (uma linha por campanha)
create table if not exists public.campaign_stage (
  campaign_id uuid primary key references public.campaigns (id) on delete cascade,
  scene_id uuid references public.campaign_scenes (id) on delete set null,
  -- quadro atual da cutscene
  beat int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PEÕES DO MAPA (posição em casas da grade)
-- ---------------------------------------------------------------------
create table if not exists public.scene_tokens (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.campaign_scenes (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  kind text not null check (kind in ('hero', 'npc', 'monster', 'marker')),
  label text not null default '' check (length(label) <= 60),
  sheet_id text,
  -- quem pode mover além do mestre (o dono da ficha do herói)
  owner_id uuid,
  npc_id uuid,
  combatant_id uuid,
  monster_ref text,
  color text check (color is null or length(color) <= 20),
  x real not null default 0,
  y real not null default 0,
  size real not null default 1 check (size between 0.5 and 6),
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists scene_tokens_scene_idx on public.scene_tokens (scene_id);
-- retrato do peão (inimigo, NPC ou herói) enviado pelo mestre: "<campaign_id>/<arquivo>"
alter table public.scene_tokens add column if not exists image_path text;

-- ---------------------------------------------------------------------
-- HANDOUTS: cartas, pistas e imagens entregues a todos ou a alguns
-- ---------------------------------------------------------------------
create table if not exists public.campaign_handouts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 80),
  body text check (body is null or length(body) <= 4000),
  image_path text,
  -- null = todos da mesa; senão, só estes jogadores
  recipients uuid[],
  -- null = ainda na gaveta do mestre
  shown_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists campaign_handouts_campaign_idx on public.campaign_handouts (campaign_id, shown_at);

alter table public.campaign_scenes enable row level security;
alter table public.campaign_stage enable row level security;
alter table public.scene_tokens enable row level security;
alter table public.campaign_handouts enable row level security;

drop policy if exists "scenes_read" on public.campaign_scenes;
create policy "scenes_read" on public.campaign_scenes for select
  using (public.is_campaign_master(campaign_id) or (revealed and public.is_campaign_member(campaign_id)));
drop policy if exists "scenes_master" on public.campaign_scenes;
create policy "scenes_master" on public.campaign_scenes for all
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));

drop policy if exists "stage_read" on public.campaign_stage;
create policy "stage_read" on public.campaign_stage for select
  using (public.is_campaign_master(campaign_id) or public.is_campaign_member(campaign_id));
drop policy if exists "stage_master" on public.campaign_stage;
create policy "stage_master" on public.campaign_stage for all
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));

drop policy if exists "tokens_read" on public.scene_tokens;
create policy "tokens_read" on public.scene_tokens for select
  using (
    public.is_campaign_master(campaign_id)
    or (not hidden and public.is_campaign_member(campaign_id)
        and exists (select 1 from public.campaign_scenes s where s.id = scene_id and s.revealed))
  );
drop policy if exists "tokens_master" on public.scene_tokens;
create policy "tokens_master" on public.scene_tokens for all
  using (public.is_campaign_master(campaign_id))
  with check (
    public.is_campaign_master(campaign_id)
    and exists (select 1 from public.campaign_scenes s where s.id = scene_id and s.campaign_id = scene_tokens.campaign_id)
  );

drop policy if exists "handouts_read" on public.campaign_handouts;
create policy "handouts_read" on public.campaign_handouts for select
  using (
    public.is_campaign_master(campaign_id)
    or (shown_at is not null and public.is_campaign_member(campaign_id)
        and (recipients is null or auth.uid() = any (recipients)))
  );
drop policy if exists "handouts_master" on public.campaign_handouts;
create policy "handouts_master" on public.campaign_handouts for all
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));

grant select, insert, update, delete on public.campaign_scenes, public.campaign_stage, public.scene_tokens, public.campaign_handouts to authenticated;

-- jogador move SÓ o próprio peão (e só a posição); o mestre move qualquer um
create or replace function public.move_token(p_token uuid, p_x real, p_y real)
returns public.scene_tokens language plpgsql security definer set search_path = public as $fn$
declare t public.scene_tokens;
begin
  select * into t from scene_tokens where id = p_token for update;
  if not found then raise exception 'Peão não encontrado.'; end if;
  if not public.is_campaign_master(t.campaign_id)
     and (t.owner_id is distinct from auth.uid() or t.hidden) then
    raise exception 'Só o mestre ou o dono move este peão.';
  end if;
  update scene_tokens
     set x = greatest(-2, least(400, p_x)), y = greatest(-2, least(400, p_y)), updated_at = now()
   where id = p_token returning * into t;
  return t;
end $fn$;
grant execute on function public.move_token(uuid, real, real) to authenticated;

-- peão escondido/revelado: o jogador não recebe o UPDATE de uma linha que
-- deixou de ver (RLS), então o palco "cutuca" todo mundo para recarregar
create or replace function public._fv_token_visibility_touch()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if tg_op = 'DELETE' or new.hidden is distinct from old.hidden then
    update campaign_stage set updated_at = now()
     where campaign_id = coalesce(new.campaign_id, old.campaign_id);
  end if;
  return null;
end $fn$;
drop trigger if exists scene_tokens_visibility on public.scene_tokens;
create trigger scene_tokens_visibility after update or delete on public.scene_tokens
  for each row execute function public._fv_token_visibility_touch();

-- ---------------------------------------------------------------------
-- IMAGENS (Supabase Storage, bucket privado "campaign-media")
-- O mestre envia para a pasta da campanha; cada jogador só baixa o que já
-- está visível para ele (cena revelada ou handout entregue a ele).
-- ---------------------------------------------------------------------
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

do $fn$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('campaign-media', 'campaign-media', false, 10485760, array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
  on conflict (id) do nothing;

  execute $p$drop policy if exists "fv_media_read" on storage.objects$p$;
  execute $p$create policy "fv_media_read" on storage.objects for select to authenticated
    using (bucket_id = 'campaign-media' and public.fv_media_readable(name))$p$;
  execute $p$drop policy if exists "fv_media_insert" on storage.objects$p$;
  execute $p$create policy "fv_media_insert" on storage.objects for insert to authenticated
    with check (bucket_id = 'campaign-media' and public.fv_media_master(name))$p$;
  execute $p$drop policy if exists "fv_media_update" on storage.objects$p$;
  execute $p$create policy "fv_media_update" on storage.objects for update to authenticated
    using (bucket_id = 'campaign-media' and public.fv_media_master(name))$p$;
  execute $p$drop policy if exists "fv_media_delete" on storage.objects$p$;
  execute $p$create policy "fv_media_delete" on storage.objects for delete to authenticated
    using (bucket_id = 'campaign-media' and public.fv_media_master(name))$p$;
exception
  when undefined_table or invalid_schema_name then
    raise notice 'Storage indisponível neste projeto — mapas e imagens não vão subir.';
  -- nunca derruba o resto do script (tabelas do palco) por causa do Storage
  when others then
    raise warning 'Palco criado, mas o Storage recusou a configuração (%). Mapas e imagens podem não subir.', sqlerrm;
end $fn$;

-- tempo real
do $fn$ begin alter publication supabase_realtime add table public.campaign_scenes; exception when duplicate_object then null; end $fn$;
do $fn$ begin alter publication supabase_realtime add table public.campaign_stage; exception when duplicate_object then null; end $fn$;
do $fn$ begin alter publication supabase_realtime add table public.scene_tokens; exception when duplicate_object then null; end $fn$;
do $fn$ begin alter publication supabase_realtime add table public.campaign_handouts; exception when duplicate_object then null; end $fn$;

-- a API do Supabase (PostgREST) passa a enxergar as tabelas novas na hora
notify pgrst, 'reload schema';
