-- =====================================================================
-- Ficha Viva — PORTAS E LUZ PELO JOGADOR
-- O jogador abre e fecha uma porta ao lado do próprio herói (porta
-- trancada só o mestre abre) e acende a luz que o próprio herói carrega.
-- O resto da cena continua só do mestre.
--
-- Rode DEPOIS do palco.sql. Pode rodar mais de uma vez. Cole TUDO numa
-- aba nova do SQL Editor e clique em Run sem nada selecionado.
-- =====================================================================

-- abre/fecha a porta n (índice em grid.fog.walls). Mestre: qualquer uma.
-- Jogador: cena no ar, porta destrancada e um herói dele a até 2 casas.
drop function if exists public.toggle_door(uuid, int);
create function public.toggle_door(p_scene uuid, p_index int)
returns setof public.campaign_scenes language sql security definer set search_path = public as '
  update public.campaign_scenes s
     set grid = jsonb_set(s.grid, array[''fog'', ''walls'', p_index::text, ''open''],
                          to_jsonb(not coalesce((s.grid->''fog''->''walls''->p_index->>''open'')::boolean, false))),
         updated_at = now()
   where s.id = p_scene
     and coalesce((s.grid->''fog''->''walls''->p_index->>''door'')::boolean, false)
     and (
       public.is_campaign_master(s.campaign_id)
       or (
         s.revealed
         and public.is_campaign_member(s.campaign_id)
         and not coalesce((s.grid->''fog''->''walls''->p_index->>''locked'')::boolean, false)
         and exists (
           select 1 from public.scene_tokens t
            where t.scene_id = s.id and t.owner_id = auth.uid() and not t.hidden
              and abs(t.x + t.size / 2 - ((s.grid->''fog''->''walls''->p_index->>''x1'')::real + (s.grid->''fog''->''walls''->p_index->>''x2'')::real) / 2) <= 2
              and abs(t.y + t.size / 2 - ((s.grid->''fog''->''walls''->p_index->>''y1'')::real + (s.grid->''fog''->''walls''->p_index->>''y2'')::real) / 2) <= 2
         )
       )
     )
  returning s.*;
';
grant execute on function public.toggle_door(uuid, int) to authenticated;

-- luz que o peão carrega (metros; 0 apaga). Mestre: qualquer peão.
-- Jogador: só o próprio herói, numa cena no ar.
drop function if exists public.set_token_light(uuid, real);
create function public.set_token_light(p_token uuid, p_meters real)
returns setof public.campaign_scenes language sql security definer set search_path = public as '
  update public.campaign_scenes s
     set grid = jsonb_set(s.grid, ''{fog,lights}'',
                  case when coalesce(p_meters, 0) > 0
                       then coalesce(s.grid->''fog''->''lights'', ''{}''::jsonb) || jsonb_build_object(p_token::text, least(p_meters, 36))
                       else coalesce(s.grid->''fog''->''lights'', ''{}''::jsonb) - p_token::text end),
         updated_at = now()
    from public.scene_tokens t
   where t.id = p_token
     and s.id = t.scene_id
     and s.grid ? ''fog''
     and (
       public.is_campaign_master(s.campaign_id)
       or (s.revealed and t.owner_id = auth.uid() and not t.hidden and public.is_campaign_member(s.campaign_id))
     )
  returning s.*;
';
grant execute on function public.set_token_light(uuid, real) to authenticated;
