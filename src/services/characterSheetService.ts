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

  /**
   * Sobe a ficha. Com `base` (a versão da nuvem que este aparelho conhece),
   * a gravação é condicional: só escreve se a nuvem ainda estiver nela —
   * se outro aparelho subiu antes, devolve false (conflito) em vez de
   * sobrescrever. `base` null = a ficha ainda não existe na nuvem.
   * Sem `base` (escolha explícita do usuário): grava por cima.
   */
  async pushSheet(char: Character, userId: string, base?: number | null): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return true;
    const row = toRow(char, userId);
    if (base === undefined) {
      const { error } = await sb.from('sheets').upsert(row, { onConflict: 'id' });
      if (error) throw new Error(error.message);
      return true;
    }
    if (base === null) {
      const { error } = await sb.from('sheets').insert(row);
      if (error?.code === '23505') return false; // outro aparelho criou primeiro
      if (error) throw new Error(error.message);
      return true;
    }
    const { data, error } = await sb.from('sheets').update(row).eq('id', char.id).eq('updated_at', base).select('id');
    if (error) throw new Error(error.message);
    return (data ?? []).length > 0;
  },

  async deleteSheet(sheetId: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('sheets').delete().eq('id', sheetId);
    if (error) throw new Error(error.message);
  },
};
