import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { characterResources } from '../classResources';
import { warlockState } from '../warlock';
import { warlockSlots } from '../progression';
import { grantedSpells, invocationSpells, spellSlotsFor } from '../spellcasting';
import { conditionImmunity } from '../conditionImmunity';
import { attacksPerAction } from '../extraAttack';
import type { Character } from '@/types/character';

function warlock(level: number, extra: Partial<Character> = {}): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Morrigan', classId: 'warlock', raceId: 'human' });
  c.level = level;
  c.classLevels = [{ classId: 'warlock', level }];
  c.baseAbilities = { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 16 };
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return { ...c, ...extra };
}
const st = (c: Character) => {
  const d = deriveCharacter(c);
  return warlockState(c, d.proficiency, d.abilities.cha.mod)!;
};
const res = (c: Character) => Object.fromEntries(characterResources(c).map((r) => [r.id, r]));

describe('Bruxo do 1 ao 20 (PHB 2014)', () => {
  it('Magia de Pacto: 1 → 2 → 3 → 4 espaços, sempre no círculo mais alto (até o 5º)', () => {
    expect([1, 2, 3, 5, 7, 9, 11, 17].map((l) => warlockSlots(l))).toEqual([
      { 1: 1 }, { 1: 2 }, { 2: 2 }, { 3: 2 }, { 4: 2 }, { 5: 2 }, { 5: 3 }, { 5: 4 },
    ]);
    expect(spellSlotsFor(warlock(9))).toEqual({ 5: 2 });
    const s = st(warlock(11));
    expect([s.pactCircle, s.pactMax, s.dc]).toEqual([5, 3, 8 + 4 + 3]);
  });

  it('Dádivas do Pacto: Corrente ensina convocar familiar; Lâmina dá a arma (e Lâmina Sedenta, 2 ataques)', () => {
    expect(grantedSpells(warlock(3, { choices: { 'warlock.pact': ['chain'] } })).map((g) => g.id)).toContain('phb-find-familiar');
    expect(grantedSpells(warlock(2, { choices: { 'warlock.pact': ['chain'] } })).map((g) => g.id)).not.toContain('phb-find-familiar');
    expect(grantedSpells(warlock(3, { choices: { 'warlock.pact': ['tome'] } })).map((g) => g.id)).not.toContain('phb-find-familiar');
    const blade = warlock(5, { choices: { 'warlock.pact': ['blade'], 'warlock.invocation': ['thirstingBlade'] } });
    expect(attacksPerAction(blade).count).toBe(2);
  });

  it('Invocações que viram magia: à vontade e 1× por descanso longo', () => {
    const c = warlock(9, { choices: { 'warlock.invocation': ['armorOfShadows', 'mireTheMind', 'devilsSight'] } });
    expect(invocationSpells(c).map((s) => [s.id, s.recharge])).toEqual([['armorOfShadows', 'atwill'], ['mireTheMind', 'long']]);
    expect(res(c)['inv-mireTheMind']?.max).toBe(1);
    expect(deriveCharacter(c).darkvision?.range).toBe(36);
  });

  it('Arcano Místico 11º/13º/15º/17º e Mestre Místico 20º (devolve os espaços)', () => {
    expect(Object.keys(res(warlock(17))).filter((k) => k.startsWith('arcanum'))).toEqual(['arcanum6', 'arcanum7', 'arcanum8', 'arcanum9']);
    expect(res(warlock(10)).arcanum6).toBeUndefined();
    expect([st(warlock(19)).left.eldritchMaster, st(warlock(20)).left.eldritchMaster]).toEqual([0, 1]);
  });

  it('Corruptor: Bênção (CAR + nível), Sorte 6º, Resiliência 10º (tipo escolhido), Arremesso 14º', () => {
    expect(st(warlock(5, { subclassId: 'fiend' })).blessingTemp).toBe(3 + 5);
    expect([st(warlock(5, { subclassId: 'fiend' })).left.darkLuck, st(warlock(6, { subclassId: 'fiend' })).left.darkLuck]).toEqual([0, 1]);
    const r10 = warlock(10, { subclassId: 'fiend', choices: { 'warlock.fiendResilience': ['fogo'] } });
    expect(st(r10).resilience).toBe('fogo');
    expect(deriveCharacter(r10).resistances.find((r) => r.source === 'Resiliência Infernal')?.value).toMatch(/^fogo/);
    expect(st(warlock(14, { subclassId: 'fiend' })).left.hurlHell).toBe(1);
  });

  it('Arquifada: Presença 1º, Fuga Enevoada 6º, Defesas Encantadoras 10º (não fica Enfeitiçado), Delírio 14º', () => {
    expect(st(warlock(1, { subclassId: 'archfey' })).left.feyPresence).toBe(1);
    expect(st(warlock(6, { subclassId: 'archfey' })).left.mistyEscape).toBe(1);
    expect(conditionImmunity(warlock(9, { subclassId: 'archfey' }), 'Enfeitiçado')).toBeNull();
    expect(conditionImmunity(warlock(10, { subclassId: 'archfey' }), 'Enfeitiçado')).toBe('Defesas Encantadoras');
    expect(st(warlock(14, { subclassId: 'archfey' })).left.darkDelirium).toBe(1);
  });

  it('Grande Antigo: Escudo Entrópico 6º e Escudo Mental 10º (resistência psíquica)', () => {
    expect(st(warlock(6, { subclassId: 'oldone' })).left.entropicWard).toBe(1);
    expect(deriveCharacter(warlock(9, { subclassId: 'oldone' })).resistances.some((r) => r.source === 'Escudo Mental')).toBe(false);
    expect(deriveCharacter(warlock(10, { subclassId: 'oldone' })).resistances.find((r) => r.source === 'Escudo Mental')?.value).toBe('psíquico');
  });
});
