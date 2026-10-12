import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { characterResources } from '../classResources';
import { SLOT_COST, WILD_SURGE, elementalAffinity, sorcererState, wildSurgeEffect } from '../sorcerer';
import { spellSlotsFor, spellsKnownOrPrepared, cantripsKnown } from '../spellcasting';
import { pendingChoices } from '../classChoices';
import { SPELL_BY_ID } from '@/data/spells';
import type { Character } from '@/types/character';

function sorc(level: number, subclassId: string | null = null, choices: Record<string, string[]> = {}): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Vesper', classId: 'sorcerer', raceId: 'human' });
  c.level = level;
  c.classLevels = [{ classId: 'sorcerer', level }];
  c.subclassId = subclassId;
  c.baseAbilities = { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 16 };
  c.choices = choices;
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return c;
}
const st = (c: Character) => {
  const d = deriveCharacter(c);
  return sorcererState(c, d.proficiency, d.abilities.cha.mod)!;
};
const res = (c: Character) => Object.fromEntries(characterResources(c).map((r) => [r.id, r]));

describe('Feiticeiro do 1 ao 20 (PHB 2014)', () => {
  it('Conjuração: truques, magias conhecidas e espaços de conjurador completo', () => {
    expect([1, 4, 10].map((l) => cantripsKnown('sorcerer', l))).toEqual([4, 5, 6]);
    expect([1, 2, 11, 17].map((l) => spellsKnownOrPrepared('sorcerer', l, 3).count)).toEqual([2, 3, 12, 15]);
    expect(spellSlotsFor(sorc(5))).toEqual({ 1: 4, 2: 3, 3: 2 });
    expect(st(sorc(5)).dc).toBe(8 + 3 + 3);
  });

  it('Pontos de Feitiçaria = nível (2º+); Fonte de Magia custa 2/3/5/6/7 até o 5º', () => {
    expect(res(sorc(1)).sorcery).toBeUndefined();
    expect([2, 9, 20].map((l) => res(sorc(l)).sorcery.max)).toEqual([2, 9, 20]);
    expect(SLOT_COST).toEqual({ 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 });
  });

  it('Metamagia: 2 no 3º, +1 no 10º e no 17º; custo de cada opção', () => {
    const keys = (l: number) => pendingChoices(sorc(l)).filter((p) => p.spec.key === 'metamagic').reduce((n, p) => n + p.missing, 0);
    expect([keys(2), keys(3), keys(10), keys(17)]).toEqual([0, 2, 3, 4]);
    const s = st(sorc(10, null, { 'sorcerer.metamagic': ['quickened', 'twinned', 'heightened'] }));
    expect(s.metamagic.map((m) => [m.id, m.cost])).toEqual([['heightened', 3], ['quickened', 2], ['twinned', 'circle']]);
  });

  it('Restauração Feiticeira (20º)', () => {
    expect([st(sorc(19)).restoration, st(sorc(20)).restoration]).toEqual([false, true]);
  });

  it('Dracônica: CA 13 + DES, +1 PV/nível, Afinidade Elemental (6º) no dano do tipo do ancestral, resistência por 1 ponto', () => {
    const red = (l: number) => sorc(l, 'draconic', { 'sorcerer.dragonAncestor': ['red'] });
    const d = deriveCharacter(red(1));
    expect(d.ac).toBe(13 + 2);
    expect(deriveCharacter(red(5)).maxHp - deriveCharacter(sorc(5)).maxHp).toBe(5);
    const fireBolt = SPELL_BY_ID['sp-raiofogo'] ?? Object.values(SPELL_BY_ID).find((s) => s.level === 0 && s.damage?.type === 'fogo')!;
    expect(elementalAffinity(red(5), fireBolt, null, 3)).toBe(0);
    expect(elementalAffinity(red(6), fireBolt, null, 3)).toBe(3);
    const cold = Object.values(SPELL_BY_ID).find((s) => s.damage?.type === 'frio')!;
    expect(elementalAffinity(red(6), cold, null, 3)).toBe(0);
    expect(st(red(6))).toMatchObject({ affinity: true, dragonType: 'fogo', wings: false });
    const warded = red(6);
    warded.combat.marks = ['draconicWard'];
    expect(deriveCharacter(warded).resistances.find((r) => r.source === 'Afinidade Elemental')?.value).toBe('fogo');
    expect([st(red(14)).wings, st(red(18)).presence]).toEqual([true, true]);
  });

  it('Magia Selvagem: Marés do Caos, Distorcer o Destino (6º), Caos Controlado (14º) e a tabela de Surto', () => {
    expect(st(sorc(1, 'wild')).tidesLeft).toBe(1);
    expect([st(sorc(5, 'wild')).bendLuck, st(sorc(6, 'wild')).bendLuck]).toEqual([false, true]);
    expect(st(sorc(14, 'wild')).controlledChaos).toBe(true);
    expect(WILD_SURGE).toHaveLength(50);
    expect(wildSurgeEffect(1)).toBe(WILD_SURGE[0]);
    expect(wildSurgeEffect(2)).toBe(WILD_SURGE[0]);
    expect(wildSurgeEffect(3)).toBe(WILD_SURGE[1]);
    expect(wildSurgeEffect(100)).toMatch(/pontos de feitiçaria/);
  });
});
