/**
 * Versão do app: o commit do build (curto) e quando foi feito. O menu mostra
 * as duas e confere em /version.json se já existe uma mais nova no ar.
 */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev';
export const APP_BUILT_AT = import.meta.env.VITE_APP_BUILT_AT ?? '';

/** "10/10/2026 12:25" — vazio sem data de build (modo de desenvolvimento). */
export function builtAtLabel(iso: string = APP_BUILT_AT): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d).replace(',', '');
}

export type VersionState = 'checking' | 'current' | 'outdated' | 'unknown';

/**
 * Compara com a versão no ar. `unknown` = sem internet, sem o arquivo (dev)
 * ou resposta estranha: nunca diz "desatualizado" sem ter certeza.
 */
export async function checkLatest(fetcher: typeof fetch = fetch): Promise<VersionState> {
  try {
    const res = await fetcher(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return 'unknown';
    const live = (await res.json()) as { version?: unknown };
    if (typeof live.version !== 'string' || !live.version) return 'unknown';
    return live.version === APP_VERSION ? 'current' : 'outdated';
  } catch {
    return 'unknown';
  }
}

/**
 * Atualiza agora: pede ao service worker a versão nova e recarrega quando ela
 * assumir. Sem service worker (navegador comum), recarrega direto.
 */
export async function updateNow(): Promise<void> {
  const reload = () => window.location.reload();
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (!reg) return reload();
  await reg.update().catch(() => undefined);
  const waiting = reg.waiting ?? (await waitForInstalled(reg));
  if (!waiting) return reload();
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
  waiting.postMessage({ type: 'SKIP_WAITING' });
  // se o navegador não trocar em 4 s, recarrega mesmo assim
  setTimeout(reload, 4000);
}

/** Espera o worker novo terminar de baixar (até 8 s). */
function waitForInstalled(reg: ServiceWorkerRegistration): Promise<ServiceWorker | null> {
  const sw = reg.installing;
  if (!sw) return Promise.resolve(null);
  return new Promise((resolve) => {
    const done = () => resolve(reg.waiting ?? null);
    sw.addEventListener('statechange', () => sw.state === 'installed' && done());
    setTimeout(done, 8000);
  });
}
