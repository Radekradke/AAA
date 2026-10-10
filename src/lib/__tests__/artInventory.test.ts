import { describe, expect, it } from 'vitest';
import { artInventory, artTotals, pct } from '../artInventory';
import { bundledSpellArt } from '../spellArt';
import { bundledMonsterArt } from '../monsterArt';
import { SPELLS } from '@/data/spells';
import { MONSTERS } from '@/data/bestiary';
import { CLASSES } from '@/data/classes';

const cats = artInventory();
const cat = (key: string) => cats.find((c) => c.key === key)!;

describe('contador de artes', () => {
  it('cobre magias, itens, criaturas, retratos e vozes', () => {
    expect(cats.map((c) => c.key)).toEqual(['magias', 'armas', 'armaduras', 'equipamento', 'magicos', 'criaturas', 'retratos', 'vozes']);
  });

  it('o total de cada categoria é o catálogo inteiro, e o "tem" é o que existe na pasta', () => {
    expect(cat('magias').total).toBe(SPELLS.length);
    expect(cat('magias').have).toBe(SPELLS.filter((s) => bundledSpellArt()[s.id]).length);
    expect(cat('criaturas').total).toBe(MONSTERS.length);
    expect(cat('criaturas').have).toBe(MONSTERS.filter((m) => bundledMonsterArt()[m.id]).length);
    expect(cat('retratos').total).toBe(CLASSES.length * 2);
  });

  it('grupos somam a categoria; o que falta é exatamente o que não tem arte', () => {
    for (const c of cats) {
      expect(c.groups.reduce((n, g) => n + g.total, 0), c.key).toBe(c.total);
      expect(c.groups.reduce((n, g) => n + g.have, 0), c.key).toBe(c.have);
      expect(c.groups.reduce((n, g) => n + g.missing.length, 0), c.key).toBe(c.total - c.have);
    }
    const missingSpells = cat('magias').groups.flatMap((g) => g.missing.map((m) => m.id));
    expect(missingSpells.some((id) => bundledSpellArt()[id])).toBe(false);
  });

  it('magias em ordem de círculo; armas +1/+2/+3 não contam (usam a arte da base)', () => {
    expect(cat('magias').groups[0].label).toBe('Truques');
    const weaponIds = cat('armas').groups.flatMap((g) => g.missing.map((m) => m.id));
    expect(weaponIds.some((id) => /-plus\d$/.test(id))).toBe(false);
    expect(cat('armas').total).toBeLessThan(40);
  });

  it('total geral e porcentagem', () => {
    const t = artTotals(cats);
    expect(t.total).toBe(cats.reduce((n, c) => n + c.total, 0));
    expect(pct(1, 4)).toBe(25);
    expect(pct(0, 0)).toBe(0);
  });
});
