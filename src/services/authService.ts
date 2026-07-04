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

function mapSupabaseUser(user: { id: string; email?: string | null; user_metadata?: unknown }): User {
  const meta = user.user_metadata as { name?: string; full_name?: string } | undefined;
  return mapUser(user.id, user.email ?? null, meta?.name ?? meta?.full_name);
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

  /** Login social: redireciona ao Google; a sessão volta na rota de callback. */
  async signInWithGoogle(redirectTo: string): Promise<AuthResult> {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: 'Nuvem não configurada.' };
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) return { ok: false, error: translate(error.message) };
    return { ok: true };
  },

  async completeOAuthSignIn(callbackUrl: string): Promise<AuthResult> {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: 'Nuvem não configurada.' };

    const url = new URL(callbackUrl);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const oauthError =
      url.searchParams.get('error_description') ??
      url.searchParams.get('error') ??
      hashParams.get('error_description') ??
      hashParams.get('error');
    if (oauthError) return { ok: false, error: oauthError };

    const code = url.searchParams.get('code');
    if (code) {
      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      // Não abortamos no erro: o `code` pode já ter sido consumido (outra
      // aba, refresh) mesmo com a sessão válida — caímos no currentUser abaixo.
      if (!error) {
        const u = data.user ?? data.session?.user;
        if (u) return { ok: true, user: mapSupabaseUser(u) };
      }
    }

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data, error } = await sb.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!error) {
        const u = data.user ?? data.session?.user;
        if (u) return { ok: true, user: mapSupabaseUser(u) };
      }
    }

    const user = await authService.currentUser();
    if (!user) return { ok: false, error: 'Nao foi possivel concluir o login com Google.' };
    return { ok: true, user };
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
    return mapSupabaseUser(u);
  },
};

function translate(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/already registered/i.test(msg)) return 'Já existe uma conta com este e-mail.';
  if (/password/i.test(msg)) return 'A senha precisa de ao menos 6 caracteres.';
  return msg;
}
