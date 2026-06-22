import type { AbilityKey, AbilityScores } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import { getRace, getSubrace } from '@/data/races';

/** Modificador de atributo: floor((valor - 10) / 2). */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Bônus de proficiência por nível (1–20). */
export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4);
}

/** Soma dois mapas parciais de atributos. */
export function addAbilityBonuses(
  base: AbilityScores,
  ...bonuses: Array<Partial<AbilityScores>>
): AbilityScores {
  const out: AbilityScores = { ...base };
  for (const b of bonuses) {
    for (const k of ABILITY_KEYS) {
      const v = b[k];
      if (typeof v === 'number') out[k] += v;
    }
  }
  return out;
}

/**
 * Atributos totais = base + bônus de raça + bônus de sublinhagem.
 */
export function totalAbilities(
  base: AbilityScores,
  raceId: string,
  subraceId: string | null,
): AbilityScores {
  const race = getRace(raceId);
  const sub = getSubrace(raceId, subraceId);
  return addAbilityBonuses(base, race.abilityBonus, sub?.abilityBonus ?? {});
}

/** Bônus racial total para um atributo específico (raça + sublinhagem). */
export function racialBonusFor(
  ability: AbilityKey,
  raceId: string,
  subraceId: string | null,
): number {
  const race = getRace(raceId);
  const sub = getSubrace(raceId, subraceId);
  return (race.abilityBonus[ability] ?? 0) + (sub?.abilityBonus?.[ability] ?? 0);
}
