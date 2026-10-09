import type { ItemDescription } from './types';
import { WEAPON_DESCRIPTIONS } from './weapons';
import { ARMOR_DESCRIPTIONS } from './armors';

export type { ItemDescription };

/** Descrições de todo o catálogo, por id de item. */
export const ITEM_DESCRIPTIONS: Record<string, ItemDescription> = {
  ...WEAPON_DESCRIPTIONS,
  ...ARMOR_DESCRIPTIONS,
};

/**
 * Descrição de um item. Versões encantadas (+1/+2/+3) usam a do item base:
 * uma "Espada Longa +2" continua sendo, antes de tudo, uma espada longa.
 */
export function itemDescription(id: string | null | undefined): ItemDescription | undefined {
  if (!id) return undefined;
  return ITEM_DESCRIPTIONS[id] ?? ITEM_DESCRIPTIONS[id.replace(/-plus[123]$/, '')];
}
