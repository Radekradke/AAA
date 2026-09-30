import { describe, expect, it } from 'vitest';
import { rageBonus, resolveExtras, smiteDice, sneakDice, weaponExtras, withExtraDice } from '../damageExtras';
import type { DerivedAttack } from '../dndRules';
import type { Character } from '@/types/character';
import { roll } from '../dice';

const atk = (p: Partial<DerivedAttack>): DerivedAttack => ({
  uid: 'a', name: 'Rapieira', note: '', attackBonus: 5, damageDice: 1, damageDie: 8, damageBonus: 3, damageType: 'perfurante', critMin: 20,
  hitBreakdown: { total: 5, parts: [] }, damageBreakdown: { total: 3, parts: [] }, range: 'melee', ability: 'dex', finesse: true, weapon: true, ...p,
});
const char = (classId: string, level: number, p: Partial<Character> = {}): Character => ({
  classId, level, classLevels: [{ classId, level }], preparedSpells: [], knownSpells: [], choices: {}, subclassId: null,
  combat: { turn: { action: false, bonus: false, reaction: false }, spellSlots: {}, marks: [] }, ...p,
} as unknown as Character);

describe('dano extra: números do PHB', () => {
  it('Ataque Furtivo ⌈nível/2⌉d6; Fúria +2/+3/+4; Destruição 2d8…5d8 (+1 morto-vivo)', () => {
    expect([1, 2, 3, 5, 11, 20].map(sneakDice)).toEqual([1, 1, 2, 3, 6, 10]);
    expect([1, 8, 9, 16].map(rageBonus)).toEqual([2, 2, 3, 4]);
    expect([1, 2, 3, 4, 5].map((l) => smiteDice(l))).toEqual([2, 3, 4, 5, 5]);
    expect(smiteDice(4, true)).toBe(6);
  });
});

describe('dano extra: quando vale', () => {
  it('Furtivo só com acuidade/distância e 1× por turno', () => {
    const rogue = char('rogue', 5);
    expect(weaponExtras(rogue, atk({}))).toMatchObject({ sneak: { dice: 3, used: false } });
    expect(weaponExtras(rogue, atk({ finesse: false, name: 'Maça' })).sneak).toBeNull();
    const used = char('rogue', 5, { combat: { turn: { action: true, bonus: false, reaction: false, sneak: true }, spellSlots: {} } } as Partial<Character>);
    const a = weaponExtras(used, atk({}));
    expect(a.sneak!.used).toBe(true);
    expect(resolveExtras(used, atk({}), a, { sneak: true }).dice).toEqual([]);
  });
  it('Fúria só corpo a corpo com FOR e ligada', () => {
    const barb = char('barbarian', 9, { combat: { turn: { action: false, bonus: false, reaction: false }, spellSlots: {}, marks: ['rage'] } } as Partial<Character>);
    const axe = atk({ ability: 'str', finesse: false });
    expect(resolveExtras(barb, axe, weaponExtras(barb, axe), {}).flat).toBe(3);
    expect(weaponExtras(barb, atk({ range: 'ranged', ability: 'dex' })).rage).toBeNull();
  });
  it('Paladino 11: Aprimorada sempre; Destruição só corpo a corpo com arma', () => {
    const pal = char('paladin', 11);
    const sword = atk({ ability: 'str', finesse: false });
    const av = weaponExtras(pal, sword);
    expect(av.improvedSmite).toBe(true);
    expect(resolveExtras(pal, sword, av, { smiteLevel: 2 }).dice.map((d) => `${d.count}d${d.die} ${d.source}`)).toEqual([
      '3d8 Destruição Divina',
      '1d8 Destruição Divina Aprimorada',
    ]);
    expect(weaponExtras(pal, atk({ range: 'ranged' })).smite).toBeNull();
    expect(weaponExtras(pal, atk({ weapon: false })).smite).toBeNull();
  });
  it('Bruxaria e Marca do Caçador só somam quando estão ativas', () => {
    const lock = char('warlock', 3, { preparedSpells: ['phb-hex'] });
    expect(weaponExtras(lock, atk({})).hex).toBe(true);
    expect(resolveExtras(lock, atk({}), weaponExtras(lock, atk({})), {}).dice).toEqual([]);
    const on = { ...lock, combat: { ...lock.combat, marks: ['hex'] } } as Character;
    expect(resolveExtras(on, atk({}), weaponExtras(on, atk({})), {}).dice[0]).toMatchObject({ count: 1, die: 6, type: 'necrótico' });
  });
});

describe('crítico dobra os dados extras', () => {
  it('3d6 furtivo no crítico vira 6 dados', () => {
    const base = roll(8, { count: 2, modifier: 3, damage: true });
    const r = withExtraDice(base, [{ count: 3, die: 6, type: 'perfurante', source: 'Ataque Furtivo' }], true);
    expect(r.rolls.length).toBe(2 + 6);
    expect(r.expr).toContain('6d6');
  });
});
