import { useEffect } from 'react';

/**
 * Tela sempre acesa (Screen Wake Lock) enquanto `on`: na mesa ao vivo o
 * celular fica em cima da mesa e não pode apagar no meio do combate.
 * O navegador solta a trava quando a aba some; ao voltar, pedimos de novo.
 * Sem suporte (Safari antigo, Firefox) ou sem permissão: não faz nada.
 */
interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}
type WakeLockNav = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };

export const wakeLockSupported = () => typeof navigator !== 'undefined' && !!(navigator as WakeLockNav).wakeLock;

export function useWakeLock(on: boolean) {
  useEffect(() => {
    const wl = (navigator as WakeLockNav).wakeLock;
    if (!on || !wl) return;
    let lock: WakeLockSentinelLike | null = null;
    let alive = true;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        const l = await wl.request('screen');
        if (alive) lock = l;
        else void l.release();
      } catch {
        // bateria fraca, aba em segundo plano ou política do navegador: segue sem
      }
    };
    const onVisible = () => void acquire();
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      if (lock && !lock.released) void lock.release().catch(() => {});
    };
  }, [on]);
}
