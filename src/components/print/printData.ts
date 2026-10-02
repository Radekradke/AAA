import { useMemo } from 'react';
import type { Character } from '@/types/character';
import { deriveCharacter } from '@/engine/dndRules';
import { featuresGained } from '@/engine/levelUp';
import { spellSlotsFor } from '@/engine/spellcasting';
import { characterResources } from '@/engine/classResources';
import { getClass } from '@/data/classes';
import { getSubclass } from '@/data/subclasses';
import { getBackground } from '@/data/backgrounds';
import { getSubrace, raceOf } from '@/data/races';
import { getSpell } from '@/data/spells';

export const COINS: [keyof Character['coins'], string][] = [['pp', 'PL'], ['gp', 'PO'], ['ep', 'PE'], ['sp', 'PP'], ['cp', 'PC']];
export const fmtM = (m: number) => `${String(m).replace('.', ',')} m`;

/**
 * Tudo o que as fichas para imprimir (clássica e ilustrada) mostram, calculado
 * uma vez: atributos derivados, origem, classes com características por
 * nível, espaços e magias por círculo, recursos de classe.
 */
export function usePrintData(char: Character) {
  const d = useMemo(() => deriveCharacter(char), [char]);
  const spells = useMemo(() => {
    const ids = [...new Set([...(char.knownSpells ?? []), ...(char.preparedSpells ?? [])])];
    const list = ids.map((id) => getSpell(id)).filter((s): s is NonNullable<typeof s> => !!s);
    const byLevel = new Map<number, typeof list>();
    for (const s of list.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))) byLevel.set(s.level, [...(byLevel.get(s.level) ?? []), s]);
    return byLevel;
  }, [char.knownSpells, char.preparedSpells]);
  const resources = useMemo(() => {
    try {
      return characterResources(char);
    } catch {
      return [];
    }
  }, [char]);

  const race = raceOf(char);
  const sub = getSubrace(char.raceId, char.subraceId);
  const bg = getBackground(char.backgroundId);
  const classes = (char.classLevels?.length ? char.classLevels : [{ classId: char.classId, level: char.level }]).map((cl) => ({ ...cl, cls: getClass(cl.classId) }));
  const subclass = getSubclass(char.subclassId ?? undefined);
  const features = classes.map((c) => {
    const subId = c.classId === char.classId ? (char.subclassId ?? null) : null;
    const rows = Array.from({ length: c.level }, (_, i) => i + 1)
      .map((lv) => ({ lv, f: featuresGained(c.classId, lv, subId) }))
      .filter((r) => r.f.length);
    return { classId: c.classId, label: c.cls.label, rows };
  });

  return {
    d,
    race,
    sub,
    bg,
    classes,
    subclass,
    features,
    slots: spellSlotsFor(char),
    spells,
    resources,
    prepared: new Set(char.preparedSpells ?? []),
    equippedIds: new Set(Object.values(char.equipped ?? {}).filter(Boolean) as string[]),
    traits: race.traitDetails?.length ? race.traitDetails.map((t) => t.name) : race.traits,
    classLine: classes.map((c) => `${c.cls.label} ${c.level}`).join(' / ') + (subclass ? ` (${subclass.label})` : ''),
  };
}
