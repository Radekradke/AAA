import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/character';
import { authService } from '@/services/authService';

interface StoredAccount {
  id: string;
  name: string;
  email: string;
  /** Hash SHA-256 da senha (contas locais/offline; nunca em texto puro). */
  passwordHash: string;
  /** Campo legado (migrado para hash no primeiro login). */
  password?: string;
}

interface AuthState {
  user: User | null;
  /** Contas locais para o modo offline (sem nuvem). Com Supabase, use a nuvem. */
  accounts: StoredAccount[];
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** Sessão vinda da nuvem (Supabase Auth). */
  setUser: (user: User) => void;
  loginAsGuest: () => void;
  logout: () => void;
}

let _seq = 0;
function userId(): string {
  _seq += 1;
  return `u${Date.now().toString(36)}${_seq}`;
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accounts: [],

      async register(name, email, password) {
        const cleanEmail = email.trim().toLowerCase();
        if (!name.trim()) return { ok: false, error: 'Informe um nome.' };
        if (!cleanEmail) return { ok: false, error: 'Informe um e-mail.' };
        if (password.length < 4) return { ok: false, error: 'A senha precisa de ao menos 4 caracteres.' };
        if (get().accounts.some((a) => a.email === cleanEmail)) {
          return { ok: false, error: 'Já existe uma conta com este e-mail.' };
        }
        const account: StoredAccount = {
          id: userId(),
          name: name.trim(),
          email: cleanEmail,
          passwordHash: await sha256(password),
        };
        set((s) => ({
          accounts: [...s.accounts, account],
          user: { id: account.id, name: account.name, email: account.email, guest: false },
        }));
        return { ok: true };
      },

      async login(email, password) {
        const cleanEmail = email.trim().toLowerCase();
        const account = get().accounts.find((a) => a.email === cleanEmail);
        const hash = await sha256(password);
        // migra conta legada (senha em texto) para hash na primeira entrada
        const valid = account && (account.passwordHash === hash || account.password === password);
        if (!valid) return { ok: false, error: 'E-mail ou senha incorretos.' };
        if (account.password) {
          set((s) => ({
            accounts: s.accounts.map((a) =>
              a.id === account.id ? { id: a.id, name: a.name, email: a.email, passwordHash: hash } : a,
            ),
          }));
        }
        set({ user: { id: account.id, name: account.name, email: account.email, guest: false } });
        return { ok: true };
      },
    
      setUser(user) {
        set({ user });
      },

      loginAsGuest() {
        set({ user: { id: 'guest', name: 'Convidado', email: null, guest: true } });
      },

      logout() {
        void authService.signOut();
        set({ user: null });
      },
    }),
    { name: 'fv-auth' },
  ),
);
console.log("tste")


console.log("tste")