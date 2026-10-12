import type { Character } from '@/types/character';

export const INCAPACITATING_CONDITIONS = new Set(['Incapacitado', 'Inconsciente', 'Paralisado', 'Atordoado', 'Petrificado']);

/** Encerra somente dependências da concentração, preservando efeitos de classe. */
export function clearConcentration(char: Character): void {
  char.combat.concentration = false;
  char.combat.marks = (char.combat.marks ?? []).filter((m) => m !== 'hex' && m !== 'huntersMark');
  char.combat.spellEffects = (char.combat.spellEffects ?? []).filter((e) => e.until !== 'concentration');
}

export function canConcentrate(char: Character): boolean {
  return char.hpCurrent > 0 && !(char.combat.conditions ?? []).some((c) => INCAPACITATING_CONDITIONS.has(c)) && !(char.combat.marks ?? []).includes('rage');
}
