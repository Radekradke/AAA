import type { Character } from '@/types/character';
import { getSubclass } from '@/data/subclasses';

/** Progressão por classe; lê também fichas antigas sem classLevels. */
export function levelsOf(char: Character): Character['classLevels'] {
  return char.classLevels?.length ? char.classLevels : [{ classId: char.classId, level: char.level }];
}

/** Subclasse de uma classe, com compatibilidade para o campo legado principal. */
export function subclassOf(char: Character, classId: string): string | null {
  const valid = (id: string | null | undefined) => id && getSubclass(id)?.classId === classId ? id : null;
  if (classId === char.classId && char.subclassId === null) return null;
  if (classId === char.classId && valid(char.subclassId)) return char.subclassId;
  const entry = levelsOf(char).find((cl) => cl.classId === classId);
  if (!entry) return null;
  if (entry.subclassId !== undefined) return valid(entry.subclassId);
  const historic = [...(char.levelHistory ?? [])].reverse().find((r) => r.classId === classId && valid(r.subclassId));
  return valid(historic?.subclassId) ?? valid(char.subclassId);
}
