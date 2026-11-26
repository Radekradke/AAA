import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabaseClient';
import { presenceList } from './realtimeService';
import type { RowChange } from '@/lib/realtimeRows';
import type { ConnectionState, PresencePlayer } from '@/types/session';

/**
 * Canal do PALCO da mesa: `stage-{campaignId}`. Separado do canal da sessão
 * porque o mapa vive mesmo sem sessão aberta (o mestre põe a cena no ar e
 * a mesa já se encontra nela).
 *
 * · postgres_changes — cenas, peões, paredes, segredos (o RLS decide quem
 *   recebe o quê); cada linha chega como RowChange para o store aplicar.
 * · broadcast — arrasto, ping, réguas, laser… efêmeros, nunca a verdade.
 * · presence — quem está com o mapa aberto agora.
 *
 * O canal se cuida sozinho: ao (re)entrar avisa `onResync` (o que mudou
 * enquanto esteve fora só chega relendo tudo), se o servidor fechar o canal
 * ele refaz com espera crescente, e `wake()` (aba voltou, rede voltou)
 * reconstrói na hora um canal que morreu calado.
 */
export type StageTable = 'campaign_scenes' | 'scene_tokens' | 'scene_walls' | 'scene_secrets';
/** Tabelas que mudam a estrutura do palco: o store relê em vez de aplicar a linha. */
const STRUCTURE_TABLES = ['campaign_stage', 'campaign_handouts'] as const;
const ROW_TABLES: StageTable[] = ['campaign_scenes', 'scene_tokens', 'scene_walls', 'scene_secrets'];
/** DELETE não respeita filtro no Realtime (chega só com o id): assina sem filtro. */
const UNFILTERED_DELETES: StageTable[] = ['scene_tokens', 'scene_walls'];
export const STAGE_BROADCASTS = ['drag', 'ping', 'mark', 'laser', 'explored-reset', 'focus'] as const;
export type StageBroadcast = (typeof STAGE_BROADCASTS)[number];

export interface StageChannelHandlers {
  onRow: (table: StageTable, change: RowChange) => void;
  onStructure: () => void;
  onBroadcast: (event: StageBroadcast, payload: Record<string, unknown>) => void;
  onPresence: (online: PresencePlayer[]) => void;
  onStatus: (state: ConnectionState) => void;
  /** Entrou ou voltou a entrar: hora de reler o palco inteiro uma vez. */
  onResync: () => void;
}

export interface StageChannel {
  send: (event: StageBroadcast, payload: Record<string, unknown>) => void;
  /** Atualiza o que eu mostro na presença (troquei de herói, virei mestre). */
  track: (me: Omit<PresencePlayer, 'onlineAt'>) => void;
  /** A aba/rede voltou: reconstrói o canal se ele caiu, senão só ressincroniza. */
  wake: () => void;
  leave: () => void;
}

export const stageTopic = (campaignId: string) => `stage-${campaignId}`;

/** Espera antes de refazer um canal fechado pelo servidor (1 s, 2 s, 5 s, 10 s…). */
export function rejoinDelay(attempt: number): number {
  return [1000, 2000, 5000][attempt] ?? 10_000;
}

const OFFLINE_CHANNEL: StageChannel = { send: () => undefined, track: () => undefined, wake: () => undefined, leave: () => undefined };

export function joinStageChannel(campaignId: string, me: Omit<PresencePlayer, 'onlineAt'>, h: StageChannelHandlers): StageChannel {
  const client = getSupabase();
  if (!client) {
    h.onStatus('offline');
    return OFFLINE_CHANNEL;
  }
  const onlineAt = new Date().toISOString();
  let current = me;
  let channel: RealtimeChannel | null = null;
  let joined = false;
  let everJoined = false;
  let closed = false;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | null = null;
  /** Cada canal criado ganha um número: callbacks de um canal velho são ignorados. */
  let generation = 0;

  const status = (s: ConnectionState) => {
    if (!closed) h.onStatus(s);
  };

  const build = () => {
    const gen = ++generation;
    const ch = createChannel(client, campaignId, me.userId, h, () => gen === generation && !closed);
    channel = ch;
    status(everJoined ? 'reconnecting' : 'connecting');
    ch.subscribe((s) => {
      if (gen !== generation || closed) return;
      if (s === 'SUBSCRIBED') {
        joined = true;
        everJoined = true;
        attempt = 0;
        status('connected');
        void ch.track({ ...current, onlineAt });
        h.onResync();
        return;
      }
      joined = false;
      // erro e tempo esgotado: o próprio realtime-js tenta de novo
      if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') return status('reconnecting');
      // CLOSED sem a gente pedir: o servidor derrubou o canal — refaz com espera
      status(navigator.onLine === false ? 'offline' : 'reconnecting');
      scheduleRebuild(rejoinDelay(attempt++));
    });
  };

  /**
   * Tira o canal atual (e qualquer sobra com o mesmo tópico — o client
   * devolveria a sobra em vez de criar outro) e cria um novo com o MESMO
   * tópico: o broadcast só chega a quem está no mesmo nome.
   */
  const rebuild = async () => {
    if (closed) return;
    channel = null;
    joined = false;
    generation++;
    const stale = client.getChannels().filter((c) => c.topic === `realtime:${stageTopic(campaignId)}`);
    await Promise.all(stale.map((c) => client.removeChannel(c).catch(() => undefined)));
    if (!closed) build();
  };

  const scheduleRebuild = (ms: number) => {
    if (retry) clearTimeout(retry);
    retry = setTimeout(() => {
      retry = null;
      void rebuild();
    }, ms);
  };

  const goOffline = () => status('offline');
  window.addEventListener('offline', goOffline);
  status('connecting');
  void rebuild();

  return {
    send(event, payload) {
      if (channel && joined) void channel.send({ type: 'broadcast', event, payload });
    },
    track(next) {
      current = next;
      if (channel && joined) void channel.track({ ...next, onlineAt });
    },
    wake() {
      if (closed) return;
      if (channel && joined && channel.state === 'joined') return h.onResync();
      attempt = 0;
      scheduleRebuild(0);
    },
    leave() {
      closed = true;
      window.removeEventListener('offline', goOffline);
      if (retry) clearTimeout(retry);
      const ch = channel;
      channel = null;
      if (ch) {
        void ch.untrack().catch(() => undefined);
        void client.removeChannel(ch);
      }
    },
  };
}

function createChannel(client: SupabaseClient, campaignId: string, presenceKey: string, h: StageChannelHandlers, live: () => boolean): RealtimeChannel {
  const filter = `campaign_id=eq.${campaignId}`;
  const ch = client.channel(stageTopic(campaignId), { config: { broadcast: { self: false }, presence: { key: presenceKey } } });
  const guard =
    <A extends unknown[]>(fn: (...a: A) => void) =>
    (...a: A) => {
      if (live()) fn(...a);
    };
  for (const table of STRUCTURE_TABLES) ch.on('postgres_changes', { event: '*', schema: 'public', table, filter }, guard(h.onStructure));
  const row = (table: StageTable) => (c: unknown) => {
    if (live()) h.onRow(table, c as RowChange);
  };
  for (const table of ROW_TABLES) ch.on('postgres_changes', { event: '*', schema: 'public', table, filter }, row(table));
  for (const table of UNFILTERED_DELETES) ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, row(table));
  for (const event of STAGE_BROADCASTS) {
    ch.on('broadcast', { event }, guard(({ payload }) => h.onBroadcast(event, (payload ?? {}) as Record<string, unknown>)));
  }
  ch.on('presence', { event: 'sync' }, guard(() => h.onPresence(presenceList(ch.presenceState() as Record<string, unknown[]>))));
  return ch;
}
