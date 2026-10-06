import { describe, expect, it } from 'vitest';
import { deathSaveOutcome, isDeathOutcome } from '../deathSave';

describe('teste contra a morte', () => {
  const zero = { success: 0, fail: 0 };
  it('20 natural levanta; 1 natural conta duas falhas', () => {
    expect(deathSaveOutcome({ success: 2, fail: 2 }, 20, 20)).toEqual({ success: 0, fail: 0, outcome: 'revive' });
    expect(deathSaveOutcome(zero, 1, 1)).toEqual({ success: 0, fail: 2, outcome: 'double' });
    expect(deathSaveOutcome({ success: 0, fail: 2 }, 1, 1)).toEqual({ success: 0, fail: 3, outcome: 'dead' });
  });
  it('10+ é sucesso (3 estabiliza); abaixo de 10 é falha (3 mata)', () => {
    expect(deathSaveOutcome(zero, 10, 10).outcome).toBe('success');
    expect(deathSaveOutcome({ success: 2, fail: 1 }, 15, 15)).toEqual({ success: 3, fail: 1, outcome: 'stable' });
    expect(deathSaveOutcome({ success: 1, fail: 1 }, 9, 9)).toEqual({ success: 1, fail: 2, outcome: 'fail' });
    expect(deathSaveOutcome({ success: 1, fail: 2 }, 4, 4).outcome).toBe('dead');
    expect(deathSaveOutcome(undefined, 12, 12)).toEqual({ success: 1, fail: 0, outcome: 'success' });
  });
  it('reconhece só desfechos válidos', () => {
    expect(isDeathOutcome('stable')).toBe(true);
    expect(isDeathOutcome('morto')).toBe(false);
  });
});
