import { getSupabase } from './supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import type { User } from '@/types/character';

/**
 * Tutorial por CONTA: quem entra com conta da nuvem vê o tutorial (e os
 * tours) só na primeira vez — em qualquer aparelho. O que já foi visto e a
 * escolha "desligar dicas" ficam nos metadados do usuário no Supabase Auth
 * (`user_metadata.fv_onboarding`): não precisa de tabela nem de SQL.
 * Convidado e contas locais continuam valendo só para o aparelho.
 */
const KEY = 'fv_onboarding';

type Tours = ReturnType<typeof useUiStore.getState>['toursSeen'];
export interface AccountOnboarding {
  done?: boolean;
  tours?: Tours;
  off?: boolean;
}

/** Conta da nuvem (id UUID do Supabase); contas locais usam ids "u…". */
const isCloudAccount = (u: User | null): u is User => !!u && !u.guest && !!getSupabase() && /^[0-9a-f-]{36}$/i.test(u.id);

const snapshot = (): AccountOnboarding => {
  const s = useUiStore.getState();
  return { done: s.onboarded, tours: s.toursSeen, off: s.tipsOff };
};
const same = (a: AccountOnboarding | null, b: AccountOnboarding) =>
  !!a && !!a.done === !!b.done && !!a.off === !!b.off && JSON.stringify(a.tours ?? {}) === JSON.stringify(b.tours ?? {});

let ready: Promise<boolean> = Promise.resolve(true);
let readyFor: string | null = null;
let remote: AccountOnboarding | null = null;

async function pull(userId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user || data.user.id !== userId) return false;
  remote = (data.user.user_metadata?.[KEY] as AccountOnboarding | undefined) ?? {};
  useUiStore.getState().mergeOnboarding(remote);
  // o aparelho já tinha visto algo que a conta não sabia: grava na conta
  push();
  return true;
}

let timer: ReturnType<typeof setTimeout> | null = null;
function push() {
  const user = useAuthStore.getState().user;
  if (!isCloudAccount(user) || readyFor !== user.id || remote === null) return;
  const next = snapshot();
  if (same(remote, next)) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    remote = next;
    void getSupabase()?.auth.updateUser({ data: { [KEY]: next } }).catch(() => {
      remote = null; // tenta de novo no próximo login
    });
  }, 600);
}

function onUser(user: User | null) {
  if (!isCloudAccount(user)) {
    readyFor = null;
    remote = null;
    ready = Promise.resolve(true);
    return;
  }
  if (readyFor === user.id) return;
  readyFor = user.id;
  remote = null;
  ready = pull(user.id).catch(() => false);
}

/**
 * Espera saber o que a conta já viu antes de abrir algo sozinho.
 * true = pode decidir (convidado, conta local ou conta lida);
 * false = não deu para ler a conta (sem rede) — melhor não abrir.
 */
export function onboardingReady(): Promise<boolean> {
  return ready;
}

/** Liga a sincronização (uma vez, no App). */
export function startOnboardingSync(): () => void {
  onUser(useAuthStore.getState().user);
  const offAuth = useAuthStore.subscribe((s, prev) => {
    if (s.user?.id !== prev.user?.id || s.user?.guest !== prev.user?.guest) onUser(s.user);
  });
  const offUi = useUiStore.subscribe((s, prev) => {
    if (s.onboarded !== prev.onboarded || s.toursSeen !== prev.toursSeen || s.tipsOff !== prev.tipsOff) push();
  });
  return () => {
    offAuth();
    offUi();
  };
}

/** Pode abrir tutorial/tour sozinho agora? (dicas ligadas e conta conferida) */
export async function mayAutoShow(seen: (ui: ReturnType<typeof useUiStore.getState>) => boolean): Promise<boolean> {
  const ok = await onboardingReady();
  const ui = useUiStore.getState();
  return ok && !ui.tipsOff && !seen(ui) && !ui.tour && !ui.tutorialOpen;
}
