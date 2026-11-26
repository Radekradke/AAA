import { describe, expect, it } from 'vitest';
import { applyRowChange } from '../realtimeRows';
import type { RowChange } from '../realtimeRows';

type Item = { id: string; updatedAt?: string; scene: string; v: number };
const map = (r: Record<string, unknown>): Item => ({ id: String(r.id), updatedAt: r.updated_at as string | undefined, scene: String(r.scene_id), v: Number(r.v) });
const ev = (eventType: RowChange['eventType'], row: Record<string, unknown>): RowChange => ({ eventType, new: eventType === 'DELETE' ? {} : row, old: eventType === 'DELETE' ? { id: row.id } : {} });
const base: Item[] = [{ id: 'a', updatedAt: '2026-11-26T10:00:00.000100+00:00', scene: 's1', v: 1 }];

describe('applyRowChange (tempo real incremental)', () => {
  it('insere, atualiza e remove pelo id', () => {
    const ins = applyRowChange(base, ev('INSERT', { id: 'b', scene_id: 's1', v: 2 }), map);
    expect(ins.map((x) => x.id)).toEqual(['a', 'b']);
    const upd = applyRowChange(ins, ev('UPDATE', { id: 'a', scene_id: 's1', v: 9, updated_at: '2026-11-26T10:00:01+00:00' }), map);
    expect(upd.find((x) => x.id === 'a')?.v).toBe(9);
    expect(applyRowChange(upd, ev('DELETE', { id: 'b' }), map).map((x) => x.id)).toEqual(['a']);
  });

  it('ignora evento atrasado (fora de ordem), inclusive no mesmo milissegundo', () => {
    const old = ev('UPDATE', { id: 'a', scene_id: 's1', v: 0, updated_at: '2026-11-26T09:59:59+00:00' });
    expect(applyRowChange(base, old, map)).toBe(base);
    const sameMs = ev('UPDATE', { id: 'a', scene_id: 's1', v: 0, updated_at: '2026-11-26T10:00:00.000050+00:00' });
    expect(applyRowChange(base, sameMs, map)).toBe(base);
  });

  it('linha que deixou de pertencer sai; de fora não entra', () => {
    const keep = (x: Item) => x.scene === 's1';
    expect(applyRowChange(base, ev('UPDATE', { id: 'a', scene_id: 's2', v: 1, updated_at: '2026-11-26T11:00:00+00:00' }), map, keep)).toEqual([]);
    expect(applyRowChange(base, ev('INSERT', { id: 'z', scene_id: 's9', v: 1 }), map, keep)).toBe(base);
  });

  it('nada mudou: devolve a mesma lista', () => {
    expect(applyRowChange(base, ev('DELETE', { id: 'nao-existe' }), map)).toBe(base);
    expect(applyRowChange(base, { eventType: 'UPDATE', new: {}, old: {} }, map)).toBe(base);
  });
});
