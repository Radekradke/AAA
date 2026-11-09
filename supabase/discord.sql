-- =====================================================================
-- Ficha Viva — DISCORD DA MESA
-- O mestre cola o webhook de um canal do Discord e as rolagens PÚBLICAS
-- da mesa ao vivo aparecem lá. O endereço do webhook é segredo: só o
-- mestre da campanha lê e grava (nem os jogadores, nem o link da ficha).
-- O envio sai do navegador do mestre enquanto a mesa está aberta.
--
-- Requer: o SQL base (docs/SUPABASE.md §5).
-- Idempotente: pode rodar mais de uma vez. Cole TUDO numa aba nova do SQL
-- Editor e clique em Run sem nada selecionado. Não apaga dados.
-- =====================================================================

create table if not exists public.campaign_discord (
  campaign_id uuid primary key references public.campaigns (id) on delete cascade,
  webhook_url text not null check (
    webhook_url ~ '^https://(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$'
    and char_length(webhook_url) <= 300
  ),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.campaign_discord enable row level security;

drop policy if exists "campaign_discord_master_read" on public.campaign_discord;
create policy "campaign_discord_master_read" on public.campaign_discord for select to authenticated
  using (public.is_campaign_master(campaign_id));
drop policy if exists "campaign_discord_master_insert" on public.campaign_discord;
create policy "campaign_discord_master_insert" on public.campaign_discord for insert to authenticated
  with check (public.is_campaign_master(campaign_id));
drop policy if exists "campaign_discord_master_update" on public.campaign_discord;
create policy "campaign_discord_master_update" on public.campaign_discord for update to authenticated
  using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));
drop policy if exists "campaign_discord_master_delete" on public.campaign_discord;
create policy "campaign_discord_master_delete" on public.campaign_discord for delete to authenticated
  using (public.is_campaign_master(campaign_id));
revoke all on public.campaign_discord from anon;
grant select, insert, update, delete on public.campaign_discord to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- versão do banco: registra que este script rodou (o app avisa o mestre
-- do que falta). Idempotente.
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (step text primary key, applied_at timestamptz not null default now());
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('discord')
on conflict (step) do update set applied_at = now();
