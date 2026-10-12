import type { Character } from '@/types/character';
import { CLASSES } from '@/data/classes';
import { RACES } from '@/data/races';
import { SUBCLASSES } from '@/data/subclasses';
import { ABILITY_KEYS } from '@/types/dnd';

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const integer = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Valida antes de migrar/gravar. Defaults antigos são aceitos; tipos inválidos não. */
export function characterImportError(value: unknown, defaults: Character): string | null {
  if (!record(value) || typeof value.name !== 'string' || !value.name.trim()) return 'A ficha precisa de um nome em texto.';
  if (value.name.length > 160) return 'O nome deve ter até 160 caracteres.';
  const shape = (input: Record<string, unknown>, model: Record<string, unknown>, path: string): string | null => {
    for (const [key, expected] of Object.entries(model)) {
      if (!(key in input) || expected === null || expected === undefined) continue;
      const actual = input[key];
      const field = `${path}${key}`;
      if (Array.isArray(expected)) {
        if (!Array.isArray(actual)) return `${field} precisa ser uma lista.`;
      } else if (record(expected)) {
        if (!record(actual)) return `${field} precisa ser um objeto.`;
        const nested = shape(actual, expected, `${field}.`);
        if (nested) return nested;
      } else if (typeof actual !== typeof expected || (typeof actual === 'number' && !Number.isFinite(actual))) return `${field} tem um tipo inválido.`;
    }
    return null;
  };
  const malformed = shape(value, defaults as unknown as Record<string, unknown>, '');
  if (malformed) return malformed;
  const level = value.level ?? defaults.level;
  if (!integer(level, 1, 20)) return 'O nível precisa ser um inteiro entre 1 e 20.';
  if (value.schema !== undefined && !integer(value.schema, 1, 4)) return 'Versão de ficha não suportada.';
  const classId = value.classId ?? defaults.classId;
  if (!CLASSES.some((cl) => cl.id === classId)) return 'Classe não reconhecida.';
  const raceId = value.raceId ?? defaults.raceId;
  if (!RACES.some((race) => race.id === raceId) && !(record(value.customRace) && value.customRace.id === raceId)) return 'Raça não reconhecida e sem definição personalizada.';
  if (value.subclassId != null) {
    const sub = SUBCLASSES.find((entry) => entry.id === value.subclassId);
    const legacySecondary = (value.schema ?? 3) !== 4 && Array.isArray(value.classLevels) && value.classLevels.some((cl) => record(cl) && cl.classId === sub?.classId);
    if (!sub || (sub.classId !== classId && !legacySecondary)) return 'Subclasse incompatível com a classe principal.';
  }
  if (value.classLevels !== undefined) {
    if (!Array.isArray(value.classLevels) || !value.classLevels.length) return 'As classes precisam conter pelo menos um nível.';
    const seen = new Set();
    let total = 0;
    for (const cl of value.classLevels) {
      if (!record(cl) || !CLASSES.some((entry) => entry.id === cl.classId) || !integer(cl.level, 1, 20) || seen.has(cl.classId)) return 'Lista de classes inválida ou repetida.';
      if (cl.subclassId != null && !SUBCLASSES.some((sub) => sub.id === cl.subclassId && sub.classId === cl.classId)) return 'Subclasse incompatível na multiclasse.';
      seen.add(cl.classId);
      total += cl.level;
    }
    if (total !== level || !seen.has(classId)) return 'A soma dos níveis das classes deve corresponder ao nível da ficha.';
  }
  if (record(value.baseAbilities)) for (const key of ABILITY_KEYS) {
    if (key in value.baseAbilities && !integer(value.baseAbilities[key], 1, 30)) return `Atributo ${key} precisa ser um inteiro entre 1 e 30.`;
  }
  for (const key of ['preparedSpells', 'knownSpells', 'spellbookCopied', 'feats'] as const) {
    if (key in value && !strings(value[key])) return `${key} precisa conter identificadores em texto.`;
  }
  if (value.choices !== undefined && (!record(value.choices) || !Object.values(value.choices).every(strings))) return 'Escolhas precisam ser listas de identificadores.';
  if (value.inventory !== undefined) {
    if (!Array.isArray(value.inventory)) return 'Inventário precisa ser uma lista.';
    const ids = new Set<string>();
    for (const item of value.inventory) {
      if (!record(item) || typeof item.uid !== 'string' || !item.uid || ids.has(item.uid) || typeof item.name !== 'string' || typeof item.category !== 'string' || !integer(item.quantity, 0, 1000000)) return 'Item do inventário inválido ou identificador repetido.';
      ids.add(item.uid);
      for (const field of ['weapon', 'armor', 'magic', 'charges'] as const) if (item[field] !== undefined && !record(item[field])) return `${item.name}: ${field} precisa ser um objeto.`;
    }
  }
  if (value.classSpells !== undefined) {
    if (!record(value.classSpells)) return 'Magias por classe precisam ser um objeto.';
    for (const [id, selection] of Object.entries(value.classSpells)) {
      if (!CLASSES.some((cl) => cl.id === id) || !record(selection) || !strings(selection.knownSpells) || !strings(selection.preparedSpells)) return 'Seleção de magias por classe inválida.';
    }
  }
  if (record(value.combat)) {
    for (const field of ['conditions', 'marks'] as const) if (field in value.combat && !strings(value.combat[field])) return `combat.${field} precisa ser uma lista de textos.`;
    if (value.combat.spellSlots !== undefined) {
      if (!record(value.combat.spellSlots)) return 'Espaços de magia precisam ser um objeto.';
      for (const [circle, slot] of Object.entries(value.combat.spellSlots)) if (!integer(Number(circle), 1, 9) || !record(slot) || !integer(slot.max, 0, 20) || !integer(slot.used, 0, slot.max)) return 'Reserva de espaços de magia inválida.';
    }
  }
  return null;
}
