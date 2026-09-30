import type { Item } from '@/types/dnd';
import { WEAPONS, WEAPON_BY_ID } from './weapons';
import { ARMORS, ARMOR_BY_ID } from './armors';
import { GEAR } from './gear';
import { MAGIC_ITEMS, enchantItem } from './magicItems';

export { GEAR, MAGIC_ITEMS };

/** Catálogo completo de itens (armas + armaduras + equipamento + mágicos). */
export const ALL_ITEMS: Item[] = [...WEAPONS, ...ARMORS, ...GEAR, ...MAGIC_ITEMS];

export const ITEM_BY_ID: Record<string, Item> = {
  ...WEAPON_BY_ID,
  ...ARMOR_BY_ID,
  ...Object.fromEntries(GEAR.map((g) => [g.id, g])),
  ...Object.fromEntries(MAGIC_ITEMS.map((g) => [g.id, g])),
};

export function getItem(id: string | null | undefined): Item | undefined {
  if (!id) return undefined;
  const hit = ITEM_BY_ID[id];
  if (hit) return hit;
  // arma/armadura/escudo encantado: "w-longsword-plus2"
  const m = id.match(/^(.*)-plus([123])$/);
  const base = m ? ITEM_BY_ID[m[1]] : undefined;
  return base ? enchantItem(base, Number(m![2])) : undefined;
}
