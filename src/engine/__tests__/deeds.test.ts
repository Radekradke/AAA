import { describe, expect, it } from 'vitest';
import { addDeed, cardTier, DEEDS, earnedDeeds, killKindsFor } from '../deeds';

describe('carta do herói: moldura, feitos e golpe final', () => {
  it('moldura sobe com o nível', () => {
    expect([1, 4, 5, 10, 11, 16, 17, 20].map(cardTier)).toEqual(['bronze', 'bronze', 'prata', 'prata', 'ouro', 'ouro', 'lendaria', 'lendaria']);
  });

  it('feito é conquistado uma vez, no limite certo, com data', () => {
    const t1 = new Date('2026-10-01T20:00:00Z');
    let r = addDeed(undefined, 'crits', 1, t1);
    expect(r.unlocked.map((d) => d.id)).toEqual(['crit-1']);
    expect(r.deeds.unlocked['crit-1']).toBe(t1.toISOString());
    r = addDeed(r.deeds, 'crits', 1);
    expect(r.unlocked).toEqual([]); // não repete
    r = addDeed(r.deeds, 'crits', 8);
    expect(r.unlocked.map((d) => d.id)).toEqual(['crit-10']);
    expect(r.deeds.counts.crits).toBe(10);
    expect(r.deeds.unlocked['crit-1']).toBe(t1.toISOString()); // a data do primeiro fica
  });

  it('golpe final conta o tipo da criatura', () => {
    expect(killKindsFor('Dragão')).toEqual(['kills', 'dragons']);
    expect(killKindsFor('Gigante')).toEqual(['kills', 'giants']);
    expect(killKindsFor('Morto-vivo')).toEqual(['kills', 'undead']);
    expect(killKindsFor('Corruptor (demônio)')).toEqual(['kills', 'fiends']);
    expect(killKindsFor(null)).toEqual(['kills']);
  });

  it('lista dos conquistados, do mais recente; ids únicos', () => {
    let d = addDeed(undefined, 'kills', 1, new Date('2026-01-01')).deeds;
    d = addDeed(d, 'comebacks', 1, new Date('2026-02-01')).deeds;
    expect(earnedDeeds(d).map((x) => x.def.id)).toEqual(['comeback-1', 'kill-1']);
    expect(new Set(DEEDS.map((x) => x.id)).size).toBe(DEEDS.length);
  });
});
