import { getSupabase } from './supabaseClient';
import { sessionUserId } from './campaignService';
import { PALCO_SETUP_MISSING } from './mediaService';
import { DEFAULT_GRID } from '@/types/stage';
import type { CutsceneBeat, GridConfig, Handout, Scene, SceneKind, StageState, Token } from '@/types/stage';

/**
 * Palco da mesa: cenas, o que está no ar, peões e handouts. O mestre
 * escreve; jogadores leem o que o RLS libera e movem só o próprio peão
 * (RPC move_token).
 */
function sb() {
  const client = getSupabase();
  if (!client) throw new Error('Nuvem não configurada.');
  return client;
}

const TABLES = 'campaign_scenes|campaign_stage|scene_tokens|campaign_handouts|move_token';
/** Só "a tabela/função não existe" — não qualquer erro que cite o nome dela. */
const missing = (m: string) =>
  new RegExp(`Could not find the (table|function) '?public\\.(${TABLES})|relation "?(public\\.)?(${TABLES})"? does not exist|function public\\.(${TABLES})\\b.* does not exist`, 'i').test(m);

/** O banco não tem o palco; `detail` guarda a mensagem original para diagnóstico. */
export class PalcoSetupError extends Error {
  constructor(public detail: string) {
    super(PALCO_SETUP_MISSING);
  }
}

export function stageError(e: { message: string; code?: string }): Error {
  if (missing(e.message)) return new PalcoSetupError(e.message);
  if (/row-level security|violates row/i.test(e.message)) return new Error('O banco recusou: só o mestre desta mesa mexe no palco. Se você é o mestre, saia e entre de novo (sessão expirada).');
  if (/mestre ou o dono/i.test(e.message)) return new Error('Esse peão não é seu — só o mestre ou o dono move.');
  if (/JWT|not authenticated|permission denied/i.test(e.message)) return new Error(`O banco recusou o acesso (${e.message}). Saia e entre de novo; se continuar, rode supabase/palco.sql outra vez.`);
  return new Error(`Palco: ${e.message}${e.code ? ` (${e.code})` : ''}`);
}

const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function mapScene(r: Record<string, unknown>): Scene {
  const g = (r.grid ?? {}) as Partial<GridConfig>;
  return {
    id: String(r.id),
    campaignId: String(r.campaign_id),
    kind: (r.kind as SceneKind) ?? 'image',
    name: String(r.name ?? ''),
    imagePath: (r.image_path as string) ?? null,
    grid: {
      size: Math.max(8, num(g.size, DEFAULT_GRID.size)),
      ox: num(g.ox),
      oy: num(g.oy),
      show: g.show !== false,
      ...(g.cols ? { cols: num(g.cols) } : {}),
      ...(g.rows ? { rows: num(g.rows) } : {}),
      ...(g.fog && typeof g.fog === 'object'
        ? {
            fog: {
              on: !!g.fog.on,
              reveal: (Array.isArray(g.fog.reveal) ? g.fog.reveal : [])
                .map((r) => ({ x: num(r?.x), y: num(r?.y), w: Math.max(1, num(r?.w, 1)), h: Math.max(1, num(r?.h, 1)) }))
                .slice(0, 400),
            },
          }
        : {}),
    },
    beats: Array.isArray(r.beats) ? (r.beats as CutsceneBeat[]).map((b) => ({ path: b?.path ?? null, text: String(b?.text ?? '') })) : [],
    revealed: !!r.revealed,
    sort: num(r.sort),
    updatedAt: String(r.updated_at ?? ''),
  };
}

export function mapToken(r: Record<string, unknown>): Token {
  return {
    id: String(r.id),
    sceneId: String(r.scene_id),
    campaignId: String(r.campaign_id),
    kind: (r.kind as Token['kind']) ?? 'marker',
    label: String(r.label ?? ''),
    sheetId: (r.sheet_id as string) ?? null,
    ownerId: (r.owner_id as string) ?? null,
    npcId: (r.npc_id as string) ?? null,
    combatantId: (r.combatant_id as string) ?? null,
    monsterRef: (r.monster_ref as string) ?? null,
    color: (r.color as string) ?? null,
    imagePath: (r.image_path as string) ?? null,
    x: num(r.x),
    y: num(r.y),
    size: num(r.size, 1),
    hidden: !!r.hidden,
  };
}

export function mapHandout(r: Record<string, unknown>): Handout {
  return {
    id: String(r.id),
    campaignId: String(r.campaign_id),
    title: String(r.title ?? ''),
    body: String(r.body ?? ''),
    imagePath: (r.image_path as string) ?? null,
    recipients: Array.isArray(r.recipients) ? (r.recipients as string[]) : null,
    shownAt: (r.shown_at as string) ?? null,
    createdAt: String(r.created_at ?? ''),
  };
}

function sceneRow(campaignId: string, s: Partial<Scene>) {
  return {
    campaign_id: campaignId,
    ...(s.kind ? { kind: s.kind } : {}),
    ...(s.name !== undefined ? { name: s.name.trim().slice(0, 80) } : {}),
    ...(s.imagePath !== undefined ? { image_path: s.imagePath } : {}),
    ...(s.grid ? { grid: s.grid } : {}),
    ...(s.beats ? { beats: s.beats } : {}),
    ...(s.sort !== undefined ? { sort: s.sort } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type NewToken = Omit<Token, 'id' | 'campaignId'>;
export type TokenPatch = Partial<Pick<Token, 'label' | 'size' | 'hidden' | 'color' | 'x' | 'y' | 'imagePath'>>;

export const stageService = {
  async scenes(campaignId: string): Promise<Scene[]> {
    const { data, error } = await sb().from('campaign_scenes').select('*').eq('campaign_id', campaignId).order('sort').order('created_at');
    if (error) throw stageError(error);
    return (data ?? []).map(mapScene);
  },

  async saveScene(campaignId: string, scene: Partial<Scene> & { id?: string }): Promise<Scene> {
    await sessionUserId();
    const row = sceneRow(campaignId, scene);
    const q = scene.id
      ? sb().from('campaign_scenes').update(row).eq('id', scene.id).select().single()
      : sb().from('campaign_scenes').insert(row).select().single();
    const { data, error } = await q;
    if (error) throw stageError(error);
    return mapScene(data);
  },

  async removeScene(scene: Scene): Promise<void> {
    await sessionUserId();
    const { error } = await sb().from('campaign_scenes').delete().eq('id', scene.id);
    if (error) throw stageError(error);
  },

  async stage(campaignId: string): Promise<StageState | null> {
    const { data, error } = await sb().from('campaign_stage').select('*').eq('campaign_id', campaignId).maybeSingle();
    if (error) throw stageError(error);
    if (!data) return null;
    return { campaignId, sceneId: (data.scene_id as string) ?? null, beat: num(data.beat), updatedAt: String(data.updated_at ?? '') };
  },

  /** Põe uma cena no ar (revela para sempre) ou tira tudo do ar (null). */
  async goLive(campaignId: string, sceneId: string | null, beat = 0): Promise<void> {
    await sessionUserId();
    if (sceneId) {
      const { error } = await sb().from('campaign_scenes').update({ revealed: true }).eq('id', sceneId);
      if (error) throw stageError(error);
    }
    const { error } = await sb()
      .from('campaign_stage')
      .upsert({ campaign_id: campaignId, scene_id: sceneId, beat, updated_at: new Date().toISOString() }, { onConflict: 'campaign_id' });
    if (error) throw stageError(error);
  },

  async setBeat(campaignId: string, beat: number): Promise<void> {
    const { error } = await sb().from('campaign_stage').update({ beat, updated_at: new Date().toISOString() }).eq('campaign_id', campaignId);
    if (error) throw stageError(error);
  },

  async tokens(sceneId: string): Promise<Token[]> {
    const { data, error } = await sb().from('scene_tokens').select('*').eq('scene_id', sceneId);
    if (error) throw stageError(error);
    return (data ?? []).map(mapToken);
  },

  async addTokens(campaignId: string, list: NewToken[]): Promise<void> {
    if (!list.length) return;
    await sessionUserId();
    const rows = list.map((t) => ({
      scene_id: t.sceneId, campaign_id: campaignId, kind: t.kind, label: t.label.slice(0, 60), sheet_id: t.sheetId, owner_id: t.ownerId,
      npc_id: t.npcId, combatant_id: t.combatantId, monster_ref: t.monsterRef, color: t.color, image_path: t.imagePath, x: t.x, y: t.y, size: t.size, hidden: t.hidden,
    }));
    const { error } = await sb().from('scene_tokens').insert(rows);
    if (error) throw stageError(error);
  },

  async updateToken(id: string, patch: TokenPatch): Promise<void> {
    const { imagePath, ...rest } = patch;
    const row = { ...rest, ...(imagePath !== undefined ? { image_path: imagePath } : {}), updated_at: new Date().toISOString() };
    const { error } = await sb().from('scene_tokens').update(row).eq('id', id);
    if (error) throw stageError(error);
  },

  async removeToken(id: string): Promise<void> {
    const { error } = await sb().from('scene_tokens').delete().eq('id', id);
    if (error) throw stageError(error);
  },

  async moveToken(id: string, x: number, y: number): Promise<void> {
    const { error } = await sb().rpc('move_token', { p_token: id, p_x: x, p_y: y });
    if (error) throw stageError(error);
  },

  async handouts(campaignId: string): Promise<Handout[]> {
    const { data, error } = await sb().from('campaign_handouts').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false });
    if (error) throw stageError(error);
    return (data ?? []).map(mapHandout);
  },

  async saveHandout(campaignId: string, h: Partial<Handout> & { title: string }): Promise<Handout> {
    await sessionUserId();
    const row = {
      campaign_id: campaignId,
      title: h.title.trim().slice(0, 80),
      body: h.body?.trim() || null,
      image_path: h.imagePath ?? null,
      ...(h.recipients !== undefined ? { recipients: h.recipients } : {}),
    };
    const q = h.id
      ? sb().from('campaign_handouts').update(row).eq('id', h.id).select().single()
      : sb().from('campaign_handouts').insert(row).select().single();
    const { data, error } = await q;
    if (error) throw stageError(error);
    return mapHandout(data);
  },

  /** Entrega agora (null em recipients = todos). */
  async showHandout(id: string, recipients: string[] | null): Promise<void> {
    await sessionUserId();
    const { error } = await sb().from('campaign_handouts').update({ recipients, shown_at: new Date().toISOString() }).eq('id', id);
    if (error) throw stageError(error);
  },

  async hideHandout(id: string): Promise<void> {
    const { error } = await sb().from('campaign_handouts').update({ shown_at: null }).eq('id', id);
    if (error) throw stageError(error);
  },

  async removeHandout(id: string): Promise<void> {
    const { error } = await sb().from('campaign_handouts').delete().eq('id', id);
    if (error) throw stageError(error);
  },

  /**
   * Pistas recebidas nas mesas desta ficha (para o diário). Guarda cópia
   * local para abrir offline.
   */
  async handoutsForSheet(sheetId: string): Promise<Handout[]> {
    const key = `fv-handouts-${sheetId}`;
    try {
      const { data: shares, error } = await sb().from('shared_sheets').select('campaign_id').eq('sheet_id', sheetId);
      if (error) throw error;
      const ids = [...new Set((shares ?? []).map((r: Record<string, unknown>) => String(r.campaign_id)))];
      if (!ids.length) return [];
      const { data, error: e2 } = await sb().from('campaign_handouts').select('*').in('campaign_id', ids).not('shown_at', 'is', null).order('shown_at', { ascending: false });
      if (e2) throw e2;
      const list = (data ?? []).map(mapHandout);
      try {
        localStorage.setItem(key, JSON.stringify(list));
      } catch {
        /* cheio: segue sem cópia */
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
