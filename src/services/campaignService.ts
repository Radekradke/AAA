import { getSupabase } from './supabaseClient';
import type { Campaign, CampaignMember, InviteLink, MasterPermission, SharedCharacterSheet, SheetRow } from '@/types/models';
import { DEFAULT_MASTER_PERMISSION } from '@/types/models';
import type { Character } from '@/types/character';

/**
 * Modo Mestre / Sala (nuvem): campanhas, convites por link e fichas
 * compartilhadas. O jogador controla a própria ficha; o mestre enxerga o
 * snapshot conforme as permissões concedidas (RLS garante no banco —
 * ver docs/SUPABASE.md seção 4). Realtime entra depois nesta mesma malha.
 */
function sb() {
  const client = getSupabase();
  if (!client) throw new Error('Nuvem não configurada.');
  return client;
}

function token(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(36).padStart(2, '0').slice(0, 1)).join('') +
    Date.now().toString(36).slice(-4);
}

export const campaignService = {
  async createCampaign(masterId: string, name: string): Promise<Campaign> {
    const now = Date.now();
    const row = { master_id: masterId, name: name.trim(), created_at: now, updated_at: now };
    const { data, error } = await sb().from('campaigns').insert(row).select().single();
    if (error) throw new Error(error.message);
    return mapCampaign(data);
  },

  /** Campanhas onde sou mestre + onde sou jogador. */
  async myCampaigns(userId: string): Promise<{ asMaster: Campaign[]; asPlayer: Campaign[] }> {
    const client = sb();
    const { data: mine, error: e1 } = await client.from('campaigns').select('*').eq('master_id', userId);
    if (e1) throw new Error(e1.message);
    const { data: memberships, error: e2 } = await client
      .from('campaign_members').select('campaign_id').eq('user_id', userId).eq('role', 'player');
    if (e2) throw new Error(e2.message);
    const ids = (memberships ?? []).map((m: { campaign_id: string }) => m.campaign_id);
    let asPlayer: Campaign[] = [];
    if (ids.length) {
      const { data, error } = await client.from('campaigns').select('*').in('id', ids);
      if (error) throw new Error(error.message);
      asPlayer = (data ?? []).map(mapCampaign);
    }
    return { asMaster: (mine ?? []).map(mapCampaign), asPlayer };
  },

  async getCampaign(id: string): Promise<Campaign | null> {
    const { data } = await sb().from('campaigns').select('*').eq('id', id).maybeSingle();
    return data ? mapCampaign(data) : null;
  },

  /** Convite reutilizável da campanha (cria um se ainda não existir). */
  async ensureInvite(campaign: Campaign, userId: string): Promise<InviteLink> {
    const client = sb();
    const { data: existing } = await client.from('invite_links').select('*').eq('campaign_id', campaign.id).limit(1);
    if (existing?.length) return mapInvite(existing[0]);
    const row = { campaign_id: campaign.id, token: token(), created_by: userId, expires_at: null, max_uses: null, uses: 0 };
    const { data, error } = await client.from('invite_links').insert(row).select().single();
    if (error) throw new Error(error.message);
    return mapInvite(data);
  },

  /** Entra numa campanha pelo token do convite (RPC segura no banco). */
  async joinByToken(inviteToken: string): Promise<string> {
    const { data, error } = await sb().rpc('join_campaign', { invite_token: inviteToken });
    if (error) throw new Error(error.message);
    return data as string; // campaign_id
  },

  async members(campaignId: string): Promise<CampaignMember[]> {
    const { data, error } = await sb().from('campaign_members').select('*').eq('campaign_id', campaignId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((m: Record<string, unknown>) => ({
      id: String(m.id), campaignId: String(m.campaign_id), userId: String(m.user_id),
      role: m.role as CampaignMember['role'], joinedAt: Number(m.joined_at),
    }));
  },

  /** Jogador vincula a própria ficha à sala (a ficha precisa existir na nuvem). */
  async shareSheet(campaignId: string, sheetId: string, ownerId: string, permissions: MasterPermission = DEFAULT_MASTER_PERMISSION): Promise<void> {
    const row = { campaign_id: campaignId, sheet_id: sheetId, owner_id: ownerId, permissions, shared_at: Date.now() };
    const { error } = await sb().from('shared_sheets').upsert(row, { onConflict: 'campaign_id,sheet_id' });
    if (error) throw new Error(error.message);
  },

  async unshareSheet(campaignId: string, sheetId: string): Promise<void> {
    const { error } = await sb().from('shared_sheets').delete().eq('campaign_id', campaignId).eq('sheet_id', sheetId);
    if (error) throw new Error(error.message);
  },

  /** Fichas compartilhadas da sala + snapshots (mestre vê conforme RLS). */
  async sharedSheets(campaignId: string): Promise<{ share: SharedCharacterSheet; snapshot: Character | null }[]> {
    const client = sb();
    const { data: shares, error } = await client.from('shared_sheets').select('*').eq('campaign_id', campaignId);
    if (error) throw new Error(error.message);
    const list = (shares ?? []).map((s: Record<string, unknown>): SharedCharacterSheet => ({
      id: String(s.id), campaignId: String(s.campaign_id), sheetId: String(s.sheet_id),
      ownerId: String(s.owner_id), permissions: s.permissions as MasterPermission, sharedAt: Number(s.shared_at),
    }));
    if (!list.length) return [];
    const { data: rows } = await client.from('sheets').select('*').in('id', list.map((s) => s.sheetId));
    const byId = new Map(((rows ?? []) as SheetRow[]).map((r) => [r.id, r.snapshot]));
    return list.map((share) => ({ share, snapshot: byId.get(share.sheetId) ?? null }));
  },
};

function mapCampaign(r: Record<string, unknown>): Campaign {
  return { id: String(r.id), masterId: String(r.master_id), name: String(r.name), description: r.description ? String(r.description) : undefined, createdAt: Number(r.created_at), updatedAt: Number(r.updated_at) };
}
function mapInvite(r: Record<string, unknown>): InviteLink {
  return { id: String(r.id), campaignId: String(r.campaign_id), token: String(r.token), createdBy: String(r.created_by), expiresAt: r.expires_at ? Number(r.expires_at) : null, maxUses: r.max_uses ? Number(r.max_uses) : null, uses: Number(r.uses ?? 0) };
}
