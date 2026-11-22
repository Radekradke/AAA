/**
 * O celular dormiu, a aba ficou em segundo plano ou a internet caiu: o
 * WebSocket do Realtime pode ter morrido em silêncio e as mudanças desse
 * intervalo não chegam sozinhas. Ao voltar (aba visível de novo ou rede de
 * volta), quem assina refaz a leitura completa. Intervalo mínimo entre
 * chamadas para não repetir quando os dois sinais chegam juntos.
 */
export function onWake(fn: () => void, minGapMs = 2500): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;
  let last = 0;
  const fire = () => {
    const now = Date.now();
    if (now - last < minGapMs) return;
    last = now;
    fn();
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') fire();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', fire);
  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', fire);
  };
}
