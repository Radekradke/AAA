import type { Character, EquippedSlots, InventoryItem } from '@/types/character';
import { itemToInventory } from './inventory';
import { getItem } from '@/data/items';

export interface GearSelection {
  armorId: string | null;
  weaponId: string | null;
  rangedId: string | null;
  shield: boolean;
}

export interface GearOptions {
  armors: string[];
  weapons: string[];
  ranged: string[];
  canUseShield: boolean;
  default: GearSelection;
  note: string;
}

/** Itens sempre incluídos na mochila inicial. */
const BASE_GEAR = ['g-backpack', 'g-rope', 'g-torch', 'g-rations', 'p-heal'];

const COMMON_SIMPLE_MELEE = ['w-club', 'w-dagger', 'w-handaxe', 'w-mace', 'w-quarterstaff', 'w-spear'];

const GEAR_BY_CLASS: Record<string, GearOptions> = {
  barbarian: {
    armors: ['a-leather', 'a-hide'],
    weapons: ['w-greataxe', 'w-greatsword', 'w-battleaxe', 'w-handaxe', 'w-spear'],
    ranged: ['w-shortbow'],
    canUseShield: true,
    default: { armorId: null, weaponId: 'w-greataxe', rangedId: null, shield: false },
    note: 'Bárbaros lutam melhor leves: arma pesada, corpo livre e fúria no lugar da armadura.',
  },
  bard: {
    armors: ['a-leather', 'a-studded'],
    weapons: ['w-rapier', 'w-shortsword', 'w-dagger', 'w-quarterstaff'],
    ranged: ['w-lightcrossbow', 'w-shortbow'],
    canUseShield: false,
    default: { armorId: 'a-leather', weaponId: 'w-rapier', rangedId: 'w-lightcrossbow', shield: false },
    note: 'Bardos começam leves, com arma de acuidade e opção à distância.',
  },
  cleric: {
    armors: ['a-leather', 'a-hide', 'a-chainshirt', 'a-scale'],
    weapons: ['w-mace', 'w-warhammer', 'w-quarterstaff', 'w-spear'],
    ranged: ['w-lightcrossbow'],
    canUseShield: true,
    default: { armorId: 'a-scale', weaponId: 'w-mace', rangedId: null, shield: true },
    note: 'Clérigos usam armadura média, escudo e arma simples para sustentar a linha.',
  },
  druid: {
    armors: ['a-leather', 'a-hide'],
    weapons: ['w-quarterstaff', 'w-spear', 'w-dagger', 'w-mace'],
    ranged: ['w-shortbow'],
    canUseShield: true,
    default: { armorId: 'a-leather', weaponId: 'w-quarterstaff', rangedId: null, shield: false },
    note: 'Druidas evitam metal pesado: proteção leve, bordão e foco em magia natural.',
  },
  fighter: {
    armors: ['a-leather', 'a-hide', 'a-chainshirt', 'a-scale', 'a-chainmail'],
    weapons: ['w-longsword', 'w-battleaxe', 'w-warhammer', 'w-greatsword', 'w-greataxe', 'w-rapier'],
    ranged: ['w-lightcrossbow', 'w-shortbow', 'w-longbow'],
    canUseShield: true,
    default: { armorId: 'a-chainmail', weaponId: 'w-longsword', rangedId: null, shield: true },
    note: 'Guerreiros têm a seleção marcial mais ampla: armadura pesada, escudo ou armas de duas mãos.',
  },
  monk: {
    armors: [],
    weapons: ['w-quarterstaff', 'w-shortsword', 'w-spear', 'w-dagger'],
    ranged: ['w-shortbow'],
    canUseShield: false,
    default: { armorId: null, weaponId: 'w-quarterstaff', rangedId: null, shield: false },
    note: 'Monges dependem de mobilidade e defesa sem armadura.',
  },
  paladin: {
    armors: ['a-chainmail', 'a-scale', 'a-splint'],
    weapons: ['w-longsword', 'w-warhammer', 'w-battleaxe', 'w-greatsword'],
    ranged: ['w-lightcrossbow'],
    canUseShield: true,
    default: { armorId: 'a-chainmail', weaponId: 'w-longsword', rangedId: null, shield: true },
    note: 'Paladinos começam pesados: armadura, escudo e arma marcial.',
  },
  ranger: {
    armors: ['a-leather', 'a-studded', 'a-hide', 'a-chainshirt', 'a-scale'],
    weapons: ['w-shortsword', 'w-rapier', 'w-longsword', 'w-spear', 'w-handaxe'],
    ranged: ['w-longbow', 'w-shortbow'],
    canUseShield: true,
    default: { armorId: 'a-leather', weaponId: 'w-shortsword', rangedId: 'w-longbow', shield: false },
    note: 'Patrulheiros favorecem destreza, rastreio e arco desde o início.',
  },
  rogue: {
    armors: ['a-leather', 'a-studded'],
    weapons: ['w-rapier', 'w-shortsword', 'w-dagger'],
    ranged: ['w-shortbow', 'w-lightcrossbow'],
    canUseShield: false,
    default: { armorId: 'a-leather', weaponId: 'w-rapier', rangedId: 'w-shortbow', shield: false },
    note: 'Ladinos começam leves, com acuidade e ferramenta para atacar à distância.',
  },
  sorcerer: {
    armors: [],
    weapons: ['w-quarterstaff', 'w-dagger'],
    ranged: ['w-lightcrossbow'],
    canUseShield: false,
    default: { armorId: null, weaponId: 'w-quarterstaff', rangedId: 'w-lightcrossbow', shield: false },
    note: 'Feiticeiros carregam pouco: arma simples e alcance para sobreviver.',
  },
  warlock: {
    armors: ['a-leather'],
    weapons: ['w-quarterstaff', 'w-dagger', 'w-mace', 'w-spear'],
    ranged: ['w-lightcrossbow', 'w-shortbow'],
    canUseShield: false,
    default: { armorId: 'a-leather', weaponId: 'w-quarterstaff', rangedId: 'w-lightcrossbow', shield: false },
    note: 'Bruxos recebem proteção leve e uma arma simples enquanto o pacto faz o trabalho pesado.',
  },
  wizard: {
    armors: [],
    weapons: ['w-quarterstaff', 'w-dagger'],
    ranged: [],
    canUseShield: false,
    default: { armorId: null, weaponId: 'w-quarterstaff', rangedId: null, shield: false },
    note: 'Magos começam sem armadura; o grimório vale mais que aço.',
  },
};

const FALLBACK_GEAR: GearOptions = {
  armors: ['a-leather'],
  weapons: COMMON_SIMPLE_MELEE,
  ranged: ['w-shortbow'],
  canUseShield: false,
  default: { armorId: 'a-leather', weaponId: 'w-quarterstaff', rangedId: null, shield: false },
  note: 'Seleção simples e segura para uma classe personalizada.',
};

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
  return { ...gearOptionsForClass(classId).default };
}

export function gearOptionsForClass(classId: string): GearOptions {
  return GEAR_BY_CLASS[classId] ?? FALLBACK_GEAR;
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
