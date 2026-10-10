import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Combatant } from '@/types/session';

// ficha do jogador neste aparelho
const hero = { id: 'sheet-kael', hpCurrent: 12, appliedEvents: [] as string[], combat: { conditions: ['Caído'] } };
vi.mock('@/store/characterStore', () => ({ useCharacterStore: { getState: () => ({ characters: [hero], resetTurn: vi.fn() }) } }));
vi.mock('@/engine/dndRules', () => ({ deriveCharacter: () => ({ maxHp: 40 }) }));
vi.mock('@/services/supabaseClient', () => ({ getSupabase: () => null }));
vi.mock('@/services/realtimeService', () => ({ joinLiveChannel: () => ({ leave: vi.fn(), track: vi.fn(), broadcast: vi.fn(), isPrivate: () => true }) }));
vi.mock('@/services/sessionService', () => ({
  sessionService: {
    live: async () => ({ id: 'sess', campaignId: 'camp', name: 'S', status: 'active', startedAt: null, endedAt: null, createdBy: 'gm', createdAt: '', updatedAt: '' }),
    events: async () => [],
    heroEvents: async () => [],
    log: vi.fn(async () => undefined),
  },
}));

const base: Combatant = {
  id: 'c-kael', encounterId: 'enc', type: 'player', name: 'Kael', sheetId: 'sheet-kael', ownerId: 'p1', monsterRef: null,
  initiative: 15, initiativeBonus: 2, turnOrder: 1, hpCurrent: 30, hpMax: 40, armorClass: 15, conditions: [], hidden: false, groupKey: null,
} as unknown as Combatant;
let combatants: Combatant[] = [];
const updateOwn = vi.fn(async () => undefined);
vi.mock('@/services/encounterService', () => ({
  StaleRevisionError: class extends Error {},
  encounterService: {
    open: async () => ({ encounter: { id: 'enc', sessionId: 'sess', status: 'active', round: 1, activeCombatantId: null, revision: 1 }, combatants }),
    updateOwn: (...a: unknown[]) => (updateOwn as unknown as (...x: unknown[]) => Promise<void>)(...a),
  },
}));

const store = new Map<string, string>();
const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
vi.stubGlobal('localStorage', storage);
vi.stubGlobal('sessionStorage', storage);

const { useSessionStore, syncMyVitals } = await import('../sessionStore');

describe('PV e condições do herói: a ficha manda para o encontro', () => {
  beforeEach(() => {
    updateOwn.mockClear();
    useSessionStore.getState().leave();
  });

  it('poção ou dano na própria ficha chegam à linha do mestre', async () => {
    combatants = [{ ...base }];
    await useSessionStore.getState().join('camp', { userId: 'p1', name: 'Ana', isMaster: false, characterId: 'sheet-kael', characterName: 'Kael' });
    await syncMyVitals();
    expect(updateOwn).toHaveBeenCalledWith('c-kael', { hp_current: 12, hp_max: 40, conditions: ['Caído'] });
  });

  it('já igual: não manda nada (sem laço com o realtime)', async () => {
    combatants = [{ ...base, hpCurrent: 12, conditions: ['Caído'] }];
    await useSessionStore.getState().join('camp', { userId: 'p1', name: 'Ana', isMaster: false, characterId: 'sheet-kael', characterName: 'Kael' });
    await syncMyVitals();
    expect(updateOwn).not.toHaveBeenCalled();
  });

  it('não mexe no herói de outro jogador nem quando eu sou o mestre', async () => {
    combatants = [{ ...base, ownerId: 'p2' }];
    await useSessionStore.getState().join('camp', { userId: 'p1', name: 'Ana', isMaster: false, characterId: null, characterName: null });
    await syncMyVitals();
    expect(updateOwn).not.toHaveBeenCalled();

    useSessionStore.getState().leave();
    combatants = [{ ...base, ownerId: 'gm' }];
    await useSessionStore.getState().join('camp', { userId: 'gm', name: 'Mestre', isMaster: true, characterId: null, characterName: null });
    await syncMyVitals();
    expect(updateOwn).not.toHaveBeenCalled();
  });
});
