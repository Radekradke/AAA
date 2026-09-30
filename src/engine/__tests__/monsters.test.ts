import { describe, expect, it } from 'vitest';
import { MONSTERS, MONSTER_BY_ID, crValue } from '@/data/bestiary';
import { damageDice, encounterBudget, monsterHp } from '../monsters';

describe('bestiário SRD', () => {
  it('ids únicos, XP pelo ND e PV médios batem com os dados de vida', () => {
    expect(new Set(MONSTERS.map((m) => m.id)).size).toBe(MONSTERS.length);
    expect(MONSTERS.length).toBeGreaterThanOrEqual(50);
    for (const m of MONSTERS) {
      expect(m.xp, m.id).toBeGreaterThan(0);
      // média de NdX+B = N*(X+1)/2 + B (arredondada para baixo)
      const d = m.hpDice.match(/^(\d+)d(\d+)([+-]\d+)?$/)!;
      const avg = Math.floor((Number(d[1]) * (Number(d[2]) + 1)) / 2 + (d[3] ? Number(d[3]) : 0));
      expect(Math.abs(avg - m.hp), `${m.id} ${m.hpDice}=${avg} vs ${m.hp}`).toBeLessThanOrEqual(1);
      for (const a of m.actions) if (a.damage) expect(damageDice(a.damage), `${m.id} ${a.name}`).not.toBeNull();
    }
    expect(MONSTER_BY_ID.goblin.xp).toBe(50);
    expect(crValue('1/4')).toBe(0.25);
  });
  it('PV rolados ficam na faixa dos dados', () => {
    const ogre = MONSTER_BY_ID.ogre; // 7d10+21
    expect(monsterHp(ogre, 'roll', () => 0)).toBe(28);
    expect(monsterHp(ogre, 'roll', () => 0.999)).toBe(91);
    expect(monsterHp(ogre, 'average')).toBe(59);
  });
});

describe('dificuldade do encontro (Guia do Mestre)', () => {
  it('4 heróis de nível 1 contra 4 goblins = mortal (200 XP × 2 = 400)', () => {
    const b = encounterBudget([1, 1, 1, 1], [50, 50, 50, 50])!;
    expect([b.xp, b.multiplier, b.adjusted, b.difficulty, b.perPlayer]).toEqual([200, 2, 400, 'mortal', 50]);
  });
  it('4 heróis de nível 3 contra 1 ogro = fácil (450 < 600)', () => {
    const b = encounterBudget([3, 3, 3, 3], [450])!;
    expect(b.difficulty).toBe('fácil');
  });
  it('grupo pequeno sobe o multiplicador', () => {
    expect(encounterBudget([5, 5], [1800])!.multiplier).toBe(1.5);
    expect(encounterBudget([5, 5, 5, 5, 5, 5], [100, 100])!.multiplier).toBe(1);
  });
});
