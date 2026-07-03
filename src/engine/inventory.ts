import type { Item } from '@/types/dnd';
import type { Character, EquippedSlots, InventoryItem } from '@/types/character';

let _seq = 0;
function invUid(): string {
  _seq += 1;
  return `it${Date.now().toString(36)}${_seq}`;
}

/** Cria uma instância de mochila a partir de um item do catálogo. */
export function itemToInventory(item: Item, quantity = 1): InventoryItem {
  return {
    uid: invUid(),
    itemId: item.id,
    name: item.name,
    category: item.category,
    note: item.note,
    rarity: item.rarity,
    weight: item.weight,
    quantity,
    favorite: false,
    attuned: false,
    weapon: item.weapon,
    armor: item.armor,
    acBonus: item.acBonus,
    attunement: item.attunement,
  };
}

/** Cria uma instância de item personalizado (homebrew). */
export function customInventoryItem(partial: Partial<InventoryItem> & { name: string }): InventoryItem {
  return {
    uid: invUid(),
    name: partial.name,
    category: partial.category ?? 'gear',
    note: partial.note ?? '',
    rarity: partial.rarity ?? 'comum',
    weight: partial.weight ?? 0,
    quantity: partial.quantity ?? 1,
    favorite: partial.favorite ?? false,
    attuned: partial.attuned ?? false,
    weapon: partial.weapon,
    armor: partial.armor,
    acBonus: partial.acBonus,
    attunement: partial.attunement,
    value: partial.value,
    itemId: partial.itemId,
    homebrew: true,
  };
}

/** Qual slot um item ocupa quando equipado. */
export function slotForItem(it: InventoryItem): keyof EquippedSlots | null {
  if (it.category === 'armor') return 'armor';
  if (it.category === 'shield') return 'shield';
  if (it.weapon) return it.weapon.range === 'ranged' ? 'ranged' : 'mainHand';
  return null;
}

/** Equipa ou desequipa um item, devolvendo o novo mapa de slots. */
export function toggleEquip(char: Character, it: InventoryItem): EquippedSlots {
  const slot = slotForItem(it);
  if (!slot) return char.equipped;
  const equipped = { ...char.equipped };
  equipped[slot] = equipped[slot] === it.uid ? null : it.uid;
  return equipped;
}

export function isEquipped(char: Character, it: InventoryItem): boolean {
  return Object.values(char.equipped).includes(it.uid);
}

/** Conta de sintonias ativas (máximo 3 em D&D 5e). */
export function attunedCount(char: Character): number {
  return char.inventory.filter((i) => i.attuned).length;
}

export const MAX_ATTUNEMENT = 3;
