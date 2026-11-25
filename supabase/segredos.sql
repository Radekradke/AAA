-- =====================================================================
-- Ficha Viva — SEGREDOS DO MAPA
-- Baús, armadilhas, portas secretas e pistas que só o mestre vê, com o
-- loot e as condições para aparecer (proximidade, Percepção passiva,
-- teste, item, gatilho). Os jogadores NÃO leem esta tabela: só recebem o
-- peão revelado e a pista com o loot.
--
-- Rode DEPOIS do palco.sql. Pode rodar mais de uma vez. Cole TUDO numa
-- aba nova do SQL Editor e clique em Run sem nada selecionado.
-- =====================================================================

create table if not exists public.scene_secrets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  scene_id uuid not null references public.campaign_scenes (id) on delete cascade,
  -- o marcador escondido no mapa (aparece para a mesa quando o segredo é achado)
  token_id uuid references public.scene_tokens (id) on delete set null,
  kind text not null default 'chest' check (kind in ('chest', 'trap', 'door', 'clue', 'item')),
  title text not null check (length(trim(title)) between 1 and 80),
  -- o que os jogadores leem ao achar
  reveal_text text check (reveal_text is null or length(reveal_text) <= 4000),
  -- anotações só do mestre
  notes text check (notes is null or length(notes) <= 4000),
  -- [{ name, qty, itemId? }]
  loot jsonb not null default '[]'::jsonb,
  -- { pp, gp, ep, sp, cp }
  coins jsonb not null default '{}'::jsonb,
  -- { mode, near, passive, check, item, flag, auto, to }
  rules jsonb not null default '{}'::jsonb,
  found_by text,
  found_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scene_secrets_scene_idx on public.scene_secrets (scene_id);
create index if not exists scene_secrets_campaign_idx on public.scene_secrets (campaign_id);

alter table public.scene_secrets enable row level security;
drop policy if exists "secrets_master" on public.scene_secrets;
create policy "secrets_master" on public.scene_secrets for all
  using (public.is_campaign_master(campaign_id))
  with check (
    public.is_campaign_master(campaign_id)
    and exists (select 1 from public.campaign_scenes s where s.id = scene_id and s.campaign_id = scene_secrets.campaign_id)
  );
grant select, insert, update, delete on public.scene_secrets to authenticated;

-- realtime: o console do mestre acompanha os próprios segredos
do $fn$ begin alter publication supabase_realtime add table public.scene_secrets; exception when duplicate_object then null; end $fn$;

-- ---------------------------------------------------------------------
-- LOOT NAS PISTAS: a pista do achado leva os itens; quem recebeu pega uma
-- vez só (claimed_by), direto para a mochila da ficha.
-- ---------------------------------------------------------------------
alter table public.campaign_handouts add column if not exists loot jsonb;
alter table public.campaign_handouts add column if not exists claimed_by uuid;

drop function if exists public.claim_handout_loot(uuid);
create function public.claim_handout_loot(p_handout uuid)
returns setof public.campaign_handouts language sql security definer set search_path = public as '
  update public.campaign_handouts
     set claimed_by = auth.uid()
   where id = p_handout
     and claimed_by is null
     and loot is not null
     and shown_at is not null
     and public.is_campaign_member(campaign_id)
     and (recipients is null or auth.uid() = any (recipients))
  returning *;
';
grant execute on function public.claim_handout_loot(uuid) to authenticated;
