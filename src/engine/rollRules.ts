import type { Character } from '@/types/character';
import type { AbilityKey } from '@/types/dnd';
import { levelIn } from './damageExtras';
import { effectiveAbilities } from './levelUp';

/**
 * Regras de classe que mudam um teste ou salvaguarda d20 sozinhas (PHB 2014):
 * · Fúria (Bárbaro): vantagem em testes e salvaguardas de FOR enquanto dura.
 * · Sentido de Perigo (Bárbaro 2º): vantagem em salvaguardas de DES contra o
 *   que você vê — some se estiver cego, surdo ou incapacitado.
 * · Força Indomável (Bárbaro 18º): teste de FOR nunca abaixo do valor de FOR.
 */
export interface RollRule {
  advantage: boolean;
  /** Por que a ficha deu vantagem (vai no rótulo da rolagem). */
  sources: string[];
  /** Total mínimo do teste (Força Indomável). */
  floor?: { value: number; source: string };
}

const BLOCKS_DANGER = ['Cego', 'Surdo', 'Incapacitado', 'Atordoado', 'Paralisado', 'Inconsciente', 'Petrificado'];

export function rollRule(char: Character, kind: 'check' | 'save', ability: AbilityKey): RollRule {
  const sources: string[] = [];
  const raging = (char.combat?.marks ?? []).includes('rage');
  const barb = levelIn(char, 'barbarian');
  if (raging && ability === 'str') sources.push('Fúria');
  if (kind === 'save' && ability === 'dex' && barb >= 2 && !(char.combat?.conditions ?? []).some((c) => BLOCKS_DANGER.includes(c))) {
    sources.push('Sentido de Perigo');
  }
  const floor = kind === 'check' && ability === 'str' && barb >= 18 ? { value: effectiveAbilities(char).str, source: 'Força Indomável' } : undefined;
  return { advantage: sources.length > 0, sources, floor };
}
