import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { useCharacterStore } from '@/store/characterStore';
import { syncHitDicePools } from '@/engine/hitDice';

/**
 * Gastar um Dado de Vida (PHB 2014): rola o dado + CON e cura esse tanto
 * (mínimo 0) — antes a rolagem aparecia mas a vida tinha de ser somada à mão.
 */
export function useSpendHitDie(char: Character, derived: DerivedCharacter, selectedDie?: number): (() => void) | undefined {
  const { rollDice } = useDiceRoller();
  const store = useCharacterStore();
  const pools = syncHitDicePools(char);
  const die = selectedDie ?? (pools[derived.hitDie]?.remaining ? derived.hitDie : Object.keys(pools).map(Number).find((d) => pools[d].remaining > 0));
  if (!die || !pools[die]?.remaining || char.hpCurrent <= 0 || (char.combat.deathSaves?.fail ?? 0) >= 3) return undefined;
  return () => {
    const current = store.getCharacter(char.id);
    if (!current || !syncHitDicePools(current)[die]?.remaining) return;
    const r = rollDice(die, { label: `Dado de Vida · d${die}`, modifier: derived.abilities.con.mod });
    store.spendHitDie(char.id, die);
    const amount = Math.max(0, r.total);
    if (amount > 0) store.heal(char.id, amount);
  };
}
