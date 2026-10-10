import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { useCharacterStore } from '@/store/characterStore';

/**
 * Gastar um Dado de Vida (PHB 2014): rola o dado + CON e cura esse tanto
 * (mínimo 0) — antes a rolagem aparecia mas a vida tinha de ser somada à mão.
 */
export function useSpendHitDie(char: Character, derived: DerivedCharacter): (() => void) | undefined {
  const { rollDice } = useDiceRoller();
  const store = useCharacterStore();
  if (char.combat.hitDiceRemaining <= 0) return undefined;
  return () => {
    const r = rollDice(derived.hitDie, { label: 'Dado de Vida', modifier: derived.abilities.con.mod });
    store.spendHitDie(char.id);
    const amount = Math.max(0, r.total);
    if (amount > 0) store.heal(char.id, amount);
  };
}
