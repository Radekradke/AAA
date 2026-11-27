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
  /** Personagem que rolou (histórico por ficha). */
  charId?: string;
  /** Rolou o companheiro/montaria (nome): não conta como crítico do herói. */
  ally?: string;
  /** Dano de truque (feito "Truque mortal" no golpe final). */
  cantrip?: boolean;
  /** Teste contra a morte (feito do 20 natural). */
  deathSave?: boolean;
  /** Os números vieram de dados de verdade, digitados pelo jogador. */
  physical?: boolean;
}

let _seq = 0;
function uid(): string {
  _seq += 1;
  return `r${Date.now().toString(36)}${_seq}`;
}

/**
 * De onde vêm os números dos dados. Normalmente, do sorteio; com o modo
 * "dado físico", dos valores que o jogador tirou na mesa (ver
 * `src/lib/physicalDice.ts`). Toda rolagem do motor passa por `rollDie`.
 */
export type DiceSource = (sides: number) => number;

const randomSource: DiceSource = (sides) => 1 + Math.floor(Math.random() * sides);
let source: DiceSource = randomSource;

/**
 * Roda `fn` com outra fonte de dados e devolve a de sempre ao terminar.
 * As funções de rolagem são síncronas e puras, então a troca vale só para
 * a conta feita dentro de `fn`.
 */
export function withDiceSource<T>(src: DiceSource, fn: () => T): T {
  const prev = source;
  source = src;
  try {
    return fn();
  } finally {
    source = prev;
  }
}

export function rollDie(sides: number): number {
  return source(sides);
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
  /** Menor natural do d20 que conta como crítico (padrão 20; Campeão reduz). */
  critMin?: number;
  cantrip?: boolean;
  deathSave?: boolean;
}

/** Rola `count`d`sides` + modificador, com opção de vantagem/desvantagem (apenas 1d20). */
export function roll(sides: number, options: RollOptions = {}): RollResult {
  const { count = 1, modifier = 0, label = '', damage = false, advantage, disadvantage, critMin = 20 } = options;
  const rolls: number[] = [];
  let sum = 0;

  const singleD20 = count === 1 && sides === 20;
  const adv = !!advantage && !disadvantage;
  const dis = !!disadvantage && !advantage;
  if (singleD20 && (adv || dis)) {
    const a = rollDie(20);
    const b = rollDie(20);
    const chosen = adv ? Math.max(a, b) : Math.min(a, b);
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
  const natural = singleD20 ? (adv || dis ? sum : rolls[0]) : null;
  const crit = natural !== null && natural >= critMin;
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
    ...(options.cantrip && { cantrip: true }),
    ...(options.deathSave && { deathSave: true }),
  };
}

/** Atalho para um teste 1d20 + modificador (atributo, perícia, resistência, ataque). */
export function rollCheck(label: string, modifier: number, opts: Partial<RollOptions> = {}): RollResult {
  return roll(20, { label, modifier, ...opts });
}
