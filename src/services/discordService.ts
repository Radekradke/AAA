import { getSupabase } from './supabaseClient';
import { isDiscordWebhook } from '@/engine/discord';

/**
 * Webhook do Discord da mesa (supabase/discord.sql). O RLS deixa só o mestre
 * ler e gravar: jogadores nunca recebem o endereço.
 */
function client() {
  const sb = getSupabase();
  if (!sb) throw new Error('Este site não está ligado à nuvem.');
  return sb;
}

export interface TableDiscord {
  webhookUrl: string;
  enabled: boolean;
}

export const discordService = {
  /** null: sem webhook (ou o banco ainda não tem o script discord.sql). */
  async get(campaignId: string): Promise<TableDiscord | null> {
    const { data, error } = await client().from('campaign_discord').select('webhook_url, enabled').eq('campaign_id', campaignId).maybeSingle();
    if (error || !data) return null;
    return { webhookUrl: String(data.webhook_url), enabled: !!data.enabled };
  },

  async save(campaignId: string, webhookUrl: string, enabled = true): Promise<void> {
    const url = webhookUrl.trim();
    if (!isDiscordWebhook(url)) throw new Error('Cole o endereço do webhook do Discord (https://discord.com/api/webhooks/…).');
    const { error } = await client()
      .from('campaign_discord')
      .upsert({ campaign_id: campaignId, webhook_url: url, enabled, updated_at: new Date().toISOString() }, { onConflict: 'campaign_id' });
    if (error) throw new Error(/campaign_discord/.test(error.message) ? 'Falta rodar supabase/discord.sql no Supabase.' : error.message);
  },

  async remove(campaignId: string): Promise<void> {
    const { error } = await client().from('campaign_discord').delete().eq('campaign_id', campaignId);
    if (error) throw new Error(error.message);
  },
};
