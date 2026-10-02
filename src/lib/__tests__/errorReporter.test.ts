import { beforeEach, describe, expect, it, vi } from 'vitest';

// ambiente node: um localStorage de mentira e sem nuvem
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});
vi.stubGlobal('location', { pathname: '/ficha/x' });
vi.stubGlobal('navigator', { userAgent: 'teste' });
vi.mock('@/services/supabaseClient', () => ({ getSupabase: () => null }));

const { reportError, recentErrors, clearErrors, isNoise, isChunkLoadError, errorReport } = await import('../errorReporter');

describe('captador de erros', () => {
  beforeEach(() => clearErrors());

  it('registra o erro com tela, tipo e pilha curta', () => {
    reportError(new Error('quebrou'), { kind: 'render', scope: '/ficha/x' });
    const [e] = recentErrors();
    expect(e).toMatchObject({ message: 'quebrou', kind: 'render', where: '/ficha/x', count: 1 });
  });

  it('o mesmo erro repetido vira contador, não spam', () => {
    reportError(new Error('de novo'));
    reportError(new Error('de novo'));
    reportError(new Error('de novo'));
    expect(recentErrors()).toHaveLength(1);
    expect(recentErrors()[0].count).toBe(3);
  });

  it('ignora ruído de navegador e extensões', () => {
    expect(isNoise('ResizeObserver loop completed with undelivered notifications.')).toBe(true);
    expect(isNoise('Script error.')).toBe(true);
    expect(isNoise('x', 'at chrome-extension://abc/x.js')).toBe(true);
    expect(reportError('ResizeObserver loop limit exceeded')).toBeNull();
    expect(recentErrors()).toHaveLength(0);
  });

  it('reconhece pedaço de código antigo depois de uma atualização', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /static/x.js'))).toBe(true);
    expect(isChunkLoadError(new Error('outra coisa'))).toBe(false);
  });

  it('guarda no máximo 30 e monta um relatório legível', () => {
    for (let i = 0; i < 40; i++) reportError(new Error('erro ' + i));
    expect(recentErrors()).toHaveLength(30);
    expect(errorReport()).toContain('Ficha Viva — relatório de erros');
  });
});
