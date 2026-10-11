import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { characterResources } from '../classResources';
import { empoweredEvocation, grimHarvest, overchannelBacklash, validRecovery, wizardFreeCast, wizardState } from '../wizard';
import { spellSlotsFor, spellsKnownOrPrepared, cantripsKnown } from '../spellcasting';
import { pendingChoices } from '../classChoices';
import { SPELL_BY_ID } from '@/data/spells';
import type { Character } from '@/types/character';

function wizard(level: number, subclassId: string | null = null, choices: Record<string, string[]> = {}): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Elminor', classId: 'wizard', raceId: 'human' });
  c.level = level;
  c.classLevels = [{ classId: 'wizard', level }];
  c.subclassId = subclassId;
  c.baseAbilities = { str: 8, dex: 14, con: 14, int: 16, wis: 12, cha: 10 };
  c.choices = choices;
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return c;
}
const st = (c: Character) => {
  const d = deriveCharacter(c);
  return wizardState(c, d.proficiency, d.abilities.int.mod)!;
};
const res = (c: Character) => Object.fromEntries(characterResources(c).map((r) => [r.id, r]));

describe('Mago do 1 ao 20 (PHB 2014)', () => {
  it('Conjuração: truques, grimório (6 + 2 por nível) e espaços de conjurador completo', () => {
    expect([1, 4, 10].map((l) => cantripsKnown('wizard', l))).toEqual([3, 4, 5]);
    expect([1, 5, 20].map((l) => spellsKnownOrPrepared('wizard', l, 3).count)).toEqual([6, 14, 44]);
    expect(spellSlotsFor(wizard(9))).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 });
    expect(st(wizard(5)).dc).toBe(8 + 3 + 3);
  });

  it('Recuperação Arcana: até metade do nível (para cima), nenhum de 6º+, só espaços gastos', () => {
    expect(st(wizard(5)).recovery).toEqual({ budget: 3, left: 1 });
    const slots = { 1: { max: 4, used: 2 }, 2: { max: 3, used: 1 }, 3: { max: 2, used: 1 }, 6: { max: 1, used: 1 } };
    const c = wizard(5);
    expect(validRecovery(c, { 1: 1, 2: 1 }, slots)).toBe(true);
    expect(validRecovery(c, { 3: 1 }, slots)).toBe(true);
    expect(validRecovery(c, { 2: 1, 3: 1 }, slots)).toBe(false); // passa de 3
    expect(validRecovery(c, { 1: 3 }, slots)).toBe(false); // só 2 gastos
    expect(validRecovery(wizard(20), { 6: 1 }, slots)).toBe(false); // 6º+ não
  });

  it('Domínio de Magia (18º) à vontade; Magias de Assinatura (20º) 1× por descanso curto', () => {
    const c = wizard(20, null, { 'wizard.spellMastery1': ['sp-escudo'], 'wizard.signature': ['sp-bolafogo', 'phb-counterspell'] });
    expect(wizardFreeCast(c, 'sp-escudo')).toEqual({ kind: 'mastery' });
    expect(wizardFreeCast(c, 'sp-bolafogo')).toEqual({ kind: 'signature', resId: 'signature-sp-bolafogo', left: 1 });
    expect(res(c)['signature-sp-bolafogo']).toMatchObject({ recharge: 'short', max: 1 });
    expect(wizardFreeCast(wizard(17, null, { 'wizard.spellMastery1': ['sp-escudo'] }), 'sp-escudo')).toBeNull();
    const keys = pendingChoices(wizard(18)).map((p) => p.spec.key);
    expect(keys).toEqual(expect.arrayContaining(['spellMastery1', 'spellMastery2']));
  });

  it('Abjuração: Barreira Arcana = 2 × nível + INT; Resistência a Magia (14º)', () => {
    expect(st(wizard(2, 'abjuration')).ward).toEqual({ hp: 7, max: 7, up: false });
    expect(st(wizard(10, 'abjuration')).ward?.max).toBe(23);
    expect(deriveCharacter(wizard(14, 'abjuration')).resistances.some((r) => r.source === 'Resistência a Magia')).toBe(true);
  });

  it('Adivinhação: Portento 2 d20 (3 no 14º)', () => {
    expect(st(wizard(2, 'divination')).portent).toEqual({ rolls: [], count: 2 });
    expect(st(wizard(14, 'divination')).portent?.count).toBe(3);
  });

  it('Evocação: Evocação Poderosa (+INT, 10º) e Sobrecarga (14º, custo crescente)', () => {
    const fireball = SPELL_BY_ID['sp-bolafogo'];
    expect(empoweredEvocation(wizard(9, 'evocation'), fireball, 3)).toBe(0);
    expect(empoweredEvocation(wizard(10, 'evocation'), fireball, 3)).toBe(3);
    const notEvocation = Object.values(SPELL_BY_ID).find((s) => s.damage && s.school !== 'Evocação' && s.classes?.includes('wizard'))!;
    expect(empoweredEvocation(wizard(10, 'evocation'), notEvocation, 3)).toBe(0);
    expect([overchannelBacklash(0, 5), overchannelBacklash(1, 5), overchannelBacklash(2, 3)]).toEqual([0, 10, 9]);
    expect(st(wizard(14, 'evocation')).overchannel).toEqual({ uses: 0 });
  });

  it('Necromancia: Colheita Sinistra 2 × círculo (3 × necromancia); Acostumado à Morte-Vida (10º)', () => {
    expect([grimHarvest(0, false), grimHarvest(3, false), grimHarvest(3, true)]).toEqual([0, 6, 9]);
    expect(deriveCharacter(wizard(10, 'necromancy')).resistances.some((r) => /necrótico/.test(r.value))).toBe(true);
  });

  it('Conjuração (6º) e Ilusão (10º): usos de Transposição Benigna e Eu Ilusório', () => {
    expect(st(wizard(6, 'conjuration')).left.benignTransposition).toBe(1);
    expect(st(wizard(10, 'illusion')).left.illusorySelf).toBe(1);
    expect(res(wizard(10, 'illusion')).illusorySelf.recharge).toBe('short');
  });
});
