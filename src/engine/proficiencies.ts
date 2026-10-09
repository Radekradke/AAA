import type { Character, InventoryItem } from '@/types/character';
import type { WeaponType } from '@/types/dnd';
import { getSubrace } from '@/data/races';
import { WEAPONS } from '@/data/weapons';
import { getItem } from '@/data/items';

/**
 * Proficiência com armas e armaduras — PHB 2014.
 *
 * - Classe inicial: a lista completa da classe (cap. 3).
 * - Classes de multiclasse: só o que a tabela de multiclasse dá (cap. 6).
 * - Subclasses, raças/sub-raças e talentos somam.
 *
 * Sem proficiência na arma: não soma o bônus de proficiência no ataque.
 * Sem proficiência na armadura: desvantagem em testes, salvaguardas e ataques
 * de FOR/DES e não conjura magias (a CA vale normalmente).
 */
export type ArmorKind = 'leve' | 'média' | 'pesada' | 'escudo';

interface ProfGrant {
  armor?: ArmorKind[];
  weaponTypes?: WeaponType[];
  /** Armas específicas (ids do catálogo, "w-longsword"). */
  weapons?: string[];
}

const ALL_ARMOR: ArmorKind[] = ['leve', 'média', 'pesada', 'escudo'];
const SIMPLE: WeaponType[] = ['simple'];
const MARTIAL: WeaponType[] = ['simple', 'martial'];
const FINESSE_KIT = ['w-handcrossbow', 'w-longsword', 'w-rapier', 'w-shortsword'];
const ARCANE_KIT = ['w-dagger', 'w-dart', 'w-sling', 'w-quarterstaff', 'w-lightcrossbow'];

/** Classe inicial (PHB 2014, cap. 3). */
const CLASS_PROFS: Record<string, ProfGrant> = {
  barbarian: { armor: ['leve', 'média', 'escudo'], weaponTypes: MARTIAL },
  bard: { armor: ['leve'], weaponTypes: SIMPLE, weapons: FINESSE_KIT },
  cleric: { armor: ['leve', 'média', 'escudo'], weaponTypes: SIMPLE },
  druid: {
    armor: ['leve', 'média', 'escudo'],
    weapons: ['w-club', 'w-dagger', 'w-dart', 'w-javelin', 'w-mace', 'w-quarterstaff', 'w-scimitar', 'w-sickle', 'w-sling', 'w-spear'],
  },
  fighter: { armor: ALL_ARMOR, weaponTypes: MARTIAL },
  monk: { weaponTypes: SIMPLE, weapons: ['w-shortsword'] },
  paladin: { armor: ALL_ARMOR, weaponTypes: MARTIAL },
  ranger: { armor: ['leve', 'média', 'escudo'], weaponTypes: MARTIAL },
  rogue: { armor: ['leve'], weaponTypes: SIMPLE, weapons: FINESSE_KIT },
  sorcerer: { weapons: ARCANE_KIT },
  warlock: { armor: ['leve'], weaponTypes: SIMPLE },
  wizard: { weapons: ARCANE_KIT },
};

/** Multiclasse (PHB 2014, cap. 6 — tabela "Proficiências de Multiclasse"). */
const MULTICLASS_PROFS: Record<string, ProfGrant> = {
  barbarian: { armor: ['escudo'], weaponTypes: MARTIAL },
  bard: { armor: ['leve'] },
  cleric: { armor: ['leve', 'média', 'escudo'] },
  druid: { armor: ['leve', 'média', 'escudo'] },
  fighter: { armor: ['leve', 'média', 'escudo'], weaponTypes: MARTIAL },
  monk: { weaponTypes: SIMPLE, weapons: ['w-shortsword'] },
  paladin: { armor: ['leve', 'média', 'escudo'], weaponTypes: MARTIAL },
  ranger: { armor: ['leve', 'média', 'escudo'], weaponTypes: MARTIAL },
  rogue: { armor: ['leve'] },
  sorcerer: {},
  warlock: { armor: ['leve'], weaponTypes: SIMPLE },
  wizard: {},
};

const SUBCLASS_PROFS: Record<string, ProfGrant> = {
  valor: { armor: ['média', 'escudo'], weaponTypes: MARTIAL },
  life: { armor: ['pesada'] },
  nature: { armor: ['pesada'] },
  tempest: { armor: ['pesada'], weaponTypes: MARTIAL },
  war: { armor: ['pesada'], weaponTypes: MARTIAL },
};

const RACE_PROFS: Record<string, ProfGrant> = {
  // Treinamento Anão em Combate
  dwarf: { weapons: ['w-battleaxe', 'w-handaxe', 'w-lighthammer', 'w-warhammer'] },
  // Treinamento Anão com Armaduras
  'mountain-dwarf': { armor: ['leve', 'média'] },
  // Treinamento Élfico com Armas
  'high-elf': { weapons: ['w-longsword', 'w-shortsword', 'w-shortbow', 'w-longbow'] },
  'wood-elf': { weapons: ['w-longsword', 'w-shortsword', 'w-shortbow', 'w-longbow'] },
  // Treinamento Drow com Armas
  drow: { weapons: ['w-rapier', 'w-shortsword', 'w-handcrossbow'] },
};

const FEAT_PROFS: Record<string, ProfGrant> = {
  'lightly-armored': { armor: ['leve'] },
  'moderately-armored': { armor: ['média', 'escudo'] },
  'heavily-armored': { armor: ['pesada'] },
};

export interface Proficiencies {
  armor: Set<ArmorKind>;
  weaponTypes: Set<WeaponType>;
  weapons: Set<string>;
  /** Mestre em Armas / Pacto da Lâmina ainda sem escolha: não pune a ficha até escolher. */
  lenientWeapons: boolean;
  lenientMelee: boolean;
}

export function proficienciesOf(char: Character): Proficiencies {
  const p: Proficiencies = { armor: new Set(), weaponTypes: new Set(), weapons: new Set(), lenientWeapons: false, lenientMelee: false };
  const add = (g: ProfGrant | undefined) => {
    g?.armor?.forEach((a) => p.armor.add(a));
    g?.weaponTypes?.forEach((t) => p.weaponTypes.add(t));
    g?.weapons?.forEach((w) => p.weapons.add(w));
  };
  add(CLASS_PROFS[char.classId]);
  for (const cl of char.classLevels ?? []) if (cl.classId !== char.classId) add(MULTICLASS_PROFS[cl.classId]);
  if (char.subclassId) add(SUBCLASS_PROFS[char.subclassId]);
  add(RACE_PROFS[char.raceId]);
  const sub = getSubrace(char.raceId, char.subraceId);
  if (sub) add(RACE_PROFS[sub.id]);
  for (const f of char.feats ?? []) add(FEAT_PROFS[f]);
  // Mestre em Armas: as 4 armas escolhidas (sem escolha ainda, não pune a ficha)
  if ((char.feats ?? []).includes('weapon-master')) {
    const picks = char.choices?.['feat.weaponMasterWeapons'] ?? [];
    picks.forEach((w) => p.weapons.add(w));
    if (!picks.length) p.lenientWeapons = true;
  }
  // Pacto da Lâmina: proficiente com a forma escolhida da arma de pacto
  if ((char.choices?.['warlock.pact'] ?? []).includes('blade')) {
    const form = char.choices?.['warlock.pactWeapon'] ?? [];
    form.forEach((w) => p.weapons.add(w));
    if (!form.length) p.lenientMelee = true;
  }
  return p;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*\+\d.*$/, '').trim();
const WEAPON_BY_NAME = new Map(WEAPONS.map((w) => [norm(w.name), w.id]));

/** Arma do catálogo por trás do item ("w-longsword-plus2" → "w-longsword"; nome como reserva). */
export function baseWeaponId(it: Pick<InventoryItem, 'itemId' | 'name'>): string | null {
  const id = it.itemId?.replace(/-plus[123]$/, '');
  if (id && id.startsWith('w-')) return id;
  // item mágico/foco que é uma arma do livro (Cajado do Poder → bordão)
  const viaCatalog = id ? getItem(id)?.weapon?.baseId : undefined;
  return viaCatalog ?? WEAPON_BY_NAME.get(norm(it.name)) ?? null;
}

export function isWeaponProficient(p: Proficiencies, it: Pick<InventoryItem, 'itemId' | 'name'>, type: WeaponType, range: 'melee' | 'ranged'): boolean {
  if (p.lenientWeapons || (p.lenientMelee && range === 'melee')) return true;
  if (p.weaponTypes.has(type)) return true;
  const base = baseWeaponId(it);
  return !!base && p.weapons.has(base);
}

export function isArmorProficient(p: Proficiencies, kind: ArmorKind): boolean {
  return p.armor.has(kind);
}

/** Armaduras e armas que a classe dá no 1º nível (sem raça, subclasse nem talento). */
export function classProficiencySummary(classId: string): { armor: string; weapons: string } {
  const p: Proficiencies = { armor: new Set(), weaponTypes: new Set(), weapons: new Set(), lenientWeapons: false, lenientMelee: false };
  const g = CLASS_PROFS[classId];
  g?.armor?.forEach((a) => p.armor.add(a));
  g?.weaponTypes?.forEach((t) => p.weaponTypes.add(t));
  g?.weapons?.forEach((w) => p.weapons.add(w));
  return proficiencySummary(p);
}

/** Texto curto para a ficha ("Armaduras leves e médias, escudos · Armas simples e marciais"). */
export function proficiencySummary(p: Proficiencies): { armor: string; weapons: string } {
  const a = (['leve', 'média', 'pesada'] as const).filter((k) => p.armor.has(k));
  const armor = [
    a.length === 3 ? 'Todas as armaduras' : a.length ? `Armaduras ${a.map((k) => (k === 'leve' ? 'leves' : k === 'média' ? 'médias' : 'pesadas')).join(' e ')}` : '',
    p.armor.has('escudo') ? 'escudos' : '',
  ].filter(Boolean).join(', ') || 'Nenhuma armadura';
  const names = WEAPONS.filter((w) => p.weapons.has(w.id) && !(w.weapon && p.weaponTypes.has(w.weapon.type))).map((w) => w.name);
  const types = p.weaponTypes.has('martial') ? 'Armas simples e marciais' : p.weaponTypes.has('simple') ? 'Armas simples' : '';
  const weapons = [types, ...names].filter(Boolean).join(', ') + (p.lenientWeapons ? ' + 4 do Mestre em Armas (escolha pendente)' : '') + (p.lenientMelee ? ' + arma do pacto (escolha pendente)' : '') || 'Nenhuma arma';
  return { armor, weapons };
}
