import type { Character, HitDicePool } from '@/types/character';
import { getClass } from '@/data/classes';
import { levelsOf } from './characterClasses';

/** Reserva por tipo de dado. Mantém o gasto de fichas antigas sem inventar usos recuperados. */
export function syncHitDicePools(char: Character): Record<number, HitDicePool> {
  const maxes: Record<number, number> = {};
  for (const cl of levelsOf(char)) {
    const die = getClass(cl.classId).hitDie;
    maxes[die] = (maxes[die] ?? 0) + cl.level;
  }
  const total = Object.values(maxes).reduce((n, max) => n + max, 0);
  let legacySpent = Math.max(0, total - char.combat.hitDiceRemaining);
  const primary = getClass(char.classId).hitDie;
  const dice = Object.keys(maxes).map(Number).sort((a, b) => Number(b === primary) - Number(a === primary) || b - a);
  const out: Record<number, HitDicePool> = {};
  for (const die of dice) {
    const previous = char.combat.hitDicePools?.[die];
    const spent = char.combat.hitDicePools ? Math.max(0, (previous?.max ?? 0) - (previous?.remaining ?? 0)) : Math.min(maxes[die], legacySpent);
    out[die] = { max: maxes[die], remaining: Math.max(0, maxes[die] - spent) };
    legacySpent -= spent;
  }
  return out;
}

export function saveHitDicePools(char: Character, pools = syncHitDicePools(char)): void {
  char.combat.hitDicePools = pools;
  char.combat.hitDiceRemaining = Object.values(pools).reduce((n, pool) => n + pool.remaining, 0);
}

export function recoverHitDice(char: Character): void {
  const pools = syncHitDicePools(char);
  let count = Math.max(1, Math.floor(Object.values(pools).reduce((n, p) => n + p.max, 0) / 2));
  for (const die of Object.keys(pools).map(Number).sort((a, b) => b - a)) {
    const n = Math.min(count, pools[die].max - pools[die].remaining);
    pools[die].remaining += n;
    count -= n;
  }
  saveHitDicePools(char, pools);
}
