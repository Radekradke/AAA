import { describe, expect, it } from 'vitest';
import { contrastRatio, readableOn } from '../contrast';
import { ABILITY_COLORS } from '@/data/skills';
import { THEME_ORDER, resolveTheme } from '@/data/themes';

/** As cores fixas do app (atributos, PV, cura) ficam legíveis (AA) no painel de todo tema/modo. */
describe('readableOn', () => {
  const fixed = [...Object.values(ABILITY_COLORS), '#3FC56B', '#E0A93E', '#FF4D3A'];
  for (const name of THEME_ORDER) {
    for (const mode of ['dark', 'light'] as const) {
      it(`${name} · ${mode}`, () => {
        const t = resolveTheme(name, mode);
        for (const c of fixed) {
          const out = readableOn(c, t.panel);
          expect([c, contrastRatio(out, t.panel) >= 4.5]).toEqual([c, true]);
        }
      });
    }
  }

  it('cor que já passa não muda; variável CSS volta como veio', () => {
    expect(readableOn('#FFFFFF', '#000000')).toBe('#FFFFFF');
    expect(readableOn('var(--acc)', '#ffffff')).toBe('var(--acc)');
  });

  it('mantém o tom: verde continua verde', () => {
    const g = readableOn('#3FC56B', '#F6F2FF');
    const [r, gg, b] = [1, 3, 5].map((i) => parseInt(g.slice(i, i + 2), 16));
    expect(gg).toBeGreaterThan(r);
    expect(gg).toBeGreaterThan(b);
  });
});
