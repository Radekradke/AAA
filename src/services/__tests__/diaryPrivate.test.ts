import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character, Diary } from '@/types/character';
import type { SheetRow } from '@/types/models';
import type { DiaryRow } from '../diaryCloud';

const cloud = vi.hoisted(() => ({
  rows: [] as SheetRow[],
  /** null = banco sem a tabela sheet_diaries */
  diaries: new Map() as Map<string, DiaryRow> | null,
  sheetPushes: [] as { id: string; base: number | null | undefined; privateDiary: boolean; snapshot: Character }[],
  diaryPushes: [] as { id: string; version: number; data: unknown }[],
}));

vi.mock('../supabaseClient', () => ({ cloudEnabled: () => true, getSupabase: () => null }));
vi.mock('../characterSheetService', async () => {
  const { withoutDiary } = await vi.importActual<typeof import('../diaryCloud')>('../diaryCloud');
  return {
    fromRow: (row: SheetRow, owner: string) => ({ ...row.snapshot, ownerId: owner, updatedAt: row.updated_at }),
    characterSheetService: {
      pullSheets: async () => cloud.rows.map((r) => ({ ...r })),
      deleteSheet: async () => undefined,
      pushSheet: async (char: Character, _u: string, base?: number | null, privateDiary = false) => {
        const snapshot = privateDiary ? withoutDiary(char) : char;
        cloud.sheetPushes.push({ id: char.id, base, privateDiary, snapshot });
        const row = cloud.rows.find((r) => r.id === char.id);
        if (row) Object.assign(row, { snapshot, updated_at: char.updatedAt });
        else cloud.rows.push({ id: char.id, user_id: 'u', snapshot, updated_at: char.updatedAt } as SheetRow);
        return true;
      },
    },
  };
});
vi.mock('../diaryCloud', async () => {
  const real = await vi.importActual<typeof import('../diaryCloud')>('../diaryCloud');
  return {
    ...real,
    diaryCloud: {
      pull: async () => (cloud.diaries ? new Map(cloud.diaries) : null),
      push: async (char: Character, user: string, version: number) => {
        const data = real.diaryPartOf(char);
        cloud.diaryPushes.push({ id: char.id, version, data });
        cloud.diaries?.set(char.id, { sheet_id: char.id, user_id: user, data, updated_at: version });
      },
    },
  };
});

import { syncNow } from '../offlineSyncService';
import { cloudDiaryFor, hasLegacyDiary, isEmptyDiaryPart, withDiary, withoutDiary } from '../diaryCloud';
import { useCharacterStore } from '@/store/characterStore';
import { useSaveStatusStore } from '@/store/saveStatusStore';

const USER = '22222222-2222-4222-8222-222222222222';
const diary = (text: string): Diary => ({ notes: [{ id: 'n1', text, at: 1 }], quests: [], clues: [], people: {} });

function hero(p: Partial<Character> = {}): Character {
  return { id: 'h1', ownerId: USER, name: 'Kael', level: 3, hpCurrent: 20, inventory: [], coins: { pp: 0, gp: 10, ep: 0, sp: 0, cp: 0 }, preparedSpells: [], journal: [], notes: '', combat: { conditions: [], spellSlots: {} }, createdAt: 1, updatedAt: 100, ...p } as unknown as Character;
}
const row = (c: Character): SheetRow => ({ id: c.id, user_id: USER, snapshot: c, updated_at: c.updatedAt }) as SheetRow;
const drow = (id: string, d: Diary, v: number): DiaryRow => ({ sheet_id: id, user_id: USER, data: { diary: d, journal: [], notes: '' }, updated_at: v });
const current = () => useCharacterStore.getState().characters.find((c) => c.id === 'h1')!;

beforeEach(() => {
  cloud.rows = [];
  cloud.diaries = new Map();
  cloud.sheetPushes = [];
  cloud.diaryPushes = [];
  useSaveStatusStore.setState({ conflicts: [], cloud: 'pending' });
  vi.stubGlobal('navigator', { onLine: true });
});

describe('diário privado: funções puras', () => {
  it('a ficha sobe sem o diário (o mestre e o link leem o snapshot)', () => {
    const c = hero({ diary: diary('segredo'), journal: [{ id: 'j' } as never], notes: 'nota' });
    const s = withoutDiary(c);
    expect(s.diary).toBeUndefined();
    expect(s.journal).toEqual([]);
    expect(s.notes).toBe('');
    expect(JSON.stringify(s)).not.toContain('segredo');
    expect(withDiary(s, { diary: diary('segredo'), journal: [], notes: 'nota' }).notes).toBe('nota');
  });

  it('reconhece snapshot antigo e diário vazio', () => {
    expect(hasLegacyDiary(hero({ diary: diary('x') }))).toBe(true);
    expect(hasLegacyDiary(hero({ notes: '  ' }))).toBe(false);
    expect(isEmptyDiaryPart({ journal: [], notes: '' })).toBe(true);
    expect(isEmptyDiaryPart({ diary: diary('x'), journal: [], notes: '' })).toBe(false);
  });

  it('qual diário vale para a ficha da nuvem', () => {
    const stripped = row(withoutDiary(hero({ updatedAt: 200 })));
    const legacy = row(hero({ updatedAt: 200, diary: diary('antigo') }));
    expect(cloudDiaryFor(stripped, drow('h1', diary('nuvem'), 200)).diary?.notes[0].text).toBe('nuvem');
    expect(cloudDiaryFor(legacy, drow('h1', diary('velho'), 100)).diary?.notes[0].text).toBe('antigo'); // app antigo gravou depois
    expect(cloudDiaryFor(stripped, drow('h1', diary('velho'), 100)).diary?.notes[0].text).toBe('velho'); // envio do diário falhou
    expect(cloudDiaryFor(stripped).journal).toEqual([]);
  });
});

describe('diário privado: sincronização', () => {
  it('edição local: a ficha sobe sem o diário e o diário vai à parte com a mesma versão', async () => {
    useCharacterStore.setState({ characters: [hero({ updatedAt: 200, syncBase: 100, syncStatus: 'pending', diary: diary('meu segredo') })], pendingDeletes: [] });
    cloud.rows = [row(withoutDiary(hero({ updatedAt: 100 })))];
    await syncNow(USER);
    expect(cloud.sheetPushes[0]).toMatchObject({ base: 100, privateDiary: true });
    expect(JSON.stringify(cloud.sheetPushes[0].snapshot)).not.toContain('meu segredo');
    expect(cloud.diaryPushes[0]).toMatchObject({ id: 'h1', version: 200 });
    expect(current().diary?.notes[0].text).toBe('meu segredo'); // continua no aparelho
  });

  it('ficha antiga na nuvem com o diário dentro: limpa o snapshot (mesma versão) e guarda o diário à parte', async () => {
    const c = hero({ updatedAt: 100, syncBase: 100, syncStatus: 'synced', lastSyncedAt: 100, diary: diary('antigo') });
    useCharacterStore.setState({ characters: [c], pendingDeletes: [] });
    cloud.rows = [row(c)];
    await syncNow(USER);
    expect(cloud.sheetPushes[0]).toMatchObject({ base: 100, privateDiary: true });
    expect(cloud.rows[0].snapshot.diary).toBeUndefined();
    expect(cloud.rows[0].updated_at).toBe(100);
    expect(cloud.diaryPushes[0]).toMatchObject({ version: 100 });
  });

  it('outro aparelho mudou: baixa a ficha e o diário privado da mesma versão', async () => {
    useCharacterStore.setState({ characters: [hero({ updatedAt: 100, syncBase: 100, syncStatus: 'synced', diary: diary('velho') })], pendingDeletes: [] });
    cloud.rows = [row(withoutDiary(hero({ updatedAt: 300, hpCurrent: 9 })))];
    cloud.diaries!.set('h1', drow('h1', diary('novo'), 300));
    await syncNow(USER);
    expect(current().hpCurrent).toBe(9);
    expect(current().diary?.notes[0].text).toBe('novo');
    expect(cloud.sheetPushes).toHaveLength(0);
  });

  it('aparelho sem diário (app antigo apagou ao baixar) não apaga o da nuvem: traz de volta', async () => {
    useCharacterStore.setState({ characters: [hero({ updatedAt: 300, syncBase: 300, syncStatus: 'synced' })], pendingDeletes: [] });
    cloud.rows = [row(withoutDiary(hero({ updatedAt: 300 })))];
    cloud.diaries!.set('h1', drow('h1', diary('guardado'), 300));
    await syncNow(USER);
    expect(cloud.diaryPushes).toHaveLength(0);
    expect(current().diary?.notes[0].text).toBe('guardado');
  });

  it('o envio do diário falhou da outra vez (ficha já na versão nova): reenvia', async () => {
    useCharacterStore.setState({ characters: [hero({ updatedAt: 300, syncBase: 100, syncStatus: 'pending', diary: diary('recente') })], pendingDeletes: [] });
    cloud.rows = [row(withoutDiary(hero({ updatedAt: 300 })))]; // a ficha subiu, a resposta não voltou
    cloud.diaries!.set('h1', drow('h1', diary('antigo'), 100));
    await syncNow(USER);
    expect(useSaveStatusStore.getState().conflicts).toHaveLength(0); // mesma versão dos dois lados ≠ conflito
    expect(cloud.diaryPushes[0]).toMatchObject({ version: 300 });
    expect(cloud.diaries!.get('h1')!.data.diary?.notes[0].text).toBe('recente');
  });

  it('ficha que só existe na nuvem chega com o diário privado', async () => {
    useCharacterStore.setState({ characters: [], pendingDeletes: [] });
    cloud.rows = [row(withoutDiary(hero({ updatedAt: 300 })))];
    cloud.diaries!.set('h1', drow('h1', diary('do outro aparelho'), 300));
    await syncNow(USER);
    expect(current().diary?.notes[0].text).toBe('do outro aparelho');
  });

  it('banco sem a tabela nova: nada muda — o diário segue dentro da ficha', async () => {
    cloud.diaries = null;
    useCharacterStore.setState({ characters: [hero({ updatedAt: 200, syncBase: 100, syncStatus: 'pending', diary: diary('x') })], pendingDeletes: [] });
    cloud.rows = [row(hero({ updatedAt: 100 }))];
    await syncNow(USER);
    expect(cloud.sheetPushes[0].privateDiary).toBe(false);
    expect(cloud.rows[0].snapshot.diary?.notes[0].text).toBe('x');
    expect(cloud.diaryPushes).toHaveLength(0);
  });
});
