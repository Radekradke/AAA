import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_ORDER, resolveTheme } from '../themes';

/**
 * A tela de abertura (index.html) pinta com as cores do tema salvo antes do
 * JS carregar — por isso guarda uma cópia das paletas. Este teste garante que
 * a cópia acompanha src/data/themes.ts.
 */
const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8');
const BOOT = JSON.parse(html.match(/var BOOT = (\{.*?\});/)![1]) as Record<string, Record<string, string[]>>;

describe('tela de abertura: cores iguais às dos temas', () => {
  for (const t of THEME_ORDER) {
    for (const m of ['dark', 'light'] as const) {
      it(`${t} · ${m}`, () => {
        const p = resolveTheme(t, m);
        expect(BOOT[t]?.[m]).toEqual([p.bg, p.bg2, p.gold, p.ink]);
      });
    }
  }
});
