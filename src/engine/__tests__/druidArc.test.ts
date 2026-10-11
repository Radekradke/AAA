import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { characterResources } from '../classResources';
import { canTakeShape, crValue, druidState, validNaturalRecovery, wildShapeAttacks, wildShapeMaxCr } from '../druid';
import { spellSlotsFor, spellsKnownOrPrepared, cantripsKnown, casterOf } from '../spellcasting';
import { conditionImmunity } from '../conditionImmunity';
import { getWildShape, WILD_SHAPES } from '@/data/wildShapes';
import type { Character } from '@/types/character';

function druid(level: number, subclassId: string | null = null): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Seren', classId: 'druid', raceId: 'human' });
  c.level = level;
  c.classLevels = [{ classId: 'druid', level }];
  c.subclassId = subclassId;
  c.baseAbilities = { str: 10, dex: 14, con: 14, int: 12, wis: 16, cha: 8 };
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return c;
}
const st = (c: Character) => {
  const d = deriveCharacter(c);
  return druidState(c, d.proficiency, d.abilities.wis.mod)!;
};
const res = (c: Character) => Object.fromEntries(characterResources(c).map((r) => [r.id, r]));
const beast = (id: string) => getWildShape(id)!;

describe('Druida do 1 ao 20 (PHB 2014)', () => {
  it('Conjuração: truques, preparadas (SAB + nível) e espaços de conjurador completo', () => {
    expect([1, 4, 10].map((l) => cantripsKnown('druid', l))).toEqual([2, 3, 4]);
    expect(spellsKnownOrPrepared('druid', 5, 3).count).toBe(8);
    expect(spellSlotsFor(druid(3))).toEqual({ 1: 4, 2: 2 });
    expect(st(druid(5)).dc).toBe(8 + 3 + 3);
  });

  it('Forma Selvagem: 2 usos por descanso curto (2º), ilimitada no 20º; dura metade do nível em horas', () => {
    expect(res(druid(1)).wildshape).toBeUndefined();
    expect(res(druid(2)).wildshape).toMatchObject({ max: 2, recharge: 'short' });
    expect(st(druid(20)).unlimited).toBe(true);
    expect([st(druid(2)).hours, st(druid(9)).hours]).toEqual([1, 4]);
  });

  it('ND máximo e deslocamento: 1/4 sem voo nem natação → 1/2 sem voo (4º) → 1 (8º); Lua: 1 e nível ÷ 3 (6º)', () => {
    expect([2, 4, 8].map((l) => wildShapeMaxCr(l, false))).toEqual([0.25, 0.5, 1]);
    expect([2, 5, 6, 9, 18].map((l) => wildShapeMaxCr(l, true))).toEqual([1, 1, 2, 3, 6]);
    expect(crValue('1/8')).toBe(0.125);
    expect(canTakeShape(druid(2), beast('wolf'))).toBe(true);
    expect(canTakeShape(druid(2), beast('giantFrog'))).toBe(false); // nada
    expect(canTakeShape(druid(4), beast('giantFrog'))).toBe(true);
    expect(canTakeShape(druid(4), beast('bloodHawk'))).toBe(false); // voa
    expect(canTakeShape(druid(8), beast('bloodHawk'))).toBe(true);
    expect(canTakeShape(druid(4), beast('brownBear'))).toBe(false);
    expect(canTakeShape(druid(2, 'moon'), beast('brownBear'))).toBe(true);
    expect(canTakeShape(druid(9, 'moon'), beast('giantScorpion'))).toBe(true);
    expect(canTakeShape(druid(9, 'moon'), beast('elephant'))).toBe(false);
    expect(st(druid(2)).options.every((b) => crValue(b.cr) <= 0.25 && !/voo|nadar/.test(b.speed))).toBe(true);
    expect(WILD_SHAPES.length).toBeGreaterThan(30);
  });

  it('Círculo da Lua: ação bônus, Golpes Primais (6º) e elementais (10º)', () => {
    expect([st(druid(2)).bonusAction, st(druid(2, 'moon')).bonusAction]).toEqual([false, true]);
    const bear = beast('brownBear');
    expect(wildShapeAttacks(druid(5, 'moon'), bear)[0].note).not.toMatch(/mágico/);
    expect(wildShapeAttacks(druid(6, 'moon'), bear)[0]).toMatchObject({ attackBonus: 6, damageDice: 1, damageDie: 8, damageBonus: 4 });
    expect(wildShapeAttacks(druid(6, 'moon'), bear)[0].note).toMatch(/mágico/);
    expect([st(druid(9, 'moon')).elementals.length, st(druid(10, 'moon')).elementals.length]).toEqual([0, 4]);
  });

  it('A forma atual vem do estado da ficha', () => {
    const c = druid(4, 'moon');
    c.combat.wildShape = { beastId: 'brownBear', hp: 20 };
    expect(st(c).form).toMatchObject({ hp: 20, elemental: false });
    expect(st(c).form?.beast.label).toBe('Urso-pardo');
  });

  it('Círculo da Terra: truque extra, Recuperação Natural (metade do nível) e Guarda da Natureza (10º)', () => {
    expect(casterOf(druid(2, 'land'))!.cantrips).toBe(cantripsKnown('druid', 2) + 1);
    expect(st(druid(5, 'land')).naturalRecovery).toEqual({ budget: 3, left: 1 });
    const slots = { 1: { max: 4, used: 2 }, 3: { max: 2, used: 1 } };
    expect(validNaturalRecovery(druid(5, 'land'), { 3: 1 }, slots)).toBe(true);
    expect(validNaturalRecovery(druid(5, 'land'), { 1: 1, 3: 1 }, slots)).toBe(false);
    expect(conditionImmunity(druid(9, 'land'), 'Envenenado')).toBeNull();
    expect(conditionImmunity(druid(10, 'land'), 'Envenenado')).toBe('Guarda da Natureza');
  });
});
