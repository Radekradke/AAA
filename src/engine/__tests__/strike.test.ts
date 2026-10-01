import { describe, expect, it } from 'vitest';
import { applyDefense, attackHits, defenseFor } from '../strike';

describe('ataque contra alvo', () => {
  it('compara com a CA; 20 natural acerta e 1 natural erra', () => {
    expect(attackHits(15, 11, 15)).toEqual({ hit: true, crit: false });
    expect(attackHits(14, 10, 15)).toEqual({ hit: false, crit: false });
    expect(attackHits(22, 20, 30)).toEqual({ hit: true, crit: true });
    expect(attackHits(25, 1, 10)).toEqual({ hit: false, crit: false });
    expect(attackHits(3, 2, null).hit).toBe(true); // sem CA conhecida: o mestre decide
  });

  it('resistência arredonda para baixo; vulnerável dobra; imune zera', () => {
    expect(applyDefense(7, 'half')).toBe(3);
    expect(applyDefense(7, 'double')).toBe(14);
    expect(applyDefense(7, 'zero')).toBe(0);
    expect(applyDefense(7, 'normal')).toBe(7);
  });

  it('lê resistências do bloco do monstro', () => {
    expect(defenseFor('fogo', { immune: 'fogo, veneno' })).toBe('zero');
    expect(defenseFor('frio', { resist: 'frio' })).toBe('half');
    expect(defenseFor('concussão', { vuln: 'concussão' })).toBe('double');
    expect(defenseFor('cortante', {})).toBe('normal');
    const lobisomem = { immune: 'contundente, perfurante e cortante de ataques não mágicos' };
    expect(defenseFor('cortante', lobisomem)).toBe('zero');
    expect(defenseFor('cortante', lobisomem, true)).toBe('normal');
  });
});

describe('cláusulas de resistência', () => {
  it('ataque mágico ignora só a cláusula "não mágicos"', () => {
    const d = { resist: 'frio; contundente, perfurante e cortante de ataques não mágicos' };
    expect(defenseFor('frio', d, true)).toBe('half');
    expect(defenseFor('perfurante', d, true)).toBe('normal');
    expect(defenseFor('perfurante', d)).toBe('half');
  });
});
