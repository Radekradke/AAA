/**
 * Aplica um evento do Realtime (postgres_changes) numa lista em memória,
 * sem buscar tudo de novo. Puro e testável.
 *
 * · INSERT/UPDATE: entra ou substitui pelo id — a não ser que o evento seja
 *   mais velho que o que já temos (eventos podem chegar fora de ordem).
 * · DELETE: sai pelo id (o Realtime manda só a chave em `old`).
 * · `keep` decide se a linha pertence à lista (ex.: peão de outra cena sai).
 * Devolve a MESMA lista quando nada mudou (o React não redesenha à toa).
 */
export type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RowChange {
  eventType: ChangeEvent;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

export interface Versioned {
  id: string;
  /** ISO 8601 do banco (updated_at); compara como texto. */
  updatedAt?: string;
}

export function applyRowChange<T extends Versioned>(list: T[], change: RowChange, map: (row: Record<string, unknown>) => T, keep: (item: T) => boolean = () => true): T[] {
  if (change.eventType === 'DELETE') {
    const id = String(change.old?.id ?? '');
    return id && list.some((x) => x.id === id) ? list.filter((x) => x.id !== id) : list;
  }
  if (!change.new || change.new.id == null) return list;
  const item = map(change.new);
  const i = list.findIndex((x) => x.id === item.id);
  if (!keep(item)) return i < 0 ? list : list.filter((x) => x.id !== item.id);
  if (i < 0) return [...list, item];
  const cur = list[i];
  // evento atrasado: o que temos já é mais novo
  if (cur.updatedAt && item.updatedAt && newer(cur.updatedAt, item.updatedAt)) return list;
  const next = list.slice();
  next[i] = item;
  return next;
}

/** a é estritamente mais novo que b? (datas ISO do Postgres) */
function newer(a: string, b: string): boolean {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta > tb;
  // mesmo milissegundo: o Postgres manda microssegundos — compara o texto
  return a > b;
}
