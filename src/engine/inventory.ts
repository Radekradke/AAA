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
    value: item.value,
    magic: item.magic,
    heal: item.heal,
    grantsSpells: item.grantsSpells,
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
    magic: partial.magic,
    grantsSpells: partial.grantsSpells,
    wear: partial.wear,
    image: partial.image ?? undefined,
    worn: partial.wear === 'worn' ? (partial.worn ?? false) : undefined,
    homebrew: true,
  };
}

/** Pode ir para "Equipado": arma, armadura, escudo ou item vestível. */
export function canEquip(it: InventoryItem): boolean {
  return slotForItem(it) !== null || it.wear === 'worn';
}

/**
 * O item está valendo agora (efeitos mágicos, magias concedidas)?
 * - parte do corpo: sempre;
 * - vestível: vestido (e sintonizado, se pede sintonia);
 * - pede sintonia: sintonizado;
 * - o resto: com o personagem (no Baú não conta).
 */
export function itemIsActive(char: Character, it: InventoryItem, needsAttunement = !!it.attunement): boolean {
  if (it.wear === 'body') return true;
  if (it.wear === 'worn') return !!it.worn && (!needsAttunement || it.attuned);
  if (needsAttunement) return it.attuned;
  return containerOf(char, it) !== 'bau';
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
  return Object.values(char.equipped).includes(it.uid) || it.wear === 'body' || (it.wear === 'worn' && !!it.worn);
}

/** Conta de sintonias ativas (máximo 3 em D&D 5e). */
export function attunedCount(char: Character): number {
  return char.inventory.filter((i) => i.attuned).length;
}

export const MAX_ATTUNEMENT = 3;

/* ---------- recipientes: Equipado · Mochila · Baú ---------- */

export type ContainerId = 'equipado' | 'mochila' | 'bau';

/** Categorias que, sem escolha do jogador, ficam guardadas no Baú. */
const STASH_BY_DEFAULT = new Set(['treasure', 'wondrous', 'ring']);

/** Em qual recipiente o item aparece. */
export function containerOf(char: Character, it: InventoryItem): ContainerId {
  if (isEquipped(char, it)) return 'equipado';
  if (it.location) return it.location;
  return STASH_BY_DEFAULT.has(it.category) ? 'bau' : 'mochila';
}

export type MoveResult = { ok: true } | { ok: false; reason: string };

/**
 * Move um item para um recipiente (muta o rascunho da ficha):
 * - Equipado: ocupa o slot do item (troca o que estava lá);
 * - Mochila/Baú: desequipa, se preciso, e guarda no lugar escolhido.
 */
export function moveItemTo(char: Character, uid: string, target: ContainerId): MoveResult {
  const it = char.inventory.find((i) => i.uid === uid);
  if (!it) return { ok: false, reason: 'Item não encontrado.' };
  if (it.wear === 'body') return { ok: false, reason: `${it.name} faz parte do corpo — fica sempre com o herói.` };
  if (it.wear === 'worn') {
    it.worn = target === 'equipado';
    if (target !== 'equipado') it.location = target;
    return { ok: true };
  }
  if (target === 'equipado') {
    const slot = slotForItem(it);
    if (!slot) return { ok: false, reason: `${it.name} não é arma, armadura nem escudo — não dá para equipar.` };
    if (!isEquipped(char, it)) char.equipped = { ...char.equipped, [slot]: it.uid };
    return { ok: true };
  }
  if (isEquipped(char, it)) {
    const equipped = { ...char.equipped };
    for (const k of Object.keys(equipped) as (keyof EquippedSlots)[]) if (equipped[k] === uid) equipped[k] = null;
    char.equipped = equipped;
  }
  it.location = target;
  return { ok: true };
}

