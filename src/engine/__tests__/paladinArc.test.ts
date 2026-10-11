import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { itemToInventory } from '../inventory';
import { characterResources } from '../classResources';
import { attacksPerAction } from '../extraAttack';
import { paladinState } from '../paladin';
import { conditionImmunity } from '../conditionImmunity';
import { smiteDice, weaponExtras } from '../damageExtras';
import { spellSlotsFor } from '../spellcasting';
import { getItem } from '@/data/items';
import type { Character } from '@/types/character';

function paladin(level: number, extra: Partial<Character> = {}): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Ser Lys', classId: 'paladin', raceId: 'human' });
  c.level = level;
  c.classLevels = [{ classId: 'paladin', level }];
  c.baseAbilities = { str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 16 };
  const w = itemToInventory(getItem('w-longsword')!);
  c.inventory = [w];
  c.equipped = { armor: null, shield: null, mainHand: w.uid, offHand: null, ranged: null };
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return { ...c, ...extra };
}
const st = (c: Character) => {
  const d = deriveCharacter(c);
  return paladinState(c, d.proficiency, d.abilities.cha.mod)!;
};
const res = (c: Character) => Object.fromEntries(characterResources(c).map((r) => [r.id, r]));

describe('Paladino do 1 ao 20 (PHB 2014)', () => {
  it('Sentido Divino (1 + CAR) e Cura pelas Mãos (5 × nível)', () => {
    expect(st(paladin(1)).senseMax).toBe(1 + 3);
    expect([1, 10, 20].map((l) => st(paladin(l)).layMax)).toEqual([5, 50, 100]);
    const spent = paladin(4, { combat: { ...paladin(4).combat, resources: { layhands: 7 } } });
    expect(st(spent).layLeft).toBe(7);
  });

  it('Conjuração a partir do 2º (meio conjurador) e Destruição Divina 2d8 + 1d8/círculo (máx. 5d8, +1d8 em morto-vivo)', () => {
    expect(spellSlotsFor(paladin(1))).toEqual({});
    expect(spellSlotsFor(paladin(2))).toEqual({ 1: 2 });
    expect(spellSlotsFor(paladin(20))).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 });
    expect([1, 2, 4, 5].map((l) => smiteDice(l))).toEqual([2, 3, 5, 5]);
    expect(smiteDice(4, true)).toBe(6);
    const p2 = paladin(2);
    expect(weaponExtras(p2, deriveCharacter(p2).attacks[0]).smite).not.toBeNull();
    expect(weaponExtras(paladin(1), deriveCharacter(paladin(1)).attacks[0]).smite).toBeNull();
  });

  it('Saúde Divina 3º, Ataque Extra 5º, Canalizar Divindade 3º com as opções do juramento', () => {
    expect(deriveCharacter(paladin(3)).resistances.map((r) => r.source)).toContain('Saúde Divina');
    expect([4, 5].map((l) => attacksPerAction(paladin(l)).count)).toEqual([1, 2]);
    expect(st(paladin(3, { subclassId: 'devotion' })).channelOptions.map((o) => o.label)).toEqual(['Arma Sagrada', 'Expulsar o Profano']);
    expect(st(paladin(3, { subclassId: 'vengeance' })).channelOptions.map((o) => o.mark ?? null)).toEqual([null, 'vow']);
    expect(st(paladin(3, { subclassId: 'ancients' })).channelOptions).toHaveLength(2);
    expect(st(paladin(5)).dc).toBe(8 + 3 + 3);
  });

  it('Arma Sagrada soma CAR ao ataque enquanto ligada', () => {
    const base = paladin(3, { subclassId: 'devotion' });
    const on = paladin(3, { subclassId: 'devotion' });
    on.combat.marks = ['sacredWeapon'];
    expect(deriveCharacter(on).attacks[0].attackBonus - deriveCharacter(base).attacks[0].attackBonus).toBe(3);
  });

  it('Aura de Proteção 6º (+CAR, mín. 1, nas salvaguardas; 9 m no 18º)', () => {
    const d5 = deriveCharacter(paladin(5));
    const d6 = deriveCharacter(paladin(6));
    expect(d6.abilities.dex.save - d5.abilities.dex.save).toBe(3);
    expect([st(paladin(6)).auraRange, st(paladin(18)).auraRange]).toEqual([3, 9]);
    const lowCha = paladin(6, { baseAbilities: { str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 8 } });
    expect(st(lowCha).auraBonus).toBe(1);
  });

  it('Auras de juramento 7º e Aura de Coragem 10º impedem condições', () => {
    expect(conditionImmunity(paladin(6, { subclassId: 'devotion' }), 'Enfeitiçado')).toBeNull();
    expect(conditionImmunity(paladin(7, { subclassId: 'devotion' }), 'Enfeitiçado')).toBe('Aura de Devoção');
    expect(conditionImmunity(paladin(9), 'Amedrontado')).toBeNull();
    expect(conditionImmunity(paladin(10), 'Amedrontado')).toBe('Aura de Coragem');
    expect(deriveCharacter(paladin(7, { subclassId: 'ancients' })).resistances.map((r) => r.value)).toContain('dano de magias');
  });

  it('Destruição Aprimorada 11º, Toque Purificador 14º (CAR usos), Sentinela Imortal 15º e forma do 20º', () => {
    const p11 = paladin(11);
    expect(weaponExtras(p11, deriveCharacter(p11).attacks[0]).improvedSmite).toBe(true);
    expect([st(paladin(13)).cleansingMax, st(paladin(14)).cleansingMax]).toEqual([0, 3]);
    expect(st(paladin(15, { subclassId: 'ancients' })).undyingLeft).toBe(1);
    expect(st(paladin(15, { subclassId: 'devotion' })).undyingLeft).toBe(0);
    expect(st(paladin(20, { subclassId: 'vengeance' })).avatar?.label).toBe('Anjo Vingador');
    expect(res(paladin(19, { subclassId: 'vengeance' })).oathAvatar).toBeUndefined();
  });
});
