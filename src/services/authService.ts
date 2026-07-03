import { getSupabase, cloudEnabled } from './supabaseClient';
import type { User } from '@/types/character';

/**
 * Autenticação unificada. Com Supabase configurado, usa Supabase Auth
 * (senhas nunca passam pelo nosso código além do submit). Sem nuvem,
 * o app continua com contas locais/convidado do authStore.
 */
export interface AuthResult {
  ok: boolean;
  user?: User;
  error?: string;
}

function mapUser(id: string, email: string | null, name?: string): User {
  return { id, name: name || email?.split('@')[0] || 'Aventureiro', email, guest: false };
}

export const authService = {
  cloudEnabled,

  async signUp(name: string, email: string, password: string): Promise<AuthResult> {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: 'Nuvem não configurada.' };
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
    if (error) return { ok: false, error: translate(error.message) };
    if (!data.user) return { ok: false, error: 'Confirme o e-mail para ativar a conta.' };
    return { ok: true, user: mapUser(data.user.id, data.user.email ?? email, name) };
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: 'Nuvem não configurada.' };
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: translate(error.message) };
    const meta = data.user.user_metadata as { name?: string };
    return { ok: true, user: mapUser(data.user.id, data.user.email ?? email, meta?.name) };
  },

  async signOut(): Promise<void> {
    await getSupabase()?.auth.signOut();
  },

  /** Sessão persistida pelo Supabase (retorna o usuário logado, se houver). */
  async currentUser(): Promise<User | null> {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    const u = data.session?.user;
    if (!u) return null;
    const meta = u.user_metadata as { name?: string };
    return mapUser(u.id, u.email ?? null, meta?.name);
  },
};

function translate(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/already registered/i.test(msg)) return 'Já existe uma conta com este e-mail.';
  if (/password/i.test(msg)) return 'A senha precisa de ao menos 6 caracteres.';
  return msg;
}
