import { getSupabase } from './supabaseClient';
import type { Character, Diary, JournalEntry } from '@/types/character';
import type { SheetRow } from '@/types/models';

/**
 * Diário PRIVADO na nuvem (tabela `sheet_diaries`, ver supabase/diario_privado.sql).
 *
 * O diário (rabiscos, crônica, missões, pistas e pessoas) não vai mais
 * dentro do snapshot da ficha — o snapshot é lido pelo mestre e pelo link
 * de compartilhamento. Fica numa linha própria que SÓ o dono lê e escreve,
 * gravada com a mesma versão (`updated_at`) da ficha: assim a decisão de
 * sync da ficha (push / pull / conflito) vale para os dois juntos.
 *
 * Sem a tabela (SQL ainda não rodou), nada muda: o diário segue dentro da
 * ficha como antes, para não sumir de nenhum aparelho.
 */

/** A parte "diário" de uma ficha. */
export interface DiaryPart {
  diary?: Diary;
  journal: JournalEntry[];
  notes: string;
}

export interface DiaryRow {
  sheet_id: string;
  user_id: string;
  data: DiaryPart;
  updated_at: number;
}

export const diaryPartOf = (c: Pick<Character, 'diary' | 'journal' | 'notes'>): DiaryPart => ({
  ...(c.diary ? { diary: c.diary } : {}),
  journal: c.journal ?? [],
  notes: c.notes ?? '',
});

/** A ficha sem o diário (o que vai para o snapshot que o mestre/link leem). */
export function withoutDiary(c: Character): Character {
  const { diary: _diary, ...rest } = c;
  return { ...rest, journal: [], notes: '' } as Character;
}

/** A ficha com este diário. */
export function withDiary(c: Character, p: DiaryPart): Character {
  const { diary: _old, ...rest } = c;
  return { ...rest, ...(p.diary ? { diary: p.diary } : {}), journal: p.journal ?? [], notes: p.notes ?? '' } as Character;
}

/** Snapshot antigo, ainda com o diário dentro (gravado antes da mudança ou por um app desatualizado). */
export function hasLegacyDiary(snapshot: Partial<Character> | null | undefined): boolean {
  return !!snapshot && (snapshot.diary !== undefined || (snapshot.journal?.length ?? 0) > 0 || !!snapshot.notes?.trim());
}

export function isEmptyDiaryPart(p: DiaryPart): boolean {
  const d = p.diary;
  return !p.journal.length && !p.notes.trim() && (!d || (!d.notes.length && !d.quests.length && !d.clues.length && !Object.keys(d.people ?? {}).length));
}

export const sameDiary = (a: DiaryPart, b: DiaryPart) => JSON.stringify(a) === JSON.stringify(b);

/**
 * O diário que vale para uma ficha da nuvem: a linha privada da mesma versão
 * (ou mais nova); senão o que um snapshot antigo ainda carrega; senão a
 * linha privada que houver (o envio do diário falhou depois do da ficha).
 */
export function cloudDiaryFor(row: Pick<SheetRow, 'snapshot' | 'updated_at'>, d?: DiaryRow): DiaryPart {
  if (d && d.updated_at >= row.updated_at) return d.data;
  if (hasLegacyDiary(row.snapshot)) return diaryPartOf(row.snapshot);
  return d?.data ?? { journal: [], notes: '' };
}

/** A tabela ainda não existe no banco (SQL não rodou). */
const missingTable = (e: { code?: string; message?: string }) => e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table/i.test(e.message ?? '');

export const diaryCloud = {
  /** Diários do usuário por ficha. `null` = sem a tabela privada (o diário segue dentro da ficha). */
  async pull(userId: string): Promise<Map<string, DiaryRow> | null> {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.from('sheet_diaries').select('sheet_id, user_id, data, updated_at').eq('user_id', userId);
    if (error) {
      if (missingTable(error)) return null;
      throw new Error(error.message);
    }
    return new Map(((data ?? []) as DiaryRow[]).map((r) => [r.sheet_id, r]));
  },

  /** Grava o diário com a versão da ficha que acabou de subir. */
  async push(char: Character, userId: string, version: number): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;
    const row: DiaryRow = { sheet_id: char.id, user_id: userId, data: diaryPartOf(char), updated_at: version };
    const { error } = await sb.from('sheet_diaries').upsert(row, { onConflict: 'sheet_id' });
    if (error) throw new Error(error.message);
  },
};
