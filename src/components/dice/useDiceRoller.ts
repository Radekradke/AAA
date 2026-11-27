import { useCallback } from 'react';
import { useUiStore } from '@/store/uiStore';
import { roll as rollEngine, rollCheck } from '@/engine/dice';
import type { RollOptions, RollResult } from '@/engine/dice';
import type { DerivedAttack } from '@/engine/dndRules';
import { rollAttack, rollDamage } from '@/engine/combat';
import { useCharacterStore } from '@/store/characterStore';
import { playSample } from '@/lib/sfx';
import type { Character } from '@/types/character';
import type { AbilityKey } from '@/types/dnd';
import { rollRule } from '@/engine/rollRules';
import type { RollContext } from '@/engine/rollRules';
import { expandAnswer, groupDice, probe, runWithValues } from '@/lib/physicalDice';
import { usePhysicalDiceStore } from '@/store/physicalDiceStore';

/** Quantas vezes a regra pode pedir dado a mais no meio (rolar de novo) antes de desistir. */
const MAX_REROLL_ROUNDS = 4;

/**
 * Faz a conta de uma rolagem do motor (`compute`, pura). Com o dado físico
 * desligado, sorteia na hora. Ligado: descobre os dados que a conta pede,
 * pergunta ao jogador o que ele tirou e refaz a conta com esses números —
 * bônus, vantagem, crítico e regras de classe seguem iguais. Devolve null se
 * o jogador desistir.
 */
export async function resolveRoll(compute: () => RollResult, flags: { advantage?: boolean; disadvantage?: boolean } = {}): Promise<RollResult | null> {
  if (!useUiStore.getState().physicalDice) return compute();
  const first = probe(compute);
  if (!first.dice.length) return compute();
  const twoD20 = first.dice.length === 2 && first.dice.every((d) => d === 20);
  const mode = !twoD20 || flags.advantage === flags.disadvantage ? 'normal' : flags.advantage ? 'advantage' : 'disadvantage';
  let groups = groupDice(first.dice);
  let values: number[] = [];
  for (let round = 0; round < MAX_REROLL_ROUNDS; round++) {
    const answer = await usePhysicalDiceStore.getState().ask({ label: first.result.label, modifier: first.result.modifier, groups, mode, reroll: round > 0 });
    if (answer === null) return null;
    if (answer === 'app') return compute();
    values = [...values, ...expandAnswer(groups, answer)];
    const { result, extra } = runWithValues(compute, values);
    if (!extra.length) return { ...result, physical: true };
    groups = groupDice(extra);
  }
  return null;
}

/**
 * Inspiração preparada: marca a rolagem, desconta o ponto da ficha e
 * devolve o modo de rolagem. Só para testes d20 (ataque/perícia/resistência
 * e o d20 avulso da aba Dados) — nunca dano, dado de vida ou morte.
 */
export function consumeArmedInspiration(result: RollResult): RollResult {
  const ui = useUiStore.getState();
  if (!ui.inspirationArmed || !ui.armedCharId || ui.armedCharId !== ui.activeCharId) return result;
  useCharacterStore.getState().spendInspiration(ui.armedCharId);
  ui.disarmInspiration();
  return { ...result, label: `${result.label} · Inspiração` };
}

/** Lê o modo de rolagem atual (vantagem/desvantagem) do store global. */
function modeFlags(): { advantage?: boolean; disadvantage?: boolean } {
  const mode = useUiStore.getState().rollMode;
  return { advantage: mode === 'advantage', disadvantage: mode === 'disadvantage' };
}

/**
 * Hook central de rolagem: faz a conta no motor (sorteando ou com o dado
 * físico do jogador) e manda o resultado para o overlay/histórico global.
 * Toda rolagem é assíncrona — com o dado físico ela espera o jogador
 * digitar — e devolve null quando ele desiste.
 */
export function useDiceRoller() {
  const pushRoll = useUiStore((s) => s.pushRoll);

  /** Rolagem qualquer do motor (companheiro, aliado, painel de classe). */
  const rollWith = useCallback(
    async (compute: () => RollResult, flags: { advantage?: boolean; disadvantage?: boolean } = {}): Promise<RollResult | null> => {
      const result = await resolveRoll(compute, flags);
      if (result) pushRoll(result);
      return result;
    },
    [pushRoll],
  );

  const rollDice = useCallback((sides: number, options: RollOptions = {}) => rollWith(() => rollEngine(sides, options), options), [rollWith]);

  const check = useCallback(
    async (label: string, modifier: number, opts: Partial<RollOptions> = {}): Promise<RollResult | null> => {
      const flags = { ...modeFlags(), ...opts };
      const base = await resolveRoll(() => rollCheck(label, modifier, flags), flags);
      if (!base) return null;
      const result = consumeArmedInspiration(base);
      pushRoll(result);
      return result;
    },
    [pushRoll],
  );

  /**
   * Teste/salvaguarda com as regras de classe aplicadas: vantagem da Fúria e do
   * Sentido de Perigo (cancela com a desvantagem escolhida) e o mínimo da Força Indomável.
   */
  const checkFor = useCallback(
    async (char: Character, kind: 'check' | 'save', ability: AbilityKey, label: string, modifier: number, ctx: RollContext = {}): Promise<RollResult | null> => {
      const rule = rollRule(char, kind, ability, ctx);
      const mode = modeFlags();
      const adv = !!mode.advantage || rule.advantage;
      const dis = !!mode.disadvantage;
      const tag = rule.sources.length ? ` · vantagem: ${rule.sources.join(', ')}` : '';
      const flags = { advantage: adv && !dis, disadvantage: dis && !adv };
      const base = await resolveRoll(() => rollCheck(label + tag, modifier, flags), flags);
      if (!base) return null;
      let result = consumeArmedInspiration(base);
      // Talento Confiável: o d20 que valeu (já com vantagem/desvantagem) nunca fica abaixo de 10
      const die = result.total - result.modifier;
      if (rule.d20Min && die < rule.d20Min.value) {
        result = { ...result, total: rule.d20Min.value + result.modifier, label: `${result.label} · ${rule.d20Min.source} (d20 ${die} → ${rule.d20Min.value})` };
      }
      if (rule.floor && result.total < rule.floor.value) {
        result = { ...result, total: rule.floor.value, label: `${result.label} · ${rule.floor.source} (mínimo ${rule.floor.value})` };
      }
      pushRoll(result);
      return result;
    },
    [pushRoll],
  );

  const attack = useCallback(
    async (atk: DerivedAttack, opts: { advantage?: boolean; disadvantage?: boolean } = {}): Promise<RollResult | null> => {
      const flags = { ...modeFlags(), ...opts };
      const base = await resolveRoll(() => rollAttack(atk, flags), flags);
      if (!base) return null;
      const result = consumeArmedInspiration(base);
      playSample('lamina', 0.4);
      pushRoll(result);
      return result;
    },
    [pushRoll],
  );

  const damage = useCallback((atk: DerivedAttack, opts: { versatile?: boolean; crit?: boolean } = {}) => rollWith(() => rollDamage(atk, opts)), [rollWith]);

  /** 1d20 avulso (aba Dados): como rollDice, mas consome a inspiração preparada. */
  const checkD20 = useCallback(
    async (options: RollOptions = {}): Promise<RollResult | null> => {
      const base = await resolveRoll(() => rollEngine(20, options), options);
      if (!base) return null;
      const result = consumeArmedInspiration(base);
      pushRoll(result);
      return result;
    },
    [pushRoll],
  );

  return { rollDice, check, checkFor, attack, damage, checkD20, rollWith };
}
