import { getSupabase } from './supabaseClient';
import type { GameSession, SessionEvent, SessionStatus } from '@/types/session';

/**
 * Sessão ao vivo (uma noite de jogo). ONLINE-FIRST: nada aqui passa pela
 * ficha offline nem pelo snapshot. Toda escrita é RPC — o banco confere se
 * quem chama é o mestre (supabase/multiplayer_session.sql).
 */
export function sb() {
  const client = getSupabase();
  if (!client) throw new Error('Nuvem não configurada.');
  return client;
}

/** Erros do banco em português (a RPC já manda a frase pronta). */
export function rpcError(error: { message: string; code?: string } | null): Error | null {
  if (!error) return null;
  if (/function .* does not exist|Could not find the function/i.test(error.message)) {
    return new Error('O banco ainda não tem a sessão ao vivo — rode supabase/multiplayer_session.sql (docs/SUPABASE.md seção 6).');
  }
  return new Error(error.message);
}

export function mapSession(r: Record<string, unknown>): GameSession {
  return {
    id: String(r.id),
    campaignId: String(r.campaign_id),
    name: String(r.name ?? ''),
    status: r.status as SessionStatus,
    startedAt: (r.started_at as string) ?? null,
    endedAt: (r.ended_at as string) ?? null,
    createdBy: String(r.created_by ?? ''),
    createdAt: String(r.created_at ?? ''),
    updatedAt: String(r.updated_at ?? ''),
  };
}

export function mapEvent(r: Record<string, unknown>): SessionEvent {
  return {
    id: String(r.id),
    sessionId: String(r.session_id),
    type: String(r.type),
    actorId: (r.actor_id as string) ?? null,
    targetId: (r.target_id as string) ?? null,
    payload: (r.payload as Record<string, unknown>) ?? {},
    visibility: r.visibility as SessionEvent['visibility'],
    createdAt: String(r.created_at),
  };
}

export const sessionService = {
  /** Mestre abre a sessão (se já houver uma ao vivo, devolve a mesma). */
  async start(campaignId: string, name?: string): Promise<GameSession> {
    const { data, error } = await sb().rpc('start_session', { p_campaign: campaignId, p_name: name ?? null });
    const err = rpcError(error);
    if (err) throw err;
    return mapSession(data as Record<string, unknown>);
  },

  async setStatus(sessionId: string, status: Exclude<SessionStatus, 'planned'>): Promise<GameSession> {
    const { data, error } = await sb().rpc('set_session_status', { p_session: sessionId, p_status: status });
    const err = rpcError(error);
    if (err) throw err;
    return mapSession(data as Record<string, unknown>);
  },

  /** A sessão ao vivo (ativa ou pausada) da campanha, se houver. */
  async live(campaignId: string): Promise<GameSession | null> {
    const { data, error } = await sb()
      .from('sessions').select('*').eq('campaign_id', campaignId).in('status', ['active', 'paused'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) {
      // tabela ausente = SQL da sessão não rodado: trata como "sem sessão"
      if (/relation .* does not exist|Could not find the table/i.test(error.message)) return null;
      throw new Error(error.message);
    }
    return data ? mapSession(data) : null;
  },

  async get(sessionId: string): Promise<GameSession | null> {
    const { data, error } = await sb().from('sessions').select('*').eq('id', sessionId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapSession(data) : null;
  },

  async history(campaignId: string, limit = 10): Promise<GameSession[]> {
    const { data, error } = await sb().from('sessions').select('*').eq('campaign_id', campaignId)
      .order('created_at', { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSession);
  },

  /** Últimos eventos que EU posso ver (RLS filtra público/mestre/privado). */
  async events(sessionId: string, limit = 40): Promise<SessionEvent[]> {
    const { data, error } = await sb().from('session_events').select('*').eq('session_id', sessionId)
      .order('created_at', { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapEvent).reverse();
  },

  /** Registra um evento do próprio usuário (ex.: rolagem). O banco confere autor e sessão. */
  async log(sessionId: string, campaignId: string, actorId: string, type: string, payload: Record<string, unknown>, visibility: SessionEvent['visibility'] = 'public'): Promise<void> {
    const { error } = await sb().from('session_events').insert({
      session_id: sessionId, campaign_id: campaignId, actor_id: actorId, type, payload, visibility,
    });
    if (error) throw new Error(error.message);
  },
};
