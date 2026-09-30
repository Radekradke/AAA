import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Combatant, Encounter } from '@/types/session';

// banco simulado: o que o servidor "tem" agora
const db: { encounter: Encounter | null; combatants: Combatant[] } = { encounter: null, combatants: [] };
const resetTurn = vi.fn();

vi.mock('@/store/characterStore', () => ({
  useCharacterStore: { getState: () => ({ characters: [{ id: 'sheet-kael' }], resetTurn }) },
}));
vi.mock('@/services/supabaseClient', () => ({ getSupabase: () => null }));
vi.mock('@/services/realtimeService', () => ({
  joinLiveChannel: () => ({ leave: vi.fn(), track: vi.fn(), broadcast: vi.fn(), isPrivate: () => true }),
}));
vi.mock('@/services/sessionService', () => ({
  sessionService: {
    live: async () => ({ id: 'sess', campaignId: 'camp', name: 'Sessão 1', status: 'active', startedAt: null, endedAt: null, createdBy: 'm', createdAt: '', updatedAt: '' }),
    events: async () => [],
  },
}));
vi.mock('@/services/encounterService', () => ({
  StaleRevisionError: class extends Error {},
  encounterService: {
    open: async () => (db.encounter ? { encounter: db.encounter, combatants: db.combatants } : null),
    setInitiative: vi.fn(async () => undefined),
  },
}));

const store = new Map<string, string>();
const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
vi.stubGlobal('localStorage', storage);
vi.stubGlobal('sessionStorage', storage);

const { useSessionStore, myActiveCombatant } = await import('../sessionStore');
const { encounterService } = await import('@/services/encounterService');

const base = { encounterId: 'enc', sessionId: 'sess', campaignId: 'camp', monsterInstanceId: null, initiativeBonus: 0, hpCurrent: 10, hpMax: 10, armorClass: 12, conditions: [], hidden: false, groupKey: null };
const kael: Combatant = { ...base, id: 'c-kael', type: 'player', sheetId: 'sheet-kael', ownerId: 'user-p1', name: 'Kael', initiative: 18, turnOrder: 1 };
const gob: Combatant = { ...base, id: 'c-gob', type: 'monster', sheetId: null, ownerId: null, name: 'Goblin', initiative: 12, turnOrder: 2 };
const enc = (round: number, active: string): Encounter => ({ id: 'enc', sessionId: 'sess', campaignId: 'camp', name: 'Emboscada', status: 'active', round, activeCombatantId: active, revision: round * 10, startedAt: null, endedAt: null, updatedAt: '' });

describe('sessionStore: turno do jogador', () => {
  beforeEach(() => {
    store.clear();
    resetTurn.mockClear();
    useSessionStore.getState().leave();
  });

  it('zera a ação da ficha quando começa o MEU turno — uma vez por turno', async () => {
    db.combatants = [kael, gob];
    db.encounter = enc(1, 'c-gob');
    await useSessionStore.getState().join('camp', { userId: 'user-p1', name: 'Ana', isMaster: false, characterId: 'sheet-kael', characterName: 'Kael' });
    expect(resetTurn).not.toHaveBeenCalled();
    expect(myActiveCombatant(useSessionStore.getState())).toBeNull();

    db.encounter = enc(2, 'c-kael');
    await useSessionStore.getState().refresh();
    expect(resetTurn).toHaveBeenCalledTimes(1);
    expect(resetTurn).toHaveBeenCalledWith('sheet-kael');
    expect(myActiveCombatant(useSessionStore.getState())?.name).toBe('Kael');

    // eventos repetidos / refetch do mesmo turno não zeram de novo
    await useSessionStore.getState().refresh();
    await useSessionStore.getState().refresh();
    expect(resetTurn).toHaveBeenCalledTimes(1);

    // reload da página (estado da memória some, sessionStorage fica) também não
    useSessionStore.setState({ myTurnKey: null });
    await useSessionStore.getState().refresh();
    expect(resetTurn).toHaveBeenCalledTimes(1);

    // próxima rodada: novo turno, novo reset
    db.encounter = enc(3, 'c-kael');
    await useSessionStore.getState().refresh();
    expect(resetTurn).toHaveBeenCalledTimes(2);
  });

  it('turno de outro jogador não mexe na minha ficha', async () => {
    db.combatants = [kael, gob];
    db.encounter = enc(1, 'c-kael');
    await useSessionStore.getState().join('camp', { userId: 'user-p2', name: 'Bia', isMaster: false, characterId: null, characterName: null });
    expect(resetTurn).not.toHaveBeenCalled();
  });

  it('iniciativa rolada na ficha vai para o encontro só se o personagem estiver nele', async () => {
    db.combatants = [kael, gob];
    db.encounter = { ...enc(0, 'c-kael'), status: 'preparing', activeCombatantId: null };
    await useSessionStore.getState().join('camp', { userId: 'user-p1', name: 'Ana', isMaster: false, characterId: 'sheet-kael', characterName: 'Kael' });
    expect(await useSessionStore.getState().reportInitiative('sheet-kael', 17)).toBe(true);
    expect(encounterService.setInitiative).toHaveBeenCalledWith('c-kael', 17);
    expect(await useSessionStore.getState().reportInitiative('outra-ficha', 12)).toBe(false);
  });
});
