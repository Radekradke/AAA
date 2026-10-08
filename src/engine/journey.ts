import type { Character } from '@/types/character';
import { getClass } from '@/data/classes';
import { getSubclass } from '@/data/subclasses';
import { earnedDeeds } from './deeds';
import type { DeedDef } from './deeds';

export type JourneyKind = 'inicio' | 'nivel' | 'feito' | 'cicatriz' | 'sessao';

export interface JourneyEvent {
  id: string;
  /** Quando aconteceu (ISO). */
  at: string;
  kind: JourneyKind;
  title: string;
  detail?: string;
  /** Feito (para o selo com a raridade). */
  deed?: DeedDef;
}

const iso = (ms: number) => new Date(ms).toISOString();

/**
 * A história do herói contada pela carta: criação, subidas de nível,
 * feitos, cicatrizes e sessões na mesa — em ordem cronológica.
 */
export function journeyOf(char: Character): JourneyEvent[] {
  const out: JourneyEvent[] = [];
  if (char.createdAt) {
    out.push({ id: 'inicio', at: iso(char.createdAt), kind: 'inicio', title: 'Começa a jornada', detail: `${char.name.trim() || 'O herói'} entra para a história como ${getClass(char.classId).label.toLowerCase()} de nível 1.` });
  }
  for (const r of char.levelHistory ?? []) {
    // registros de migração não têm data real
    if (r.synthetic || !r.at || r.level <= 1) continue;
    const sub = r.subclassId ? getSubclass(r.subclassId)?.label : null;
    out.push({
      id: `nivel-${r.level}-${r.at}`,
      at: iso(r.at),
      kind: 'nivel',
      title: `Nível ${r.level}`,
      detail: [`${getClass(r.classId).label} ${r.classLevel}`, sub && `escolheu ${sub}`, r.features.length ? r.features.slice(0, 3).join(', ') : null].filter(Boolean).join(' · '),
    });
  }
  for (const { def, at } of earnedDeeds(char.deeds)) out.push({ id: `feito-${def.id}`, at, kind: 'feito', title: def.name, detail: def.desc, deed: def });
  for (const s of char.scars ?? []) out.push({ id: `cicatriz-${s.id}`, at: s.date, kind: 'cicatriz', title: s.text, detail: [s.session, s.by === 'mestre' ? 'pelo mestre' : null].filter(Boolean).join(' · ') || undefined });
  for (const s of char.sessions ?? []) out.push({ id: `sessao-${s.id}`, at: s.at, kind: 'sessao', title: s.name, detail: 'Sessão na mesa ao vivo' });
  const sorted = out.filter((e) => !Number.isNaN(Date.parse(e.at))).sort((a, b) => a.at.localeCompare(b.at));
  // o começo vem sempre primeiro (ficha importada/copiada pode ter data de criação mais nova que os feitos)
  const i = sorted.findIndex((e) => e.kind === 'inicio');
  if (i > 0) {
    const [start] = sorted.splice(i, 1);
    sorted.unshift({ ...start, at: sorted[0].at < start.at ? sorted[0].at : start.at });
  }
  return sorted;
}
