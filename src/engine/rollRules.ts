import type { Character } from '@/types/character';
import type { AbilityKey, SkillKey } from '@/types/dnd';
import { levelIn } from './damageExtras';
import { effectiveAbilities } from './levelUp';

/**
 * Regras de classe que mudam um teste ou salvaguarda d20 sozinhas (PHB 2014):
 * · Fúria (Bárbaro): vantagem em testes e salvaguardas de FOR enquanto dura.
 * · Sentido de Perigo (Bárbaro 2º): vantagem em salvaguardas de DES contra o
 *   que você vê — some se estiver cego, surdo ou incapacitado.
 * · Força Indomável (Bárbaro 18º): teste de FOR nunca abaixo do valor de FOR.
 * · Talento Confiável (Ladino 11º): em teste com proficiência, d20 de 9 ou menos conta como 10.
 * · Furtividade Suprema (Ladrão 9º): vantagem em Furtividade se andou no máximo metade do deslocamento.
 */
export interface RollRule {
  advantage: boolean;
  /** Por que a ficha deu vantagem (vai no rótulo da rolagem). */
  sources: string[];
  /** Total mínimo do teste (Força Indomável). */
  floor?: { value: number; source: string };
  /** Menor valor que o d20 conta (Talento Confiável). */
  d20Min?: { value: number; source: string };
}

export interface RollContext {
  skill?: SkillKey;
  /** O teste soma a proficiência (perícia ou ferramenta treinada). */
  proficient?: boolean;
  /** Deslocamento do herói (Furtividade Suprema compara com o que já andou). */
  speed?: number;
}

const BLOCKS_DANGER = ['Cego', 'Surdo', 'Incapacitado', 'Atordoado', 'Paralisado', 'Inconsciente', 'Petrificado'];

export function rollRule(char: Character, kind: 'check' | 'save', ability: AbilityKey, ctx: RollContext = {}): RollRule {
  const sources: string[] = [];
  const raging = (char.combat?.marks ?? []).includes('rage');
  const barb = levelIn(char, 'barbarian');
  if (raging && ability === 'str') sources.push('Fúria');
  if (kind === 'save' && ability === 'dex' && barb >= 2 && !(char.combat?.conditions ?? []).some((c) => BLOCKS_DANGER.includes(c))) {
    sources.push('Sentido de Perigo');
  }
  const rogue = levelIn(char, 'rogue');
  if (kind === 'check' && ctx.skill === 'stealth' && char.subclassId === 'thief' && rogue >= 9 && ctx.speed && (char.combat?.moveUsed ?? 0) <= ctx.speed / 2) {
    sources.push('Furtividade Suprema');
  }
  const floor = kind === 'check' && ability === 'str' && barb >= 18 ? { value: effectiveAbilities(char).str, source: 'Força Indomável' } : undefined;
  const d20Min = kind === 'check' && ctx.proficient && rogue >= 11 ? { value: 10, source: 'Talento Confiável' } : undefined;
  return { advantage: sources.length > 0, sources, floor, d20Min };
}
