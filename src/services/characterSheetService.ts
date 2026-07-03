import { getSupabase } from './supabaseClient';
import type { Character } from '@/types/character';
import type { SheetRow } from '@/types/models';

/**
 * CRUD de fichas na nuvem (tabela `sheets`, ver docs/SUPABASE.md).
 * A ficha inteira (Character) vai no campo JSONB `snapshot` — snapshot
 * completo do personagem: PV atual, inventário, equipados, magias e
 * slots gastos, evolução, recursos, condições, diário e anotações.
 * Campos normalizados (nome/classe/nível) existem só para listagem/busca.
 */
export function toRow(char: Character, userId: string): Omit<SheetRow, 'created_at'> & { created_at?: number } {
  return {
    id: char.id,
    user_id: userId,
    title: char.name,
    character_name: char.name,
    class_id: char.classId,
    race_id: char.raceId,
    level: char.level,
    sheet_version: char.schema ?? 3,
    snapshot: char,
    created_at: char.createdAt,
    updated_at: char.updatedAt,
    last_played_at: char.updatedAt,
  };
}

export function fromRow(row: SheetRow, localOwnerId: string): Character {
  // o snapshot é a fonte de verdade; ownerId local acompanha o usuário logado
  return { ...row.snapshot, ownerId: localOwnerId, updatedAt: row.updated_at };
}

export const characterSheetService = {
  async pullSheets(userId: string): Promise<SheetRow[]> {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb.from('sheets').select('*').eq('user_id', userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as SheetRow[];
  },

  async pushSheet(char: Character, userId: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('sheets').upsert(toRow(char, userId), { onConflict: 'id' });
    if (error) throw new Error(error.message);
  },

  async deleteSheet(sheetId: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('sheets').delete().eq('id', sheetId);
    if (error) throw new Error(error.message);
  },
};
