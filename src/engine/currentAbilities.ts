import type { Character } from '@/types/character';
import type { AbilityScores } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import { raceOf } from '@/data/races';
import { totalAbilities } from './modifiers';
import { activeMagicItems } from './inventory';
import { levelsOf } from './characterClasses';

/** Atributos usados agora em jogadas e recursos, incluindo itens ativos. */
export function currentAbilities(char: Character): AbilityScores {
  const totals = totalAbilities(char.baseAbilities, char.raceId, char.subraceId, char.raceAbilityChoice, char.customOrigin?.asi, raceOf(char));
  const magic = activeMagicItems(char);
  const primal = levelsOf(char).some((cl) => cl.classId === 'barbarian' && cl.level >= 20);
  for (const k of ABILITY_KEYS) {
    let value = Math.min(20, totals[k] + (char.asiBonuses?.[k] ?? 0)) + (primal && (k === 'str' || k === 'con') ? 4 : 0);
    for (const m of magic) {
      const bonus = m.magic.addAbility?.[k];
      if (bonus) value = Math.max(value, Math.min(bonus.max, value + bonus.bonus));
    }
    totals[k] = Math.max(value, ...magic.map((m) => m.magic.setAbility?.[k] ?? 0));
  }
  return totals;
}
