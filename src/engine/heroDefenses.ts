import type { Character } from '@/types/character';
import { deriveCharacter } from './dndRules';
import { barbarianState } from './barbarian';
import { itemDefinition } from './inventory';

/** A mesa usa as mesmas defesas ativas da ficha, incluindo itens e Fúria. */
export function heroDefenses(char: Character): { resist?: string; immune?: string } {
  const d = deriveCharacter(char);
  const rage = barbarianState(char);
  const values = d.resistances.map((entry) => entry.value);
  const resist = values.filter((entry) => !entry.includes('(imune)'));
  const immune = values.filter((entry) => entry.includes('(imune)')).map((entry) => entry.replace(/\s*\(imune\)/g, ''));
  const armor = char.inventory.find((it) => it.uid === char.equipped.armor);
  if (rage?.raging && (!armor || itemDefinition(armor).armor?.category !== 'pesada')) {
    resist.push(rage.totem === 'bear' ? 'ácido; frio; fogo; força; elétrico; necrótico; veneno; radiante; trovejante; concussão; cortante; perfurante' : 'concussão; cortante; perfurante');
  }
  return { resist: resist.join('; ') || undefined, immune: immune.join('; ') || undefined };
}
