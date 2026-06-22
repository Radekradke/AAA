import type { Item } from '@/types/dnd';

/**
 * Catálogo de armas (simples e marciais), com dados genéricos de D&D 5e.
 * Distâncias em metros. Fácil de expandir com homebrew.
 */
export const WEAPONS: Item[] = [
  // ---- Armas simples corpo a corpo ----
  {
    id: 'w-club', name: 'Clava', category: 'weapon', rarity: 'comum', weight: 1, note: '1d4 concussão · Leve',
    weapon: { damageDice: 1, damageDie: 4, damageType: 'concussão', type: 'simple', range: 'melee', properties: ['Leve'] },
  },
  {
    id: 'w-dagger', name: 'Adaga', category: 'weapon', rarity: 'comum', weight: 0.5, note: '1d4 perfurante · Acuidade, Leve, Arremesso',
    weapon: { damageDice: 1, damageDie: 4, damageType: 'perfurante', type: 'simple', range: 'melee', properties: ['Acuidade', 'Leve', 'Arremesso'], finesse: true, thrown: true, rangeLabel: '6/18 m' },
  },
  {
    id: 'w-handaxe', name: 'Machado de Mão', category: 'weapon', rarity: 'comum', weight: 1, note: '1d6 cortante · Leve, Arremesso',
    weapon: { damageDice: 1, damageDie: 6, damageType: 'cortante', type: 'simple', range: 'melee', properties: ['Leve', 'Arremesso'], thrown: true, rangeLabel: '6/18 m' },
  },
  {
    id: 'w-mace', name: 'Maça', category: 'weapon', rarity: 'comum', weight: 2, note: '1d6 concussão',
    weapon: { damageDice: 1, damageDie: 6, damageType: 'concussão', type: 'simple', range: 'melee', properties: [] },
  },
  {
    id: 'w-quarterstaff', name: 'Bordão', category: 'weapon', rarity: 'comum', weight: 2, note: '1d6 (1d8) concussão · Versátil',
    weapon: { damageDice: 1, damageDie: 6, damageType: 'concussão', type: 'simple', range: 'melee', properties: ['Versátil'], versatileDie: 8 },
  },
  {
    id: 'w-spear', name: 'Lança', category: 'weapon', rarity: 'comum', weight: 1.5, note: '1d6 (1d8) perfurante · Arremesso, Versátil',
    weapon: { damageDice: 1, damageDie: 6, damageType: 'perfurante', type: 'simple', range: 'melee', properties: ['Arremesso', 'Versátil'], versatileDie: 8, thrown: true, rangeLabel: '6/18 m' },
  },
  // ---- Armas simples à distância ----
  {
    id: 'w-shortbow', name: 'Arco Curto', category: 'weapon', rarity: 'comum', weight: 1, note: '1d6 perfurante · Distância 24/96 m',
    weapon: { damageDice: 1, damageDie: 6, damageType: 'perfurante', type: 'simple', range: 'ranged', properties: ['Munição', 'Duas mãos'], finesse: true, rangeLabel: '24/96 m' },
  },
  {
    id: 'w-lightcrossbow', name: 'Besta Leve', category: 'weapon', rarity: 'comum', weight: 2.5, note: '1d8 perfurante · Distância 24/96 m',
    weapon: { damageDice: 1, damageDie: 8, damageType: 'perfurante', type: 'simple', range: 'ranged', properties: ['Munição', 'Recarga', 'Duas mãos'], finesse: true, rangeLabel: '24/96 m' },
  },
  // ---- Armas marciais corpo a corpo ----
  {
    id: 'w-shortsword', name: 'Espada Curta', category: 'weapon', rarity: 'comum', weight: 1, note: '1d6 perfurante · Acuidade, Leve',
    weapon: { damageDice: 1, damageDie: 6, damageType: 'perfurante', type: 'martial', range: 'melee', properties: ['Acuidade', 'Leve'], finesse: true },
  },
  {
    id: 'w-longsword', name: 'Espada Longa', category: 'weapon', rarity: 'comum', weight: 1.5, note: '1d8 (1d10) cortante · Versátil',
    weapon: { damageDice: 1, damageDie: 8, damageType: 'cortante', type: 'martial', range: 'melee', properties: ['Versátil'], versatileDie: 10 },
  },
  {
    id: 'w-battleaxe', name: 'Machado de Batalha', category: 'weapon', rarity: 'comum', weight: 2, note: '1d8 (1d10) cortante · Versátil',
    weapon: { damageDice: 1, damageDie: 8, damageType: 'cortante', type: 'martial', range: 'melee', properties: ['Versátil'], versatileDie: 10 },
  },
  {
    id: 'w-greataxe', name: 'Machado Grande', category: 'weapon', rarity: 'comum', weight: 3.5, note: '1d12 cortante · Pesada, Duas mãos',
    weapon: { damageDice: 1, damageDie: 12, damageType: 'cortante', type: 'martial', range: 'melee', properties: ['Pesada', 'Duas mãos'] },
  },
  {
    id: 'w-greatsword', name: 'Espada Grande', category: 'weapon', rarity: 'comum', weight: 3, note: '2d6 cortante · Pesada, Duas mãos',
    weapon: { damageDice: 2, damageDie: 6, damageType: 'cortante', type: 'martial', range: 'melee', properties: ['Pesada', 'Duas mãos'] },
  },
  {
    id: 'w-rapier', name: 'Rapieira', category: 'weapon', rarity: 'comum', weight: 1, note: '1d8 perfurante · Acuidade',
    weapon: { damageDice: 1, damageDie: 8, damageType: 'perfurante', type: 'martial', range: 'melee', properties: ['Acuidade'], finesse: true },
  },
  {
    id: 'w-warhammer', name: 'Martelo de Guerra', category: 'weapon', rarity: 'comum', weight: 1, note: '1d8 (1d10) concussão · Versátil',
    weapon: { damageDice: 1, damageDie: 8, damageType: 'concussão', type: 'martial', range: 'melee', properties: ['Versátil'], versatileDie: 10 },
  },
  // ---- Armas marciais à distância ----
  {
    id: 'w-longbow', name: 'Arco Longo', category: 'weapon', rarity: 'comum', weight: 1, note: '1d8 perfurante · Distância 45/180 m',
    weapon: { damageDice: 1, damageDie: 8, damageType: 'perfurante', type: 'martial', range: 'ranged', properties: ['Munição', 'Pesada', 'Duas mãos'], finesse: true, rangeLabel: '45/180 m' },
  },
  // ---- Exemplo mágico ----
  {
    id: 'w-battleaxe-plus1', name: 'Machado de Batalha +1', category: 'weapon', rarity: 'incomum', weight: 2, note: '1d8 (1d10) cortante · +1 mágico',
    weapon: { damageDice: 1, damageDie: 8, damageType: 'cortante', type: 'martial', range: 'melee', properties: ['Versátil', 'Mágica +1'], versatileDie: 10 },
  },
];

export const WEAPON_BY_ID: Record<string, Item> = Object.fromEntries(
  WEAPONS.map((w) => [w.id, w]),
);
