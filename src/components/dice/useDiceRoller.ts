import { useCallback } from 'react';
import { useUiStore } from '@/store/uiStore';
import { roll as rollEngine, rollCheck } from '@/engine/dice';
import type { RollOptions, RollResult } from '@/engine/dice';
import type { DerivedAttack } from '@/engine/dndRules';
import { rollAttack, rollDamage } from '@/engine/combat';

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
      const result = rollCheck(label, modifier, opts);
      pushRoll(result);
      return result;
    },
    [pushRoll],
  );

  const attack = useCallback(
    (atk: DerivedAttack, opts: { advantage?: boolean; disadvantage?: boolean } = {}): RollResult => {
      const result = rollAttack(atk, opts);
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

  return { rollDice, check, attack, damage };
}
