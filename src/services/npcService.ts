import { getSupabase } from './supabaseClient';
import { sessionUserId } from './campaignService';
import type { CampaignNpc, NpcSecret, NpcStats } from '@/types/npc';

/**
 * NPCs da campanha. O mestre escreve (RLS confere); jogadores leem só os
 * revelados e nunca a tabela de segredos.
 */
function sb() {
  const client = getSupabase();
  if (!client) throw new Error('Nuvem não configurada.');
  return client;
}

/** Banco sem as tabelas de NPC (o SQL da atualização ainda não rodou). */
export const NPC_SETUP_MISSING =
  'O banco ainda não tem as tabelas de NPC. No Supabase: SQL Editor → aba nova → cole supabase/atualizacao_npcs_bestiario.sql → Run.';

const missingTable = (m: string) => /Could not find the table '?public\.campaign_npc|relation "?(public\.)?campaign_npc\w*"? does not exist/i.test(m);

function friendly(e: { message: string; code?: string }): Error {
  if (missingTable(e.message)) return new Error(NPC_SETUP_MISSING);
  if (/row-level security|violates row/i.test(e.message)) {
    return new Error('O banco recusou: só o mestre desta mesa edita NPCs. Se você é o mestre, sua sessão pode ter expirado — saia e entre de novo.');
  }
  if (/check constraint.*portrait|value too long/i.test(e.message)) return new Error('Retrato grande demais — tente outra imagem.');
  if (/check constraint.*name/i.test(e.message)) return new Error('O nome precisa ter de 1 a 80 letras.');
  return new Error(`Não deu para salvar o NPC: ${e.message}`);
}

export function mapNpc(r: Record<string, unknown>): CampaignNpc {
  return {
    id: String(r.id),
    campaignId: String(r.campaign_id),
    name: String(r.name ?? ''),
    role: String(r.role ?? ''),
    summary: String(r.summary ?? ''),
    portrait: (r.portrait as string) ?? null,
    revealed: r.revealed !== false,
    updatedAt: String(r.updated_at ?? ''),
  };
}

export const npcService = {
  async list(campaignId: string): Promise<CampaignNpc[]> {
    const { data, error } = await sb().from('campaign_npcs').select('*').eq('campaign_id', campaignId).order('name');
    if (error) throw friendly(error);
    return (data ?? []).map(mapNpc);
  },

  /** Segredos (só o mestre recebe linhas; para jogadores vem vazio pelo RLS). */
  async secrets(campaignId: string): Promise<Record<string, NpcSecret>> {
    const { data, error } = await sb().from('campaign_npc_secrets').select('*').eq('campaign_id', campaignId);
    if (error) return {};
    return Object.fromEntries(
      (data ?? []).map((r: Record<string, unknown>) => [
        String(r.npc_id),
        { npcId: String(r.npc_id), notes: String(r.notes ?? ''), stats: (r.stats as NpcStats) ?? {} },
      ]),
    );
  },

  async save(campaignId: string, npc: Partial<CampaignNpc> & { name: string }, secret?: { notes: string; stats: NpcStats }): Promise<CampaignNpc> {
    await sessionUserId();
    const row = {
      campaign_id: campaignId,
      name: npc.name.trim(),
      role: npc.role?.trim() || null,
      summary: npc.summary?.trim() || null,
      portrait: npc.portrait ?? null,
      revealed: npc.revealed ?? true,
      updated_at: new Date().toISOString(),
    };
    const q = npc.id
      ? sb().from('campaign_npcs').update(row).eq('id', npc.id).select().single()
      : sb().from('campaign_npcs').insert(row).select().single();
    const { data, error } = await q;
    if (error) throw friendly(error);
    const saved = mapNpc(data);
    if (secret) {
      const { error: e2 } = await sb().from('campaign_npc_secrets').upsert(
        { npc_id: saved.id, campaign_id: campaignId, notes: secret.notes, stats: secret.stats, updated_at: new Date().toISOString() },
        { onConflict: 'npc_id' },
      );
      if (e2) throw friendly(e2);
    }
    return saved;
  },

  async remove(id: string): Promise<void> {
    await sessionUserId();
    const { error } = await sb().from('campaign_npcs').delete().eq('id', id);
    if (error) throw friendly(error);
  },

  /**
   * NPCs revelados de todas as mesas em que esta ficha está vinculada (para
   * as menções do diário). Guarda cópia local para funcionar offline.
   */
  async forSheet(sheetId: string): Promise<CampaignNpc[]> {
    const key = `fv-npcs-${sheetId}`;
    try {
      const { data: links, error } = await sb().from('shared_sheets').select('campaign_id').eq('sheet_id', sheetId);
      if (error) throw error;
      const ids = [...new Set((links ?? []).map((l: { campaign_id: string }) => l.campaign_id))];
      if (!ids.length) {
        localStorage.setItem(key, '[]');
        return [];
      }
      const { data, error: e2 } = await sb().from('campaign_npcs').select('*').in('campaign_id', ids).order('name');
      if (e2) throw e2;
      const list = (data ?? []).map(mapNpc).filter((n) => n.revealed);
      try {
        localStorage.setItem(key, JSON.stringify(list));
      } catch {
        /* retratos podem estourar a cota: segue sem cache */
      }
      return list;
    } catch {
      try {
        return JSON.parse(localStorage.getItem(key) ?? '[]');
      } catch {
        return [];
      }
    }
  },
};
