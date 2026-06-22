import type { Character, EquippedSlots, InventoryItem } from '@/types/character';
import { itemToInventory } from './inventory';
import { getItem } from '@/data/items';

export interface GearSelection {
  armorId: string | null;
  weaponId: string | null;
  rangedId: string | null;
  shield: boolean;
}

/** Itens sempre incluídos na mochila inicial. */
const BASE_GEAR = ['g-backpack', 'p-heal', 'g-torch', 'g-rations'];

/**
 * Constrói a mochila e o mapa de slots equipados a partir das escolhas do
 * passo de Equipamento. Mantém os uids consistentes entre inventário e slots.
 */
export function buildLoadout(sel: GearSelection): { inventory: InventoryItem[]; equipped: EquippedSlots } {
  const inventory: InventoryItem[] = [];
  const equipped: EquippedSlots = { armor: null, shield: null, mainHand: null, offHand: null, ranged: null };

  const addAndMaybeEquip = (id: string | null, slot: keyof EquippedSlots | null) => {
    if (!id) return;
    const item = getItem(id);
    if (!item) return;
    const inst = itemToInventory(item);
    inventory.push(inst);
    if (slot) equipped[slot] = inst.uid;
  };

  addAndMaybeEquip(sel.armorId, 'armor');
  addAndMaybeEquip(sel.weaponId, 'mainHand');
  addAndMaybeEquip(sel.rangedId, 'ranged');
  if (sel.shield) addAndMaybeEquip('s-shield', 'shield');

  for (const id of BASE_GEAR) {
    const item = getItem(id);
    if (item) inventory.push(itemToInventory(item));
  }

  return { inventory, equipped };
}

/** Escolha inicial coerente conforme a classe. */
export function defaultSelection(classId: string): GearSelection {
  if (classId === 'wizard' || classId === 'sorcerer') {
    return { armorId: null, weaponId: 'w-quarterstaff', rangedId: null, shield: false };
  }
  if (classId === 'rogue' || classId === 'ranger' || classId === 'monk') {
    return { armorId: 'a-leather', weaponId: 'w-shortsword', rangedId: 'w-shortbow', shield: false };
  }
  if (classId === 'barbarian') {
    return { armorId: 'a-hide', weaponId: 'w-greataxe', rangedId: null, shield: false };
  }
  return { armorId: 'a-chainmail', weaponId: 'w-longsword', rangedId: null, shield: true };
}

export function applySelection(char: Character, sel: GearSelection) {
  const { inventory, equipped } = buildLoadout(sel);
  char.inventory = inventory;
  char.equipped = equipped;
}

/** Lê a seleção de equipamento atual a partir dos slots equipados do personagem. */
export function selectionFromChar(char: Character): GearSelection {
  const itemIdOf = (uid: string | null) =>
    uid ? char.inventory.find((i) => i.uid === uid)?.itemId ?? null : null;
  return {
    armorId: itemIdOf(char.equipped.armor),
    weaponId: itemIdOf(char.equipped.mainHand),
    rangedId: itemIdOf(char.equipped.ranged),
    shield: !!char.equipped.shield,
  };
}
