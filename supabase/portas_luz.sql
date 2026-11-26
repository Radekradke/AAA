-- =====================================================================
-- Ficha Viva — PAREDES, PORTAS E LUZ (mesa ao vivo)
-- Paredes e portas ganham tabela própria e a luz vira coluna do peão:
-- cada mudança é uma linha pequena (sem regravar a cena inteira), então
-- o mestre desenhando e o jogador abrindo uma porta nunca se atropelam,
-- e o tempo real manda só o que mudou.
--  · o jogador abre/fecha a porta ao lado do próprio herói (trancada:
--    só o mestre) e acende a luz que o próprio herói carrega;
--  · o resto continua só do mestre.
-- Migra sozinho as paredes e luzes guardadas no formato antigo.
--
-- Rode DEPOIS do palco.sql. Pode rodar mais de uma vez. Cole TUDO numa
-- aba nova do SQL Editor e clique em Run sem nada selecionado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PAREDES E PORTAS (em casas, de quina a quina)
-- ---------------------------------------------------------------------
create table if not exists public.scene_walls (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.campaign_scenes (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  x1 real not null,
  y1 real not null,
  x2 real not null,
  y2 real not null,
  door boolean not null default false,
  open boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scene_walls_not_point check (x1 <> x2 or y1 <> y2)
);
create index if not exists scene_walls_scene_idx on public.scene_walls (scene_id);

alter table public.scene_walls enable row level security;
-- quem joga precisa das paredes para a visão (só de cenas que já foram ao ar)
drop policy if exists "walls_read" on public.scene_walls;
create policy "walls_read" on public.scene_walls for select
  using (
    public.is_campaign_master(campaign_id)
    or (public.is_campaign_member(campaign_id)
        and exists (select 1 from public.campaign_scenes s where s.id = scene_id and s.revealed))
  );
drop policy if exists "walls_master" on public.scene_walls;
create policy "walls_master" on public.scene_walls for all
  using (public.is_campaign_master(campaign_id))
  with check (
    public.is_campaign_master(campaign_id)
    and exists (select 1 from public.campaign_scenes s where s.id = scene_id and s.campaign_id = scene_walls.campaign_id)
  );
grant select, insert, update, delete on public.scene_walls to authenticated;
do $fn$ begin alter publication supabase_realtime add table public.scene_walls; exception when duplicate_object then null; end $fn$;

-- ---------------------------------------------------------------------
-- LUZ QUE O PEÃO CARREGA (metros; 0 = nenhuma)
-- ---------------------------------------------------------------------
alter table public.scene_tokens add column if not exists light real not null default 0;
alter table public.scene_tokens drop constraint if exists scene_tokens_light_range;
alter table public.scene_tokens add constraint scene_tokens_light_range check (light between 0 and 36);

-- ---------------------------------------------------------------------
-- MIGRAÇÃO do formato antigo (grid.fog.walls / grid.fog.lights), num
-- comando só: copia e limpa juntos, então rodar de novo não duplica.
-- ---------------------------------------------------------------------
with src as (
  select id, campaign_id, grid from public.campaign_scenes
   where grid->'fog' ?| array['walls', 'lights']
   for update
), copied_walls as (
  insert into public.scene_walls (scene_id, campaign_id, x1, y1, x2, y2, door, open, locked)
  select src.id, src.campaign_id,
         (w->>'x1')::real, (w->>'y1')::real, (w->>'x2')::real, (w->>'y2')::real,
         coalesce((w->>'door')::boolean, false), coalesce((w->>'open')::boolean, false), coalesce((w->>'locked')::boolean, false)
    from src
   cross join lateral jsonb_array_elements(case when jsonb_typeof(src.grid->'fog'->'walls') = 'array' then src.grid->'fog'->'walls' else '[]'::jsonb end) w
   where (w->>'x1') is not null and (w->>'y1') is not null and (w->>'x2') is not null and (w->>'y2') is not null
     and ((w->>'x1')::real <> (w->>'x2')::real or (w->>'y1')::real <> (w->>'y2')::real)
  returning 1
), copied_lights as (
  update public.scene_tokens t
     set light = greatest(0, least(36, (src.grid->'fog'->'lights'->>t.id::text)::real))
    from src
   where src.id = t.scene_id and (src.grid->'fog'->'lights') ? t.id::text
  returning 1
)
update public.campaign_scenes s
   set grid = jsonb_set(s.grid, '{fog}', (s.grid->'fog') - 'walls' - 'lights')
  from src
 where s.id = src.id;

-- ---------------------------------------------------------------------
-- O JOGADOR NA MESA
-- ---------------------------------------------------------------------
-- versões antigas (por índice dentro do JSON da cena)
drop function if exists public.toggle_door(uuid, int);

-- abre/fecha uma porta. Mestre: qualquer uma. Jogador: cena no ar, porta
-- destrancada e um herói dele a até 2 casas do vão.
drop function if exists public.toggle_door(uuid);
create function public.toggle_door(p_wall uuid)
returns setof public.scene_walls language sql security definer set search_path = public as '
  update public.scene_walls w
     set open = not w.open, updated_at = now()
   where w.id = p_wall
     and w.door
     and (
       public.is_campaign_master(w.campaign_id)
       or (
         not w.locked
         and public.is_campaign_member(w.campaign_id)
         and exists (select 1 from public.campaign_scenes s where s.id = w.scene_id and s.revealed)
         and exists (
           select 1 from public.scene_tokens t
            where t.scene_id = w.scene_id and t.owner_id = auth.uid() and not t.hidden
              and abs(t.x + t.size / 2 - (w.x1 + w.x2) / 2) <= 2
              and abs(t.y + t.size / 2 - (w.y1 + w.y2) / 2) <= 2
         )
       )
     )
  returning w.*;
';
grant execute on function public.toggle_door(uuid) to authenticated;

-- luz que o peão carrega (metros; 0 apaga). Mestre: qualquer peão.
-- Jogador: só o próprio herói, numa cena no ar.
drop function if exists public.set_token_light(uuid, real);
create function public.set_token_light(p_token uuid, p_meters real)
returns setof public.scene_tokens language sql security definer set search_path = public as '
  update public.scene_tokens t
     set light = greatest(0, least(36, coalesce(p_meters, 0))), updated_at = now()
   where t.id = p_token
     and (
       public.is_campaign_master(t.campaign_id)
       or (
         t.owner_id = auth.uid() and not t.hidden
         and public.is_campaign_member(t.campaign_id)
         and exists (select 1 from public.campaign_scenes s where s.id = t.scene_id and s.revealed)
       )
     )
  returning t.*;
';
grant execute on function public.set_token_light(uuid, real) to authenticated;
