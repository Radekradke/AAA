import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase (nuvem). Configurado por variáveis de ambiente —
 * apenas a chave pública (anon) vive no front; a segurança por usuário
 * é garantida por Row Level Security no banco (ver docs/SUPABASE.md).
 * Sem as variáveis, o app roda 100% offline-first sem erro.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function cloudEnabled(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient | null {
  if (!cloudEnabled()) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        // sessão persistida entre visitas + refresh automático do token
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
        // A rota /auth/callback troca o `code` manualmente (authService).
        // Sem isto, o cliente ALSO tenta trocar sozinho e disputa o mesmo
        // `code` de uso único (race) — o perdedor falha com erro e o login
        // com Google não conclui. Desligar deixa a troca manual ser a única.
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
