import type { Character } from '@/types/character';
import { CATALOGS, CLASS_CHOICES, SUBCLASS_CHOICES } from '@/data/classChoices';
import type { ChoiceOption, ChoiceSpec } from '@/data/classChoices';
import { getSubclass } from '@/data/subclasses';
import { getClass } from '@/data/classes';

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

/** Escolhas concedidas EXATAMENTE ao atingir `classLevel` (classe + subclasse). */
export function specsAt(classId: string, classLevel: number, subclassId: string | null | undefined): ResolvedSpec[] {
  const out: ResolvedSpec[] = [];
  for (const spec of CLASS_CHOICES[classId]?.[classLevel] ?? []) {
    out.push({ ...spec, storeKey: storeKeyFor(classId, spec.key), classId, classLevel, source: getClass(classId).label });
  }
  const sub = getSubclass(subclassId ?? undefined);
  if (sub && sub.classId === classId) {
    for (const spec of SUBCLASS_CHOICES[sub.id]?.[classLevel] ?? []) {
      out.push({ ...spec, storeKey: storeKeyFor(classId, spec.key), classId, classLevel, source: sub.label });
    }
  }
  return out;
}

/** Todas as escolhas que o personagem já deveria ter feito até o nível atual. */
export function specsUpTo(char: Character): ResolvedSpec[] {
  const levels = char.classLevels?.length ? char.classLevels : [{ classId: char.classId, level: char.level }];
  const out: ResolvedSpec[] = [];
  for (const cl of levels) {
    const sub = cl.classId === char.classId ? char.subclassId : null;
    for (let lv = 1; lv <= cl.level; lv++) out.push(...specsAt(cl.classId, lv, sub));
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
    const missing = total - chosenFor(char, spec.storeKey).length;
    if (missing > 0) out.push({ spec, missing });
  }
  return out;
}

/** Opções do catálogo para uma escolha (respeita `only`). */
export function catalogFor(spec: Pick<ChoiceSpec, 'catalog' | 'only'>): ChoiceOption[] {
  const all = CATALOGS[spec.catalog] ?? [];
  return spec.only ? all.filter((o) => spec.only!.includes(o.id)) : all;
}

/** Rótulo de uma opção escolhida (para listas e linha do tempo). */
export function optionLabel(storeKey: string, id: string): string {
  const key = storeKey.split('.').slice(1).join('.');
  for (const specs of [...Object.values(CLASS_CHOICES), ...Object.values(SUBCLASS_CHOICES)]) {
    for (const list of Object.values(specs)) {
      const spec = list.find((s) => s.key === key);
      if (spec) return CATALOGS[spec.catalog]?.find((o) => o.id === id)?.label ?? id;
    }
  }
  return id;
}

export function findOption(spec: Pick<ChoiceSpec, 'catalog'>, id: string): ChoiceOption | undefined {
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
  // várias escolhas podem cair na mesma chave no mesmo nível (ex.: Manobras) — soma
  const need = new Map<string, { spec: ResolvedSpec; count: number }>();
  for (const spec of specs) {
    const cur = need.get(spec.storeKey);
    need.set(spec.storeKey, { spec, count: (cur?.count ?? 0) + spec.count });
  }
  for (const [storeKey, { spec, count }] of need) {
    const total = count;
    const chosen = picks[storeKey] ?? [];
    const valid = new Set(catalogFor(spec).map((o) => o.id));
    const already = new Set(chosenFor(char, storeKey));
    if (chosen.length !== total) errors.push(`${spec.label}: escolha ${total} (${chosen.length} escolhida${chosen.length === 1 ? '' : 's'}).`);
    if (new Set(chosen).size !== chosen.length) errors.push(`${spec.label}: não repita a mesma opção.`);
    for (const id of chosen) {
      if (!valid.has(id)) errors.push(`${spec.label}: opção inválida para esta classe.`);
      else if (already.has(id)) errors.push(`${spec.label}: "${findOption(spec, id)?.label ?? id}" você já tem.`);
    }
    const rep = replace[storeKey];
    if (rep) {
      if (!spec.canReplace) errors.push(`${spec.label}: esta escolha não permite troca.`);
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
