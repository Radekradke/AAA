import type { ArmorData, WeaponData } from '@/types/dnd';

/**
 * Etiquetas de item: um vocabulário fixo, curto e em português. Parte sai
 * sozinha dos dados (arremesso, duas mãos, sintonia…); o resto é escrito à
 * mão junto com a descrição de cada item (src/data/itemDescriptions).
 */
export const AUTO_TAGS = [
  'Arremessável',
  'Duas mãos',
  'Precisa de munição',
  'Barulhenta',
  'Gasta ao usar',
  'Sintonia',
  'Cargas',
  'Foco de conjuração',
  'Ferramenta',
] as const;

export const MANUAL_TAGS = [
  'Discreta',
  'Barata',
  'Frágil',
  'Inflamável',
  'Fonte de luz',
  'Exploração',
  'Social',
  'Sobrevivência',
  'Furtividade',
  'Cura',
  'Controle',
  'Defesa',
  'Montado',
] as const;

export type ItemTag = (typeof AUTO_TAGS)[number] | (typeof MANUAL_TAGS)[number];
export const ITEM_TAGS: readonly ItemTag[] = [...AUTO_TAGS, ...MANUAL_TAGS];

/** O que basta do item para deduzir as etiquetas automáticas. */
export interface TaggableItem {
  category: string;
  group?: string;
  weapon?: WeaponData;
  armor?: ArmorData;
  attunement?: boolean;
  heal?: string;
  charges?: { max: number };
}

/** Etiquetas que saem dos dados do item (sem texto escrito à mão). */
export function autoTags(item: TaggableItem): ItemTag[] {
  const w = item.weapon;
  const tags: ItemTag[] = [];
  if (w?.thrown) tags.push('Arremessável');
  if (w?.properties.includes('Duas mãos')) tags.push('Duas mãos');
  if (w?.properties.includes('Munição')) tags.push('Precisa de munição');
  if (item.armor?.stealthDisadvantage) tags.push('Barulhenta');
  if (item.category === 'consumable' || item.heal || item.group === 'Munição') tags.push('Gasta ao usar');
  if (item.attunement) tags.push('Sintonia');
  if (item.charges?.max) tags.push('Cargas');
  if (item.group === 'Focos de conjuração') tags.push('Foco de conjuração');
  // instrumentos e jogos são "ferramentas" nas regras, mas ninguém chama um alaúde assim
  if (item.category === 'tool' && item.group !== 'Instrumentos musicais' && item.group !== 'Jogos') tags.push('Ferramenta');
  return tags;
}

/** Automáticas primeiro, depois as escritas à mão, sem repetir. */
export function itemTags(item: TaggableItem, manual: readonly ItemTag[] = []): ItemTag[] {
  return [...new Set([...autoTags(item), ...manual])];
}
