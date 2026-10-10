import type { ItemDescription } from './types';
import { WEAPON_DESCRIPTIONS } from './weapons';
import { ARMOR_DESCRIPTIONS } from './armors';
import { ADVENTURE_DESCRIPTIONS } from './adventure';
import { SUPPLY_DESCRIPTIONS } from './supplies';
import { CRAFT_DESCRIPTIONS } from './crafts';
import { TRAVEL_DESCRIPTIONS } from './travel';
import { POTION_DESCRIPTIONS } from './potions';
import { WONDROUS_DESCRIPTIONS } from './wondrous';
import { ARCANE_DESCRIPTIONS } from './arcane';

export type { ItemDescription };

/** Itens mágicos: a linha "na mesa" é dica, e a regra exata fica na nota do catálogo. */
function asTips(map: Record<string, ItemDescription>): Record<string, ItemDescription> {
  return Object.fromEntries(Object.entries(map).map(([id, d]) => [id, { ...d, complementsNote: true }]));
}

/** Descrições de todo o catálogo, por id de item. */
export const ITEM_DESCRIPTIONS: Record<string, ItemDescription> = {
  ...WEAPON_DESCRIPTIONS,
  ...ARMOR_DESCRIPTIONS,
  ...ADVENTURE_DESCRIPTIONS,
  ...SUPPLY_DESCRIPTIONS,
  ...CRAFT_DESCRIPTIONS,
  ...TRAVEL_DESCRIPTIONS,
  ...asTips(POTION_DESCRIPTIONS),
  ...asTips(WONDROUS_DESCRIPTIONS),
  ...asTips(ARCANE_DESCRIPTIONS),
};

/**
 * Descrição de um item. Versões encantadas (+1/+2/+3) usam a do item base:
 * uma "Espada Longa +2" continua sendo, antes de tudo, uma espada longa.
 */
export function itemDescription(id: string | null | undefined): ItemDescription | undefined {
  if (!id) return undefined;
  return ITEM_DESCRIPTIONS[id] ?? ITEM_DESCRIPTIONS[id.replace(/-plus[123]$/, '')];
}
