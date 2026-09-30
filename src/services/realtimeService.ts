import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from './supabaseClient';
import type { ConnectionState, PresencePlayer } from '@/types/session';

/**
 * Canal da sessão ao vivo: `campaign:{campaignId}:session:{sessionId}`.
 *
 * · Presence — quem está na mesa agora.
 * · postgres_changes — sessões, encontro, combatentes e eventos (o Supabase
 *   só entrega linhas que o RLS deixa este usuário ver).
 * · Broadcast — avisos efêmeros (ex.: "rolando…"); nunca é fonte de verdade.
 *
 * O canal é PRIVADO (Realtime Authorization: policy em realtime.messages
 * só deixa entrar quem é da campanha). Se o projeto ainda não tiver
 * canais privados habilitados, cai para um canal comum — os dados continuam
 * protegidos pelo RLS; só a lista de presença fica menos blindada.
 */
export type LiveTable = 'sessions' | 'encounters' | 'combatants' | 'session_events';

export interface LiveHandlers {
  onChange: (table: LiveTable) => void;
  onPresence: (players: PresencePlayer[]) => void;
  onStatus: (state: ConnectionState) => void;
  onBroadcast?: (event: string, payload: Record<string, unknown>) => void;
}

export interface LiveChannel {
  leave: () => void;
  /** Atualiza o que eu mostro na presença (ex.: troquei de personagem). */
  track: (me: Omit<PresencePlayer, 'onlineAt'>) => void;
  broadcast: (event: string, payload: Record<string, unknown>) => void;
  isPrivate: () => boolean;
}

export const sessionTopic = (campaignId: string, sessionId: string) => `campaign:${campaignId}:session:${sessionId}`;

/** Lista de presença sem duplicar a mesma pessoa em duas abas. */
export function presenceList(state: Record<string, unknown[]>): PresencePlayer[] {
  const byUser = new Map<string, PresencePlayer>();
  for (const metas of Object.values(state)) {
    for (const m of metas as PresencePlayer[]) {
      if (!m?.userId) continue;
      const prev = byUser.get(m.userId);
      if (!prev || (m.characterId && !prev.characterId) || m.onlineAt > prev.onlineAt) byUser.set(m.userId, m);
    }
  }
  return [...byUser.values()].sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'master' ? -1 : 1));
}

export function joinLiveChannel(campaignId: string, sessionId: string, me: Omit<PresencePlayer, 'onlineAt'>, h: LiveHandlers): LiveChannel {
  const client = getSupabase();
  if (!client) {
    h.onStatus('offline');
    return { leave: () => undefined, track: () => undefined, broadcast: () => undefined, isPrivate: () => false };
  }
  let channel: RealtimeChannel | null = null;
  let privateMode = true;
  let everSubscribed = false;
  let closed = false;
  let current = me;
  const onlineAt = new Date().toISOString();

  const build = () => {
    const ch = client.channel(sessionTopic(campaignId, sessionId), {
      config: { private: privateMode, presence: { key: me.userId }, broadcast: { self: false } },
    });
    const filter = `session_id=eq.${sessionId}`;
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, () => h.onChange('sessions'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encounters', filter }, () => h.onChange('encounters'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combatants', filter }, () => h.onChange('combatants'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_events', filter }, () => h.onChange('session_events'))
      .on('presence', { event: 'sync' }, () => h.onPresence(presenceList(ch.presenceState() as Record<string, unknown[]>)))
      .on('broadcast', { event: '*' }, (msg) => h.onBroadcast?.(String(msg.event), (msg.payload ?? {}) as Record<string, unknown>));
    h.onStatus(everSubscribed ? 'reconnecting' : 'connecting');
    ch.subscribe((status) => {
      if (closed) return;
      if (status === 'SUBSCRIBED') {
        const first = !everSubscribed;
        everSubscribed = true;
        h.onStatus('connected');
        void ch.track({ ...current, onlineAt });
        // reconexão: o que mudou enquanto a rede caiu chega por um refetch completo
        if (!first) h.onChange('encounters');
        return;
      }
      if (status === 'CHANNEL_ERROR' && privateMode && !everSubscribed) {
        // projeto sem canais privados/policy → canal comum (dados seguem no RLS)
        privateMode = false;
        void client.removeChannel(ch);
        channel = build();
        return;
      }
      h.onStatus(status === 'CLOSED' ? 'offline' : 'reconnecting');
    });
    return ch;
  };

  channel = build();

  const goOffline = () => h.onStatus('offline');
  const goOnline = () => h.onStatus(everSubscribed ? 'reconnecting' : 'connecting');
  window.addEventListener('offline', goOffline);
  window.addEventListener('online', goOnline);

  return {
    leave() {
      closed = true;
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      if (channel) {
        void channel.untrack();
        void client.removeChannel(channel);
      }
      channel = null;
    },
    track(next) {
      current = next;
      if (channel && everSubscribed) void channel.track({ ...next, onlineAt });
    },
    broadcast(event, payload) {
      if (channel && everSubscribed) void channel.send({ type: 'broadcast', event, payload });
    },
    isPrivate: () => privateMode,
  };
}
