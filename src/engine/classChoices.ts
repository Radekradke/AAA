import type { Character } from '@/types/character';
import { CATALOGS, CLASS_CHOICES, SUBCLASS_CHOICES } from '@/data/classChoices';
import type { ChoiceOption, ChoiceSpec } from '@/data/classChoices';
import { getSubclass } from '@/data/subclasses';
import { getClass } from '@/data/classes';
import { SPELLS, SPELL_BY_ID } from '@/data/spells';
import { spellSlotsForClass } from './progression';
import { getBackground } from '@/data/backgrounds';
import { getRace } from '@/data/races';

/** Uma escolha com contexto: de qual classe/subclasse e nível ela vem. */
export interface ResolvedSpec extends ChoiceSpec {
  /** Chave na ficha: `classe.chave` (ex.: `fighter.fightingStyle`). */
  storeKey: string;
  classId: string;
  classLevel: number;
  /** Quem concede (nome da classe ou da subclasse). */
  source: string;
}

export function storeKeyFor(classId: string, key: string): string {
  return `${classId}.${key}`;
}

/**
 * Escolhas concedidas EXATAMENTE ao atingir `classLevel` (classe + subclasse).
 * `choices` (as da ficha + as deste nível) liberam escolhas condicionais,
 * como os truques do Pacto do Tomo.
 */
export function specsAt(
  classId: string,
  classLevel: number,
  subclassId: string | null | undefined,
  choices: Record<string, string[]> = {},
): ResolvedSpec[] {
  const out: ResolvedSpec[] = [];
  const ok = (spec: ChoiceSpec) => !spec.requires || (choices[storeKeyFor(classId, spec.requires.key)] ?? []).includes(spec.requires.id);
  for (const spec of CLASS_CHOICES[classId]?.[classLevel] ?? []) {
    if (ok(spec)) out.push({ ...spec, storeKey: storeKeyFor(classId, spec.key), classId, classLevel, source: getClass(classId).label });
  }
  const sub = getSubclass(subclassId ?? undefined);
  if (sub && sub.classId === classId) {
    for (const spec of SUBCLASS_CHOICES[sub.id]?.[classLevel] ?? []) {
      if (ok(spec)) out.push({ ...spec, storeKey: storeKeyFor(classId, spec.key), classId, classLevel, source: sub.label });
    }
  }
  return out;
}

/** Uma chave de escolha num nível: specs somadas, quantas faltam e opções válidas. */
export interface ChoiceGroup {
  spec: ResolvedSpec;
  /** Quantas escolher (limitado ao que ainda existe no catálogo). */
  need: number;
  canReplace: boolean;
  options: ChoiceOption[];
}

/** Agrupa as escolhas de um nível por chave (ex.: Manobras vindas de duas fontes). */
export function groupSpecs(char: Character, specs: ResolvedSpec[]): ChoiceGroup[] {
  const groups = new Map<string, { spec: ResolvedSpec; count: number; canReplace: boolean }>();
  for (const spec of specs) {
    const cur = groups.get(spec.storeKey);
    groups.set(spec.storeKey, {
      spec: cur && cur.spec.count >= spec.count ? cur.spec : spec,
      count: (cur?.count ?? 0) + spec.count,
      canReplace: !!(cur?.canReplace || spec.canReplace),
    });
  }
  return [...groups.values()].map(({ spec, count, canReplace }) => {
    const available = catalogFor(spec, char);
    const taken = new Set(chosenFor(char, spec.storeKey));
    const free = available.filter((o) => !taken.has(o.id)).length;
    // o que já tem aparece sempre (marcado), mesmo se o pré-requisito mudou
    const extra = [...taken].filter((id) => !available.some((o) => o.id === id)).map((id) => findOption(spec, id)).filter((o): o is ChoiceOption => !!o);
    return { spec, need: Math.min(count, free), canReplace, options: [...available, ...extra] };
  });
}

/** Todas as escolhas que o personagem já deveria ter feito até o nível atual. */
export function specsUpTo(char: Character): ResolvedSpec[] {
  const levels = char.classLevels?.length ? char.classLevels : [{ classId: char.classId, level: char.level }];
  const out: ResolvedSpec[] = [];
  for (const cl of levels) {
    const sub = cl.classId === char.classId ? char.subclassId : null;
    for (let lv = 1; lv <= cl.level; lv++) out.push(...specsAt(cl.classId, lv, sub, char.choices ?? {}).filter((s) => s.count > 0));
  }
  return out;
}

export function chosenFor(char: Character, storeKey: string): string[] {
  return char.choices?.[storeKey] ?? [];
}

export interface PendingChoice {
  spec: ResolvedSpec;
  /** Quantas ainda faltam nessa chave. */
  missing: number;
}

/** O que falta escolher (ex.: ficha antiga de Guerreiro sem Estilo de Luta). */
export function pendingChoices(char: Character): PendingChoice[] {
  const required = new Map<string, { spec: ResolvedSpec; total: number }>();
  for (const spec of specsUpTo(char)) {
    const cur = required.get(spec.storeKey);
    required.set(spec.storeKey, { spec, total: (cur?.total ?? 0) + spec.count });
  }
  const out: PendingChoice[] = [];
  for (const { spec, total } of required.values()) {
    const taken = new Set(chosenFor(char, spec.storeKey));
    const free = catalogFor(spec, char).filter((o) => !taken.has(o.id)).length;
    const missing = Math.min(total - taken.size, free);
    if (missing > 0) out.push({ spec, missing });
  }
  return out;
}

const CLASS_SHORT: Record<string, string> = {
  bard: 'Bardo', cleric: 'Clérigo', druid: 'Druida', paladin: 'Paladino', ranger: 'Patrulheiro', sorcerer: 'Feiticeiro', warlock: 'Bruxo', wizard: 'Mago',
};

function spellOption(id: string): ChoiceOption | undefined {
  const sp = SPELL_BY_ID[id];
  if (!sp) return undefined;
  return {
    id: sp.id,
    label: sp.name,
    tag: sp.level === 0 ? 'truque' : `${sp.level}º círculo`,
    desc: [sp.school, (sp.classes ?? []).map((c) => CLASS_SHORT[c] ?? c).join(', ')].filter(Boolean).join(' · '),
  };
}

type SpecContext = Pick<ChoiceSpec, 'catalog' | 'only' | 'spell'> & { key?: string; classId?: string; classLevel?: number };

/**
 * Opções válidas para uma escolha: respeita `only`, os filtros de magia e,
 * com a ficha, os pré-requisitos (nível na classe, pacto, magia conhecida).
 */
export function catalogFor(spec: SpecContext, char?: Character): ChoiceOption[] {
  let all: ChoiceOption[];
  if (spec.catalog === 'spell') {
    const f = spec.spell ?? {};
    const maxCircle = f.upToSlots && spec.classId
      ? Math.max(0, ...Object.keys(spellSlotsForClass(spec.classId, spec.classLevel ?? 1)).map(Number))
      : 9;
    all = SPELLS.filter((sp) =>
      (f.circle === undefined ? sp.level <= maxCircle : sp.level === f.circle) &&
      (!f.classes || (sp.classes ?? []).some((c) => f.classes!.includes(c))),
    )
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
      .map((sp) => spellOption(sp.id)!);
  } else {
    all = CATALOGS[spec.catalog] ?? [];
  }
  if (spec.only) all = all.filter((o) => spec.only!.includes(o.id));
  // perícias: só as que o personagem ainda não tem
  if (char && spec.catalog === 'skill') {
    const has = new Set<string>([...char.skillProfs, ...getBackground(char.backgroundId).skills, ...(getRace(char.raceId).skillProfs ?? [])]);
    const own = new Set(Object.entries(char.choices ?? {}).filter(([k]) => /\.(loreSkills|knowledgeSkills|natureSkill)$/.test(k)).flatMap(([, v]) => v));
    all = all.filter((o) => !has.has(o.id) || own.has(o.id));
  }
  // idiomas: só os que o personagem ainda não fala
  if (char && spec.catalog === 'language') {
    const speaks = new Set([...(getRace(char.raceId).languages ?? []), ...(char.extraLanguages ?? [])]);
    const own = new Set(Object.entries(char.choices ?? {}).filter(([k]) => k.endsWith('.knowledgeLanguages')).flatMap(([, v]) => v));
    all = all.filter((o) => !speaks.has(o.id) || own.has(o.id));
  }
  // magias: esconde as que o personagem já conhece por outro caminho
  if (char && spec.catalog === 'spell') {
    const known = new Set([...(char.preparedSpells ?? []), ...(char.knownSpells ?? [])]);
    const mine = new Set(spec.classId && spec.key ? char.choices?.[storeKeyFor(spec.classId, spec.key)] ?? [] : []);
    all = all.filter((o) => !known.has(o.id) || mine.has(o.id));
  }
  if (char && spec.classId) {
    const lv = spec.classLevel ?? 20;
    const pacts = char.choices?.[storeKeyFor(spec.classId, 'pact')] ?? [];
    const spells = new Set([...(char.preparedSpells ?? []), ...(char.knownSpells ?? [])]);
    all = all.filter((o) => {
      const p = o.prereq;
      if (!p) return true;
      if (p.level && lv < p.level) return false;
      if (p.pact && !pacts.includes(p.pact)) return false;
      if (p.spell && !spells.has(p.spell)) return false;
      return true;
    });
  }
  return all;
}

/** Rótulo de uma opção escolhida (para listas e linha do tempo). */
export function optionLabel(storeKey: string, id: string): string {
  const key = storeKey.split('.').slice(1).join('.');
  for (const specs of [...Object.values(CLASS_CHOICES), ...Object.values(SUBCLASS_CHOICES)]) {
    for (const list of Object.values(specs)) {
      const spec = list.find((s) => s.key === key);
      if (spec) return findOption(spec, id)?.label ?? id;
    }
  }
  return id;
}

export function findOption(spec: Pick<ChoiceSpec, 'catalog'>, id: string): ChoiceOption | undefined {
  if (spec.catalog === 'spell') return spellOption(id);
  return CATALOGS[spec.catalog]?.find((o) => o.id === id);
}

export interface ReplacePick {
  from: string;
  to: string;
}

/**
 * Valida as escolhas de UM nível: quantidade exata, opções válidas, sem
 * repetir o que já tem (estilos, metamagias e manobras não acumulam) e
 * troca opcional quando a regra permite.
 */
export function validateChoicePicks(
  char: Character,
  specs: ResolvedSpec[],
  picks: Record<string, string[]> = {},
  replace: Record<string, ReplacePick | undefined> = {},
): string[] {
  const errors: string[] = [];
  for (const { spec, need: total, canReplace, options } of groupSpecs(char, specs)) {
    const storeKey = spec.storeKey;
    const chosen = picks[storeKey] ?? [];
    const valid = new Set(options.map((o) => o.id));
    const already = new Set(chosenFor(char, storeKey));
    if (chosen.length !== total) errors.push(`${spec.label}: escolha ${total} (${chosen.length} escolhida${chosen.length === 1 ? '' : 's'}).`);
    if (new Set(chosen).size !== chosen.length) errors.push(`${spec.label}: não repita a mesma opção.`);
    for (const id of chosen) {
      if (!valid.has(id)) errors.push(`${spec.label}: "${findOption(spec, id)?.label ?? id}" não está disponível (pré-requisito ou lista).`);
      else if (already.has(id)) errors.push(`${spec.label}: "${findOption(spec, id)?.label ?? id}" você já tem.`);
    }
    const rep = replace[storeKey];
    if (rep) {
      if (!canReplace) errors.push(`${spec.label}: esta escolha não permite troca.`);
      else if (!already.has(rep.from)) errors.push(`${spec.label}: só dá para trocar algo que você já tem.`);
      else if (!valid.has(rep.to) || already.has(rep.to) || chosen.includes(rep.to)) errors.push(`${spec.label}: a troca precisa ser por uma opção nova.`);
    }
  }
  return errors;
}

/** Aplica escolhas (e trocas) na ficha — usado pela subida de nível e pelas pendências. */
export function applyChoicePicks(c: Character, picks: Record<string, string[]>, replace: Record<string, ReplacePick | undefined> = {}): void {
  c.choices = { ...(c.choices ?? {}) };
  for (const [storeKey, ids] of Object.entries(picks)) {
    let list = [...(c.choices[storeKey] ?? [])];
    const rep = replace[storeKey];
    if (rep) list = list.map((x) => (x === rep.from ? rep.to : x));
    for (const id of ids) if (!list.includes(id)) list.push(id);
    c.choices[storeKey] = list;
  }
  for (const [storeKey, rep] of Object.entries(replace)) {
    if (!rep || picks[storeKey]) continue;
    c.choices[storeKey] = (c.choices[storeKey] ?? []).map((x) => (x === rep.from ? rep.to : x));
  }
}

/** Resumo das escolhas feitas, para exibir na ficha (rótulo + opções com descrição). */
export function choiceSummary(char: Character): { storeKey: string; label: string; options: ChoiceOption[] }[] {
  const out: { storeKey: string; label: string; options: ChoiceOption[] }[] = [];
  for (const [storeKey, ids] of Object.entries(char.choices ?? {})) {
    if (!ids.length) continue;
    const key = storeKey.split('.').slice(1).join('.');
    let spec: ChoiceSpec | undefined;
    for (const specs of [...Object.values(CLASS_CHOICES), ...Object.values(SUBCLASS_CHOICES)]) {
      for (const list of Object.values(specs)) {
        spec = spec ?? list.find((s) => s.key === key);
      }
    }
    if (!spec) continue;
    const label = spec.label.replace(/ adicional$/, '');
    out.push({ storeKey, label, options: ids.map((id) => findOption(spec!, id) ?? { id, label: id, desc: '' }) });
  }
  return out;
}

/**
 * Magias vindas de escolhas que NÃO contam nos limites de truques/magias
 * (Segredos Mágicos Adicionais, Livro das Sombras, Arcano Místico,
 * Magias de Assinatura).
 */
export function bonusSpellIds(char: Character): Set<string> {
  const out = new Set<string>();
  for (const [storeKey, ids] of Object.entries(char.choices ?? {})) {
    const key = storeKey.split('.').slice(1).join('.');
    if (/^(loreSecrets|tomeCantrips|natureCantrip|arcanum\d|signature)$/.test(key)) ids.forEach((id) => out.add(id));
  }
  return out;
}
