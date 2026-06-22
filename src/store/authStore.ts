import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/character';

interface StoredAccount {
  id: string;
  name: string;
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  /** Contas locais cadastradas (apenas para demonstração — sem segurança real). */
  accounts: StoredAccount[];
  register: (name: string, email: string, password: string) => { ok: boolean; error?: string };
  login: (email: string, password: string) => { ok: boolean; error?: string };
  loginAsGuest: () => void;
  logout: () => void;
}

let _seq = 0;
function userId(): string {
  _seq += 1;
  return `u${Date.now().toString(36)}${_seq}`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accounts: [],

      register(name, email, password) {
        const cleanEmail = email.trim().toLowerCase();
        if (!name.trim()) return { ok: false, error: 'Informe um nome.' };
        if (!cleanEmail) return { ok: false, error: 'Informe um e-mail.' };
        if (password.length < 4) return { ok: false, error: 'A senha precisa de ao menos 4 caracteres.' };
        if (get().accounts.some((a) => a.email === cleanEmail)) {
          return { ok: false, error: 'Já existe uma conta com este e-mail.' };
        }
        const account: StoredAccount = { id: userId(), name: name.trim(), email: cleanEmail, password };
        set((s) => ({
          accounts: [...s.accounts, account],
          user: { id: account.id, name: account.name, email: account.email, guest: false },
        }));
        return { ok: true };
      },

      login(email, password) {
        const cleanEmail = email.trim().toLowerCase();
        const account = get().accounts.find((a) => a.email === cleanEmail);
        if (!account || account.password !== password) {
          return { ok: false, error: 'E-mail ou senha incorretos.' };
        }
        set({ user: { id: account.id, name: account.name, email: account.email, guest: false } });
        return { ok: true };
      },

      loginAsGuest() {
        set({ user: { id: 'guest', name: 'Convidado', email: null, guest: true } });
      },

      logout() {
        set({ user: null });
      },
    }),
    { name: 'fv-auth' },
  ),
);
