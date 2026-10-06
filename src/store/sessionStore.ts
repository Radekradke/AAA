import { create } from 'zustand';
import { sessionService } from '@/services/sessionService';
import { encounterService, StaleRevisionError } from '@/services/encounterService';
import type { CombatantPatch, NewCombatant } from '@/services/encounterService';
import { joinLiveChannel } from '@/services/realtimeService';
import { getSupabase } from '@/services/supabaseClient';
import type { LiveChannel } from '@/services/realtimeService';
import { useCharacterStore } from './characterStore';
import { rollEnemyInitiatives } from '@/engine/encounter';
import type { Combatant, ConnectionState, Encounter, EncounterStatus, EventVisibility, GameSession, PresencePlayer, SessionEvent, StrikeLog } from '@/types/session';
import { useUiStore } from './uiStore';
import { getItem } from '@/data/items';
import { itemToInventory } from '@/engine/inventory';
import type { InventoryItem } from '@/types/character';
import { tableHero } from '@/lib/tableHeroes';
import { heroDice } from '@/data/diceTrophies';
import { deathSaveOutcome, isDeathOutcome } from '@/engine/deathSave';

/**
 * Estado da MESA AO VIVO — separado da ficha de propósito.
 *
 * A ficha é offline-first (IndexedDB + snapshot com debounce). A sessão é
 * online-first: a verdade está no banco (RPCs + RLS) e aqui é só o espelho.
 * Toda mudança chega pelo Realtime e dispara um refetch curto do estado
 * completo — assim duas abas/aparelhos nunca divergem, e um reload não perde
 * nada (é só buscar de novo).
 */
/** Quem deu o golpe (dano aplicado a partir da rolagem do jogador). */
export interface KillBy {
  sheetId: string;
  name: string;
  /** O dano veio de um truque (feito secreto "Truque mortal"). */
  cantrip?: boolean;
}

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

  /** Quem vê minhas rolagens na mesa: todos, só o mestre, ou ninguém (não envia). */
  rollVisibility: EventVisibility;
  setRollVisibility: (v: EventVisibility) => void;
  /** Última rolagem de OUTRA pessoa da mesa (aviso rápido na tela). */
  lastTableRoll: SessionEvent | null;

  // mestre → ficha do jogador (o jogador aplica na própria ficha)
  /** delta < 0: dano; > 0: cura. */
  sendHeroHp: (c: Combatant, delta: number, opts?: { crit?: boolean }) => Promise<void>;
  sendHeroCondition: (c: Combatant, condition: string, on: boolean) => Promise<void>;
  awardXp: (amount: number, note?: string) => Promise<void>;
  /** Mestre entrega um item (catálogo ou inventado na hora) na mochila do herói. */
  giveItem: (sheetId: string, heroName: string, item: { name: string; itemId?: string; quantity?: number; note?: string }) => Promise<void>;

  /** Alvo escolhido pelo mestre (local): quem recebe o próximo ataque. */
  targetId: string | null;
  setTarget: (id: string | null) => void;
  /**
   * Muda o PV de um combatente: delta < 0 é dano, > 0 é cura. Herói recebe
   * na ficha do jogador (evento); monstro/NPC direto no encontro.
   */
  /** `by`: herói que causou o dano (golpe final vai para ele). */
  changeHp: (c: Combatant, delta: number, opts?: { crit?: boolean; by?: KillBy | null }) => Promise<void>;
  /** Criatura que acabou de cair sem autor conhecido: o mestre escolhe quem deu o golpe final. */
  pendingKill: { combatantId: string; name: string; monsterRef: string | null } | null;
  creditKill: (sheetId: string | null, heroName?: string, how?: { cantrip?: boolean }) => Promise<void>;
  /** Mestre grava uma cicatriz na carta do herói. */
  sendHeroScar: (sheetId: string, heroName: string, text: string) => Promise<void>;
  /** Registra o ataque na crônica da sessão (quem, em quem, golpe, rolagem vs CA, dano, PV). A rodada entra sozinha. */
  logStrike: (p: StrikeLog, secret: boolean) => Promise<void>;
}

/** Eventos do mestre que mexem na ficha do jogador. */
export const HERO_EVENTS = ['hero_hp', 'hero_condition', 'xp_award', 'hero_item', 'hero_deed', 'hero_scar'] as const;
const VIS_KEY = 'fv-roll-visibility';
let seenEvents = new Set<string>();
let seeded = false;

/**
 * O mestre mandou dano/cura/condição/XP para um herói: se o herói é MEU
 * (está neste aparelho), aplico na ficha — uma vez só, mesmo após reload ou
 * em outro aparelho (o id do evento fica gravado na própria ficha).
 * Só vale evento cujo autor é o mestre da sessão (quem abriu a sessão).
 */
function applyHeroEvents(events: SessionEvent[], masterId: string | null) {
  if (!masterId) return;
  const chars = useCharacterStore.getState();
  const pending = (sheetId: string, eventId: string) => {
    const c = useCharacterStore.getState().characters.find((x) => x.id === sheetId);
    return !!c && !(c.appliedEvents ?? []).includes(eventId);
  };
  for (const e of [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (!(HERO_EVENTS as readonly string[]).includes(e.type) || e.actorId !== masterId) continue;
    const p = e.payload as Record<string, unknown>;
    if (e.type === 'xp_award') {
      for (const id of ((p.sheetIds as string[] | undefined) ?? []).filter((x) => pending(x, e.id))) {
        chars.addXp(id, Number(p.amount) || 0);
        chars.markEventApplied(id, e.id);
      }
      continue;
    }
    const sheetId = String(p.sheetId ?? '');
    if (!pending(sheetId, e.id)) continue;
    if (e.type === 'hero_item') {
      // item entregue pelo mestre (improviso): entra na mochila do herói
      const base = typeof p.itemId === 'string' ? getItem(p.itemId) : undefined;
      const qty = Math.max(1, Math.min(999, Math.round(Number(p.quantity) || 1)));
      const inst: InventoryItem = base
        ? { ...itemToInventory(base, qty), note: String(p.note ?? '') || itemToInventory(base, qty).note }
        : {
            uid: `it-${e.id.slice(0, 8)}`,
            name: String(p.item ?? 'Item').slice(0, 80),
            category: 'Tesouro',
            note: String(p.note ?? '').slice(0, 500),
            rarity: 'comum',
            weight: 0,
            quantity: qty,
            favorite: false,
            attuned: false,
            homebrew: true,
          };
      chars.addInventoryItem(sheetId, inst);
      chars.markEventApplied(sheetId, e.id);
      continue;
    }
    if (e.type === 'hero_deed') {
      // golpe final (e afins): marca já (não repete) e soma os contadores da carta
      // com o catálogo de feitos sob demanda (não pesa a primeira tela)
      chars.markEventApplied(sheetId, e.id);
      const kinds = (p.kinds as string[] | undefined) ?? [];
      const ref = typeof p.monsterRef === 'string' ? p.monsterRef : null;
      void import('@/lib/deedTracker').then((m) => m.applyDeedKinds(sheetId, kinds, ref));
      continue;
    }
    if (e.type === 'hero_scar') {
      chars.addScar(sheetId, { id: `scar-${e.id}`, text: String(p.text ?? ''), date: e.createdAt, session: typeof p.session === 'string' ? p.session : null, by: 'mestre' });
      chars.markEventApplied(sheetId, e.id);
      continue;
    }
    if (e.type === 'hero_hp') {
      const n = Math.abs(Number(p.amount) || 0);
      if (p.kind === 'heal') chars.heal(sheetId, n);
      else chars.applyDamage(sheetId, n, { crit: p.crit === true });
    } else if (e.type === 'hero_condition') {
      const cur = useCharacterStore.getState().characters.find((c) => c.id === sheetId)?.combat.conditions ?? [];
      const cond = String(p.condition ?? '');
      if (cond && cur.includes(cond) !== Boolean(p.on)) chars.toggleCondition(sheetId, cond);
    }
    chars.markEventApplied(sheetId, e.id);
  }
}

function savedVisibility(isMaster: boolean): EventVisibility {
  try {
    const v = localStorage.getItem(VIS_KEY);
    if (v === 'public' || v === 'master' || v === 'private') return v;
  } catch {
    /* ignora */
  }
  // o mestre rola atrás do escudo por padrão
  return isMaster ? 'master' : 'public';
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
    rollVisibility: 'public',
    lastTableRoll: null,
    targetId: null,
    pendingKill: null,

    setTarget: (id) => set({ targetId: id }),

    async changeHp(c, delta, opts) {
      if (!delta) return;
      if (c.type === 'player' && c.sheetId) return get().sendHeroHp(c, delta, opts);
      const cur = c.hpCurrent ?? c.hpMax ?? 0;
      const next = Math.max(0, c.hpMax !== null ? Math.min(c.hpMax, cur + delta) : cur + delta);
      await get().updateCombatant(c.id, { hp_current: next });
      // caiu agora: golpe final para quem rolou o dano, ou o mestre escolhe
      if (cur > 0 && next === 0 && get().me?.isMaster) {
        set({ pendingKill: { combatantId: c.id, name: c.name, monsterRef: c.monsterRef } });
        if (opts?.by) await get().creditKill(opts.by.sheetId, opts.by.name, { cantrip: opts.by.cantrip });
      }
    },

    async creditKill(sheetId, heroName, how) {
      const { session, campaignId, me, pendingKill } = get();
      set({ pendingKill: null });
      if (!sheetId || !pendingKill || !session || !campaignId || !me) return;
      // bestiário sob demanda (não pesa a primeira tela)
      const monster = pendingKill.monsterRef ? (await import('@/data/bestiary')).MONSTER_BY_ID[pendingKill.monsterRef] : undefined;
      // ND acima do nível do herói (ficha compartilhada da mesa) e golpe de truque: feitos secretos
      const kinds = (await import('@/engine/deeds')).killKindsFor(monster?.type, { cr: monster?.cr, level: tableHero(sheetId)?.level, cantrip: how?.cantrip });
      await sessionService
        .log(session.id, campaignId, me.userId, 'hero_deed', { sheetId, name: heroName ?? null, creature: pendingKill.name, monsterRef: pendingKill.monsterRef ?? null, kinds }, 'public')
        .catch(() => undefined);
    },

    sendHeroScar: (sheetId, heroName, text) =>
      act(async () => {
        const { session, campaignId, me } = get();
        if (!session || !campaignId || !me) throw new Error('Abra a sessão para gravar cicatrizes.');
        const t = text.trim().slice(0, 200);
        if (!t) return;
        await sessionService.log(session.id, campaignId, me.userId, 'hero_scar', { sheetId, name: heroName, text: t, session: session.name }, 'public');
      }),

    async logStrike(p, secret) {
      const { session, campaignId, me } = get();
      if (!session || !campaignId || !me) return;
      const round = get().encounter?.status === 'active' ? get().encounter?.round : undefined;
      const payload = { ...p, round: p.round ?? round };
      await sessionService.log(session.id, campaignId, me.userId, 'attack', payload, secret ? 'master' : 'public').catch(() => undefined);
      await get().refresh();
    },

    setRollVisibility(v) {
      try {
        localStorage.setItem(VIS_KEY, v);
      } catch {
        /* ignora */
      }
      set({ rollVisibility: v });
    },

    sendHeroHp: (c, delta, opts) =>
      act(async () => {
        const { session, campaignId, me } = get();
        if (!session || !campaignId || !me || !c.sheetId || !delta) return;
        // a linha do encontro mostra o novo PV para o mestre; a ficha do jogador aplica o evento
        if (c.hpCurrent !== null) {
          const next = Math.max(0, c.hpMax !== null ? Math.min(c.hpMax, c.hpCurrent + delta) : c.hpCurrent + delta);
          await encounterService.update(c.id, { hp_current: next });
        }
        await sessionService.log(session.id, campaignId, me.userId, 'hero_hp', { sheetId: c.sheetId, name: c.name, amount: Math.abs(delta), kind: delta < 0 ? 'damage' : 'heal', crit: !!opts?.crit }, 'public');
      }),

    sendHeroCondition: (c, condition, on) =>
      act(async () => {
        const { session, campaignId, me } = get();
        if (!session || !campaignId || !me) return;
        const next = on ? [...new Set([...c.conditions, condition])] : c.conditions.filter((x) => x !== condition);
        await encounterService.update(c.id, { conditions: next });
        if (c.sheetId) await sessionService.log(session.id, campaignId, me.userId, 'hero_condition', { sheetId: c.sheetId, name: c.name, condition, on }, 'public');
      }),

    awardXp: (amount, note) =>
      act(async () => {
        const { session, campaignId, me, combatants } = get();
        if (!session || !campaignId || !me || amount <= 0) return;
        const heroes = combatants.filter((c) => c.type === 'player' && c.sheetId);
        if (!heroes.length) throw new Error('Nenhum herói no encontro para receber XP.');
        await sessionService.log(session.id, campaignId, me.userId, 'xp_award', {
          amount: Math.round(amount), sheetIds: heroes.map((h) => h.sheetId), names: heroes.map((h) => h.name), note: note ?? null,
        }, 'public');
      }),

    giveItem: (sheetId, heroName, item) =>
      act(async () => {
        const { session, campaignId, me } = get();
        if (!session || !campaignId || !me) throw new Error('Abra a sessão para entregar itens.');
        const name = item.name.trim();
        if (!name) return;
        // a ficha do dono aplica o evento (uma vez, mesmo com reload) — como dano e XP
        await sessionService.log(session.id, campaignId, me.userId, 'hero_item', {
          sheetId, name: heroName, item: name.slice(0, 80), itemId: item.itemId ?? null,
          quantity: Math.max(1, Math.round(item.quantity ?? 1)), note: (item.note ?? '').slice(0, 500),
        }, 'public');
      }),

    async join(campaignId, me) {
      const cur = get();
      if (cur.campaignId === campaignId && cur.me?.userId === me.userId) {
        if (cur.me.characterId !== me.characterId) get().setCharacter(me.characterId, me.characterName);
        return get().refresh();
      }
      get().leave();
      set({ campaignId, me, loading: true, error: null, rollVisibility: savedVisibility(me.isMaster) });
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
      seenEvents = new Set();
      seeded = false;
      set({ campaignId: null, me: null, session: null, encounter: null, combatants: [], events: [], online: [], connection: 'idle', myTurnKey: null, error: null, lastTableRoll: null });
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

        // eventos novos: rolagens da mesa (aviso) e ordens do mestre para a ficha
        const fresh = events.filter((e) => !seenEvents.has(e.id));
        fresh.forEach((e) => seenEvents.add(e.id));
        applyHeroEvents(seeded ? fresh : events, session?.createdBy ?? null);
        if (seeded) {
          const roll = fresh.filter((e) => e.type === 'roll' && e.actorId !== me.userId).pop();
          if (roll) set({ lastTableRoll: roll });
          // 20 / 1 natural e teste contra a morte de outro herói: o momento em tela cheia aparece para a mesa toda
          const epic = fresh
            .filter((e) => e.type === 'roll' && e.actorId !== me.userId)
            .map((e) => e.payload as { d20?: boolean; crit?: boolean; fail?: boolean; sheetId?: string | null; who?: string; label?: string; death?: Record<string, unknown> })
            .filter((p) => p.d20 && p.sheetId && (p.crit || p.fail || p.death))
            .pop();
          const d = epic?.death;
          if (epic && d && isDeathOutcome(d.outcome)) {
            const n = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
            useUiStore.getState().showCinematic({ kind: 'death', sheetId: epic.sheetId!, name: epic.who, label: epic.label, death: { nat: n(d.nat, 20), success: n(d.success, 3), fail: n(d.fail, 3), outcome: d.outcome } });
          } else if (epic) useUiStore.getState().showCinematic({ kind: epic.crit ? 'crit' : 'fumble', sheetId: epic.sheetId!, name: epic.who, label: epic.label });
        }
        seeded = true;

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

/**
 * Rolagens compartilhadas: toda rolagem feita durante a sessão (ficha, mesa,
 * ficha de monstro) vira um evento com a visibilidade escolhida. "Só eu" não
 * envia nada. O RLS garante que "só mestre" chega só ao mestre.
 */
useUiStore.subscribe((s, prev) => {
  const r = s.history[0];
  if (!r || r === prev.history[0]) return;
  if (Date.now() - r.timestamp > 5000) return; // hidratação do histórico salvo, não é rolagem nova
  const st = useSessionStore.getState();
  if (!st.session || st.session.status !== 'active' || !st.me || !st.campaignId || st.rollVisibility === 'private') return;
  const who = st.me.isMaster ? 'Mestre' : st.me.characterName ?? st.me.name;
  // dado conquistado do herói: a mesa vê o dado dele no aviso da rolagem
  const hero = !r.ally && r.charId ? useCharacterStore.getState().getCharacter(r.charId) : undefined;
  const dice = heroDice(hero)?.id;
  // teste contra a morte: a mesa vê o momento com os contadores (calculados antes da ficha gravar)
  const death = r.deathSave && hero ? { nat: r.rolls[0], ...deathSaveOutcome(hero.combat.deathSaves, r.rolls[0], r.total) } : undefined;
  void sessionService
    .log(st.session.id, st.campaignId, st.me.userId, 'roll', {
      who, label: r.label, total: r.total, expr: r.expr, rolls: r.rolls.slice(0, 40), crit: r.crit, fail: r.fail, damage: !!r.damage,
      // ficha que rolou: golpe final no "aplicar em…" e o crítico cinematográfico
      sheetId: !st.me.isMaster ? r.charId ?? st.me.characterId ?? null : null, d20: r.sides === 20 && !r.damage && !r.ally,
      ...(r.cantrip && { cantrip: true }),
      ...(dice && { dice }),
      ...(death && { death }),
    }, st.rollVisibility)
    .catch(() => undefined);
});
