import type { Item, WeaponData } from '@/types/dnd';
import type { Character, EquippedSlots, InventoryItem } from '@/types/character';
import { getItem } from '@/data/items';
import { BODY_SLOTS, bodySlotOf } from './bodySlots';

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
    // anel, capa, botas…: chega guardado (vestir é escolha do jogador)
    worn: bodySlotOf({ name: item.name, category: item.category }) ? false : undefined,
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

/**
 * Se veste no corpo: anel, capa, botas, amuleto… (do catálogo, pelo encaixe)
 * ou item homebrew marcado como vestível.
 */
export function isWearable(it: InventoryItem): boolean {
  if (it.wear === 'body') return false;
  return it.wear === 'worn' || bodySlotOf(it) !== null;
}

/**
 * Está vestido? Fichas antigas não marcavam anel/amuleto do catálogo como
 * vestido: sintonizado e nunca mexido conta como vestido (não perde a CA).
 */
export function isWorn(it: InventoryItem): boolean {
  if (!isWearable(it)) return false;
  return it.worn ?? (it.wear !== 'worn' && !!it.attuned);
}

/** Pode ir para "Equipado": arma, armadura, escudo ou item vestível. */
export function canEquip(it: InventoryItem): boolean {
  return slotForItem(it) !== null || isWearable(it);
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
  // anel, capa, botas…: só valem vestidos (e sintonizados, se pedem sintonia)
  if (isWearable(it)) return isWorn(it) && (!needsAttunement || it.attuned);
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

const weaponOf = (it: InventoryItem | undefined): WeaponData | undefined => (it ? it.weapon ?? getItem(it.itemId)?.weapon : undefined);
const hasProp = (w: WeaponData | undefined, re: RegExp) => !!w?.properties.some((p) => re.test(p));
export const isTwoHanded = (w: WeaponData | undefined) => hasProp(w, /duas m[ãa]os/i);
export const isLightWeapon = (w: WeaponData | undefined) => hasProp(w, /^leve$/i);

/**
 * Coloca um item nos slots de arma/armadura respeitando as mãos (PHB 2014):
 * - arma de duas mãos tira o escudo e a arma da outra mão;
 * - escudo tira a arma de duas mãos e a da mão secundária;
 * - arma leve com outra arma leve na mão (e sem escudo) vai para a mão
 *   secundária — luta com duas armas. O talento Combatente com Duas Armas
 *   libera armas que não são leves.
 * Devolve os slots novos e um aviso curto do que saiu (se algo saiu).
 */
export function placeInSlots(char: Character, it: InventoryItem): { equipped: EquippedSlots; note?: string } {
  const slot = slotForItem(it);
  const equipped = { ...char.equipped };
  if (!slot) return { equipped };
  const byUid = (uid: string | null) => (uid ? char.inventory.find((i) => i.uid === uid) : undefined);
  const name = (uid: string | null) => byUid(uid)?.name ?? 'item';
  const notes: string[] = [];

  if (slot === 'shield') {
    const main = byUid(equipped.mainHand);
    if (main && isTwoHanded(weaponOf(main))) {
      notes.push(`${main.name} usa as duas mãos — foi para a mochila`);
      equipped.mainHand = null;
    }
    if (equipped.offHand) {
      notes.push(`${name(equipped.offHand)} saiu da mão secundária`);
      equipped.offHand = null;
    }
    equipped.shield = it.uid;
    return { equipped, note: notes.join('; ') || undefined };
  }

  if (slot === 'mainHand') {
    const w = weaponOf(it);
    if (isTwoHanded(w)) {
      if (equipped.shield) notes.push(`${name(equipped.shield)} foi para a mochila (arma de duas mãos)`);
      if (equipped.offHand) notes.push(`${name(equipped.offHand)} saiu da mão secundária`);
      equipped.shield = null;
      equipped.offHand = null;
      equipped.mainHand = it.uid;
      return { equipped, note: notes.join('; ') || undefined };
    }
    const main = byUid(equipped.mainHand);
    const mainW = weaponOf(main);
    const dualFeat = (char.feats ?? []).includes('dual-wielder');
    const canPair = (x: WeaponData | undefined) => !!x && x.range === 'melee' && !isTwoHanded(x) && (dualFeat || isLightWeapon(x));
    if (main && main.uid !== it.uid && !equipped.shield && canPair(mainW) && canPair(w)) {
      if (equipped.offHand && equipped.offHand !== it.uid) notes.push(`${name(equipped.offHand)} saiu da mão secundária`);
      equipped.offHand = it.uid;
      notes.unshift(`${it.name} na mão secundária (luta com duas armas)`);
      return { equipped, note: notes.join('; ') };
    }
    equipped.mainHand = it.uid;
    return { equipped };
  }

  equipped[slot] = it.uid;
  return { equipped };
}

/** Tira o item dos slots; se sair a arma principal, a da mão secundária passa para a principal. */
export function removeFromSlots(equipped: EquippedSlots, uid: string): EquippedSlots {
  const next = { ...equipped };
  for (const k of Object.keys(next) as (keyof EquippedSlots)[]) if (next[k] === uid) next[k] = null;
  if (!next.mainHand && next.offHand) {
    next.mainHand = next.offHand;
    next.offHand = null;
  }
  return next;
}

/** Equipa ou desequipa um item, devolvendo o novo mapa de slots. */
export function toggleEquip(char: Character, it: InventoryItem): EquippedSlots {
  if (Object.values(char.equipped).includes(it.uid)) return removeFromSlots(char.equipped, it.uid);
  return placeInSlots(char, it).equipped;
}

export function isEquipped(char: Character, it: InventoryItem): boolean {
  return Object.values(char.equipped).includes(it.uid) || it.wear === 'body' || isWorn(it);
}

/** Conta de sintonias ativas (máximo 3 em D&D 5e). */
export function attunedCount(char: Character): number {
  return char.inventory.filter((i) => i.attuned).length;
}

/** Itens vestidos no mesmo encaixe do corpo (sem contar o próprio). */
export function wornInSameSlot(char: Character, it: InventoryItem): InventoryItem[] {
  const slot = bodySlotOf(it);
  if (!slot) return [];
  return char.inventory.filter((o) => o.uid !== it.uid && bodySlotOf(o) === slot && isWorn(o));
}

export const MAX_ATTUNEMENT = 3;

/* ---------- recipientes: Equipado · Mochila · Baú ---------- */

export type ContainerId = 'equipado' | 'mochila' | 'bau';

/**
 * Categorias que, sem escolha do jogador, ficam guardadas no Baú. Itens
 * maravilhosos (varinha, cajado, pedra da sorte) vão para a mochila: com o
 * herói eles funcionam; anel fora do dedo não faz nada, então pode ir ao Baú.
 */
const STASH_BY_DEFAULT = new Set(['treasure', 'ring']);

/** Em qual recipiente o item aparece. */
export function containerOf(char: Character, it: InventoryItem): ContainerId {
  if (isEquipped(char, it)) return 'equipado';
  if (it.location) return it.location;
  return STASH_BY_DEFAULT.has(it.category) ? 'bau' : 'mochila';
}

export type MoveResult = { ok: true; note?: string } | { ok: false; reason: string };

/**
 * Move um item para um recipiente (muta o rascunho da ficha):
 * - Equipado: ocupa o slot do item (troca o que estava lá);
 * - Mochila/Baú: desequipa, se preciso, e guarda no lugar escolhido.
 */
export function moveItemTo(char: Character, uid: string, target: ContainerId): MoveResult {
  const it = char.inventory.find((i) => i.uid === uid);
  if (!it) return { ok: false, reason: 'Item não encontrado.' };
  if (it.wear === 'body') return { ok: false, reason: `${it.name} faz parte do corpo — fica sempre com o herói.` };
  if (isWearable(it)) {
    if (target === 'equipado' && !isWorn(it)) {
      const slot = bodySlotOf(it);
      const def = slot ? BODY_SLOTS[slot] : null;
      const others = wornInSameSlot(char, it);
      if (def?.max && others.length >= def.max) {
        const list = others.map((o) => o.name).join(' e ');
        return {
          ok: false,
          reason: def.max === 1 ? `Só dá para usar ${def.what} por vez — tire ${list} antes de vestir ${it.name}.` : `Já está usando ${def.max} ${def.what} (${list}) — tire um antes.`,
        };
      }
    }
    it.worn = target === 'equipado';
    if (target !== 'equipado') it.location = target;
    const needsAttune = it.attunement ?? getItem(it.itemId)?.attunement;
    return { ok: true, note: it.worn && needsAttune && !it.attuned ? `${it.name} só funciona sintonizado — sintonize em "Sintonia".` : undefined };
  }
  if (target === 'equipado') {
    const slot = slotForItem(it);
    if (!slot) return { ok: false, reason: `${it.name} não se equipa nem se veste — fica na mochila.` };
    if (isEquipped(char, it)) return { ok: true };
    const placed = placeInSlots(char, it);
    char.equipped = placed.equipped;
    return { ok: true, note: placed.note };
  }
  if (isEquipped(char, it)) char.equipped = removeFromSlots(char.equipped, uid);
  it.location = target;
  return { ok: true };
}

