import type { Character } from '@/types/character';
import { levelIn } from './damageExtras';
import { optionLabel } from './classChoices';

/**
 * Patrulheiro (PHB 2014) na mesa: Inimigos Favoritos e terrenos à vista,
 * Consciência Primitiva (gasta espaço), Esconder-se à Vista (+10 em
 * Furtividade parado), Desaparecer (Esconder como ação bônus), Matador de
 * Inimigos e as escolhas do Caçador. A ficha usa isto no painel do
 * Patrulheiro (Combate) e no dano das armas.
 */
export interface RangerState {
  level: number;
  /** CD das magias: 8 + prof + SAB. */
  dc: number;
  enemies: string[];
  terrains: string[];
  /** Consciência Primitiva (3º): 1 minuto por círculo do espaço gasto. */
  primeval: boolean;
  /** Pés Ligeiros na Terra (8º). */
  landsStride: boolean;
  /** Esconder-se à Vista (10º): +10 em Furtividade enquanto parado e camuflado. */
  hidePlainSight: boolean;
  /** Desaparecer (14º): Esconder como ação bônus; não pode ser rastreado sem magia. */
  vanish: boolean;
  /** Sentidos Selvagens (18º). */
  feralSenses: boolean;
  /** Matador de Inimigos (20º): + SAB no ataque ou dano contra inimigo favorito, 1× por turno. */
  foeSlayer: number | null;
  hunter: { prey: string | null; tactics: string | null; multiattack: string | null; defense: string | null } | null;
}

const pick = (char: Character, key: string) => char.choices?.[`ranger.${key}`] ?? [];

export function rangerState(char: Character, prof: number, wisMod: number): RangerState | null {
  const level = levelIn(char, 'ranger');
  if (!level) return null;
  const hunter = char.subclassId === 'hunter' && level >= 3;
  const one = (key: string, min: number) => (hunter && level >= min ? pick(char, key)[0] ?? null : null);
  return {
    level,
    dc: 8 + prof + wisMod,
    enemies: pick(char, 'favoredEnemy').map((id) => optionLabel('ranger.favoredEnemy', id)),
    terrains: pick(char, 'favoredTerrain').map((id) => optionLabel('ranger.favoredTerrain', id)),
    primeval: level >= 3,
    landsStride: level >= 8,
    hidePlainSight: level >= 10,
    vanish: level >= 14,
    feralSenses: level >= 18,
    foeSlayer: level >= 20 ? Math.max(0, wisMod) : null,
    hunter: hunter ? { prey: one('hunterPrey', 3), tactics: one('hunterTactics', 7), multiattack: one('hunterMultiattack', 11), defense: one('hunterDefense', 15) } : null,
  };
}

