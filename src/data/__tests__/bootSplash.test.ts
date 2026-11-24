import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_ALL, THEME_ORDER, resolveTheme, visibleTheme } from '../themes';

/**
 * A tela de abertura (index.html) pinta com as cores do tema salvo antes do
 * JS carregar — por isso guarda uma cópia das paletas. Este teste garante que
 * a cópia acompanha src/data/themes.ts.
 */
const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8');
const BOOT = JSON.parse(html.match(/var BOOT = (\{.*?\});/)![1]) as Record<string, Record<string, string[]>>;

describe('tela de abertura: cores iguais às dos temas', () => {
  for (const t of THEME_ALL) {
    for (const m of ['dark', 'light'] as const) {
      it(`${t} · ${m}`, () => {
        const p = resolveTheme(t, m);
        expect(BOOT[t]?.[m]).toEqual([p.bg, p.bg2, p.gold, p.ink]);
      });
    }
  }
});

describe('temas oferecidos', () => {
  it('a tela de abertura usa a mesma lista de temas visíveis do app', () => {
    const visiveis = JSON.parse(html.match(/var VISIVEIS = (\[.*?\]);/)![1]) as string[];
    expect(visiveis).toEqual(THEME_ORDER);
  });

  it('tema escondido (ou desconhecido) salvo antes abre no Véu Astral', () => {
    for (const t of THEME_ALL) expect(visibleTheme(t)).toBe(THEME_ORDER.includes(t) ? t : 'astral');
    expect(visibleTheme('nada')).toBe('astral');
    expect(visibleTheme(undefined)).toBe('astral');
  });
});
