import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiaryRow } from '../diaryCloud';
const db = vi.hoisted(() => ({ row: null as DiaryRow | null, race: null as DiaryRow | null }));
vi.mock('../supabaseClient', () => ({ getSupabase: () => ({ from: () => ({
  update: (row: DiaryRow) => ({ eq: () => ({ lte: (_column: string, version: number) => ({ select: async () => {
    if (db.row && db.row.updated_at <= version) { db.row = row; return { data: [{ sheet_id: row.sheet_id }], error: null }; }
    return { data: [], error: null };
  } }) }) }),
  insert: async (row: DiaryRow) => {
    if (db.race) { db.row = db.race; db.race = null; }
    if (db.row) return { error: { code: '23505', message: 'duplicado' } };
    db.row = row;
    return { error: null };
  },
}) }) }));
import { diaryCloud } from '../diaryCloud';
import { createDraftCharacter } from '@/engine/characterBuilder';
const c = createDraftCharacter({ ownerId: 'teste', name: 'Controle' });
const remote = (version: number): DiaryRow => ({ sheet_id: c.id, user_id: 'teste', data: { notes: 'diário novo', journal: [] }, updated_at: version });
beforeEach(() => { db.row = null; db.race = null; });
describe('versão do diário na escrita privada', () => {
  it('insere e atualiza a própria versão normalmente', async () => {
    c.notes = 'primeiro';
    await diaryCloud.push(c, 'teste', 100);
    expect(db.row?.data.notes).toBe('primeiro');
    c.notes = 'segundo';
    await diaryCloud.push(c, 'teste', 200);
    expect(db.row?.data.notes).toBe('segundo');
  });
  it('não sobrescreve a versão mais nova com envio atrasado', async () => {
    db.row = remote(200);
    await expect(diaryCloud.push(c, 'teste', 100)).rejects.toThrow('outro aparelho');
    expect(db.row.updated_at).toBe(200);
    expect(db.row.data.notes).toBe('diário novo');
  });
  it('preserva diário criado entre a atualização e a inserção', async () => {
    db.race = remote(200);
    await expect(diaryCloud.push(c, 'teste', 100)).rejects.toThrow('outro aparelho');
    expect(db.row?.updated_at).toBe(200);
    expect(db.row?.data.notes).toBe('diário novo');
  });
});
