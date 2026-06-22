import type { Item } from '@/types/dnd';
import { WEAPONS, WEAPON_BY_ID } from './weapons';
import { ARMORS, ARMOR_BY_ID } from './armors';

/** Equipamentos comuns de aventura e itens mágicos de exemplo. */
export const GEAR: Item[] = [
  { id: 'g-backpack', name: 'Mochila de Aventureiro', category: 'gear', rarity: 'comum', weight: 2, note: 'Corda, tochas, pé-de-cabra e rações' },
  { id: 'g-explorer', name: 'Mochila de Explorador', category: 'gear', rarity: 'comum', weight: 2, note: 'Saco de dormir, rações, mapa e cantil' },
  { id: 'g-rope', name: 'Corda de Cânhamo (15 m)', category: 'gear', rarity: 'comum', weight: 5, note: 'Resistência sólida' },
  { id: 'g-torch', name: 'Tocha', category: 'gear', rarity: 'comum', weight: 0.5, note: 'Luz por 1 hora' },
  { id: 'g-rations', name: 'Rações (1 dia)', category: 'gear', rarity: 'comum', weight: 1, note: 'Comida de viagem' },
  { id: 'g-healkit', name: 'Kit de Cura', category: 'gear', rarity: 'comum', weight: 1.5, note: 'Estabiliza criaturas (10 usos)' },
  { id: 'g-thieves', name: 'Ferramentas de Ladrão', category: 'gear', rarity: 'comum', weight: 0.5, note: 'Abrir fechaduras e desarmar armadilhas' },
  // ---- Consumíveis / mágicos de exemplo ----
  { id: 'p-heal', name: 'Poção de Cura', category: 'consumable', rarity: 'comum', weight: 0.25, note: 'Restaura 2d4+2 PV' },
  { id: 'p-heal-greater', name: 'Poção de Cura Maior', category: 'consumable', rarity: 'incomum', weight: 0.25, note: 'Restaura 4d4+4 PV' },
  { id: 'm-ring-prot', name: 'Anel de Proteção', category: 'ring', rarity: 'raro', weight: 0, note: '+1 CA e em resistências', acBonus: 1, attunement: true },
  { id: 'm-amulet-health', name: 'Amuleto da Saúde', category: 'wondrous', rarity: 'muito-raro', weight: 0.5, note: 'Vitalidade ampliada', attunement: true },
  { id: 'm-cloak', name: 'Manto do Deslocamento', category: 'wondrous', rarity: 'raro', weight: 0.5, note: 'Vantagem contra ser agarrado', attunement: true },
  { id: 'm-torch-eternal', name: 'Tocha Eterna', category: 'wondrous', rarity: 'comum', weight: 0.5, note: 'Luz mágica contínua' },
];

/** Catálogo completo de itens (armas + armaduras + equipamentos). */
export const ALL_ITEMS: Item[] = [...WEAPONS, ...ARMORS, ...GEAR];

export const ITEM_BY_ID: Record<string, Item> = {
  ...WEAPON_BY_ID,
  ...ARMOR_BY_ID,
  ...Object.fromEntries(GEAR.map((g) => [g.id, g])),
};

export function getItem(id: string | null | undefined): Item | undefined {
  if (!id) return undefined;
  return ITEM_BY_ID[id];
}
