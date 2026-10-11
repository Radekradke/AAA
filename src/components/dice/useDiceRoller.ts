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
 * Hook central de rolagem: executa a rolagem na engine e envia o resultado
 * para o overlay/histórico global (com brilho de partículas).
 */
export function useDiceRoller() {
  const pushRoll = useUiStore((s) => s.pushRoll);

  const rollDice = useCallback(
    (sides: number, options: RollOptions = {}): RollResult => {
      const result = rollEngine(sides, options);
      pushRoll(result);
      return result;
    },
    [pushRoll],
  );

  const check = useCallback(
    (label: string, modifier: number, opts: Partial<RollOptions> = {}): RollResult => {
      const result = consumeArmedInspiration(rollCheck(label, modifier, { ...modeFlags(), ...opts }));
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
    (char: Character, kind: 'check' | 'save', ability: AbilityKey, label: string, modifier: number): RollResult => {
      const rule = rollRule(char, kind, ability);
      const mode = modeFlags();
      const adv = !!mode.advantage || rule.advantage;
      const dis = !!mode.disadvantage;
      const tag = rule.sources.length ? ` · vantagem: ${rule.sources.join(', ')}` : '';
      let result = consumeArmedInspiration(rollCheck(label + tag, modifier, { advantage: adv && !dis, disadvantage: dis && !adv }));
      if (rule.floor && result.total < rule.floor.value) {
        result = { ...result, total: rule.floor.value, label: `${result.label} · ${rule.floor.source} (mínimo ${rule.floor.value})` };
      }
      pushRoll(result);
      return result;
    },
    [pushRoll],
  );

  const attack = useCallback(
    (atk: DerivedAttack, opts: { advantage?: boolean; disadvantage?: boolean } = {}): RollResult => {
      const result = consumeArmedInspiration(rollAttack(atk, { ...modeFlags(), ...opts }));
      playSample('lamina', 0.4);
      pushRoll(result);
      return result;
    },
    [pushRoll],
  );

  const damage = useCallback(
    (atk: DerivedAttack, opts: { versatile?: boolean; crit?: boolean } = {}): RollResult => {
      const result = rollDamage(atk, opts);
      pushRoll(result);
      return result;
    },
    [pushRoll],
  );

  /** 1d20 avulso (aba Dados): como rollDice, mas consome a inspiração preparada. */
  const checkD20 = useCallback(
    (options: RollOptions = {}): RollResult => {
      const result = consumeArmedInspiration(rollEngine(20, options));
      pushRoll(result);
      return result;
    },
    [pushRoll],
  );

  return { rollDice, check, checkFor, attack, damage, checkD20 };
}
