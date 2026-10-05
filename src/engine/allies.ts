import type { Ally, Character } from '@/types/character';
import type { AbilityKey } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import { COMPANION_BEASTS } from '@/data/beasts';
import { FAMILIARS, MOUNTS, getAllyBeast } from '@/data/allyBeasts';
import type { Beast } from '@/data/beasts';
import { abilityModifier } from './modifiers';
import { companionOf } from './companion';

export const ALLY_KINDS: Record<Ally['kind'], { label: string; plural: string }> = {
  companheiro: { label: 'Companheiro', plural: 'Companheiros' },
  montaria: { label: 'Montaria', plural: 'Montarias' },
  familiar: { label: 'Familiar', plural: 'Familiares' },
};

/** Feras sugeridas por tipo de aliado (a primeira lista vem antes no seletor). */
export function beastsFor(kind: Ally['kind']): { group: string; beasts: Beast[] }[] {
  const mounts = { group: 'Montarias', beasts: MOUNTS };
  const fam = { group: 'Familiares', beasts: FAMILIARS };
  const comp = { group: 'Feras companheiras', beasts: COMPANION_BEASTS };
  if (kind === 'montaria') return [mounts, comp, fam];
  if (kind === 'familiar') return [fam, comp, mounts];
  return [comp, mounts, fam];
}

export interface AllyAttack {
  name: string;
  toHit: number;
  dice: number;
  die: number;
  bonus: number;
  type: string;
  note?: string;
}

/** Ficha pronta para a carta: números da base + ajustes do jogador. */
export interface AllyView {
  id: string;
  kind: Ally['kind'];
  name: string;
  /** Nome da fera de base ("Cavalo de Guerra"), se houver. */
  base: string | null;
  size: string | null;
  cr: string | null;
  portrait: string | null;
  ac: number;
  hpMax: number;
  hp: number;
  speed: string;
  abilities: Record<AbilityKey, number> | null;
  mods: Record<AbilityKey, number> | null;
  attacks: AllyAttack[];
  skills: { label: string; bonus: number }[];
  traits: { name: string; desc: string }[];
  senses: string | null;
  notes: string;
  /** Vem da classe (Mestre das Feras): base e números presos à regra. */
  fromClass: boolean;
}

function mods(abilities: Record<AbilityKey, number> | null): Record<AbilityKey, number> | null {
  if (!abilities) return null;
  const out = {} as Record<AbilityKey, number>;
  for (const k of ABILITY_KEYS) out[k] = abilityModifier(abilities[k]);
  return out;
}

export function allyView(a: Ally): AllyView {
  const beast = getAllyBeast(a.beastId);
  const hpMax = Math.max(1, a.hpMax ?? beast?.hp ?? 10);
  return {
    id: a.id,
    kind: a.kind,
    name: a.name.trim() || beast?.label || ALLY_KINDS[a.kind].label,
    base: beast?.label ?? null,
    size: beast?.size ?? null,
    cr: beast?.cr ?? null,
    portrait: a.portrait ?? null,
    ac: a.ac ?? beast?.ac ?? 10,
    hpMax,
    hp: Math.max(0, Math.min(hpMax, a.hpCurrent ?? hpMax)),
    speed: a.speed?.trim() || beast?.speed || '9 m',
    abilities: beast?.abilities ?? null,
    mods: mods(beast?.abilities ?? null),
    attacks: beast?.attacks ?? [],
    skills: beast?.skills.map((s) => ({ label: s.label, bonus: s.bonus })) ?? [],
    traits: beast?.traits ?? [],
    senses: beast?.senses ?? null,
    notes: a.notes ?? '',
    fromClass: false,
  };
}

/** Companheiro do Mestre das Feras como aliado (proficiência do patrulheiro já somada). */
export function classCompanionView(char: Character): AllyView | null {
  const c = companionOf(char);
  if (!c) return null;
  return {
    id: 'class-companion',
    kind: 'companheiro',
    name: c.name,
    base: c.beast.label,
    size: c.beast.size,
    cr: c.beast.cr,
    portrait: char.companion?.portrait ?? null,
    ac: c.ac,
    hpMax: c.maxHp,
    hp: c.hp,
    speed: c.beast.speed,
    abilities: c.beast.abilities,
    mods: mods(c.beast.abilities),
    attacks: c.attacks.map((x, i) => ({ name: c.beast.attacks[i]?.name ?? x.name, toHit: x.attackBonus, dice: x.damageDice, die: x.damageDie, bonus: x.damageBonus, type: x.damageType, note: x.note || undefined })),
    skills: c.skills,
    traits: [...c.beast.traits, ...c.perks.map((p) => ({ name: 'Mestre das Feras', desc: p }))],
    senses: c.beast.senses,
    notes: '',
    fromClass: true,
  };
}

/** Todos os aliados do herói, o da classe primeiro. */
export function alliesOf(char: Character): AllyView[] {
  const cls = classCompanionView(char);
  return [...(cls ? [cls] : []), ...(char.allies ?? []).map(allyView)];
}

export function damageText(a: AllyAttack): string {
  if (a.die <= 1) return `${a.dice * (a.die || 1) + a.bonus}`;
  return `${a.dice}d${a.die}${a.bonus ? (a.bonus > 0 ? `+${a.bonus}` : a.bonus) : ''}`;
}
