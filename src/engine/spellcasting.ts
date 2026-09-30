import type { Character } from '@/types/character';
import { getSubclass } from '@/data/subclasses';
import { DOMAIN_SPELLS, LAND_SPELLS, OATH_SPELLS, PATRON_SPELLS } from '@/data/subclassSpells';
import type { AbilityKey, Spell } from '@/types/dnd';
import { getSpell } from '@/data/spells';
import { getClass } from '@/data/classes';
import { spellSlotsForClass, thirdCasterSlots } from './progression';

/**
 * Guia de conjuração (PHB 2014): quantos truques e magias cada classe
 * conhece/prepara por nível. Serve para orientar o jogador ao aprender
 * magias (não bloqueia — é recomendação, o mestre manda).
 */

/** Como a classe adquire magias. */
export type CasterKind = 'known' | 'prepared' | 'spellbook' | 'none';

export function casterKind(classId: string): CasterKind {
  switch (classId) {
    case 'bard':
    case 'sorcerer':
    case 'warlock':
    case 'ranger':
      return 'known'; // escolhe magias fixas ao subir de nível
    case 'cleric':
    case 'druid':
    case 'paladin':
      return 'prepared'; // conhece a lista toda; prepara por dia
    case 'wizard':
      return 'spellbook'; // grimório (aprende +2/nível e copia de pergaminhos)
    default:
      return 'none';
  }
}

/** Truques conhecidos por nível de classe. */
export function cantripsKnown(classId: string, level: number): number {
  const lv = Math.max(1, level);
  const tier = (a: number, b: number, c: number) => (lv >= 10 ? c : lv >= 4 ? b : a);
  switch (classId) {
    case 'bard':
    case 'warlock':
    case 'druid':
      return tier(2, 3, 4);
    case 'cleric':
    case 'wizard':
      return tier(3, 4, 5);
    case 'sorcerer':
      return tier(4, 5, 6);
    default:
      return 0; // patrulheiro e paladino não têm truques
  }
}

// Magias conhecidas por nível (índice = nível de classe) para conjuradores de escolha fixa.
const BARD_KNOWN = [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22];
const SORC_KNOWN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15];
const WARLOCK_KNOWN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];
const RANGER_KNOWN = [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11];

/**
 * Quantas magias (fora truques) a classe conhece/prepara no nível.
 * `count` = alvo recomendado; `label` = "conhecidas", "preparadas" ou "no grimório".
 */
export function spellsKnownOrPrepared(
  classId: string,
  level: number,
  castMod: number,
): { count: number; label: string } {
  const lv = Math.max(1, Math.min(20, level));
  const kind = casterKind(classId);
  switch (classId) {
    case 'bard':
      return { count: BARD_KNOWN[lv - 1], label: 'conhecidas' };
    case 'sorcerer':
      return { count: SORC_KNOWN[lv - 1], label: 'conhecidas' };
    case 'warlock':
      return { count: WARLOCK_KNOWN[lv - 1], label: 'conhecidas' };
    case 'ranger':
      return { count: RANGER_KNOWN[lv - 1], label: 'conhecidas' };
    case 'wizard':
      // grimório: 6 no nível 1 + 2 por nível subsequente
      return { count: 6 + (lv - 1) * 2, label: 'no grimório' };
    case 'cleric':
    case 'druid':
      return { count: Math.max(1, castMod + lv), label: 'preparadas' };
    case 'paladin':
      return { count: Math.max(1, castMod + Math.floor(lv / 2)), label: 'preparadas' };
    default:
      return { count: 0, label: kind === 'none' ? '—' : 'preparadas' };
  }
}

/** Magia concedida por um item, com estado de uso resolvido. */
export interface ItemSpell {
  /** Chave estável `uid:spellId` para rastrear usos. */
  key: string;
  itemUid: string;
  itemName: string;
  spell: Spell;
  recharge: 'atwill' | 'short' | 'long';
  /** Usos por descanso (0 = à vontade). */
  usesMax: number;
  usesLeft: number;
}

/**
 * Magias concedidas por itens EQUIPADOS ou SINTONIZADOS (estilo BG3):
 * ex.: um bastão que dá "Criar Água" à vontade, um arco que dá "Raio de
 * Gelo" 1×/descanso curto. Itens só guardados na mochila não valem.
 */
export function itemGrantedSpells(char: Character): ItemSpell[] {
  const equipped = new Set(Object.values(char.equipped ?? {}).filter(Boolean) as string[]);
  const uses = char.combat?.itemSpellUses ?? {};
  const out: ItemSpell[] = [];
  for (const it of char.inventory ?? []) {
    if (!it.grantsSpells?.length) continue;
    if (!(equipped.has(it.uid) || it.attuned)) continue;
    for (const g of it.grantsSpells) {
      const spell = getSpell(g.spellId);
      if (!spell) continue;
      const key = `${it.uid}:${g.spellId}`;
      const usesMax = g.recharge === 'atwill' ? 0 : Math.max(1, g.uses ?? 1);
      const used = uses[key] ?? 0;
      out.push({ key, itemUid: it.uid, itemName: it.name, spell, recharge: g.recharge, usesMax, usesLeft: Math.max(0, usesMax - used) });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Perfil de conjurador (classe OU subclasse)                          */
/* ------------------------------------------------------------------ */

/** Magias conhecidas do Cavaleiro Arcano / Trapaceiro Arcano por nível de classe. */
const THIRD_KNOWN = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];
/** Níveis em que uma magia pode vir de qualquer escola (em vez das duas da subclasse). */
const THIRD_FREE_LEVELS = [3, 8, 14, 20];

const THIRD_CASTERS: Record<string, { classId: string; schools: string[]; cantrips: (lv: number) => number; label: string }> = {
  eldritch: { classId: 'fighter', schools: ['Abjuração', 'Evocação'], cantrips: (lv) => (lv >= 10 ? 3 : 2), label: 'Cavaleiro Arcano' },
  trickster: { classId: 'rogue', schools: ['Encantamento', 'Ilusão'], cantrips: (lv) => (lv >= 10 ? 4 : 3), label: 'Trapaceiro Arcano' },
};

export interface CasterInfo {
  /** Classe dona da lista de magias (Cavaleiro Arcano usa a de mago). */
  listClass: string;
  ability: AbilityKey;
  kind: CasterKind;
  /** Nível de classe que conta para as tabelas. */
  level: number;
  cantrips: number;
  guide: { count: number; label: string };
  slots: Record<number, number>;
  /** Subclasse que concede a conjuração, quando for o caso. */
  via?: string;
  /** Restrição de escolas (Cavaleiro/Trapaceiro Arcano). */
  schools?: { allowed: string[]; free: number };
}

/**
 * Como o personagem conjura (ou null). Classes conjuradoras usam as próprias
 * tabelas; Guerreiro Cavaleiro Arcano e Ladino Trapaceiro Arcano conjuram
 * pela subclasse (lista de mago, Inteligência, um terço de conjurador).
 */
export function casterOf(char: Character, castMod = 0): CasterInfo | null {
  const cls = getClass(char.classId);
  const level = char.classLevels?.find((c) => c.classId === char.classId)?.level ?? char.level;
  if (cls.spellcasting) {
    const slots = spellSlotsForClass(char.classId, level);
    return {
      listClass: char.classId,
      ability: cls.spellAbility ?? cls.prim,
      kind: casterKind(char.classId),
      level,
      // truque extra do Círculo da Terra (2º); o luz do Domínio da Luz vem em grantedSpells
      cantrips: cantripsKnown(char.classId, level) + (char.subclassId === 'land' && level >= 2 ? 1 : 0),
      guide: spellsKnownOrPrepared(char.classId, level, castMod),
      slots,
    };
  }
  const third = char.subclassId ? THIRD_CASTERS[char.subclassId] : undefined;
  if (third && third.classId === char.classId && level >= 3) {
    return {
      listClass: 'wizard',
      ability: 'int',
      kind: 'known',
      level,
      cantrips: third.cantrips(level),
      guide: { count: THIRD_KNOWN[level - 1] ?? 0, label: 'conhecidas' },
      slots: thirdCasterSlots(level),
      via: third.label,
      schools: { allowed: third.schools, free: THIRD_FREE_LEVELS.filter((l) => level >= l).length },
    };
  }
  return null;
}

/** Espaços de magia do personagem (classe ou subclasse conjuradora). */
export function spellSlotsFor(char: Character): Record<number, number> {
  return casterOf(char)?.slots ?? {};
}

/**
 * Ajusta os espaços guardados na ficha ao máximo atual (classe + subclasse
 * conjuradora). Mantém o que já foi gasto, a menos que `refill`.
 */
export function syncSpellSlots(char: Character, refill = false): Character['combat']['spellSlots'] {
  const next: Character['combat']['spellSlots'] = {};
  for (const [circle, max] of Object.entries(spellSlotsFor(char))) {
    const used = refill ? 0 : char.combat.spellSlots?.[Number(circle)]?.used ?? 0;
    next[Number(circle)] = { used: Math.min(used, max), max };
  }
  return next;
}

export interface GrantedSpell {
  id: string;
  /** Quem concede (ex.: "Domínio da Vida"). */
  source: string;
}

/**
 * Magias sempre preparadas pela subclasse (não contam no limite):
 * Domínio do Clérigo, Juramento do Paladino, Círculo da Terra do Druida e o
 * truque luz do Domínio da Luz.
 */
export function grantedSpells(char: Character): GrantedSpell[] {
  const sub = getSubclass(char.subclassId ?? undefined);
  if (!sub) return [];
  const lv = char.classLevels?.find((c) => c.classId === sub.classId)?.level ?? (char.classId === sub.classId ? char.level : 0);
  let table: Record<number, string[]> | undefined;
  if (sub.classId === 'cleric') table = DOMAIN_SPELLS[sub.id];
  else if (sub.classId === 'paladin') table = OATH_SPELLS[sub.id];
  else if (sub.id === 'land') table = LAND_SPELLS[char.choices?.['druid.land']?.[0] ?? ''];
  const out: GrantedSpell[] = [];
  if (sub.id === 'light') out.push({ id: 'sp-luz', source: sub.label });
  for (const [need, ids] of Object.entries(table ?? {})) {
    if (lv >= Number(need)) for (const id of ids) if (!out.some((g) => g.id === id)) out.push({ id, source: sub.label });
  }
  return out;
}

/** Magias extras que o bruxo pode aprender pela lista expandida do patrono. */
export function expandedSpellIds(char: Character): string[] {
  const table = char.subclassId ? PATRON_SPELLS[char.subclassId] : undefined;
  return table ? Object.values(table).flat() : [];
}
