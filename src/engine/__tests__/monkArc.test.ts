import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { characterResources } from '../classResources';
import { attacksPerAction } from '../extraAttack';
import { monkState } from '../monk';
import { conditionImmunity } from '../conditionImmunity';
import { rollRule } from '../rollRules';
import { hasEvasion } from '../rogue';
import { initiativeRules } from '../initiative';
import type { Character } from '@/types/character';

function monk(level: number, extra: Partial<Character> = {}): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Lin', classId: 'monk', raceId: 'human' });
  c.level = level;
  c.classLevels = [{ classId: 'monk', level }];
  c.baseAbilities = { str: 10, dex: 16, con: 14, int: 10, wis: 14, cha: 8 };
  c.inventory = [];
  c.equipped = { armor: null, shield: null, mainHand: null, offHand: null, ranged: null };
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return { ...c, ...extra };
}
const st = (c: Character) => {
  const d = deriveCharacter(c);
  return monkState(c, d.proficiency, d.abilities.wis.mod, d.abilities.dex.mod)!;
};

describe('Monge do 1 ao 20 (PHB 2014)', () => {
  it('Defesa sem Armadura: 10 + DES + SAB; Artes Marciais d4→d6→d8→d10', () => {
    expect(deriveCharacter(monk(1)).ac).toBe(10 + 3 + 2);
    expect([1, 5, 11, 17].map((l) => st(monk(l)).maDie)).toEqual([4, 6, 8, 10]);
    const unarmed = deriveCharacter(monk(5)).attacks.find((a) => a.uid === 'monk-unarmed')!;
    expect(unarmed.damageDie).toBe(6);
    expect(unarmed.ability).toBe('dex');
  });

  it('Ki = nível a partir do 2º, CD 8 + prof + SAB; Movimento sem Armadura +3 → +9 m', () => {
    expect(characterResources(monk(1)).some((r) => r.id === 'ki')).toBe(false);
    expect([2, 10, 20].map((l) => st(monk(l)).kiMax)).toEqual([2, 10, 20]);
    expect(st(monk(5)).dc).toBe(8 + 3 + 2);
    expect([1, 2, 6, 10, 14, 18].map((l) => deriveCharacter(monk(l)).speed)).toEqual([9, 12, 13.5, 15, 16.5, 18]);
  });

  it('Defletir Projéteis 3º (1d10 + DES + nível), Queda Lenta 4º (5 × nível), Ataque Extra 5º', () => {
    expect(st(monk(2)).deflectBonus).toBeNull();
    expect(st(monk(3)).deflectBonus).toBe(3 + 3);
    expect([st(monk(3)).slowFall, st(monk(4)).slowFall]).toEqual([null, 20]);
    expect([4, 5].map((l) => attacksPerAction(monk(l)).count)).toEqual([1, 2]);
    expect([st(monk(4)).stunning, st(monk(5)).stunning]).toEqual([false, true]);
  });

  it('Evasão e Mente Tranquila 7º; Pureza do Corpo 10º bloqueia Envenenado', () => {
    expect([hasEvasion(monk(6)), hasEvasion(monk(7))]).toEqual([false, true]);
    expect(st(monk(7)).stillness).toBe(true);
    expect(conditionImmunity(monk(9), 'Envenenado')).toBeNull();
    expect(conditionImmunity(monk(10), 'Envenenado')).toBe('Pureza do Corpo');
    expect(deriveCharacter(monk(10)).resistances.map((r) => r.source)).toContain('Pureza do Corpo');
  });

  it('Alma de Diamante 14º (todas as salvaguardas), Corpo Vazio 18º, Ser Perfeito 20º', () => {
    const d14 = deriveCharacter(monk(14));
    expect(Object.values(d14.abilities).every((a) => a.saveProf)).toBe(true);
    expect(st(monk(14)).diamondSoul).toBe(true);
    expect([st(monk(17)).emptyBody, st(monk(18)).emptyBody]).toEqual([false, true]);
    const empty = monk(20, { combat: { ...monk(20).combat, resources: { ki: 0 } } });
    expect(initiativeRules(empty).refills.map((r) => r.resId)).toContain('ki');
  });

  it('Defesa Paciente (Esquivar): vantagem em salvaguarda de DES', () => {
    const c = monk(2);
    c.combat.marks = ['dodge'];
    expect(rollRule(c, 'save', 'dex').sources).toContain('Esquivar');
    expect(rollRule(monk(2), 'save', 'dex').advantage).toBe(false);
  });

  it('Mão Aberta: Integridade do Corpo 6º (3 × nível) e Palma Trêmula 17º', () => {
    expect(st(monk(5, { subclassId: 'openhand' })).wholenessHeal).toBeNull();
    expect(st(monk(6, { subclassId: 'openhand' })).wholenessHeal).toBe(18);
    expect(characterResources(monk(6, { subclassId: 'openhand' })).find((r) => r.id === 'wholeness')?.max).toBe(1);
    expect(st(monk(17, { subclassId: 'openhand' })).quiveringPalm).toBe(true);
  });

  it('Sombra: Artes das Sombras 3º e Passo das Sombras 6º', () => {
    expect([st(monk(3, { subclassId: 'shadow' })).shadowArts, st(monk(5, { subclassId: 'shadow' })).shadowStep, st(monk(6, { subclassId: 'shadow' })).shadowStep]).toEqual([true, false, true]);
  });

  it('Quatro Elementos: disciplinas escolhidas viram botões com custo e dano; máximo de ki por uso', () => {
    const el = st(monk(5, { subclassId: 'elements', choices: { 'monk.discipline': ['unbrokenAir', 'flowingRiver'] } }));
    expect(el.disciplines.map((d) => [d.id, d.cost])).toEqual([['unbrokenAir', 2], ['flowingRiver', 1]]);
    expect(el.disciplines[0].damage).toMatchObject({ count: 3, die: 10 });
    expect([3, 5, 9, 13, 17].map((l) => st(monk(l, { subclassId: 'elements' })).maxKiPerDiscipline)).toEqual([2, 3, 4, 5, 6]);
  });
});
