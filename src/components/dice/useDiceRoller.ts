import { useCallback } from 'react';
import { useUiStore } from '@/store/uiStore';
import { roll as rollEngine, rollCheck } from '@/engine/dice';
import type { RollOptions, RollResult } from '@/engine/dice';
import type { DerivedAttack } from '@/engine/dndRules';
import { rollAttack, rollDamage } from '@/engine/combat';
import { useCharacterStore } from '@/store/characterStore';

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

  const attack = useCallback(
    (atk: DerivedAttack, opts: { advantage?: boolean; disadvantage?: boolean } = {}): RollResult => {
      const result = consumeArmedInspiration(rollAttack(atk, { ...modeFlags(), ...opts }));
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

  return { rollDice, check, attack, damage, checkD20 };
}
