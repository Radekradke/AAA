import type { Character } from '@/types/character';
import { characterResources } from './classResources';
import { levelIn, rageBonus } from './damageExtras';
import { TOTEM_ATTUNEMENT, TOTEM_SPIRIT } from '@/data/classChoices';

/**
 * Bárbaro (PHB 2014) na mesa: o que a Fúria faz agora, quantos usos sobram e
 * os extras da subclasse. A ficha usa isto para o painel de Fúria no Combate,
 * a resistência no dano recebido e a Fúria Implacável.
 */
export interface BarbarianState {
  level: number;
  raging: boolean;
  frenzy: boolean;
  reckless: boolean;
  usesLeft: number;
  usesMax: number;
  unlimited: boolean;
  bonus: number;
  berserker: boolean;
  totem: string | null;
  /** O que a resistência da Fúria cobre (Urso: tudo menos psíquico). */
  resistance: string;
  /** Efeitos ligados enquanto a Fúria dura (lista para o jogador). */
  effects: string[];
  /** Fúria Implacável (11º): CD da próxima salvaguarda de CON (10, +5 a cada uso). */
  relentlessDC: number | null;
}

export function barbarianState(char: Character): BarbarianState | null {
  const level = levelIn(char, 'barbarian');
  if (!level) return null;
  const marks = char.combat?.marks ?? [];
  const res = characterResources(char).find((r) => r.id === 'rage');
  const usesMax = res?.max ?? 0;
  const unlimited = !!res?.unlimited;
  const usesLeft = unlimited ? Infinity : Math.min(usesMax, char.combat?.resources?.rage ?? usesMax);
  const sub = char.subclassId;
  const berserker = sub === 'berserker' && level >= 3;
  const totem = sub === 'totem' && level >= 3 ? char.choices?.['barbarian.totemSpirit']?.[0] ?? null : null;
  const attune = sub === 'totem' && level >= 14 ? char.choices?.['barbarian.totemAttunement']?.[0] ?? null : null;
  const bonus = rageBonus(level);
  const resistance = totem === 'bear' ? 'todo dano, exceto psíquico' : 'concussão, cortante e perfurante';
  const frenzy = marks.includes('frenzy');
  const effects = [
    `+${bonus} de dano em ataques corpo a corpo com FOR`,
    `Resistência a ${resistance}${totem === 'bear' ? ' (Espírito do Urso)' : ''}`,
    'Vantagem em testes e salvaguardas de FOR',
    'Não conjura nem se concentra em magias',
    ...(berserker && frenzy ? ['Frenesi: um ataque corpo a corpo como ação bônus em cada turno (exaustão quando a Fúria acabar)'] : []),
    ...(berserker && level >= 6 ? ['Fúria Inconsciente: não pode ser enfeitiçado nem amedrontado'] : []),
    ...(totem && totem !== 'bear' ? [`Espírito ${TOTEM_SPIRIT.find((t) => t.id === totem)?.label}: ${TOTEM_SPIRIT.find((t) => t.id === totem)?.desc}`] : []),
    ...(attune ? [`Sintonia ${TOTEM_ATTUNEMENT.find((t) => t.id === attune)?.label}: ${TOTEM_ATTUNEMENT.find((t) => t.id === attune)?.desc}`] : []),
    ...(level >= 11 ? ['Fúria Implacável: ao cair a 0 PV, salvaguarda de CON para ficar com 1 PV'] : []),
    ...(level >= 15 ? ['Fúria Persistente: só acaba se você desmaiar ou quiser'] : ['Acaba se você não atacar nem sofrer dano até o fim do seu turno']),
  ];
  const relentlessDC = level >= 11 ? 10 + 5 * (char.combat?.resources?.relentless ?? 0) : null;
  return { level, raging: marks.includes('rage'), frenzy, reckless: marks.includes('reckless'), usesLeft, usesMax, unlimited, bonus, berserker, totem, resistance, effects, relentlessDC };
}

/** Condições que a Fúria Inconsciente (Furioso 6º) impede enquanto dura. */
export const MINDLESS_RAGE_BLOCKS = ['Enfeitiçado', 'Amedrontado'];
