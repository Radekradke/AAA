import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_PRELOAD } from '../themePreload';

const root = resolve(__dirname, '../../..');
const themeCss = readFileSync(resolve(root, 'src/lib/themeCss.ts'), 'utf8');
const fonts = readFileSync(resolve(root, 'src/styles/fonts.ts'), 'utf8');

describe('pré-carga do tema na abertura', () => {
  it('cobre os mesmos temas que o themeCss, com o mesmo arquivo de CSS', () => {
    const imported = Object.fromEntries([...themeCss.matchAll(/^import (\w+) from '@\/styles\/themes\/(\w+)\.css\?url';/gm)].map((m) => [m[1], m[2]]));
    expect(Object.keys(THEME_PRELOAD).sort()).toEqual(Object.keys(imported).sort());
    for (const [theme, [css]] of Object.entries(THEME_PRELOAD)) expect(css, theme).toBe(imported[theme]);
  });

  it('a fonte do título existe no @fontsource e entra pelo fonts.ts', () => {
    for (const [theme, [, font]] of Object.entries(THEME_PRELOAD)) {
      const m = /^(.+)-latin-(\d+)-normal$/.exec(font);
      expect(m, `${theme}: ${font}`).toBeTruthy();
      const [, family, weight] = m!;
      expect(existsSync(resolve(root, `node_modules/@fontsource/${family}/files/${font}.woff2`)), `${font}.woff2`).toBe(true);
      expect(fonts, `fonts.ts não importa ${family} ${weight}`).toContain(`'@fontsource/${family}/latin-${weight}.css'`);
    }
  });

  it('o index.html tem o marcador que o build preenche', () => {
    expect(readFileSync(resolve(root, 'index.html'), 'utf8')).toContain('var PRE = /*FV_PRELOAD*/{};');
  });
});
