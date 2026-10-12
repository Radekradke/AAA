import type { AbilityKey, AbilityScores, Race } from '@/types/dnd';
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

/** Bônus racial à escolha (Meio-Elfo): os atributos escolhidos, ou o padrão antigo. */
export function raceChoiceBonus(raceId: string, choice?: AbilityKey[] | null, definition?: Race): Partial<AbilityScores> {
  const ch = (definition ?? getRace(raceId)).abilityChoice;
  if (!ch) return {};
  const picked = (choice ?? []).filter((k) => !ch.exclude?.includes(k)).slice(0, ch.count);
  const keys = picked.length === ch.count ? picked : ch.default;
  return Object.fromEntries(keys.map((k) => [k, ch.amount]));
}

/**
 * Atributos totais = base + bônus de raça + bônus de sublinhagem (+ escolha racial).
 */
export function totalAbilities(
  base: AbilityScores,
  raceId: string,
  subraceId: string | null,
  choice?: AbilityKey[] | null,
  custom?: Partial<AbilityScores> | null,
  definition?: Race,
): AbilityScores {
  // Origem personalizada (Tasha): os bônus redistribuídos substituem os da raça
  if (custom) return addAbilityBonuses(base, custom);
  const race = definition ?? getRace(raceId);
  const sub = definition?.subraces ? definition.subraces.find((s) => s.id === subraceId) : getSubrace(raceId, subraceId);
  return addAbilityBonuses(base, race.abilityBonus, sub?.abilityBonus ?? {}, raceChoiceBonus(raceId, choice, race));
}

/** Bônus raciais do personagem como lista (+2, +1…), do maior para o menor. */
export function racialIncreases(raceId: string, subraceId: string | null, choice?: AbilityKey[] | null): { ability: AbilityKey; amount: number }[] {
  const race = getRace(raceId);
  const sub = getSubrace(raceId, subraceId);
  const sum = addAbilityBonuses({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, race.abilityBonus, sub?.abilityBonus ?? {}, raceChoiceBonus(raceId, choice));
  return ABILITY_KEYS.filter((k) => sum[k] > 0).map((k) => ({ ability: k, amount: sum[k] })).sort((a, b) => b.amount - a.amount);
}

/** Bônus racial total para um atributo específico (raça + sublinhagem + escolha). */
export function racialBonusFor(
  ability: AbilityKey,
  raceId: string,
  subraceId: string | null,
  choice?: AbilityKey[] | null,
  custom?: Partial<AbilityScores> | null,
  definition?: Race,
): number {
  if (custom) return custom[ability] ?? 0;
  const race = definition ?? getRace(raceId);
  const sub = definition?.subraces ? definition.subraces.find((s) => s.id === subraceId) : getSubrace(raceId, subraceId);
  return (race.abilityBonus[ability] ?? 0) + (sub?.abilityBonus?.[ability] ?? 0) + (raceChoiceBonus(raceId, choice, race)[ability] ?? 0);
}
