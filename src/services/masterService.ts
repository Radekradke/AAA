import { getSupabase } from './supabaseClient';
import { mapSession, rpcError } from './sessionService';
import { sessionUserId } from './campaignService';
import type { GameSession } from '@/types/session';

/**
 * Console do mestre: preparação de sessão (status 'planned' + bandeja),
 * notas privadas e marca de improviso. Tudo protegido no banco
 * (supabase/mestre_console.sql): jogador não recebe a sessão preparada, a
 * bandeja nem as notas privadas — não é só esconder na tela.
 */
function sb() {
  const client = getSupabase();
  if (!client) throw new Error('Nuvem não configurada.');
  return client;
}

export const MASTER_SETUP_MISSING =
  'O banco ainda não tem o console do mestre. No Supabase: SQL Editor → aba nova → cole supabase/mestre_console.sql → Run (docs/SUPABASE.md §8).';

/** Tabela/coluna/função nova ausente = SQL do console ainda não rodou. */
function friendly(e: { message: string } | null): Error | null {
  if (!e) return null;
  if (/session_prep|visibility|improvised_in|plan_session|start_planned_session|rename_session|discard_planned_session/i.test(e.message) && /does not exist|Could not find|schema cache/i.test(e.message)) {
    return new Error(MASTER_SETUP_MISSING);
  }
  return rpcError(e);
}

/**
 * Bandeja da sessão: atalhos que o mestre separou. NÃO é roteiro — não há
 * ordem, nada é obrigatório e o mestre pode ignorar tudo.
 */
export interface SessionTray {
  npcs: string[];
  scenes: string[];
  handouts: string[];
  /** Ids do bestiário (SRD). */
  monsters: string[];
}

export const EMPTY_TRAY: SessionTray = { npcs: [], scenes: [], handouts: [], monsters: [] };

export function normalizeTray(raw: unknown): SessionTray {
  const r = (raw ?? {}) as Partial<Record<keyof SessionTray, unknown>>;
  const list = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : []);
  return { npcs: list(r.npcs), scenes: list(r.scenes), handouts: list(r.handouts), monsters: list(r.monsters) };
}

/** Liga/desliga um atalho na bandeja (puro: devolve uma bandeja nova). */
export function toggleTray(tray: SessionTray, kind: keyof SessionTray, id: string): SessionTray {
  const cur = tray[kind];
  return { ...tray, [kind]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
}

export function trayCount(tray: SessionTray): number {
  return tray.npcs.length + tray.scenes.length + tray.handouts.length + tray.monsters.length;
}

/** Nota do caderno do mestre (campaign_notes com visibility = 'master'). */
export interface MasterNote {
  id: string;
  text: string;
  sessionId: string | null;
  createdAt: number;
}

export const masterService = {
  // ---------- sessão preparada ----------
  async plan(campaignId: string, name?: string): Promise<GameSession> {
    const { data, error } = await sb().rpc('plan_session', { p_campaign: campaignId, p_name: name ?? null });
    const err = friendly(error);
    if (err) throw err;
    return mapSession(data as Record<string, unknown>);
  },

  async startPlanned(sessionId: string): Promise<GameSession> {
    const { data, error } = await sb().rpc('start_planned_session', { p_session: sessionId });
    const err = friendly(error);
    if (err) throw err;
    return mapSession(data as Record<string, unknown>);
  },

  async rename(sessionId: string, name: string): Promise<GameSession> {
    const { data, error } = await sb().rpc('rename_session', { p_session: sessionId, p_name: name });
    const err = friendly(error);
    if (err) throw err;
    return mapSession(data as Record<string, unknown>);
  },

  async discardPlanned(sessionId: string): Promise<void> {
    const { error } = await sb().rpc('discard_planned_session', { p_session: sessionId });
    const err = friendly(error);
    if (err) throw err;
  },

  /** Sessões em preparação (o RLS só devolve para o mestre). */
  async planned(campaignId: string): Promise<GameSession[]> {
    const { data, error } = await sb().from('sessions').select('*').eq('campaign_id', campaignId).eq('status', 'planned').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSession);
  },

  // ---------- bandeja ----------
  async tray(sessionId: string): Promise<SessionTray> {
    const { data, error } = await sb().from('session_prep').select('tray').eq('session_id', sessionId).maybeSingle();
    if (error) {
      const err = friendly(error);
      // sem o SQL novo, a bandeja só fica vazia (o resto do console funciona)
      if (err?.message === MASTER_SETUP_MISSING) return { ...EMPTY_TRAY };
      throw err ?? new Error(error.message);
    }
    return normalizeTray(data?.tray);
  },

  async saveTray(sessionId: string, campaignId: string, tray: SessionTray): Promise<void> {
    await sessionUserId();
    const { error } = await sb()
      .from('session_prep')
      .upsert({ session_id: sessionId, campaign_id: campaignId, tray, updated_at: new Date().toISOString() }, { onConflict: 'session_id' });
    const err = friendly(error);
    if (err) throw err;
  },

  // ---------- notas privadas ----------
  async notes(campaignId: string): Promise<MasterNote[]> {
    const { data, error } = await sb()
      .from('campaign_notes')
      .select('id, title, session_id, created_at')
      .eq('campaign_id', campaignId)
      .eq('visibility', 'master')
      .order('created_at', { ascending: false })
      .limit(200);
    const err = friendly(error);
    if (err) throw err;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      text: String(r.title ?? ''),
      sessionId: (r.session_id as string) ?? null,
      createdAt: Number(r.created_at),
    }));
  },

  async addNote(campaignId: string, text: string, sessionId: string | null): Promise<void> {
    const authorId = await sessionUserId();
    const { error } = await sb().from('campaign_notes').insert({
      campaign_id: campaignId,
      author_id: authorId,
      kind: 'nota',
      title: text.trim().slice(0, 2000),
      body: '',
      created_at: Date.now(),
      visibility: 'master',
      session_id: sessionId,
    });
    const err = friendly(error);
    if (err) throw err;
  },

  async updateNote(id: string, text: string): Promise<void> {
    const { error } = await sb().from('campaign_notes').update({ title: text.trim().slice(0, 2000), updated_at: Date.now() }).eq('id', id).eq('visibility', 'master');
    const err = friendly(error);
    if (err) throw err;
  },

  async removeNote(id: string): Promise<void> {
    const { error } = await sb().from('campaign_notes').delete().eq('id', id).eq('visibility', 'master');
    const err = friendly(error);
    if (err) throw err;
  },
};
