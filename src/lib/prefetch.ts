/**
 * Pré-carrega, com o aparelho ocioso, o pedaço da próxima tela provável —
 * assim tocar num herói não espera baixar a ficha (~88 KB) só depois do toque.
 * Mesmos `import()` do App.tsx: o Vite entrega o mesmo arquivo (fica em cache).
 * Não faz nada com economia de dados ligada ou rede 2G.
 */
const LOADERS = {
  sheet: () => import('@/pages/CharacterSheet'),
  creator: () => import('@/pages/CharacterCreator'),
  heroes: () => import('@/pages/CharacterSelect'),
} as const;

export type PrefetchKey = keyof typeof LOADERS;

const done = new Set<PrefetchKey>();

function slowNetwork(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType ?? ''));
}

export function prefetchOnIdle(...keys: PrefetchKey[]): () => void {
  if (typeof window === 'undefined' || slowNetwork()) return () => undefined;
  const run = () => {
    for (const k of keys) {
      if (done.has(k)) continue;
      done.add(k);
      LOADERS[k]().catch(() => done.delete(k)); // offline: tenta de novo na próxima
    }
  };
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(run, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(run, 1500);
  return () => clearTimeout(id);
}
