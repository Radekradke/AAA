import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { itemToInventory } from '../inventory';
import { characterResources } from '../classResources';
import { expertiseSlots } from '../levelUp';
import { sneakDice, weaponExtras } from '../damageExtras';
import { hasEvasion, hasUncannyDodge, reduceDamage, rogueState } from '../rogue';
import { rollRule } from '../rollRules';
import { withSubclassTools } from '../choiceEffects';
import { initiativeRules } from '../initiative';
import { spellSlotsFor } from '../spellcasting';
import { getItem } from '@/data/items';
import type { Character } from '@/types/character';

function rogue(level: number, extra: Partial<Character> = {}, weapon = 'w-rapier'): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Vex', classId: 'rogue', raceId: 'human' });
  c.level = level;
  c.classLevels = [{ classId: 'rogue', level }];
  c.baseAbilities = { str: 10, dex: 16, con: 14, int: 12, wis: 12, cha: 10 };
  const w = itemToInventory(getItem(weapon)!);
  c.inventory = [w];
  c.equipped = { armor: null, shield: null, mainHand: w.uid, offHand: null, ranged: null };
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return { ...c, ...extra };
}
const state = (c: Character) => {
  const d = deriveCharacter(c);
  return rogueState(c, d.proficiency, d.abilities.dex.mod)!;
};

describe('Ladino do 1 ao 20 (PHB 2014)', () => {
  it('Expertise: 2 vagas no 1º e +2 no 6º', () => {
    expect([1, 5, 6, 20].map((l) => expertiseSlots(rogue(l)))).toEqual([2, 2, 4, 4]);
  });

  it('Ataque Furtivo: ⌈nível/2⌉d6 e só com acuidade ou à distância', () => {
    expect([1, 2, 3, 5, 11, 19, 20].map(sneakDice)).toEqual([1, 1, 2, 3, 6, 10, 10]);
    const rapier = deriveCharacter(rogue(5)).attacks[0];
    expect(weaponExtras(rogue(5), rapier).sneak?.dice).toBe(3);
    const club = rogue(5, {}, 'w-club');
    expect(weaponExtras(club, deriveCharacter(club).attacks[0]).sneak).toBeNull();
    const bow = rogue(5, {}, 'w-shortbow');
    expect(weaponExtras(bow, deriveCharacter(bow).attacks[0]).sneak?.dice).toBe(3);
  });

  it('Gíria de Ladrão (1º) e Mente Escorregadia: proficiência em SAB no 15º', () => {
    expect(deriveCharacter(rogue(1)).languages).toContain('Gíria de Ladrão');
    expect(deriveCharacter(rogue(14)).abilities.wis.saveProf).toBe(false);
    expect(deriveCharacter(rogue(15)).abilities.wis.saveProf).toBe(true);
  });

  it('o que liga em cada nível: Ação Ardilosa 2º, Talento Confiável 11º, Sentido Cego 14º, Golpe de Sorte 20º', () => {
    expect(state(rogue(1)).cunning).toBe(false);
    expect(state(rogue(2)).cunning).toBe(true);
    expect([10, 11].map((l) => state(rogue(l)).reliable)).toEqual([false, true]);
    expect([deriveCharacter(rogue(13)).blindsense, deriveCharacter(rogue(14)).blindsense]).toEqual([null, 3]);
    expect(characterResources(rogue(19)).some((r) => r.id === 'strokeOfLuck')).toBe(false);
    expect(state(rogue(20)).strokeLeft).toBe(1);
    expect(state(rogue(20, { combat: { ...rogue(20).combat, resources: { strokeOfLuck: 0 } } })).strokeLeft).toBe(0);
  });

  it('Esquiva Sobrenatural (5º) e Evasão (7º): metade, nada ou metade, arredondando para baixo', () => {
    expect([hasUncannyDodge(rogue(4)), hasUncannyDodge(rogue(5))]).toEqual([false, true]);
    expect([hasEvasion(rogue(6)), hasEvasion(rogue(7))]).toEqual([false, true]);
    expect(reduceDamage(25, { uncanny: true })).toBe(12);
    expect(reduceDamage(25, { evasion: 'pass' })).toBe(0);
    expect(reduceDamage(25, { evasion: 'fail' })).toBe(12);
    expect(reduceDamage(25, {})).toBe(25);
  });

  it('Evasão e Esquiva também valem para o Monge 7º e para a Defesa Superior do Caçador', () => {
    const monk = rogue(7, { classId: 'monk', classLevels: [{ classId: 'monk', level: 7 }] });
    expect(hasEvasion(monk)).toBe(true);
    const hunter = rogue(15, { classId: 'ranger', classLevels: [{ classId: 'ranger', level: 15 }], subclassId: 'hunter', choices: { 'ranger.hunterDefense': ['uncannyDodge'] } });
    expect([hasUncannyDodge(hunter), hasEvasion(hunter)]).toEqual([true, false]);
  });

  it('Talento Confiável: d20 mínimo 10 só em teste com proficiência', () => {
    expect(rollRule(rogue(11), 'check', 'dex', { proficient: true }).d20Min?.value).toBe(10);
    expect(rollRule(rogue(11), 'check', 'dex', { proficient: false }).d20Min).toBeUndefined();
    expect(rollRule(rogue(11), 'save', 'dex', { proficient: true }).d20Min).toBeUndefined();
    expect(rollRule(rogue(10), 'check', 'dex', { proficient: true }).d20Min).toBeUndefined();
  });

  it('Ladrão: Mãos Rápidas 3º, Furtividade Suprema 9º (andou até metade), Reflexos 17º', () => {
    const thief = (l: number, moved = 0) => {
      const c = rogue(l, { subclassId: 'thief' });
      c.combat.moveUsed = moved;
      return c;
    };
    expect(state(thief(3)).fastHands).toBe(true);
    expect(rollRule(thief(9, 4.5), 'check', 'dex', { skill: 'stealth', speed: 9 }).sources).toContain('Furtividade Suprema');
    expect(rollRule(thief(9, 6), 'check', 'dex', { skill: 'stealth', speed: 9 }).advantage).toBe(false);
    expect(rollRule(thief(8, 0), 'check', 'dex', { skill: 'stealth', speed: 9 }).advantage).toBe(false);
    expect([initiativeRules(thief(16)).secondTurn, initiativeRules(thief(17)).secondTurn]).toEqual([false, true]);
  });

  it('Assassino: Assassinar 3º, kits de disfarce e envenenador, Golpe Mortal 17º com CD 8 + DES + prof', () => {
    const a3 = rogue(3, { subclassId: 'assassin', toolProfs: [] });
    expect(state(a3).assassinate).toBe(true);
    expect(withSubclassTools(a3).toolProfs?.map((t) => t.id)).toEqual(['disguise-kit', 'poisoners-kit']);
    expect(withSubclassTools(rogue(2, { subclassId: 'assassin', toolProfs: [] })).toolProfs).toEqual([]);
    const already = withSubclassTools(a3);
    expect(withSubclassTools(already)).toBe(already);
    expect(state(rogue(16, { subclassId: 'assassin' })).deathStrikeDC).toBeNull();
    expect(state(rogue(17, { subclassId: 'assassin' })).deathStrikeDC).toBe(8 + 3 + 6);
  });

  it('Trapaceiro Arcano: conjurador de 1/3 (2 espaços de 1º no 3º; 4/3/3/1 no 20º)', () => {
    expect(spellSlotsFor(rogue(3, { subclassId: 'trickster' }))).toEqual({ 1: 2 });
    expect(spellSlotsFor(rogue(20, { subclassId: 'trickster' }))).toEqual({ 1: 4, 2: 3, 3: 3, 4: 1 });
    expect(spellSlotsFor(rogue(20))).toEqual({});
  });
});
