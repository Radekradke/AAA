import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_ALL, nativeMode, resolveTheme } from '@/data/themes';
import { contrastRatio } from '@/lib/contrast';
import type { ThemeMode, ThemeName } from '@/types/dnd';

/**
 * Tokens do design system (etapa 2.1): contraste AA em todos os temas e
 * modos, e escalas no tamanho combinado (docs/DESIGN-TOKENS.md).
 */
const dir = resolve(__dirname, '..');
const tokens = readFileSync(resolve(dir, 'tokens.css'), 'utf8');
const FILES: Record<ThemeName, string> = { astral: 'astral', frio: 'noite', brasa: 'forja', verdejante: 'bosque', carmesim: 'corte', ouro: 'ouro', eclipse: 'eclipse', rubra: 'rubra', orfeu: 'orfeu', artemis: 'artemis' };
const themeCss = (t: ThemeName) => readFileSync(resolve(dir, 'themes', `${FILES[t]}.css`), 'utf8') + readFileSync(resolve(dir, 'themes', 'modes.css'), 'utf8');

/** Variáveis do bloco exato `[data-theme='x']` (ou `…[data-mode='m']`). */
function block(css: string, theme: ThemeName, mode?: ThemeMode): Record<string, string> {
  const sel = mode ? `[data-theme='${theme}'][data-mode='${mode}']` : `[data-theme='${theme}']`;
  const out: Record<string, string> = {};
  let from = 0;
  for (;;) {
    const i = css.indexOf(sel + ' {', from);
    if (i < 0) break;
    const body = css.slice(i + sel.length + 2, css.indexOf('\n}', i));
    for (const m of body.matchAll(/--([a-zA-Z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
    from = i + 1;
  }
  return out;
}

const hex = (v: string | undefined) => (v && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : undefined);

describe('contraste AA em todos os temas e modos', () => {
  for (const t of THEME_ALL) {
    for (const mode of ['dark', 'light'] as const) {
      it(`${t} · ${mode}`, () => {
        const p = resolveTheme(t, mode);
        const css = themeCss(t);
        const vars = mode === nativeMode(t) ? block(css, t) : { ...block(css, t), ...block(css, t, mode) };
        const onAcc = hex(vars['on-acc']) ?? p.bg; // mesmo recuo de --color-on-accent
        const onGold = hex(vars['on-gold']) ?? p.bg; // mesmo recuo de --color-on-metal
        const checks: [string, string, string, number][] = [
          // texto: 4,5:1
          ['texto / fundo', p.ink, p.bg, 4.5],
          ['texto / superfície', p.ink, p.panel, 4.5],
          ['texto apagado / fundo', p.muted, p.bg, 4.5],
          ['texto apagado / superfície', p.muted, p.panel, 4.5],
          ['texto apagado / superfície 2', p.muted, p.panel2, 4.5],
          ['texto no botão de ação', onAcc, p.acc, 4.5],
          ['texto no botão metal', onGold, p.gold, 4.5],
          // peças de interface: 3:1
          ['ação / superfície', p.acc, p.panel, 3],
          ['metal / superfície', p.gold, p.panel, 3],
          ['perigo / superfície', p.danger, p.panel, 3],
        ];
        const low = checks.map(([n, a, b, min]) => ({ n, r: Math.round(contrastRatio(a, b) * 100) / 100, min })).filter((c) => c.r < c.min);
        expect(low).toEqual([]);
      });
    }
  }
});

describe('escalas', () => {
  const names = (prefix: string) => [...tokens.matchAll(new RegExp(`--(${prefix}-[a-z0-9]+):`, 'g'))].map((m) => m[1]);
  it('7 tamanhos de texto, crescentes', () => {
    const sizes = names('text').map((n) => Number(new RegExp(`--${n}:\\s*([0-9.]+)px`).exec(tokens)?.[1]));
    expect(sizes).toHaveLength(7);
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
  });
  it('espaço em passos de 4 px', () => {
    const px = names('space').map((n) => Number(new RegExp(`--${n}:\\s*([0-9.]+)`).exec(tokens)?.[1]));
    expect(px.every((v) => v % 4 === 0)).toBe(true);
  });
  it('cores por papel só apontam para variáveis da paleta', () => {
    const roles = [...tokens.matchAll(/--(color-[a-z0-9-]+):\s*([^;]+);/g)];
    expect(roles.length).toBeGreaterThanOrEqual(15);
    for (const [, name, value] of roles) expect(value, name).toMatch(/^var\(--/);
  });
});
