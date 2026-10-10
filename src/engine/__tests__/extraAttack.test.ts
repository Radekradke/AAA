import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { attacksPerAction } from '../extraAttack';

const at = (classId: string, level: number, extra: Partial<ReturnType<typeof createDraftCharacter>> = {}) => {
  const c = createDraftCharacter({ ownerId: 't', name: 'X', classId });
  c.level = level;
  c.classLevels = [{ classId, level }];
  return attacksPerAction({ ...c, ...extra });
};

describe('Ataque Extra (PHB 2014)', () => {
  it('Guerreiro 2/3/4 ataques nos níveis 5, 11 e 20', () => {
    expect(at('fighter', 4).count).toBe(1);
    expect(at('fighter', 5).count).toBe(2);
    expect(at('fighter', 11).count).toBe(3);
    expect(at('fighter', 20).count).toBe(4);
  });
  it('Paladino, Bárbaro, Monge e Patrulheiro: 2 no 5º', () => {
    for (const c of ['paladin', 'barbarian', 'monk', 'ranger']) expect(at(c, 5).count).toBe(2);
  });
  it('Bardo só com o Colégio da Bravura, no 6º', () => {
    expect(at('bard', 6).count).toBe(1);
    expect(at('bard', 6, { subclassId: 'valor' }).count).toBe(2);
  });
  it('Bruxo com Lâmina Sedenta', () => {
    expect(at('warlock', 5).count).toBe(1);
    expect(at('warlock', 5, { choices: { 'warlock.invocation': ['thirstingBlade'] } }).count).toBe(2);
  });
  it('multiclasse não soma: vale o maior', () => {
    expect(at('fighter', 5, { classLevels: [{ classId: 'fighter', level: 5 }, { classId: 'paladin', level: 5 }], level: 10 }).count).toBe(2);
  });
});

describe('dano do truque no cartão escala com o nível', () => {
  it('Chama Sagrada 2d8 no 5º, Rajada Mística 2 feixes', async () => {
    const { spellDamageLabel } = await import('../spellCast');
    const { SPELLS } = await import('@/data/spells');
    const flame = SPELLS.find((s) => s.name === 'Chama Sagrada')!;
    const eb = SPELLS.find((s) => s.id === 'sp-eldritch')!;
    expect(spellDamageLabel(flame, 1)).toBe('1d8 radiante');
    expect(spellDamageLabel(flame, 5)).toBe('2d8 radiante');
    expect(spellDamageLabel(flame, 17)).toBe('4d8 radiante');
    expect(spellDamageLabel(eb, 5)).toBe('2× 1d10 energia');
  });
});
