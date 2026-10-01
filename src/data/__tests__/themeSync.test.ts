import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEMES, THEME_ALT, THEME_ORDER, nativeMode, resolveTheme } from '../themes';
import type { ThemeMode, ThemeName } from '@/types/dnd';

/**
 * As cores do tema existem em dois lugares: o CSS (variáveis, que pintam a
 * tela) e o JS (estilos inline, prévias do seletor). Este teste garante que
 * os dois contam a mesma história em cada tema e em cada modo.
 */
const css = ['globals.css', 'themes/astral.css', 'themes/noite.css', 'themes/forja.css', 'themes/bosque.css', 'themes/corte.css', 'themes/modes.css']
  .map((f) => readFileSync(resolve(__dirname, '../../styles', f), 'utf8'))
  .join('\n');

/** Variáveis declaradas exatamente no bloco `[data-theme='x']` (ou `[data-theme='x'][data-mode='m']`). */
function block(theme: ThemeName, mode?: ThemeMode): Record<string, string> {
  const sel = mode ? `[data-theme='${theme}'][data-mode='${mode}']` : `[data-theme='${theme}']`;
  const out: Record<string, string> = {};
  let from = 0;
  for (;;) {
    const i = css.indexOf(sel + ' {', from);
    if (i < 0) break;
    const body = css.slice(i + sel.length + 2, css.indexOf('\n}', i));
    for (const m of body.matchAll(/--([a-zA-Z0-9]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
    from = i + 1;
  }
  return out;
}

const norm = (v: string) => v.toLowerCase().replace(/\s+/g, '');
const KEYS = ['bg', 'bg2', 'panel', 'panel2', 'steel', 'line', 'acc', 'acc2', 'gold', 'goldB', 'ink', 'muted', 'danger'] as const;

describe('paletas: JS e CSS iguais', () => {
  for (const name of THEME_ORDER) {
    for (const mode of ['dark', 'light'] as const) {
      it(`${name} · ${mode}`, () => {
        const native = mode === nativeMode(name);
        const vars = native ? block(name) : { ...block(name), ...block(name, mode) };
        const js = resolveTheme(name, mode);
        for (const k of KEYS) expect([k, norm(vars[k] ?? '?')]).toEqual([k, norm(js[k])]);
      });
    }
  }

  it('cada tema tem as duas paletas e o modo de nascença certo', () => {
    for (const name of THEME_ORDER) {
      expect(THEMES[name]).toBeTruthy();
      expect(THEME_ALT[name]).toBeTruthy();
    }
    expect(nativeMode('eclipse')).toBe('light');
    expect(nativeMode('astral')).toBe('dark');
    expect(resolveTheme('astral', 'light').light).toBe(true);
    expect(resolveTheme('eclipse', 'dark').light).toBe(false);
    expect(resolveTheme('brasa', 'light').label).toBe('Forja Dourada'); // a identidade não muda com o modo
  });
});
