import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Combatant, Encounter } from '@/types/session';

// o "banco": cada envio de evento passa por aqui; `down` simula a rede caída
const sent: { type: string; payload: Record<string, unknown> }[] = [];
let down = false;
const toasts: string[] = [];

vi.mock('@/store/characterStore', () => ({
  useCharacterStore: { getState: () => ({ characters: [], resetTurn: vi.fn() }), subscribe: () => () => undefined },
}));
vi.mock('@/services/supabaseClient', () => ({ getSupabase: () => null }));
vi.mock('@/services/realtimeService', () => ({
  joinLiveChannel: () => ({ leave: vi.fn(), track: vi.fn(), broadcast: vi.fn(), isPrivate: () => true }),
}));
vi.mock('@/store/feedbackStore', () => ({ toast: (m: string) => void toasts.push(m) }));
vi.mock('@/services/sessionService', () => ({
  sessionService: {
    live: async () => null,
    events: async () => [],
    log: async (_s: string, _c: string, _a: string, type: string, payload: Record<string, unknown>) => {
      if (down) throw new Error('Failed to fetch');
      sent.push({ type, payload });
    },
  },
}));

const mem = new Map<string, string>();
const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
vi.stubGlobal('localStorage', storage);
vi.stubGlobal('sessionStorage', storage);

const { myOnDeckCombatant, sendTableRoll, flushRollOutbox, pendingRolls, __resetRollOutbox, OUTBOX_MAX, OUTBOX_TTL_MS, shareList, keepIfSame } = await import('../sessionStore');
const { eventText } = await import('@/lib/combatLog');

const base = { encounterId: 'enc', sessionId: 'sess', campaignId: 'camp', monsterInstanceId: null, initiativeBonus: 0, hpCurrent: 10, hpMax: 10, armorClass: 12, conditions: [], hidden: false, groupKey: null, monsterRef: null, sheetId: null };
const c = (id: string, turnOrder: number, extra: Partial<Combatant> = {}): Combatant => ({ ...base, id, type: 'monster', ownerId: null, name: id, initiative: 20 - turnOrder, turnOrder, ...extra });
const enc = (active: string, status: Encounter['status'] = 'active'): Encounter => ({ id: 'enc', sessionId: 'sess', campaignId: 'camp', name: 'E', status, round: 1, activeCombatantId: active, revision: 1, startedAt: null, endedAt: null, updatedAt: '' });
const me = { userId: 'u1', name: 'Ana', isMaster: false, characterId: null, characterName: null };

describe('você é o próximo', () => {
  const kael = c('kael', 3, { type: 'player', ownerId: 'u1', sheetId: 's1' });
  it('avisa quando o meu herói joga logo depois do atual', () => {
    const list = [c('orc', 1), c('gob', 2), kael];
    expect(myOnDeckCombatant({ encounter: enc('gob'), combatants: list, me })?.id).toBe('kael');
    expect(myOnDeckCombatant({ encounter: enc('orc'), combatants: list, me })).toBeNull();
  });
  it('pula criatura derrotada (como o banco) e dá a volta na rodada', () => {
    const list = [kael, c('orc', 4), c('gob', 5, { hpCurrent: 0 })];
    expect(myOnDeckCombatant({ encounter: enc('orc'), combatants: list, me })?.id).toBe('kael');
  });
  it('grupo de monstros conta como um turno só', () => {
    const list = [c('gob1', 1, { groupKey: 'g' }), c('gob2', 2, { groupKey: 'g' }), kael];
    expect(myOnDeckCombatant({ encounter: enc('gob1'), combatants: list, me })?.id).toBe('kael');
  });
  it('nada no meu turno, fora de combate ou sem estar na mesa', () => {
    const list = [c('gob', 1), kael];
    expect(myOnDeckCombatant({ encounter: enc('kael'), combatants: list, me })).toBeNull();
    expect(myOnDeckCombatant({ encounter: enc('gob', 'paused'), combatants: list, me })).toBeNull();
    expect(myOnDeckCombatant({ encounter: enc('gob'), combatants: list, me: null })).toBeNull();
    expect(myOnDeckCombatant({ encounter: enc('gob'), combatants: [c('gob', 1), c('orc', 2)], me })).toBeNull();
  });
});

describe('rolagens sem conexão não somem', () => {
  const roll = (label: string, at = Date.now()) => ({ sessionId: 'sess', campaignId: 'camp', actorId: 'u1', visibility: 'public' as const, at, payload: { label, total: 12 } });
  beforeEach(() => {
    sent.length = 0;
    toasts.length = 0;
    down = false;
    __resetRollOutbox();
  });

  it('com rede: vai direto, sem fila nem aviso', async () => {
    expect(await sendTableRoll(roll('Ataque'))).toBe(true);
    expect(sent.map((e) => e.payload.label)).toEqual(['Ataque']);
    expect(pendingRolls()).toHaveLength(0);
    expect(toasts).toEqual([]);
  });

  it('sem rede: guarda, avisa UMA vez e reenvia na ordem quando volta (marcada como atrasada)', async () => {
    down = true;
    expect(await sendTableRoll(roll('Ataque'))).toBe(false);
    expect(await sendTableRoll(roll('Dano'))).toBe(false);
    expect(pendingRolls()).toHaveLength(2);
    expect(toasts).toHaveLength(1);
    down = false;
    expect(await flushRollOutbox()).toBe(2);
    expect(sent.map((e) => [e.payload.label, e.payload.late])).toEqual([['Ataque', true], ['Dano', true]]);
    expect(pendingRolls()).toHaveLength(0);
    expect(toasts[1]).toMatch(/2 rolagens chegaram/);
  });

  it('rede cai de novo no meio do reenvio: o resto continua guardado', async () => {
    down = true;
    await sendTableRoll(roll('A'));
    await sendTableRoll(roll('B'));
    expect(await flushRollOutbox()).toBe(0);
    expect(pendingRolls().map((r) => r.payload.label)).toEqual(['A', 'B']);
  });

  it('rolagem velha demais não é mandada; fila tem limite', async () => {
    down = true;
    const now = Date.now();
    await sendTableRoll(roll('velha', now - OUTBOX_TTL_MS - 1));
    await sendTableRoll(roll('nova', now));
    down = false;
    expect(await flushRollOutbox(now)).toBe(1);
    expect(sent.map((e) => e.payload.label)).toEqual(['nova']);

    down = true;
    for (let i = 0; i < OUTBOX_MAX + 5; i++) await sendTableRoll(roll(`r${i}`));
    expect(pendingRolls()).toHaveLength(OUTBOX_MAX);
    expect(pendingRolls()[0].payload.label).toBe('r5');
  });

  it('a crônica mostra que a rolagem chegou atrasada', () => {
    const e = { id: 'e', sessionId: 's', type: 'roll', actorId: 'u1', targetId: null, visibility: 'public' as const, createdAt: '', payload: { who: 'Kael', label: 'Ataque', total: 17, late: true } };
    expect(eventText(e)).toBe('Kael · Ataque: 17 · chegou atrasada');
  });
});

describe('leitura igual não redesenha a mesa', () => {
  it('lista igual mantém a MESMA referência; item mudado troca só ele', () => {
    const a = c('a', 1);
    const b = c('b', 2);
    const prev = [a, b];
    const same = shareList(prev, [{ ...a }, { ...b }]);
    expect(same).toBe(prev);
    const changed = shareList(prev, [{ ...a }, { ...b, hpCurrent: 3 }]);
    expect(changed).not.toBe(prev);
    expect(changed[0]).toBe(a);
    expect(changed[1]).not.toBe(b);
    expect(shareList(prev, [{ ...a }])).toHaveLength(1);
  });
  it('objeto igual mantém a referência', () => {
    const e = enc('a');
    expect(keepIfSame(e, { ...e })).toBe(e);
    expect(keepIfSame(e, { ...e, round: 2 })).not.toBe(e);
    expect(keepIfSame(null, null)).toBeNull();
  });
});
