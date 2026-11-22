import { describe, expect, it, vi } from 'vitest';
import type { Combatant } from '@/types/session';

vi.mock('@/services/supabaseClient', () => ({ getSupabase: () => null }));
const { missingInitiatives, namesList } = await import('../actions');

const base = { encounterId: 'e', sessionId: 's', campaignId: 'c', monsterInstanceId: null, hpCurrent: 10, hpMax: 10, armorClass: 12, conditions: [], hidden: false, groupKey: null, monsterRef: null, sheetId: null, ownerId: null, turnOrder: 0 };
const c = (id: string, extra: Partial<Combatant> = {}): Combatant => ({ ...base, id, type: 'monster', name: id, initiative: null, initiativeBonus: 2, ...extra });
const d20 = (face: number) => () => (face - 1) / 20; // rand que tira sempre `face`

describe('iniciar combate sem deixar ninguém no fim da fila', () => {
  it('criaturas sem iniciativa são roladas (uma vez por grupo); heróis só se o mestre quiser', () => {
    const list = [
      c('gob1', { groupKey: 'g' }),
      c('gob2', { groupKey: 'g' }),
      c('orc', { initiative: 15 }),
      c('kael', { type: 'player', ownerId: 'u1', initiativeBonus: 3 }),
      c('lyra', { type: 'player', ownerId: 'u2', initiative: 9 }),
    ];
    const without = missingInitiatives(list, false, d20(10));
    expect(without).toEqual([
      { id: 'gob1', value: 12 },
      { id: 'gob2', value: 12 },
    ]);
    const withHeroes = missingInitiatives(list, true, d20(10));
    expect(withHeroes).toContainEqual({ id: 'kael', value: 13 });
    expect(withHeroes.map((v) => v.id)).not.toContain('lyra'); // já rolou
    expect(withHeroes.map((v) => v.id)).not.toContain('orc');
  });
  it('lista de nomes em português', () => {
    expect(namesList(['Kael'])).toBe('Kael');
    expect(namesList(['Kael', 'Lyra'])).toBe('Kael e Lyra');
    expect(namesList(['Kael', 'Lyra', 'Tor'])).toBe('Kael, Lyra e Tor');
  });
});
