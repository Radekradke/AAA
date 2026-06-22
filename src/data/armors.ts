import type { Item } from '@/types/dnd';

/** Catálogo de armaduras (leve, média, pesada) e escudos. */
export const ARMORS: Item[] = [
  // ---- Leves ----
  {
    id: 'a-padded', name: 'Armadura Acolchoada', category: 'armor', rarity: 'comum', weight: 4, note: 'CA 11 + DES · Furtividade em desvantagem',
    armor: { baseAC: 11, category: 'leve', addDex: true, stealthDisadvantage: true },
  },
  {
    id: 'a-leather', name: 'Armadura de Couro', category: 'armor', rarity: 'comum', weight: 5, note: 'CA 11 + DES',
    armor: { baseAC: 11, category: 'leve', addDex: true },
  },
  {
    id: 'a-studded', name: 'Couro Batido', category: 'armor', rarity: 'comum', weight: 6.5, note: 'CA 12 + DES',
    armor: { baseAC: 12, category: 'leve', addDex: true },
  },
  // ---- Médias ----
  {
    id: 'a-hide', name: 'Peles', category: 'armor', rarity: 'comum', weight: 6, note: 'CA 12 + DES (máx. 2)',
    armor: { baseAC: 12, category: 'média', addDex: true, maxDexBonus: 2 },
  },
  {
    id: 'a-chainshirt', name: 'Camisão de Malha', category: 'armor', rarity: 'comum', weight: 10, note: 'CA 13 + DES (máx. 2)',
    armor: { baseAC: 13, category: 'média', addDex: true, maxDexBonus: 2 },
  },
  {
    id: 'a-scale', name: 'Brunea', category: 'armor', rarity: 'comum', weight: 22.5, note: 'CA 14 + DES (máx. 2) · Furtividade em desvantagem',
    armor: { baseAC: 14, category: 'média', addDex: true, maxDexBonus: 2, stealthDisadvantage: true },
  },
  {
    id: 'a-halfplate', name: 'Meia-Armadura', category: 'armor', rarity: 'comum', weight: 20, note: 'CA 15 + DES (máx. 2) · Furtividade em desvantagem',
    armor: { baseAC: 15, category: 'média', addDex: true, maxDexBonus: 2, stealthDisadvantage: true },
  },
  // ---- Pesadas ----
  {
    id: 'a-ringmail', name: 'Cota de Anéis', category: 'armor', rarity: 'comum', weight: 20, note: 'CA 14 · Furtividade em desvantagem',
    armor: { baseAC: 14, category: 'pesada', addDex: false, stealthDisadvantage: true },
  },
  {
    id: 'a-chainmail', name: 'Cota de Malha', category: 'armor', rarity: 'comum', weight: 27.5, note: 'CA 16 · FOR 13 · Furtividade em desvantagem',
    armor: { baseAC: 16, category: 'pesada', addDex: false, strReq: 13, stealthDisadvantage: true },
  },
  {
    id: 'a-splint', name: 'Armadura de Talas', category: 'armor', rarity: 'comum', weight: 30, note: 'CA 17 · FOR 15 · Furtividade em desvantagem',
    armor: { baseAC: 17, category: 'pesada', addDex: false, strReq: 15, stealthDisadvantage: true },
  },
  {
    id: 'a-plate', name: 'Armadura de Placas', category: 'armor', rarity: 'comum', weight: 32.5, note: 'CA 18 · FOR 15 · Furtividade em desvantagem',
    armor: { baseAC: 18, category: 'pesada', addDex: false, strReq: 15, stealthDisadvantage: true },
  },
  // ---- Escudos ----
  {
    id: 's-shield', name: 'Escudo de Aço', category: 'shield', rarity: 'comum', weight: 3, note: '+2 CA', acBonus: 2,
  },
];

export const ARMOR_BY_ID: Record<string, Item> = Object.fromEntries(
  ARMORS.map((a) => [a.id, a]),
);
