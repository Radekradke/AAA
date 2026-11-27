import { withDiceSource } from '@/engine/dice';

/**
 * Modo "dado físico": o jogador rola na mesa e digita o que tirou; a ficha
 * soma os bônus e aplica as regras como sempre.
 *
 * As rolagens do motor são puras (só leem `rollDie`), então dá para:
 * 1. descobrir os dados que uma rolagem pede rodando-a com uma fonte que só
 *    anota (`diceNeeded`);
 * 2. pedir esses valores ao jogador;
 * 3. rodar de novo com os valores dele (`runWithValues`). Se a regra pedir
 *    dado a mais no meio (rolar de novo o 1 e o 2 do Combate com Armas
 *    Grandes), ele volta em `extra` e a tela pede só esses.
 */
export interface DiceGroup {
  sides: number;
  count: number;
}

/**
 * Roda `fn` só para ver o que ela pede: os dados, na ordem, e o resultado
 * de mentira (para ler o bônus). A fonte devolve o máximo: nada se rerola.
 */
export function probe<T>(fn: () => T): { dice: number[]; result: T } {
  const dice: number[] = [];
  const result = withDiceSource((sides) => {
    dice.push(sides);
    return sides;
  }, fn);
  return { dice, result };
}

/** Os dados que `fn` rola, na ordem. */
export const diceNeeded = (fn: () => unknown): number[] => probe(fn).dice;

/**
 * Valores por dado a partir do que o jogador digitou em cada grupo: ou um
 * valor por dado (os d20, um a um), ou só o total do grupo (somado na mão).
 */
export function expandAnswer(groups: DiceGroup[], answer: number[][]): number[] {
  return groups.flatMap((g, i) => {
    const a = answer[i] ?? [];
    return a.length === g.count ? a : spreadTotal(g, a[0] ?? g.count);
  });
}

/** Junta dados iguais seguidos: [8, 8, 6] → 2d8, 1d6. */
export function groupDice(sides: number[]): DiceGroup[] {
  const out: DiceGroup[] = [];
  for (const s of sides) {
    const last = out[out.length - 1];
    if (last && last.sides === s) last.count++;
    else out.push({ sides: s, count: 1 });
  }
  return out;
}

/** Notação curta de um grupo: "2d8". */
export const groupLabel = (g: DiceGroup) => `${g.count}d${g.sides}`;

/** O menor e o maior total que um grupo pode dar. */
export const groupRange = (g: DiceGroup): [number, number] => [g.count, g.count * g.sides];

/**
 * Reparte o total de um grupo (o jogador somou os dados na mão) em valores
 * por dado, o mais igual possível — 11 em 3d6 vira [4, 4, 3].
 */
export function spreadTotal(g: DiceGroup, total: number): number[] {
  const [lo, hi] = groupRange(g);
  const t = Math.max(lo, Math.min(hi, Math.round(total)));
  const base = Math.floor(t / g.count);
  const rest = t - base * g.count;
  return Array.from({ length: g.count }, (_, i) => base + (i < rest ? 1 : 0));
}

/**
 * Roda `fn` com os valores do jogador, na ordem. Se `fn` pedir mais dados do
 * que vieram, anota em `extra` (e usa o máximo só para a conta terminar:
 * o resultado não vale até esses chegarem).
 */
export function runWithValues<T>(fn: () => T, values: number[]): { result: T; extra: number[] } {
  let i = 0;
  const extra: number[] = [];
  const result = withDiceSource((sides) => {
    if (i < values.length) {
      const v = values[i++];
      return Math.max(1, Math.min(sides, Math.round(v)));
    }
    extra.push(sides);
    return sides;
  }, fn);
  return { result, extra };
}
