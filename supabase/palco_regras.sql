-- =====================================================================
-- Ficha Viva — SÓ AS REGRAS DE PERMISSÃO (RLS) do palco e dos NPCs.
-- Use quando o app disser "O banco recusou: só o mestre…" mesmo sendo o
-- mestre: as tabelas existem, mas as regras não foram criadas (o script
-- grande parou no meio). Só comandos simples — nada que o editor do
-- Supabase possa quebrar. Pode rodar quantas vezes quiser.
-- =====================================================================

-- palco: cenas, o que está no ar, peões e handouts
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

-- NPCs da campanha
alter table public.campaign_npcs enable row level security;
alter table public.campaign_npc_secrets enable row level security;

drop policy if exists "npcs_read" on public.campaign_npcs;
create policy "npcs_read" on public.campaign_npcs for select
  using (public.is_campaign_master(campaign_id) or (revealed and public.is_campaign_member(campaign_id)));
drop policy if exists "npcs_master_write" on public.campaign_npcs;
create policy "npcs_master_write" on public.campaign_npcs for all
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));

-- segredos: SÓ o mestre lê e escreve
drop policy if exists "npc_secrets_master" on public.campaign_npc_secrets;
create policy "npc_secrets_master" on public.campaign_npc_secrets for all
  using (public.is_campaign_master(campaign_id))
  with check (
    public.is_campaign_master(campaign_id)
    and exists (select 1 from public.campaign_npcs n where n.id = npc_id and n.campaign_id = campaign_npc_secrets.campaign_id)
  );

grant select, insert, update, delete on public.campaign_npcs to authenticated;
grant select, insert, update, delete on public.campaign_npc_secrets to authenticated;

-- conferência: devem aparecer 11 regras (8 do palco + 3 dos NPCs)
select tablename, policyname from pg_policies
 where schemaname = 'public'
   and tablename in ('campaign_scenes', 'campaign_stage', 'scene_tokens', 'campaign_handouts', 'campaign_npcs', 'campaign_npc_secrets')
 order by tablename, policyname;
