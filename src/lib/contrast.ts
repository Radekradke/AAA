import { useCallback } from 'react';
import { useTheme } from './useTheme';

/**
 * Contraste legível (WCAG AA) para cores que vêm do código — verde da cura,
 * cor de cada atributo, cor do PV. As paletas dos temas já passam no AA; o
 * problema são essas cores fixas, pensadas para fundo escuro, que somem no
 * modo claro. Aqui a cor mantém o tom (matiz e saturação em OKLCH) e só a
 * luminosidade anda até ficar legível sobre o fundo.
 */

type RGB = [number, number, number];

function parseHex(c: string): RGB | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

const toHex = (c: RGB) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratioRGB(a: RGB, b: RGB): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Razão de contraste WCAG entre duas cores hex (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const x = parseHex(a);
  const y = parseHex(b);
  return x && y ? ratioRGB(x, y) : 21;
}

// sRGB ↔ OKLCH (Björn Ottosson)
const lin = (v: number) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const gam = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function toOklch([R, G, B]: RGB): [number, number, number] {
  const r = lin(R), g = lin(G), b = lin(B);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, Bb), Math.atan2(Bb, A)];
}

function fromOklch([L, C, H]: [number, number, number]): RGB {
  const A = C * Math.cos(H), B = C * Math.sin(H);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const inGamut = (c: RGB) => c.every((v) => v >= -0.5 && v <= 255.5);
const cache = new Map<string, string>();

/**
 * A mesma cor, legível sobre `bg` (mínimo AA = 4,5:1; usamos 4,6 de folga).
 * Fundo claro → escurece; fundo escuro → clareia. Cores não-hex (variáveis
 * CSS) voltam como vieram: essas já são tokens do tema.
 */
export function readableOn(fg: string, bg: string, min = 4.6): string {
  const key = `${fg}|${bg}|${min}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const f = parseHex(fg);
  const b = parseHex(bg);
  if (!f || !b) return fg;
  if (ratioRGB(f, b) >= min) {
    cache.set(key, fg);
    return fg;
  }
  const darken = luminance(b) > 0.18;
  let [L, C, H] = toOklch(f);
  let out: RGB = f;
  for (let i = 0; i < 200 && ratioRGB(out, b) < min; i++) {
    L = Math.max(0, Math.min(1, L + (darken ? -0.01 : 0.01)));
    let c = C;
    let rgb = fromOklch([L, c, H]);
    while (!inGamut(rgb) && c > 0) {
      c -= 0.01;
      rgb = fromOklch([L, c, H]);
    }
    out = rgb.map((v) => Math.max(0, Math.min(255, v))) as RGB;
  }
  const res = toHex(out);
  cache.set(key, res);
  return res;
}

/**
 * `ink(cor)` → a cor legível sobre o painel do tema atual (claro ou escuro).
 * Padrão 5,6:1 (não 4,5): o texto quase sempre fica sobre um fundo levemente
 * tingido da própria cor, que come um pouco do contraste.
 */
export function useInk(): (color: string, min?: number) => string {
  const t = useTheme();
  return useCallback((color: string, min = 5.6) => readableOn(color, t.panel, min), [t.panel]);
}
