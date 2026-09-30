import { create } from 'zustand';
import { sessionService } from '@/services/sessionService';
import { encounterService, StaleRevisionError } from '@/services/encounterService';
import type { CombatantPatch, NewCombatant } from '@/services/encounterService';
import { joinLiveChannel } from '@/services/realtimeService';
import { getSupabase } from '@/services/supabaseClient';
import type { LiveChannel } from '@/services/realtimeService';
import { useCharacterStore } from './characterStore';
import { rollEnemyInitiatives } from '@/engine/encounter';
import type { Combatant, ConnectionState, Encounter, EncounterStatus, GameSession, PresencePlayer, SessionEvent } from '@/types/session';

/**
 * Estado da MESA AO VIVO — separado da ficha de propósito.
 *
 * A ficha é offline-first (IndexedDB + snapshot com debounce). A sessão é
 * online-first: a verdade está no banco (RPCs + RLS) e aqui é só o espelho.
 * Toda mudança chega pelo Realtime e dispara um refetch curto do estado
 * completo — assim duas abas/aparelhos nunca divergem, e um reload não perde
 * nada (é só buscar de novo).
 */
export interface LiveMe {
  userId: string;
  name: string;
  isMaster: boolean;
  characterId: string | null;
  characterName: string | null;
}

interface SessionState {
  campaignId: string | null;
  me: LiveMe | null;
  session: GameSession | null;
  encounter: Encounter | null;
  combatants: Combatant[];
  events: SessionEvent[];
  online: PresencePlayer[];
  connection: ConnectionState;
  loading: boolean;
  busy: boolean;
  error: string | null;
  /** Muda quando começa um turno MEU (a interface mostra "SEU TURNO"). */
  myTurnKey: string | null;

  join: (campaignId: string, me: LiveMe) => Promise<void>;
  leave: () => void;
  setCharacter: (characterId: string | null, characterName: string | null) => void;
  refresh: () => Promise<void>;
  clearError: () => void;

  // mestre
  startSession: (name?: string) => Promise<void>;
  setSessionStatus: (status: 'active' | 'paused' | 'finished') => Promise<void>;
  createEncounter: (name?: string) => Promise<void>;
  addCombatant: (c: NewCombatant) => Promise<void>;
  addCombatants: (list: NewCombatant[]) => Promise<void>;
  removeCombatant: (id: string) => Promise<void>;
  updateCombatant: (id: string, patch: CombatantPatch) => Promise<void>;
  rollEnemies: (all?: boolean) => Promise<void>;
  setInitiative: (combatantId: string, value: number) => Promise<void>;
  startCombat: () => Promise<void>;
  nextTurn: () => Promise<void>;
  prevTurn: () => Promise<void>;
  setEncounterStatus: (status: Exclude<EncounterStatus, 'preparing'>) => Promise<void>;

  /** Chamado pela ficha ao rolar iniciativa: se o personagem está no encontro, manda o valor. */
  reportInitiative: (characterId: string, total: number) => Promise<boolean>;
}

const RESUME_KEY = 'fv-live-session';
const SEEN_KEY = 'fv-live-turns-seen';

let channel: LiveChannel | null = null;
let channelSession: string | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshSeq = 0;

/** Última mesa aberta — para o reload (ou a ficha) voltar para ela. */
export function resumeInfo(): { campaignId: string; userId: string } | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function seenTurns(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** Meu combatente ativo neste turno (se algum). */
export function myActiveCombatant(s: Pick<SessionState, 'encounter' | 'combatants' | 'me'>): Combatant | null {
  const e = s.encounter;
  if (!e || e.status !== 'active' || !e.activeCombatantId || !s.me) return null;
  const c = s.combatants.find((x) => x.id === e.activeCombatantId);
  return c && c.ownerId === s.me.userId ? c : null;
}

export const useSessionStore = create<SessionState>()((set, get) => {
  /** Roda uma ação no banco; STALE_REVISION → recarrega e avisa. */
  const act = async (fn: () => Promise<unknown>) => {
    set({ busy: true, error: null });
    try {
      await fn();
      await get().refresh();
    } catch (e) {
      if (e instanceof StaleRevisionError) await get().refresh();
      set({ error: (e as Error).message });
    } finally {
      set({ busy: false });
    }
  };

  /** Começou um turno meu? Zera ação/bônus/reação/movimento na ficha — uma vez por turno. */
  const detectMyTurn = () => {
    const s = get();
    const mine = myActiveCombatant(s);
    if (!mine || !s.encounter) return;
    const key = `${s.encounter.id}:${s.encounter.round}:${mine.id}`;
    if (s.myTurnKey === key) return;
    const seen = seenTurns();
    const fresh = !seen.includes(key);
    if (fresh) {
      try {
        sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen.slice(-30), key]));
      } catch {
        /* sem sessionStorage: segue sem deduplicar entre reloads */
      }
      const chars = useCharacterStore.getState();
      if (mine.sheetId && chars.characters.some((c) => c.id === mine.sheetId)) chars.resetTurn(mine.sheetId);
    }
    set({ myTurnKey: key });
  };

  const scheduleRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void get().refresh(), 120);
  };

  return {
    campaignId: null,
    me: null,
    session: null,
    encounter: null,
    combatants: [],
    events: [],
    online: [],
    connection: 'idle',
    loading: false,
    busy: false,
    error: null,
    myTurnKey: null,

    async join(campaignId, me) {
      const cur = get();
      if (cur.campaignId === campaignId && cur.me?.userId === me.userId) {
        if (cur.me.characterId !== me.characterId) get().setCharacter(me.characterId, me.characterName);
        return get().refresh();
      }
      get().leave();
      set({ campaignId, me, loading: true, error: null });
      try {
        localStorage.setItem(RESUME_KEY, JSON.stringify({ campaignId, userId: me.userId }));
      } catch {
        /* ignora */
      }
      await get().refresh();
      set({ loading: false });
    },

    leave() {
      channel?.leave();
      channel = null;
      channelSession = null;
      stopLobbyWatch();
      if (refreshTimer) clearTimeout(refreshTimer);
      try {
        localStorage.removeItem(RESUME_KEY);
      } catch {
        /* ignora */
      }
      set({ campaignId: null, me: null, session: null, encounter: null, combatants: [], events: [], online: [], connection: 'idle', myTurnKey: null, error: null });
    },

    setCharacter(characterId, characterName) {
      const me = get().me;
      if (!me) return;
      const next = { ...me, characterId, characterName };
      set({ me: next });
      channel?.track({ userId: next.userId, name: next.name, role: next.isMaster ? 'master' : 'player', characterId, characterName });
    },

    async refresh() {
      const { campaignId, me } = get();
      if (!campaignId || !me) return;
      const seq = ++refreshSeq;
      try {
        const session = await sessionService.live(campaignId);
        const open = session ? await encounterService.open(session.id) : null;
        const events = session ? await sessionService.events(session.id) : [];
        if (seq !== refreshSeq || get().campaignId !== campaignId) return; // resposta velha
        set({ session, encounter: open?.encounter ?? null, combatants: open?.combatants ?? [], events });

        // canal da sessão: entra/troca quando a sessão aparece ou muda
        const topicSession = session?.id ?? null;
        if (topicSession && channelSession !== topicSession) {
          channel?.leave();
          channelSession = topicSession;
          channel = joinLiveChannel(campaignId, topicSession, { userId: me.userId, name: me.name, role: me.isMaster ? 'master' : 'player', characterId: get().me?.characterId ?? null, characterName: get().me?.characterName ?? null }, {
            onChange: scheduleRefresh,
            onPresence: (online) => set({ online }),
            onStatus: (connection) => set({ connection }),
          });
        } else if (!topicSession && channel) {
          channel.leave();
          channel = null;
          channelSession = null;
          set({ online: [], connection: 'idle' });
        }
        if (!topicSession) startLobbyWatch(campaignId, scheduleRefresh);
        else stopLobbyWatch();
        detectMyTurn();
      } catch (e) {
        if (seq === refreshSeq) set({ error: (e as Error).message });
      }
    },

    clearError: () => set({ error: null }),

    startSession: (name) => act(() => sessionService.start(get().campaignId!, name)),
    setSessionStatus: (status) => act(() => sessionService.setStatus(get().session!.id, status)),
    createEncounter: (name) => act(() => encounterService.create(get().session!.id, name)),
    addCombatant: (c) => act(() => encounterService.add(get().encounter!.id, c)),
    addCombatants: (list) =>
      act(async () => {
        for (const c of list) await encounterService.add(get().encounter!.id, c);
      }),
    removeCombatant: (id) => act(() => encounterService.remove(id)),
    updateCombatant: (id, patch) => act(() => encounterService.update(id, patch)),
    rollEnemies: (all = false) =>
      act(async () => {
        const values = rollEnemyInitiatives(get().combatants, all);
        if (values.length) await encounterService.setInitiatives(get().encounter!.id, values);
      }),
    setInitiative: (combatantId, value) => act(() => encounterService.setInitiative(combatantId, value)),
    startCombat: () => act(() => encounterService.startCombat(get().encounter!)),
    nextTurn: () => act(() => encounterService.advance(get().encounter!, 1)),
    prevTurn: () => act(() => encounterService.advance(get().encounter!, -1)),
    setEncounterStatus: (status) => act(() => encounterService.setStatus(get().encounter!, status)),

    async reportInitiative(characterId, total) {
      const { encounter, combatants, me } = get();
      if (!encounter || encounter.status === 'finished' || !me) return false;
      const mine = combatants.find((c) => c.sheetId === characterId && c.ownerId === me.userId);
      if (!mine) return false;
      await act(() => encounterService.setInitiative(mine.id, total));
      return !get().error;
    },
  };
});

/**
 * Sem sessão aberta ainda: escuta só a tabela `sessions` da campanha para o
 * jogador ver "O mestre abriu a sessão" sem recarregar.
 */
let lobby: { campaignId: string; stop: () => void } | null = null;
function startLobbyWatch(campaignId: string, onChange: () => void) {
  if (lobby?.campaignId === campaignId) return;
  stopLobbyWatch();
  const stop = watchSessions(campaignId, onChange);
  lobby = { campaignId, stop };
}
function stopLobbyWatch() {
  lobby?.stop();
  lobby = null;
}

function watchSessions(campaignId: string, onChange: () => void): () => void {
  const client = getSupabase();
  if (!client) return () => undefined;
  const ch = client
    .channel(`campaign-lobby-${campaignId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `campaign_id=eq.${campaignId}` }, onChange)
    .subscribe();
  return () => void client.removeChannel(ch);
}
