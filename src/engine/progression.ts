import { getClass } from '@/data/classes';
import type { ClassResourceDef } from '@/types/dnd';

/** Espaços por círculo (índice = círculo-1) para conjuradores plenos, por nível. */
const FULL_CASTER: number[][] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Conjuradores parciais (paladino, patrulheiro) — começam no nível 2. */
const HALF_CASTER: number[][] = [
  [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2],
  [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2],
];

const FULL_CASTERS = new Set(['bard', 'cleric', 'druid', 'sorcerer', 'wizard']);
const HALF_CASTERS = new Set(['paladin', 'ranger']);

/** Magia de Pacto do Bruxo: nível do espaço e quantidade. */
function warlockSlots(level: number): Record<number, number> {
  const circle = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1;
  const count = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1;
  return { [circle]: count };
}

/** Espaços de magia máximos por círculo para a classe/nível. */
export function spellSlotsForClass(classId: string, level: number): Record<number, number> {
  const lv = Math.max(1, Math.min(20, level));
  if (classId === 'warlock') return warlockSlots(lv);
  let table: number[][] | null = null;
  if (FULL_CASTERS.has(classId)) table = FULL_CASTER;
  else if (HALF_CASTERS.has(classId)) table = HALF_CASTER;
  if (!table) return {};
  const row = table[lv - 1] ?? [];
  const out: Record<number, number> = {};
  row.forEach((count, i) => {
    if (count > 0) out[i + 1] = count;
  });
  return out;
}

/** Máximo de um recurso de classe, com escalonamento por nível quando aplicável. */
export function resourceMaxFor(res: ClassResourceDef, level: number): number {
  switch (res.id) {
    case 'ki':
    case 'sorcery':
      return level; // pontos = nível
    case 'layhands':
      return 5 * level; // cura pelas mãos = 5 × nível
    case 'rage':
      return level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2;
    case 'surge':
      return level >= 17 ? 2 : 1;
    case 'inspiration':
    case 'channel':
      return Math.max(res.max, 1);
    default:
      return res.max;
  }
}

/** Constrói o estado inicial de espaços de magia (todos disponíveis). */
export function buildSpellSlots(classId: string, level: number): Record<number, { used: number; max: number }> {
  const maxes = spellSlotsForClass(classId, level);
  const out: Record<number, { used: number; max: number }> = {};
  for (const [circle, max] of Object.entries(maxes)) out[Number(circle)] = { used: 0, max };
  return out;
}

/** Constrói o mapa de recursos de classe disponíveis para o nível. */
export function buildResources(classId: string, level: number): Record<string, number> {
  const cls = getClass(classId);
  const out: Record<string, number> = {};
  for (const r of cls.resources ?? []) out[r.id] = resourceMaxFor(r, level);
  return out;
}
