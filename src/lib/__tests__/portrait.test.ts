import { describe, it, expect } from 'vitest';
import { borderLightRatio, cutoutLightBackground } from '../portrait';

/** Imagem sintética: fundo branco, "personagem" escuro 30×30 no meio. */
function makeImage(w = 50, h = 50) {
  const d = new Uint8ClampedArray(w * h * 4);
  const set = (x: number, y: number, r: number, g: number, b: number) => {
    const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, 250, 250, 250);
  for (let y = 10; y < 40; y++) for (let x = 10; x < 40; x++) set(x, y, 40, 30, 60);
  return { d, w, h, set, alpha: (x: number, y: number) => d[(y * w + x) * 4 + 3] };
}

describe('recorte de fundo claro do retrato', () => {
  it('mede a borda clara', () => {
    const img = makeImage();
    expect(borderLightRatio(img.d, img.w, img.h)).toBe(1);
    for (let x = 0; x < img.w; x++) img.set(x, 0, 90, 20, 20);
    expect(borderLightRatio(img.d, img.w, img.h)).toBeLessThan(0.8);
  });

  it('remove o fundo ligado à borda e mantém o personagem', () => {
    const img = makeImage();
    const frac = cutoutLightBackground(img.d, img.w, img.h);
    expect(frac).toBeCloseTo((2500 - 900) / 2500, 2);
    expect(img.alpha(0, 0)).toBe(0);
    expect(img.alpha(25, 25)).toBe(255);
    // borda do personagem suavizada, não apagada
    expect(img.alpha(10, 25)).toBeGreaterThan(0);
    expect(img.alpha(10, 25)).toBeLessThan(255);
  });

  it('preserva brilhos pequenos (olhos) e remove bolsões brancos grandes presos no desenho', () => {
    const img = makeImage();
    for (let y = 14; y < 16; y++) for (let x = 14; x < 16; x++) img.set(x, y, 255, 255, 255); // brilho 2×2
    for (let y = 22; y < 32; y++) for (let x = 22; x < 32; x++) img.set(x, y, 252, 252, 252); // bolsão 10×10
    cutoutLightBackground(img.d, img.w, img.h);
    expect(img.alpha(14, 14)).toBe(255);
    expect(img.alpha(26, 26)).toBe(0);
  });

  it('não mexe em fotos com fundo colorido', () => {
    const img = makeImage();
    for (let k = 0; k < img.w * img.h; k++) if (img.d[k * 4] === 250) { img.d[k * 4] = 120; img.d[k * 4 + 1] = 180; img.d[k * 4 + 2] = 220; }
    expect(cutoutLightBackground(img.d, img.w, img.h)).toBe(0);
  });
});
