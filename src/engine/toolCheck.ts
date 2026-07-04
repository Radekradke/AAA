import type { AbilityKey } from '@/types/dnd';
import type { Character, ToolProf } from '@/types/character';
import { abilityModifier, proficiencyBonus } from './modifiers';
import { effectiveAbilities } from './levelUp';
import { toolDefaultAbility } from '@/data/tools';

/**
 * Teste de ferramenta (D&D 5e 2014): 1d20 + modificador do atributo usado
 * + proficiência da PRÓPRIA ferramenta (+ proficiência de novo com
 * expertise) + bônus manual. Ferramenta NÃO soma perícia — Ferramentas de
 * Ladrão é independente de Prestidigitação.
 */
export interface ToolCheck {
  ability: AbilityKey;
  abilityMod: number;
  proficiency: number;
  expertiseBonus: number;
  manualBonus: number;
  total: number;
}

export function calculateToolCheck(char: Character, tool: ToolProf, ability?: AbilityKey): ToolCheck {
  const usedAbility = ability ?? tool.ability ?? toolDefaultAbility(tool.id);
  const abilityMod = abilityModifier(effectiveAbilities(char)[usedAbility]);
  const prof = proficiencyBonus(char.level);
  const proficiency = prof; // estar na lista = proficiente
  const expertiseBonus = tool.expertise ? prof : 0;
  const manualBonus = tool.manualBonus ?? 0;
  return {
    ability: usedAbility,
    abilityMod,
    proficiency,
    expertiseBonus,
    manualBonus,
    total: abilityMod + proficiency + expertiseBonus + manualBonus,
  };
}
