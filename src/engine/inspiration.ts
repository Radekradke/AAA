import type { Character } from '@/types/character';

/**
 * Pontos de Inspiração. No PHB 2014 é "tem ou não tem", mas muitas mesas
 * deixam acumular — então a ficha guarda um contador. O booleano antigo
 * (`inspiration`) continua espelhado para fichas/sync anteriores.
 */
export const INSPIRATION_MAX = 10;

/** Pontos atuais (ficha antiga sem contador: booleano vira 0 ou 1). */
export function inspirationCount(c: Pick<Character, 'inspiration' | 'inspirationPoints'>): number {
  if (typeof c.inspirationPoints === 'number') return Math.max(0, Math.min(INSPIRATION_MAX, Math.floor(c.inspirationPoints)));
  return c.inspiration ? 1 : 0;
}

/** Define os pontos (com limites) mantendo o booleano legado coerente. */
export function setInspirationCount(c: Character, n: number): void {
  const v = Math.max(0, Math.min(INSPIRATION_MAX, Math.floor(n)));
  c.inspirationPoints = v;
  c.inspiration = v > 0;
}
