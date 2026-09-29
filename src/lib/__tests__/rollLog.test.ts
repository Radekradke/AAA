import { describe, expect, it } from 'vitest';
import { rollLogText, rollStats } from '../rollLog';
import { historyFor } from '@/store/uiStore';
import type { RollResult } from '@/engine/dice';

function r(p: Partial<RollResult>): RollResult {
  return { id: Math.random().toString(36), label: 'Teste', expr: '1d20 +2', rolls: [10], modifier: 2, total: 12, sides: 20, count: 1, crit: false, fail: false, timestamp: 0, ...p };
}

describe('histórico de rolagens', () => {
  it('filtra por ficha e mantém rolagens antigas sem dono', () => {
    const h = [r({ charId: 'a' }), r({ charId: 'b' }), r({})];
    expect(historyFor(h, 'a')).toHaveLength(2);
    expect(historyFor(h, null)).toHaveLength(3);
  });

  it('estatísticas: críticos, falhas e melhor teste (ignora dano)', () => {
    const s = rollStats([r({ total: 15 }), r({ total: 30, damage: true }), r({ total: 22, crit: true }), r({ total: 3, fail: true })]);
    expect(s).toMatchObject({ count: 4, crits: 1, fails: 1 });
    expect(s.best?.total).toBe(22);
  });

  it('texto para o diário em ordem cronológica, com destaque de crítico', () => {
    const txt = rollLogText([
      r({ label: 'Furtividade', total: 21, crit: true, timestamp: 2000 }),
      r({ label: 'Atletismo', total: 9, timestamp: 1000 }),
    ]);
    const lines = txt.split('\n');
    expect(lines[0]).toMatch(/2 rolagem\(ns\), 1 crítico/);
    expect(lines[1]).toContain('Atletismo: 9');
    expect(lines[2]).toContain('Furtividade: 21');
    expect(lines[2]).toContain('CRÍTICO');
    expect(rollLogText([])).toBe('');
  });
});
