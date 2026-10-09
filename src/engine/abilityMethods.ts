import type { Character } from '@/types/character';
import type { AbilityScores } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import { STANDARD_ARRAY, standardArrayFor } from './characterBuilder';
import { rollDie } from './dice';

/**
 * Os três jeitos de gerar atributos do PHB 2014 (cap. 1) + o livre:
 * valores padrão (15·14·13·12·10·8), compra de pontos (27, de 8 a 15) e
 * rolar 4d6 descartando o menor, seis vezes.
 */
export type AbilityMethod = NonNullable<Character['abilityMethod']>;

export const POINT_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const POINT_BUDGET = 27;

export function pointBuySpent(base: AbilityScores): number {
  return ABILITY_KEYS.reduce((sum, k) => sum + (POINT_COST[base[k]] ?? 99), 0);
}

const sorted = (xs: number[]) => [...xs].sort((a, b) => b - a);
const sameMultiset = (a: number[], b: number[]) => a.length === b.length && sorted(a).every((v, i) => v === sorted(b)[i]);

/** Soma dos 3 maiores dados de uma rolagem de 4d6. */
export function rollTotal(dice: number[]): number {
  return sorted(dice).slice(0, 3).reduce((s, v) => s + v, 0);
}

/** O método em uso: o guardado ou, em fichas antigas, o que os números indicam. */
export function abilityMethodOf(char: Pick<Character, 'abilityMethod' | 'baseAbilities' | 'abilityRolls'>): AbilityMethod {
  if (char.abilityMethod) return char.abilityMethod;
  const values = ABILITY_KEYS.map((k) => char.baseAbilities[k]);
  if (sameMultiset(values, STANDARD_ARRAY)) return 'array';
  if (char.abilityRolls?.length === 6) return 'roll';
  if (values.every((v) => v >= 8 && v <= 15) && pointBuySpent(char.baseAbilities) <= POINT_BUDGET) return 'pointbuy';
  return 'manual';
}

/** Seis rolagens de 4d6. */
export function rollAbilityDice(roll: (sides: number) => number = rollDie): number[][] {
  return Array.from({ length: 6 }, () => Array.from({ length: 4 }, () => roll(6)));
}

/** Distribui valores na ordem que a classe prefere (o maior no atributo principal). */
export function assignByPriority(classId: string, values: number[]): AbilityScores {
  const order = [...ABILITY_KEYS].sort((a, b) => standardArrayFor(classId)[b] - standardArrayFor(classId)[a]);
  const vals = sorted(values);
  const out = {} as AbilityScores;
  order.forEach((k, i) => (out[k] = vals[i]));
  return out;
}

/** Os valores rolados batem com o que está na ficha (só foram redistribuídos)? */
export function rollsMatch(char: Pick<Character, 'baseAbilities' | 'abilityRolls'>): boolean {
  if (char.abilityRolls?.length !== 6) return false;
  return sameMultiset(ABILITY_KEYS.map((k) => char.baseAbilities[k]), char.abilityRolls.map(rollTotal));
}

/** O que falta na etapa Atributos (trava o Despertar). */
export function abilityPending(char: Character): string[] {
  const m = abilityMethodOf(char);
  if (m === 'pointbuy') {
    const left = POINT_BUDGET - pointBuySpent(char.baseAbilities);
    if (left < 0) return [`Compra de pontos: tire ${-left} ponto${-left > 1 ? 's' : ''}`];
  }
  if (m === 'roll' && !rollsMatch(char)) return ['Role os atributos (4d6)'];
  return [];
}
