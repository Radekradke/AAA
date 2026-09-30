import { describe, it, expect } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { forgetBlock, learnBlock, spellLearnState } from '../spellRules';
import { damageRoll, damageTypeLabel, damageTypeOptions, healRoll, parseDice, spellAttackPlan, spellHitDamage } from '../spellCast';
import { SPELL_BY_ID } from '@/data/spells';
import type { Character } from '@/types/character';

function at(classId: string, level: number, patch: Partial<Character> = {}): Character {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'T', classId }));
  return { ...c, ...patch, level, classLevels: [{ classId, level }] };
}
const sp = (id: string) => SPELL_BY_ID[id];

describe('só aprende o que pode (PHB 2014)', () => {
  it('fora da lista e acima do círculo são bloqueados', () => {
    const c = at('sorcerer', 1, { preparedSpells: [] });
    const st = spellLearnState(c, 3)!;
    expect(learnBlock(c, st, sp('sp-curar'))).toMatch(/Fora da lista/);
    expect(learnBlock(c, st, sp('sp-bolafogo'))).toMatch(/3º círculo/);
    expect(learnBlock(c, st, sp('sp-misseis'))).toBeNull();
  });

  it('feiticeiro 1: 4 truques e 2 conhecidas, e troca só com a troca do nível', () => {
    const c = at('sorcerer', 1, { preparedSpells: ['sp-firebolt', 'sp-raygelo', 'sp-maosmagicas', 'sp-prestidigitacao', 'sp-misseis', 'sp-escudo'] });
    const st = spellLearnState(c, 3)!;
    expect(learnBlock(c, st, sp('phb-shocking-grasp'))).toMatch(/Limite de truques/);
    expect(learnBlock(c, st, sp('sp-sono'))).toMatch(/Limite de 2/);
    expect(forgetBlock(st, sp('sp-misseis')).block).toMatch(/subir de nível/);
    const withSwap = spellLearnState({ ...c, spellSwaps: 1 }, 3)!;
    expect(forgetBlock(withSwap, sp('sp-misseis'))).toEqual({ block: null, usesSwap: true });
    expect(forgetBlock(withSwap, sp('sp-firebolt')).block).toMatch(/Truques não se trocam/);
  });

  it('clérigo prepara até SAB + nível e despreparar é livre', () => {
    const c = at('cleric', 1, { preparedSpells: ['sp-bencao'] });
    const st = spellLearnState(c, 0)!; // SAB +0 → 1 preparada
    expect(st.prepared).toEqual({ have: 1, max: 1 });
    expect(learnBlock(c, st, sp('sp-curar'))).toMatch(/Limite de 1 preparadas/);
    expect(forgetBlock(st, sp('sp-bencao')).block).toBeNull();
  });

  it('mago: 6 grátis no grimório inicial; depois copia pagando 50 po/círculo', () => {
    const c = at('wizard', 1);
    expect((c.knownSpells ?? []).length).toBe(6);
    const st = spellLearnState(c, 3)!;
    expect(st.known).toEqual({ have: 6, max: 6 });
    const extra = Object.values(SPELL_BY_ID).find((s) => s.level === 1 && s.classes?.includes('wizard') && !(c.knownSpells ?? []).includes(s.id))!;
    expect(learnBlock(c, st, extra)).toMatch(/copie de um pergaminho/);
    expect(learnBlock({ ...c, coins: { ...c.coins, gp: 0 } }, st, extra, 'copy')).toMatch(/50 po/);
    expect(learnBlock({ ...c, coins: { ...c.coins, gp: 60 } }, st, extra, 'copy')).toBeNull();
    expect(learnBlock(c, st, sp('sp-firebolt'), 'copy')).toMatch(/Truques/);
  });

  it('cavaleiro arcano fica nas escolas de abjuração/evocação', () => {
    const c = at('fighter', 3, { subclassId: 'eldritch', preparedSpells: ['sp-sono'] });
    const st = spellLearnState(c, 1)!;
    expect(learnBlock(c, st, sp('phb-disguise-self'))).toMatch(/Abjuração ou Evocação/);
    expect(learnBlock(c, st, sp('sp-escudo'))).toBeNull();
  });

  it('bruxo pode aprender a lista expandida do patrono', () => {
    const c = at('warlock', 1, { subclassId: 'fiend', preparedSpells: [] });
    expect(learnBlock(c, spellLearnState(c, 3)!, sp('sp-flechacida'))).toBeNull();
  });
});

describe('conjurar: dados escalados', () => {
  it('lê dados e fixos', () => {
    expect(parseDice('7d8 + 30')).toEqual({ count: 7, sides: 8, bonus: 30 });
    expect(parseDice('4d6 + 4d6')).toEqual({ count: 8, sides: 6, bonus: 0 });
    expect(parseDice('variado')).toBeNull();
  });
  it('bola de fogo no 5º círculo = 10d6; raio de fogo no nível 11 = 3d10', () => {
    expect(damageRoll(sp('sp-bolafogo'), 5, 9)!.count).toBe(10);
    expect(damageRoll(sp('sp-firebolt'), 0, 11)!.count).toBe(3);
  });
  it('curar ferimentos no 3º círculo soma o modificador', () => {
    const r = healRoll(sp('sp-curar'), 3, 4)!;
    expect([r.count, r.sides, r.bonus]).toEqual([3, 8, 4]);
  });
});

describe('mísseis mágicos', () => {
  it('3 dardos no 1º, 5 no 3º', () => {
    expect(damageRoll(sp('sp-misseis'), 1, 1)).toMatchObject({ count: 3, sides: 4, bonus: 3 });
    expect(damageRoll(sp('sp-misseis'), 3, 5)).toMatchObject({ count: 5, sides: 4, bonus: 5 });
  });
});

describe('tipo de dano à escolha', () => {
  it('Orbe Cromático escolhe entre 6 tipos; Bola de Fogo é fixa', () => {
    expect(damageTypeOptions(sp('phb-chromatic-orb'))).toEqual(['ácido', 'frio', 'fogo', 'elétrico', 'veneno', 'trovejante']);
    expect(damageTypeOptions(sp('sp-bolafogo'))).toBeNull();
    expect(damageRoll(sp('phb-chromatic-orb'), 1, 1, 'fogo')!.label).toBe('Orbe Cromático · fogo');
    expect(damageRoll(sp('phb-chromatic-orb'), 3, 5, 'frio')).toMatchObject({ count: 5, sides: 8 });
  });
  it('Onda Destrutiva só troca a metade radiante', () => {
    expect(damageTypeLabel(sp('phb-destructive-wave'), 'necrótico')).toBe('trovejante + necrótico');
    expect(damageTypeLabel(sp('phb-spirit-guardians'), 'necrótico')).toBe('necrótico');
    expect(damageTypeLabel(sp('phb-spirit-guardians'), 'fogo')).toBe('radiante/necrótico'); // fora da lista: ignora
  });
});

describe('ataque de magia: dano só no acerto', () => {
  it('Orbe: acerto rola 3d8, crítico 6d8, erro nada', () => {
    const plan = spellAttackPlan(sp('phb-chromatic-orb'), 1, 1, 'fogo')!;
    expect(plan.beams).toBe(1);
    expect(spellHitDamage(plan, ['hit'])).toMatchObject({ count: 3, sides: 8, label: 'Orbe Cromático · fogo' });
    expect(spellHitDamage(plan, ['crit'])).toMatchObject({ count: 6, sides: 8 });
    expect(spellHitDamage(plan, ['miss'])).toBeNull();
  });
  it('Raio Ardente: 3 raios no 2º, 4 no 3º; dano só dos que acertaram', () => {
    expect(spellAttackPlan(sp('sp-calorabrasante'), 2, 3)!.beams).toBe(3);
    const plan = spellAttackPlan(sp('sp-calorabrasante'), 3, 5)!;
    expect(plan.beams).toBe(4);
    expect(spellHitDamage(plan, ['hit', 'miss', 'crit', 'miss'])).toMatchObject({ count: 6, sides: 6 });
  });
  it('Rajada Mística: feixes por nível, 1d10 cada (não soma dados)', () => {
    expect(spellAttackPlan(sp('sp-eldritch'), 0, 4)).toMatchObject({ beams: 1, perHit: { count: 1, sides: 10 } });
    expect(spellAttackPlan(sp('sp-eldritch'), 0, 11)!.beams).toBe(3);
  });
  it('Flecha Ácida de Melf: errar ainda causa metade', () => {
    const plan = spellAttackPlan(sp('sp-flechacidamelf'), 2, 3)!;
    expect(plan.missHalf).toBe(true);
    expect(spellHitDamage(plan, ['miss'])).toMatchObject({ count: 4, half: true });
  });
});
