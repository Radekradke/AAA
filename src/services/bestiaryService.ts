import { create } from 'zustand';
import { useEffect } from 'react';
import { getSupabase } from './supabaseClient';
import { MONSTER_BY_ID } from '@/data/bestiary';
import { monsterLook } from '@/lib/monsterArt';
import type { MonsterCustom, MonsterLook } from '@/lib/monsterArt';

/**
 * Bestiário da mesa (supabase/bestiario.sql): foto e nome que o mestre deu
 * às criaturas desta campanha (a mesa toda vê) e as notas dele (só ele vê).
 * Sem o script rodado, nada quebra: as criaturas ficam com a arte padrão.
 */
function sb() {
  const client = getSupabase();
  if (!client) throw new Error('Nuvem não configurada.');
  return client;
}

type Row = Record<string, unknown>;

export const bestiaryService = {
  async customs(campaignId: string): Promise<Record<string, MonsterCustom>> {
    const { data, error } = await sb().from('campaign_monsters').select('monster_ref,name,portrait').eq('campaign_id', campaignId);
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((r: Row) => [String(r.monster_ref), { name: (r.name as string) ?? null, portrait: (r.portrait as string) ?? null }]));
  },

  async notes(campaignId: string): Promise<Record<string, string>> {
    const { data, error } = await sb().from('campaign_monster_notes').select('monster_ref,notes').eq('campaign_id', campaignId);
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((r: Row) => [String(r.monster_ref), String(r.notes ?? '')]));
  },

  /** Salva a aparência (vazio em tudo = volta ao padrão) e as notas. */
  async save(campaignId: string, ref: string, custom: MonsterCustom, notes: string): Promise<void> {
    const name = custom.name?.trim().slice(0, 80) || null;
    const portrait = custom.portrait || null;
    if (!name && !portrait) {
      const { error } = await sb().from('campaign_monsters').delete().eq('campaign_id', campaignId).eq('monster_ref', ref);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb()
        .from('campaign_monsters')
        .upsert({ campaign_id: campaignId, monster_ref: ref, name, portrait, updated_at: new Date().toISOString() }, { onConflict: 'campaign_id,monster_ref' });
      if (error) throw new Error(error.message);
    }
    const text = notes.trim().slice(0, 4000);
    const { error: e2 } = text
      ? await sb().from('campaign_monster_notes').upsert({ campaign_id: campaignId, monster_ref: ref, notes: text, updated_at: new Date().toISOString() }, { onConflict: 'campaign_id,monster_ref' })
      : await sb().from('campaign_monster_notes').delete().eq('campaign_id', campaignId).eq('monster_ref', ref);
    if (e2) throw new Error(e2.message);
  },
};

interface BestiaryState {
  campaignId: string | null;
  customs: Record<string, MonsterCustom>;
  notes: Record<string, string>;
  /** false = banco sem o script (ou sem nuvem): a personalização fica indisponível. */
  available: boolean;
  load: (campaignId: string, isMaster: boolean) => Promise<void>;
  /** Aplica na hora (otimista) o que o mestre salvou. */
  apply: (ref: string, custom: MonsterCustom, notes: string) => void;
}

export const useBestiaryStore = create<BestiaryState>()((set, get) => ({
  campaignId: null,
  customs: {},
  notes: {},
  available: false,
  async load(campaignId, isMaster) {
    if (get().campaignId !== campaignId) set({ campaignId, customs: {}, notes: {}, available: false });
    if (!getSupabase()) return;
    try {
      const [customs, notes] = await Promise.all([bestiaryService.customs(campaignId), isMaster ? bestiaryService.notes(campaignId) : Promise.resolve({})]);
      if (get().campaignId === campaignId) set({ customs, notes, available: true });
    } catch {
      if (get().campaignId === campaignId) set({ available: false });
    }
  },
  apply(ref, custom, notes) {
    set((s) => {
      const customs = { ...s.customs };
      if (custom.name?.trim() || custom.portrait) customs[ref] = custom;
      else delete customs[ref];
      return { customs, notes: { ...s.notes, [ref]: notes } };
    });
  },
}));

/**
 * Liga o bestiário da mesa: carrega e acompanha ao vivo (o mestre trocou a
 * foto → a iniciativa e o mapa de todos mudam). Monte onde houver campanha.
 */
export function useCampaignBestiary(campaignId: string | null | undefined, isMaster: boolean): void {
  useEffect(() => {
    if (!campaignId) return;
    const store = useBestiaryStore.getState();
    void store.load(campaignId, isMaster);
    const client = getSupabase();
    if (!client) return;
    const ch = client
      .channel(`bestiary-${campaignId}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_monsters', filter: `campaign_id=eq.${campaignId}` }, () => void useBestiaryStore.getState().load(campaignId, isMaster))
      .subscribe();
    return () => void client.removeChannel(ch);
  }, [campaignId, isMaster]);
}

/** Cara da criatura com a personalização da mesa atual (nome, foto ou emblema). */
export function useMonsterLook(ref: string | null | undefined): MonsterLook | null {
  const custom = useBestiaryStore((s) => (ref ? s.customs[ref] : undefined));
  const m = ref ? MONSTER_BY_ID[ref] : undefined;
  return m ? monsterLook(m, custom) : null;
}
