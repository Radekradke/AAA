import type { Character } from '@/types/character';
import { getSubclass } from '@/data/subclasses';
import { getFeat } from '@/data/feats';
import { DOMAIN_SPELLS, LAND_SPELLS, OATH_SPELLS, PATRON_SPELLS } from '@/data/subclassSpells';
import type { AbilityKey, Spell } from '@/types/dnd';
import { getSpell } from '@/data/spells';
import { getClass } from '@/data/classes';
import { multiclassSlots, spellSlotsForClass, thirdCasterSlots } from './progression';
import { itemIsActive, slotForItem } from './inventory';
import { chargeOptions, chargesLeft, chargesOf, grantsOf, minCost } from './itemCharges';
import type { ChargeOption } from './itemCharges';

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

/** Magias que a raça/sub-raça concede pelo nível do personagem (PHB 2014). */
export function racialSpells(char: Character): { spellId: string; recharge: 'atwill' | 'long'; source: string }[] {
  const lv = char.level;
  const out: { spellId: string; recharge: 'atwill' | 'long'; source: string }[] = [];
  if (char.raceId === 'tiefling') {
    out.push({ spellId: 'phb-thaumaturgy', recharge: 'atwill', source: 'Legado Infernal' });
    // Repreensão Infernal é conjurada como magia de 2º círculo
    if (lv >= 3) out.push({ spellId: 'sp-repreensao', recharge: 'long', source: 'Legado Infernal (2º círculo)' });
    if (lv >= 5) out.push({ spellId: 'phb-darkness', recharge: 'long', source: 'Legado Infernal' });
  }
  if (char.subraceId === 'drow') {
    out.push({ spellId: 'phb-dancing-lights', recharge: 'atwill', source: 'Magia Drow' });
    if (lv >= 3) out.push({ spellId: 'sp-fadas', recharge: 'long', source: 'Magia Drow' });
    if (lv >= 5) out.push({ spellId: 'phb-darkness', recharge: 'long', source: 'Magia Drow' });
  }
  if (char.subraceId === 'forest-gnome') out.push({ spellId: 'sp-ilusao', recharge: 'atwill', source: 'Ilusionista Nato' });
  if (char.subraceId === 'high-elf') {
    for (const id of char.choices?.['race.highElfCantrip'] ?? []) out.push({ spellId: id, recharge: 'atwill', source: 'Truque do Alto Elfo' });
  }
  return out;
}

/**
 * Invocações Místicas que concedem magia (PHB 2014): à vontade (sem espaço)
 * ou uma vez por descanso longo (as que "gastam um espaço de pacto").
 */
const INVOCATION_SPELLS: Record<string, { spellId: string; recharge: 'atwill' | 'long'; label: string; /** "em si mesmo" */ self?: boolean }> = {
  armorOfShadows: { self: true, spellId: 'sp-armaduraarcana', recharge: 'atwill', label: 'Armadura das Sombras' },
  ascendantStep: { self: true, spellId: 'phb-levitate', recharge: 'atwill', label: 'Passo Ascendente' },
  beastSpeech: { spellId: 'phb-speak-animals', recharge: 'atwill', label: 'Fala Bestial' },
  chainsOfCarceri: { spellId: 'phb-hold-monster', recharge: 'atwill', label: 'Correntes de Carceri' },
  eldritchSight: { spellId: 'sp-detectar', recharge: 'atwill', label: 'Visão Mística' },
  fiendishVigor: { self: true, spellId: 'phb-false-life', recharge: 'atwill', label: 'Vigor Infernal' },
  manyFaces: { spellId: 'phb-disguise-self', recharge: 'atwill', label: 'Máscara de Muitas Faces' },
  myriadForms: { spellId: 'phb-alter-self', recharge: 'atwill', label: 'Mestre das Formas Incontáveis' },
  mistyVisions: { spellId: 'phb-silent-image', recharge: 'atwill', label: 'Visões Nebulosas' },
  otherworldlyLeap: { self: true, spellId: 'sp-saltar', recharge: 'atwill', label: 'Salto Transcendental' },
  distantRealms: { spellId: 'phb-arcane-eye', recharge: 'atwill', label: 'Visões de Reinos Distantes' },
  whispersOfGrave: { spellId: 'phb-speak-dead', recharge: 'atwill', label: 'Sussurros do Túmulo' },
  bewitchingWhispers: { spellId: 'phb-compulsion', recharge: 'long', label: 'Sussurros Enfeitiçantes' },
  dreadfulWord: { spellId: 'phb-confusion', recharge: 'long', label: 'Palavra Terrível' },
  minionsOfChaos: { spellId: 'phb-conjure-elemental', recharge: 'long', label: 'Lacaios do Caos' },
  mireTheMind: { spellId: 'phb-slow', recharge: 'long', label: 'Atolar a Mente' },
  sculptorOfFlesh: { spellId: 'phb-polymorph', recharge: 'long', label: 'Escultor de Carne' },
  illOmen: { spellId: 'phb-bestow-curse', recharge: 'long', label: 'Sinal de Mau Agouro' },
  fiveFates: { spellId: 'sp-perdicao', recharge: 'long', label: 'Ladrão dos Cinco Destinos' },
};

/** Magias que as invocações escolhidas concedem. */
export function invocationSpells(char: Character): { id: string; spellId: string; recharge: 'atwill' | 'long'; source: string; self: boolean }[] {
  return (char.choices?.['warlock.invocation'] ?? [])
    .filter((id) => INVOCATION_SPELLS[id])
    .map((id) => ({ id, spellId: INVOCATION_SPELLS[id].spellId, recharge: INVOCATION_SPELLS[id].recharge, source: `Invocação: ${INVOCATION_SPELLS[id].label}`, self: !!INVOCATION_SPELLS[id].self }));
}

/** Invocação escolhida pelo bruxo. */
export function hasInvocation(char: Character, id: string): boolean {
  return (char.choices?.['warlock.invocation'] ?? []).includes(id);
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
  /** Item com cargas: total e quanto sobra (compartilhado entre as magias do item). */
  charges?: { max: number; left: number; regain: string };
  /** Cargas que a magia gasta no mínimo. */
  cost?: number;
  /** Jeitos de conjurar com as cargas que sobram (círculo + custo). */
  options?: ChargeOption[];
  /** CD fixa do item (varinhas: 15); sem valor, usa a de quem empunha. */
  dc?: number;
  /** Só em si mesmo (Armadura das Sombras, Vigor Infernal): o efeito cai direto no herói. */
  selfOnly?: boolean;
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
    const grants = grantsOf(it);
    if (!grants?.length) continue;
    // arma/armadura/escudo: empunhado ou sintonizado; vestível: vestido;
    // varinha, cajado…: sintonizado se pede, senão enquanto está com o herói
    const ok = slotForItem(it) ? equipped.has(it.uid) || it.attuned : itemIsActive(char, it);
    if (!ok) continue;
    const ch = chargesOf(it);
    const left = ch ? chargesLeft(char, it) : 0;
    for (const g of grants) {
      const spell = getSpell(g.spellId);
      if (!spell) continue;
      const key = `${it.uid}:${g.spellId}`;
      if (ch) {
        // cargas do item: o "usos" vira quantas vezes ainda dá para pagar o custo mínimo
        const cost = minCost(g, spell);
        out.push({
          key, itemUid: it.uid, itemName: it.name, spell, recharge: 'long',
          usesMax: Math.floor(ch.max / cost), usesLeft: Math.floor(left / cost),
          charges: { max: ch.max, left, regain: ch.regain }, cost, options: chargeOptions(g, spell, left), dc: g.dc,
        });
        continue;
      }
      const usesMax = g.recharge === 'atwill' ? 0 : Math.max(1, g.uses ?? 1);
      const used = uses[key] ?? 0;
      out.push({ key, itemUid: it.uid, itemName: it.name, spell, recharge: g.recharge, usesMax, usesLeft: Math.max(0, usesMax - used) });
    }
  }
  // magias raciais (PHB 2014): Legado Infernal, Magia Drow, Ilusionista Nato, truque do Alto Elfo
  for (const r of racialSpells(char)) {
    const spell = getSpell(r.spellId);
    if (!spell) continue;
    const key = `race:${r.spellId}`;
    const usesMax = r.recharge === 'atwill' ? 0 : 1;
    out.push({ key, itemUid: 'race', itemName: r.source, spell, recharge: r.recharge, usesMax, usesLeft: Math.max(0, usesMax - (uses[key] ?? 0)) });
  }
  // Invocações Místicas: armadura arcana à vontade, vitalidade falsa, disfarçar-se, lentidão 1×/descanso…
  for (const inv of invocationSpells(char)) {
    const spell = getSpell(inv.spellId);
    if (!spell) continue;
    const key = `inv:${inv.id}`;
    const usesMax = inv.recharge === 'atwill' ? 0 : 1;
    out.push({ key, itemUid: `inv:${inv.id}`, itemName: inv.source, spell, recharge: inv.recharge, usesMax, usesLeft: Math.max(0, usesMax - (uses[key] ?? 0)), selfOnly: inv.self });
  }
  // magias inatas de talentos (Alta Magia Drow, Teleporte Feérico, Magia do Elfo da Floresta)
  for (const featId of char.feats ?? []) {
    const feat = getFeat(featId);
    const grants = [...(feat?.grantsSpells ?? [])];
    if (featId === 'wood-elf-magic') {
      for (const id of char.choices?.['feat.woodElfCantrip'] ?? []) grants.unshift({ spellId: id, recharge: 'atwill' });
    }
    // magias escolhidas nos talentos do Tasha
    const picked: Record<string, [string, 'atwill' | 'long'][]> = {
      'artificer-initiate': [['feat.artificerCantrip', 'atwill'], ['feat.artificerSpell', 'long']],
      'fey-touched': [['feat.feyTouchedSpell', 'long']],
      'shadow-touched': [['feat.shadowTouchedSpell', 'long']],
    };
    for (const [key, recharge] of picked[featId] ?? []) {
      for (const id of char.choices?.[key] ?? []) grants.push({ spellId: id, recharge });
    }
    for (const g of grants) {
      const spell = getSpell(g.spellId);
      if (!spell || !feat) continue;
      const key = `feat:${featId}:${g.spellId}`;
      const usesMax = g.recharge === 'atwill' ? 0 : 1;
      out.push({ key, itemUid: `feat:${featId}`, itemName: feat.label, spell, recharge: g.recharge, usesMax, usesLeft: Math.max(0, usesMax - (uses[key] ?? 0)) });
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
  const levels = char.classLevels?.length ? char.classLevels : [{ classId: char.classId, level: char.level }];
  const multi = levels.length > 1;
  const thirdClass = char.subclassId && THIRD_CASTERS[char.subclassId]?.classId === char.classId ? char.classId : null;
  // multiclasse: espaços pelo nível de conjurador somado (PHB 2014, cap. 6)
  const multiSlots = () => multiclassSlots(levels, thirdClass);
  // a classe que conjura: a principal; se ela não conjura, a primeira conjuradora da multiclasse
  const castClass = getClass(char.classId).spellcasting
    ? char.classId
    : thirdClass && (levels.find((l) => l.classId === char.classId)?.level ?? 0) >= 3
      ? null
      : levels.find((l) => getClass(l.classId).spellcasting)?.classId ?? null;
  if (castClass) {
    const cls = getClass(castClass);
    const level = levels.find((c) => c.classId === castClass)?.level ?? char.level;
    const ownSub = castClass === char.classId ? char.subclassId : null;
    return {
      listClass: castClass,
      ability: cls.spellAbility ?? cls.prim,
      kind: casterKind(castClass),
      level,
      // truque extra do Círculo da Terra (2º); o luz do Domínio da Luz vem em grantedSpells
      cantrips: cantripsKnown(castClass, level) + (ownSub === 'land' && level >= 2 ? 1 : 0),
      guide: spellsKnownOrPrepared(castClass, level, castMod),
      slots: multi ? multiSlots() : spellSlotsForClass(castClass, level),
    };
  }
  const level = levels.find((c) => c.classId === char.classId)?.level ?? char.level;
  const third = char.subclassId ? THIRD_CASTERS[char.subclassId] : undefined;
  if (third && third.classId === char.classId && level >= 3) {
    return {
      listClass: 'wizard',
      ability: 'int',
      kind: 'known',
      level,
      cantrips: third.cantrips(level),
      guide: { count: THIRD_KNOWN[level - 1] ?? 0, label: 'conhecidas' },
      slots: multi ? multiSlots() : thirdCasterSlots(level),
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
