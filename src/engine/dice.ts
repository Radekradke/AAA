/**
 * Rolador de dados genérico.
 * Suporta dados padrão, modificadores, vantagem/desvantagem e expressões.
 */

export type DieSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export const DICE_TYPES: DieSides[] = [4, 6, 8, 10, 12, 20, 100];

export interface RollResult {
  /** Identificador da rolagem (para histórico/animação). */
  id: string;
  label: string;
  /** Expressão legível, ex.: "1d20 +5". */
  expr: string;
  /** Valores individuais sorteados. */
  rolls: number[];
  modifier: number;
  total: number;
  sides: number;
  count: number;
  crit: boolean;
  fail: boolean;
  /** Marca rolagens de dano (cor diferente). */
  damage?: boolean;
  timestamp: number;
}

let _seq = 0;
function uid(): string {
  _seq += 1;
  return `r${Date.now().toString(36)}${_seq}`;
}

export function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

export function modStr(n: number): string {
  return (n >= 0 ? '+' : '') + n;
}

export interface RollOptions {
  count?: number;
  modifier?: number;
  label?: string;
  damage?: boolean;
  advantage?: boolean;
  disadvantage?: boolean;
}

/** Rola `count`d`sides` + modificador, com opção de vantagem/desvantagem (apenas 1d20). */
export function roll(sides: number, options: RollOptions = {}): RollResult {
  const { count = 1, modifier = 0, label = '', damage = false, advantage, disadvantage } = options;
  const rolls: number[] = [];
  let sum = 0;

  const singleD20 = count === 1 && sides === 20;
  if (singleD20 && (advantage || disadvantage)) {
    const a = rollDie(20);
    const b = rollDie(20);
    const chosen = advantage ? Math.max(a, b) : Math.min(a, b);
    rolls.push(a, b);
    sum = chosen;
  } else {
    for (let i = 0; i < count; i++) {
      const r = rollDie(sides);
      rolls.push(r);
      sum += r;
    }
  }

  const total = sum + modifier;
  const exprBase = `${count}d${sides}`;
  const expr = modifier ? `${exprBase} ${modStr(modifier)}` : exprBase;
  // Crítico/falha só fazem sentido para um único d20 puro.
  const natural = singleD20 ? (advantage || disadvantage ? sum : rolls[0]) : null;
  const crit = natural === 20;
  const fail = natural === 1;

  return {
    id: uid(),
    label: label || `Rolagem ${expr}`,
    expr,
    rolls,
    modifier,
    total,
    sides,
    count,
    crit,
    fail,
    damage,
    timestamp: Date.now(),
  };
}

/** Atalho para um teste 1d20 + modificador (atributo, perícia, resistência, ataque). */
export function rollCheck(label: string, modifier: number, opts: Partial<RollOptions> = {}): RollResult {
  return roll(20, { label, modifier, ...opts });
}
