-- =====================================================================
-- Ficha Viva — função que move os peões do mapa (move_token).
-- Use se os peões "voltam pro lugar" ao arrastar. Sem blocos $$: o editor
-- do Supabase não quebra. Pode rodar quantas vezes quiser.
-- =====================================================================
-- jogador move SÓ o próprio peão (e só a posição); o mestre move qualquer um.
-- Função SQL de um comando só, com o corpo entre aspas simples: o editor do
-- Supabase não consegue cortá-la no meio. Sem permissão → não volta linha.
drop function if exists public.move_token(uuid, real, real);
create function public.move_token(p_token uuid, p_x real, p_y real)
returns setof public.scene_tokens language sql security definer set search_path = public as '
  update public.scene_tokens
     set x = greatest(-2, least(400, p_x)), y = greatest(-2, least(400, p_y)), updated_at = now()
   where id = p_token
     and (public.is_campaign_master(campaign_id) or (owner_id = auth.uid() and not hidden))
  returning *
';
grant execute on function public.move_token(uuid, real, real) to authenticated;

-- conferência: 1 linha
select proname from pg_proc where proname = 'move_token';
