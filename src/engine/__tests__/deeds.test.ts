import { describe, expect, it } from 'vitest';
import { addCrit, addDeed, availableTitles, cardTier, crValue, DEEDS, earnedDeeds, heroTitle, killKindsFor } from '../deeds';

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

  it('todo feito tem raridade; os 5 secretos existem e dão título', () => {
    for (const d of DEEDS) expect(['comum', 'raro', 'epico', 'lendario']).toContain(d.rarity);
    const secret = DEEDS.filter((d) => d.secret);
    expect(secret.map((d) => d.kind).sort()).toEqual(['cantripKills', 'clutch', 'critBursts', 'deathSaveCrits', 'upsets']);
    expect(secret.every((d) => d.title)).toBe(true);
    expect(DEEDS.find((d) => d.id === 'crit-1')?.rarity).toBe('comum');
    expect(DEEDS.find((d) => d.id === 'dragon-1')?.rarity).toBe('epico');
  });

  it('3 críticos no mesmo dia: "Fúria dos dados" (outro dia recomeça a contagem)', () => {
    const d1 = new Date(2026, 9, 5, 20);
    let r = addCrit(undefined, d1);
    r = addCrit(r.deeds, new Date(2026, 9, 6, 20)); // outro dia
    r = addCrit(r.deeds, new Date(2026, 9, 6, 21));
    expect(r.deeds.unlocked['burst-1']).toBeUndefined();
    r = addCrit(r.deeds, new Date(2026, 9, 6, 22));
    expect(r.unlocked.map((d) => d.id)).toContain('burst-1');
    expect(r.deeds.counts).toMatchObject({ crits: 4, critBursts: 1 });
    r = addCrit(r.deeds, new Date(2026, 9, 6, 23)); // 4º do dia não conta de novo
    expect(r.deeds.counts.critBursts).toBe(1);
  });

  it('golpe final: truque e ND acima do nível', () => {
    expect(crValue('1/4')).toBe(0.25);
    expect(crValue('5')).toBe(5);
    expect(killKindsFor('Dragão', { cr: '7', level: 5, cantrip: true })).toEqual(['kills', 'dragons', 'cantripKills', 'upsets']);
    expect(killKindsFor('Humanoide', { cr: '5', level: 5 })).toEqual(['kills']); // igual ao nível não conta
    expect(killKindsFor('Humanoide', { cr: '1/2', level: null })).toEqual(['kills']);
  });

  it('título só vale com o feito conquistado', () => {
    const deeds = addDeed(undefined, 'dragons', 1).deeds;
    expect(heroTitle({ title: 'dragon-1', deeds })).toBe('Flagelo dos Dragões');
    expect(heroTitle({ title: 'crit-50', deeds })).toBeNull();
    expect(heroTitle({ title: null, deeds })).toBeNull();
    expect(availableTitles(deeds).map((d) => d.id)).toEqual(['dragon-1']);
  });
});
