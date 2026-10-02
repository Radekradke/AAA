import { getSupabase } from './supabaseClient';
import type { Character } from '@/types/character';

/**
 * Ficha compartilhada por link (/f/<token>): só leitura, sem conta, a última
 * versão sincronizada. O dono cria e revoga (supabase/recursos_extras.sql).
 */
export interface SheetShare {
  token: string;
  sheetId: string;
  createdAt: number;
}

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** 24 caracteres aleatórios (~140 bits): impossível de adivinhar. */
export function newShareToken(): string {
  let out = '';
  while (out.length < 24) for (const b of crypto.getRandomValues(new Uint8Array(32))) if (b < 232 && out.length < 24) out += ALPHA[b % 58];
  return out;
}

export const shareUrl = (token: string) => `${window.location.origin}/f/${token}`;

function client() {
  const c = getSupabase();
  if (!c) throw new Error('Compartilhar precisa da nuvem configurada.');
  return c;
}

function friendly(message: string): Error {
  if (/sheet_shares|shared_sheet|does not exist|schema cache/i.test(message)) return new Error('O banco ainda não tem o compartilhamento: rode supabase/recursos_extras.sql no Supabase.');
  if (/row-level security|violates/i.test(message)) return new Error('A ficha ainda não está na nuvem. Espere sincronizar (selo "Nuvem em dia") e tente de novo.');
  return new Error(message);
}

export const shareService = {
  async list(sheetId: string): Promise<SheetShare[]> {
    const { data, error } = await client().from('sheet_shares').select('token, sheet_id, created_at').eq('sheet_id', sheetId).is('revoked_at', null).order('created_at', { ascending: false });
    if (error) throw friendly(error.message);
    return (data ?? []).map((r: { token: string; sheet_id: string; created_at: number }) => ({ token: r.token, sheetId: r.sheet_id, createdAt: Number(r.created_at) }));
  },

  async create(sheetId: string): Promise<SheetShare> {
    const token = newShareToken();
    const { error } = await client().from('sheet_shares').insert({ token, sheet_id: sheetId });
    if (error) throw friendly(error.message);
    return { token, sheetId, createdAt: Date.now() };
  },

  async revoke(token: string): Promise<void> {
    const { error } = await client().from('sheet_shares').update({ revoked_at: Date.now() }).eq('token', token);
    if (error) throw friendly(error.message);
  },

  /** Público: lê a ficha pelo token (null = link inválido ou revogado). */
  async get(token: string): Promise<{ char: Character; updatedAt: number } | null> {
    const { data, error } = await client().rpc('shared_sheet', { p_token: token });
    if (error) throw friendly(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.snapshot) return null;
    return { char: row.snapshot as Character, updatedAt: Number(row.updated_at) };
  },
};
