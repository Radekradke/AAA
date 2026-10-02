import { describe, expect, it } from 'vitest';
import { diff, summarize } from '../sheetDiff';
import { WIZARD_FIXTURE } from './fixtures/wizard';

describe('diferença entre versões da ficha', () => {
  it('resumo curto', () => {
    expect(summarize(WIZARD_FIXTURE)).toMatch(/^Nv 5 · PV \d+\/\d+ · \d+ ite(m|ns) · [\d.,]+ PO$/);
  });

  it('aponta PV, dinheiro, itens e nível', () => {
    const b = structuredClone(WIZARD_FIXTURE);
    b.hpCurrent = 1;
    b.coins.gp += 50;
    b.inventory = [...b.inventory, { ...b.inventory[0], uid: 'novo', name: 'Poção de Cura', itemId: 'potion-healing', quantity: 2 }];
    b.level = 6;
    const d = diff(WIZARD_FIXTURE, b, 10);
    expect(d.some((x) => x.startsWith('nível 5 → 6'))).toBe(true);
    expect(d.some((x) => /^PV \d+\/\d+ → 1\//.test(x))).toBe(true);
    expect(d.some((x) => x.startsWith('dinheiro'))).toBe(true);
    expect(d).toContain('+ Poção de Cura');
  });

  it('versões iguais não têm diferença', () => {
    expect(diff(WIZARD_FIXTURE, structuredClone(WIZARD_FIXTURE))).toEqual([]);
  });

  it('corta listas longas', () => {
    const b = structuredClone(WIZARD_FIXTURE);
    Object.assign(b, { name: 'X', level: 9, hpCurrent: 0, xp: 99999, notes: 'mudou' });
    b.coins.gp += 1;
    b.journal = [...b.journal, { id: 'j', at: 1, text: 'a' } as never];
    const d = diff(WIZARD_FIXTURE, b, 4);
    expect(d).toHaveLength(4);
    expect(d[3]).toMatch(/^e mais \d+ mudanças$/);
  });
});
