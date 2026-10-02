import { describe, expect, it } from 'vitest';
import { newShareToken } from '../shareService';

describe('newShareToken', () => {
  it('sempre 24 caracteres do alfabeto (sem I, O, l, 0, 1)', () => {
    for (let i = 0; i < 2000; i++) expect(newShareToken()).toMatch(/^[A-HJ-NP-Za-km-z2-9]{24}$/);
  });

  it('usa todo o alfabeto, sem viés grosseiro', () => {
    const seen = new Map<string, number>();
    for (let i = 0; i < 2000; i++) for (const ch of newShareToken()) seen.set(ch, (seen.get(ch) ?? 0) + 1);
    expect(seen.size).toBe(57);
    const counts = [...seen.values()];
    expect(Math.min(...counts) / Math.max(...counts)).toBeGreaterThan(0.7);
  });
});
