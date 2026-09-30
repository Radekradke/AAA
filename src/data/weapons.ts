import type { DamageType, Item, WeaponData } from '@/types/dnd';

/**
 * Armas do Livro do Jogador (D&D 5e 2014): 14 simples + 23 marciais.
 * Distâncias em metros (1,5 m = 5 pés), peso em kg, preço em po.
 * Os ids antigos foram mantidos (fichas salvas continuam apontando para eles).
 */
type Props = Partial<Pick<WeaponData, 'finesse' | 'thrown' | 'versatileDie' | 'rangeLabel'>>;

const PROP_LABEL = (w: Omit<WeaponData, 'properties'>, extra: string[]): string[] => {
  const p = [...extra];
  if (w.finesse) p.unshift('Acuidade');
  if (w.thrown) p.push('Arremesso');
  if (w.versatileDie) p.push('Versátil');
  return p;
};

function W(
  id: string,
  name: string,
  type: WeaponData['type'],
  range: WeaponData['range'],
  dice: number,
  die: number,
  damageType: DamageType,
  kg: number,
  gp: number,
  props: string[] = [],
  extra: Props = {},
): Item {
  const base = { damageDice: dice, damageDie: die, damageType, type, range, ...extra };
  const properties = PROP_LABEL(base, props);
  const dmg = die === 1 ? `${dice} ${damageType}` : `${dice}d${die}${extra.versatileDie ? ` (1d${extra.versatileDie})` : ''} ${damageType}`;
  const note = [dmg, properties.join(', '), extra.rangeLabel ? `Distância ${extra.rangeLabel}` : ''].filter(Boolean).join(' · ');
  return { id, name, category: 'weapon', rarity: 'comum', weight: kg, value: gp, note, weapon: { ...base, properties } };
}

export const WEAPONS: Item[] = [
  // ---- Armas simples corpo a corpo ----
  W('w-club', 'Clava', 'simple', 'melee', 1, 4, 'concussão', 1, 0.1, ['Leve']),
  W('w-dagger', 'Adaga', 'simple', 'melee', 1, 4, 'perfurante', 0.5, 2, ['Leve'], { finesse: true, thrown: true, rangeLabel: '6/18 m' }),
  W('w-greatclub', 'Clava Grande', 'simple', 'melee', 1, 8, 'concussão', 5, 0.2, ['Duas mãos']),
  W('w-handaxe', 'Machado de Mão', 'simple', 'melee', 1, 6, 'cortante', 1, 5, ['Leve'], { thrown: true, rangeLabel: '6/18 m' }),
  W('w-javelin', 'Azagaia', 'simple', 'melee', 1, 6, 'perfurante', 1, 0.5, [], { thrown: true, rangeLabel: '9/36 m' }),
  W('w-lighthammer', 'Martelo Leve', 'simple', 'melee', 1, 4, 'concussão', 1, 2, ['Leve'], { thrown: true, rangeLabel: '6/18 m' }),
  W('w-mace', 'Maça', 'simple', 'melee', 1, 6, 'concussão', 2, 5),
  W('w-quarterstaff', 'Bordão', 'simple', 'melee', 1, 6, 'concussão', 2, 0.2, [], { versatileDie: 8 }),
  W('w-sickle', 'Foice Curta', 'simple', 'melee', 1, 4, 'cortante', 1, 1, ['Leve']),
  W('w-spear', 'Lança', 'simple', 'melee', 1, 6, 'perfurante', 1.5, 1, [], { thrown: true, versatileDie: 8, rangeLabel: '6/18 m' }),
  // ---- Armas simples à distância ----
  W('w-lightcrossbow', 'Besta Leve', 'simple', 'ranged', 1, 8, 'perfurante', 2.5, 25, ['Munição', 'Recarga', 'Duas mãos'], { rangeLabel: '24/96 m' }),
  W('w-dart', 'Dardo', 'simple', 'ranged', 1, 4, 'perfurante', 0.1, 0.05, [], { finesse: true, thrown: true, rangeLabel: '6/18 m' }),
  W('w-shortbow', 'Arco Curto', 'simple', 'ranged', 1, 6, 'perfurante', 1, 25, ['Munição', 'Duas mãos'], { rangeLabel: '24/96 m' }),
  W('w-sling', 'Funda', 'simple', 'ranged', 1, 4, 'concussão', 0, 0.1, ['Munição'], { rangeLabel: '9/36 m' }),
  // ---- Armas marciais corpo a corpo ----
  W('w-battleaxe', 'Machado de Batalha', 'martial', 'melee', 1, 8, 'cortante', 2, 10, [], { versatileDie: 10 }),
  W('w-flail', 'Mangual', 'martial', 'melee', 1, 8, 'concussão', 1, 10),
  W('w-glaive', 'Glaive', 'martial', 'melee', 1, 10, 'cortante', 3, 20, ['Pesada', 'Alcance', 'Duas mãos']),
  W('w-greataxe', 'Machado Grande', 'martial', 'melee', 1, 12, 'cortante', 3.5, 30, ['Pesada', 'Duas mãos']),
  W('w-greatsword', 'Espada Grande', 'martial', 'melee', 2, 6, 'cortante', 3, 50, ['Pesada', 'Duas mãos']),
  W('w-halberd', 'Alabarda', 'martial', 'melee', 1, 10, 'cortante', 3, 20, ['Pesada', 'Alcance', 'Duas mãos']),
  W('w-lance', 'Lança de Montaria', 'martial', 'melee', 1, 12, 'perfurante', 3, 10, ['Alcance', 'Especial: desvantagem a 1,5 m; duas mãos se desmontado']),
  W('w-longsword', 'Espada Longa', 'martial', 'melee', 1, 8, 'cortante', 1.5, 15, [], { versatileDie: 10 }),
  W('w-maul', 'Malho', 'martial', 'melee', 2, 6, 'concussão', 5, 10, ['Pesada', 'Duas mãos']),
  W('w-morningstar', 'Maça Estrela', 'martial', 'melee', 1, 8, 'perfurante', 2, 15),
  W('w-pike', 'Pique', 'martial', 'melee', 1, 10, 'perfurante', 9, 5, ['Pesada', 'Alcance', 'Duas mãos']),
  W('w-rapier', 'Rapieira', 'martial', 'melee', 1, 8, 'perfurante', 1, 25, [], { finesse: true }),
  W('w-scimitar', 'Cimitarra', 'martial', 'melee', 1, 6, 'cortante', 1.5, 25, ['Leve'], { finesse: true }),
  W('w-shortsword', 'Espada Curta', 'martial', 'melee', 1, 6, 'perfurante', 1, 10, ['Leve'], { finesse: true }),
  W('w-trident', 'Tridente', 'martial', 'melee', 1, 6, 'perfurante', 2, 5, [], { thrown: true, versatileDie: 8, rangeLabel: '6/18 m' }),
  W('w-warpick', 'Picareta de Guerra', 'martial', 'melee', 1, 8, 'perfurante', 1, 5),
  W('w-warhammer', 'Martelo de Guerra', 'martial', 'melee', 1, 8, 'concussão', 1, 15, [], { versatileDie: 10 }),
  W('w-whip', 'Chicote', 'martial', 'melee', 1, 4, 'cortante', 1.5, 2, ['Alcance'], { finesse: true }),
  // ---- Armas marciais à distância ----
  W('w-blowgun', 'Zarabatana', 'martial', 'ranged', 1, 1, 'perfurante', 0.5, 10, ['Munição', 'Recarga'], { rangeLabel: '7,5/30 m' }),
  W('w-handcrossbow', 'Besta de Mão', 'martial', 'ranged', 1, 6, 'perfurante', 1.5, 75, ['Munição', 'Leve', 'Recarga'], { rangeLabel: '9/36 m' }),
  W('w-heavycrossbow', 'Besta Pesada', 'martial', 'ranged', 1, 10, 'perfurante', 9, 50, ['Munição', 'Pesada', 'Recarga', 'Duas mãos'], { rangeLabel: '30/120 m' }),
  W('w-longbow', 'Arco Longo', 'martial', 'ranged', 1, 8, 'perfurante', 1, 50, ['Munição', 'Pesada', 'Duas mãos'], { rangeLabel: '45/180 m' }),
  // Rede: não causa dano — ataque à distância que impede (Grande ou menor); CD 10 de FOR para escapar
  {
    id: 'w-net', name: 'Rede', category: 'weapon', rarity: 'comum', weight: 1.5, value: 1,
    note: 'Sem dano · Arremesso 1,5/4,5 m · alvo Grande ou menor fica impedido (FOR CD 10 ou 5 de dano cortante na rede para soltar)',
  },
  // ---- Exemplo mágico (mantido por compatibilidade; o catálogo mágico tem +1/+2/+3 de todas) ----
  {
    id: 'w-battleaxe-plus1', name: 'Machado de Batalha +1', category: 'weapon', rarity: 'incomum', weight: 2, value: 1000, note: '1d8 (1d10) cortante · +1 mágico',
    weapon: { damageDice: 1, damageDie: 8, damageType: 'cortante', type: 'martial', range: 'melee', properties: ['Versátil', 'Mágica +1'], versatileDie: 10 },
  },
];

export const WEAPON_BY_ID: Record<string, Item> = Object.fromEntries(
  WEAPONS.map((w) => [w.id, w]),
);
