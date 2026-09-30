import type { Character } from '@/types/character';
import { characterResources } from './classResources';
import { classLevelOf } from './levelUp';

/** Regras de classe que mexem na rolagem de iniciativa (PHB 2014). */
export interface InitiativeRules {
  /** Instinto Selvagem (Bárbaro 7º): vantagem na iniciativa. */
  advantage: boolean;
  advantageSource?: string;
  /** Recursos zerados que voltam ao rolar iniciativa. */
  refills: { resId: string; value: number; label: string }[];
}

export function initiativeRules(char: Character): InitiativeRules {
  const res = Object.fromEntries(characterResources(char).map((r) => [r.id, r]));
  const cur = (id: string) => Math.min(res[id]?.max ?? 0, char.combat.resources[id] ?? res[id]?.max ?? 0);
  const refills: InitiativeRules['refills'] = [];
  const barb = classLevelOf(char, 'barbarian');
  // Implacável (Mestre de Batalha 15º): sem dados de superioridade, recupera 1
  if (res.superiority && classLevelOf(char, 'fighter') >= 15 && cur('superiority') === 0) {
    refills.push({ resId: 'superiority', value: 1, label: 'Implacável: +1 dado de superioridade' });
  }
  // Inspiração Superior (Bardo 20º): sem inspiração, recupera 1
  if (res.inspiration && classLevelOf(char, 'bard') >= 20 && cur('inspiration') === 0) {
    refills.push({ resId: 'inspiration', value: 1, label: 'Inspiração Superior: +1 Inspiração de Bardo' });
  }
  // Perfeição (Monge 20º): sem ki, recupera 4
  if (res.ki && classLevelOf(char, 'monk') >= 20 && cur('ki') === 0) {
    refills.push({ resId: 'ki', value: 4, label: 'Perfeição: +4 pontos de ki' });
  }
  // Segunda Chance (XGE): volta ao rolar iniciativa
  if (res.featSecondChance && cur('featSecondChance') === 0) {
    refills.push({ resId: 'featSecondChance', value: 1, label: 'Segunda Chance recarregada' });
  }
  return {
    advantage: barb >= 7,
    advantageSource: barb >= 7 ? 'Instinto Selvagem' : undefined,
    refills,
  };
}
