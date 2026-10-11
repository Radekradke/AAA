import type { Character } from '@/types/character';
import { characterResources } from './classResources';
import { levelIn, sneakDice } from './damageExtras';

/**
 * Ladino (PHB 2014) na mesa: o que a ficha faz sozinha em cada nível e o que
 * vira botão. Esquiva Sobrenatural e Evasão também valem para quem as tem por
 * outra classe (Monge 7º, Caçador 15º).
 */
export interface RogueState {
  level: number;
  sneakDice: number;
  /** Ação Ardilosa (2º): Disparada, Desengajar ou Esconder como ação bônus. */
  cunning: boolean;
  /** Talento Confiável (11º): d20 abaixo de 10 conta como 10 em perícias com proficiência. */
  reliable: boolean;
  /** Sentido Cego (14º). */
  blindsense: boolean;
  /** Golpe de Sorte (20º): usos restantes (volta no descanso curto). */
  strokeLeft: number;
  /** Ladrão: Mãos Rápidas (3º), Furtividade Suprema (9º), Reflexos de Ladrão (17º). */
  fastHands: boolean;
  supremeSneak: boolean;
  thiefsReflexes: boolean;
  /** Assassino: Assassinar (3º) e a CD do Golpe Mortal (17º). */
  assassinate: boolean;
  deathStrikeDC: number | null;
}

export function rogueState(char: Character, prof: number, dexMod: number): RogueState | null {
  const level = levelIn(char, 'rogue');
  if (!level) return null;
  const sub = char.subclassId;
  const stroke = characterResources(char).find((r) => r.id === 'strokeOfLuck');
  const strokeLeft = stroke ? Math.min(stroke.max, char.combat?.resources?.strokeOfLuck ?? stroke.max) : 0;
  return {
    level,
    sneakDice: sneakDice(level),
    cunning: level >= 2,
    reliable: level >= 11,
    blindsense: level >= 14,
    strokeLeft,
    fastHands: sub === 'thief' && level >= 3,
    supremeSneak: sub === 'thief' && level >= 9,
    thiefsReflexes: sub === 'thief' && level >= 17,
    assassinate: sub === 'assassin' && level >= 3,
    deathStrikeDC: sub === 'assassin' && level >= 17 ? 8 + dexMod + prof : null,
  };
}

const hunterDefense = (char: Character) =>
  char.subclassId === 'hunter' && levelIn(char, 'ranger') >= 15 ? char.choices?.['ranger.hunterDefense']?.[0] ?? null : null;

/** Esquiva Sobrenatural: Ladino 5º ou Caçador 15º (Defesa Superior). */
export function hasUncannyDodge(char: Character): boolean {
  return levelIn(char, 'rogue') >= 5 || hunterDefense(char) === 'uncannyDodge';
}

/** Evasão: Ladino 7º, Monge 7º ou Caçador 15º (Defesa Superior). */
export function hasEvasion(char: Character): boolean {
  return levelIn(char, 'rogue') >= 7 || levelIn(char, 'monk') >= 7 || hunterDefense(char) === 'evasion';
}

/**
 * Dano recebido depois das defesas de reação: Evasão (salvaguarda de DES:
 * passou = nada, falhou = metade) e Esquiva Sobrenatural (metade de um ataque).
 * Arredonda para baixo, como toda metade no PHB.
 */
export function reduceDamage(raw: number, opts: { evasion?: 'pass' | 'fail' | null; uncanny?: boolean }): number {
  let n = raw;
  if (opts.evasion === 'pass') n = 0;
  else if (opts.evasion === 'fail') n = Math.floor(n / 2);
  if (opts.uncanny) n = Math.floor(n / 2);
  return n;
}
