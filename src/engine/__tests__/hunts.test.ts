import { describe, expect, it } from 'vitest';
import { addHunt, bestHunt, huntKnowledge, huntTier, huntsOf, isHuntRef, nextHuntTier } from '../hunts';
import { addDeed } from '../deeds';
import type { HeroDeeds } from '../deeds';

const kill = (deeds: HeroDeeds | undefined, ref: string, times: number) => {
  let d = deeds;
  const tiers: string[] = [];
  for (let i = 0; i < times; i++) {
    const r = addHunt(d, ref, new Date(Date.UTC(2026, 0, 1 + i)));
    d = r.deeds;
    if (r.tier) tiers.push(r.tier.id);
  }
  return { deeds: d!, tiers };
};

describe('bestiário de caçadas', () => {
  it('níveis de conhecimento: 1, 3, 5, 10 e 25 abates', () => {
    expect(huntTier(0)).toBeNull();
    expect(huntTier(1)?.id).toBe('rastro');
    expect(huntTier(4)?.id).toBe('presa');
    expect(huntTier(9)?.id).toBe('estudada');
    expect(huntTier(24)?.id).toBe('especialidade');
    expect(huntTier(99)?.id).toBe('nemesis');
    expect(nextHuntTier(3)?.min).toBe(5);
    expect(nextHuntTier(25)).toBeNull();
  });

  it('o que cada nível revela', () => {
    expect(huntKnowledge(0)).toEqual({ basics: false, defense: false, resist: false, attacks: false, full: false });
    expect(huntKnowledge(3)).toEqual({ basics: true, defense: true, resist: false, attacks: false, full: false });
    expect(huntKnowledge(10)).toMatchObject({ resist: true, attacks: true, full: false });
    expect(huntKnowledge(25).full).toBe(true);
  });

  it('soma abates por criatura e avisa só quando sobe de nível', () => {
    const { deeds, tiers } = kill(undefined, 'goblin', 10);
    expect(deeds.hunts?.goblin).toMatchObject({ n: 10, first: '2026-01-01T00:00:00.000Z', last: '2026-01-10T00:00:00.000Z' });
    expect(tiers).toEqual(['rastro', 'presa', 'estudada', 'especialidade']);
  });

  it('ignora id torto e não mexe no resto dos feitos', () => {
    const base = addDeed(undefined, 'kills').deeds;
    expect(addHunt(base, '../hack').deeds).toBe(base);
    expect(isHuntRef('Goblin')).toBe(false);
    const next = addHunt({ ...base, burst: { day: '2026-01-01', crits: 2 } }, 'wolf').deeds;
    expect(next.counts.kills).toBe(1);
    expect(next.burst).toEqual({ day: '2026-01-01', crits: 2 });
  });

  it('somar outro feito preserva as caçadas', () => {
    const hunted = kill(undefined, 'wolf', 2).deeds;
    expect(addDeed(hunted, 'kills').deeds.hunts?.wolf?.n).toBe(2);
  });

  it('lista as mais caçadas primeiro e o melhor caçador da mesa', () => {
    let d = kill(undefined, 'wolf', 2).deeds;
    d = kill(d, 'goblin', 5).deeds;
    expect(huntsOf(d).map(([ref]) => ref)).toEqual(['goblin', 'wolf']);
    expect(bestHunt([{ deeds: d }, { deeds: kill(undefined, 'wolf', 7).deeds }, {}], 'wolf')).toBe(7);
    expect(bestHunt([], 'wolf')).toBe(0);
  });
});
