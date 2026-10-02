import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character } from '@/types/character';
import type { SheetRow } from '@/types/models';

const cloud = vi.hoisted(() => ({
  rows: [] as SheetRow[],
  pushes: [] as { id: string; updatedAt: number; base: number | null | undefined }[],
  /** chamado no meio do push (simula o usuário mexendo durante o envio) */
  during: null as null | (() => void),
  /** a gravação condicional falha (outro aparelho subiu antes) */
  race: false,
}));

vi.mock('../supabaseClient', () => ({ cloudEnabled: () => true, getSupabase: () => null }));
vi.mock('../characterSheetService', () => ({
  fromRow: (row: SheetRow, owner: string) => ({ ...row.snapshot, ownerId: owner, updatedAt: row.updated_at }),
  characterSheetService: {
    pullSheets: async () => cloud.rows.map((r) => ({ ...r })),
    deleteSheet: async () => undefined,
    pushSheet: async (char: Character, _user: string, base?: number | null) => {
      cloud.pushes.push({ id: char.id, updatedAt: char.updatedAt, base });
      cloud.during?.();
      if (cloud.race && base !== undefined) return false;
      const row = cloud.rows.find((r) => r.id === char.id);
      if (row) Object.assign(row, { snapshot: char, updated_at: char.updatedAt });
      else cloud.rows.push({ id: char.id, user_id: 'u', snapshot: char, updated_at: char.updatedAt } as SheetRow);
      return true;
    },
  },
}));

import { resolveConflict, syncNow } from '../offlineSyncService';
import { __resetHistory, listHistory } from '../sheetHistory';
import { useCharacterStore } from '@/store/characterStore';
import { useSaveStatusStore } from '@/store/saveStatusStore';

const USER = '22222222-2222-4222-8222-222222222222';

function hero(p: Partial<Character> = {}): Character {
  return { id: 'h1', ownerId: USER, name: 'Kael', level: 3, hpCurrent: 20, inventory: [], coins: { pp: 0, gp: 10, ep: 0, sp: 0, cp: 0 }, preparedSpells: [], journal: [], notes: '', combat: { conditions: [], spellSlots: {} }, createdAt: 1, updatedAt: 100, ...p } as unknown as Character;
}
const row = (c: Character): SheetRow => ({ id: c.id, user_id: USER, snapshot: c, updated_at: c.updatedAt }) as SheetRow;
const current = () => useCharacterStore.getState().characters.find((c) => c.id === 'h1')!;

beforeEach(() => {
  cloud.rows = [];
  cloud.pushes = [];
  cloud.during = null;
  cloud.race = false;
  __resetHistory();
  useSaveStatusStore.setState({ conflicts: [], cloud: 'pending' });
  vi.stubGlobal('navigator', { onLine: true });
});

describe('syncNow', () => {
  it('edição feita DURANTE o envio não é desfeita e continua pendente', async () => {
    useCharacterStore.setState({ characters: [hero({ updatedAt: 200, syncBase: 100, syncStatus: 'pending' })], pendingDeletes: [] });
    cloud.rows = [row(hero({ updatedAt: 100 }))];
    cloud.during = () => useCharacterStore.getState().updateCharacter('h1', (c) => { c.hpCurrent = 7; });
    await syncNow(USER);
    expect(current().hpCurrent).toBe(7); // antes: voltava para 20
    expect(current().syncStatus).toBe('pending');
    expect(current().syncBase).toBe(200);
    expect(cloud.pushes[0]).toMatchObject({ updatedAt: 200, base: 100 });
  });

  it('push é condicional à versão lida; se outro aparelho subiu antes, não sobrescreve', async () => {
    useCharacterStore.setState({ characters: [hero({ updatedAt: 200, syncBase: 100, syncStatus: 'pending' })], pendingDeletes: [] });
    cloud.rows = [row(hero({ updatedAt: 100, hpCurrent: 3 }))];
    cloud.race = true;
    await syncNow(USER, 2); // sem novas rodadas
    expect(cloud.rows[0].updated_at).toBe(100);
    expect(current().syncStatus).toBe('pending');
  });

  it('a nuvem mudou desde a base → baixa, mesmo com horário "antigo"', async () => {
    useCharacterStore.setState({ characters: [hero({ updatedAt: 100, syncBase: 100, lastSyncedAt: 99999, syncStatus: 'synced' })], pendingDeletes: [] });
    cloud.rows = [row(hero({ updatedAt: 102, hpCurrent: 11 }))];
    await syncNow(USER);
    expect(current().hpCurrent).toBe(11);
    expect(current().syncBase).toBe(102);
  });

  it('conflito traz a versão da nuvem para comparar', async () => {
    useCharacterStore.setState({ characters: [hero({ updatedAt: 150, syncBase: 100, hpCurrent: 5 })], pendingDeletes: [] });
    cloud.rows = [row(hero({ updatedAt: 120, hpCurrent: 18 }))];
    await syncNow(USER);
    const [c] = useSaveStatusStore.getState().conflicts;
    expect(c.remote?.hpCurrent).toBe(18);
    expect(current().syncStatus).toBe('conflict');
    expect(cloud.pushes).toHaveLength(0);
  });
});

describe('resolveConflict', () => {
  async function setupConflict() {
    useCharacterStore.setState({ characters: [hero({ updatedAt: 150, syncBase: 100, hpCurrent: 5 })], pendingDeletes: [] });
    cloud.rows = [row(hero({ updatedAt: 120, hpCurrent: 18 }))];
    await syncNow(USER);
  }

  it('manter a deste aparelho: sobe por cima e guarda a da nuvem no histórico', async () => {
    await setupConflict();
    await resolveConflict(USER, 'h1', 'local');
    expect(cloud.rows[0].snapshot.hpCurrent).toBe(5);
    expect(current().syncStatus).toBe('synced');
    const hist = await listHistory('h1');
    expect(hist[0]).toMatchObject({ reason: 'conflict' });
    expect(hist[0].char.hpCurrent).toBe(18);
    expect(useSaveStatusStore.getState().conflicts).toHaveLength(0);
  });

  it('usar a da nuvem: baixa e guarda a deste aparelho no histórico', async () => {
    await setupConflict();
    await resolveConflict(USER, 'h1', 'cloud');
    expect(current().hpCurrent).toBe(18);
    expect(current().syncBase).toBe(120);
    const hist = await listHistory('h1');
    expect(hist[0].char.hpCurrent).toBe(5);
  });
});
