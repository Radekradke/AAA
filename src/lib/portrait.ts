/**
 * Retrato enviado pelo jogador: reduz, recorta fundo claro liso (quando a
 * arte vem em fundo branco, como as geradas pelo guia docs/ARTE-PERSONAGENS.md)
 * e devolve um data URL leve para guardar na própria ficha.
 */

/** Maior lado do retrato salvo — suficiente para o painel e bem leve na ficha. */
export const PORTRAIT_MAX = { w: 640, h: 800 };
/** Tamanho máximo aceito na entrada (antes de reduzir). */
export const PORTRAIT_INPUT_LIMIT = 15 * 1024 * 1024;

/** Pixel "de fundo": claro e sem cor (branco, cinza-claro, xadrez de transparência). */
function isLightNeutral(d: Uint8ClampedArray, i: number): boolean {
  const r = d[i], g = d[i + 1], b = d[i + 2];
  const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
  return d[i + 3] > 0 && mn > 200 && mx - mn < 22;
}

/** Fração (0–1) dos pixels da borda que são claros e neutros. */
export function borderLightRatio(d: Uint8ClampedArray, w: number, h: number): number {
  let light = 0, total = 0;
  const check = (x: number, y: number) => {
    total++;
    if (isLightNeutral(d, (y * w + x) * 4)) light++;
  };
  for (let x = 0; x < w; x++) { check(x, 0); check(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { check(0, y); check(w - 1, y); }
  return total ? light / total : 0;
}

/**
 * Some com o fundo claro: tudo que é claro-neutro e toca a borda, mais os
 * bolsões grandes quase brancos presos entre mechas de cabelo/capa.
 * A borda do recorte ganha 1px de suavização para não sobrar halo branco.
 * Altera `d` no lugar e devolve a fração removida (0–1).
 */
export function cutoutLightBackground(d: Uint8ClampedArray, w: number, h: number): number {
  const n = w * h;
  const bg = new Uint8Array(n);
  const seen = new Uint8Array(n);
  const minPocket = Math.max(40, Math.round(n * 0.0004));
  const stack: number[] = [];

  for (let start = 0; start < n; start++) {
    if (seen[start] || !isLightNeutral(d, start * 4)) continue;
    const comp: number[] = [];
    let touches = false;
    let brightest = true;
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const k = stack.pop()!;
      comp.push(k);
      const x = k % w, y = (k / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
      if (Math.min(d[k * 4], d[k * 4 + 1], d[k * 4 + 2]) < 232) brightest = false;
      if (x > 0 && !seen[k - 1] && isLightNeutral(d, (k - 1) * 4)) { seen[k - 1] = 1; stack.push(k - 1); }
      if (x < w - 1 && !seen[k + 1] && isLightNeutral(d, (k + 1) * 4)) { seen[k + 1] = 1; stack.push(k + 1); }
      if (y > 0 && !seen[k - w] && isLightNeutral(d, (k - w) * 4)) { seen[k - w] = 1; stack.push(k - w); }
      if (y < h - 1 && !seen[k + w] && isLightNeutral(d, (k + w) * 4)) { seen[k + w] = 1; stack.push(k + w); }
    }
    // bolsão fechado só sai se for grande E quase branco (protege olhos, dentes, brilhos)
    if (touches || (brightest && comp.length >= minPocket)) for (const k of comp) bg[k] = 1;
  }

  let removed = 0;
  for (let k = 0; k < n; k++) if (bg[k]) { d[k * 4 + 3] = 0; removed++; }
  if (!removed) return 0;

  // suaviza a borda: pixel mantido encostado no fundo fica semitransparente e um pouco mais escuro
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const k = y * w + x;
      if (bg[k]) continue;
      let near = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) near += bg[(y + dy) * w + x + dx];
      if (!near) continue;
      const i = k * 4;
      d[i + 3] = Math.round(d[i + 3] * (1 - near / 12));
      d[i] *= 0.8; d[i + 1] *= 0.8; d[i + 2] *= 0.8;
    }
  }
  return removed / n;
}

export interface ProcessedPortrait {
  dataUrl: string;
  /** Fundo claro foi recortado. */
  cutout: boolean;
}

/**
 * Lê a imagem escolhida, reduz para no máximo 640×800 e, se o fundo for
 * branco/claro liso (≥ metade da borda — bustos costumam encostar embaixo), recorta. Saída WebP (PNG se o
 * navegador não gerar WebP).
 */
export async function processPortraitFile(file: File, opts: { cutout?: boolean; max?: { w: number; h: number }; quality?: number } = {}): Promise<ProcessedPortrait> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem (PNG, JPG ou WebP).');
  if (file.size > PORTRAIT_INPUT_LIMIT) throw new Error('Imagem muito grande (máx. 15 MB).');

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const max = opts.max ?? PORTRAIT_MAX;
    const scale = Math.min(1, max.w / img.naturalWidth, max.h / img.naturalHeight);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    let cutout = false;
    if (opts.cutout !== false) {
      const data = ctx.getImageData(0, 0, w, h);
      if (borderLightRatio(data.data, w, h) >= 0.5) {
        cutout = cutoutLightBackground(data.data, w, h) > 0.02;
        if (cutout) ctx.putImageData(data, 0, 0);
      }
    }

    let dataUrl = canvas.toDataURL('image/webp', opts.quality ?? 0.86);
    if (!dataUrl.startsWith('data:image/webp')) {
      // Safari antigo não gera WebP: sem recorte, JPEG é bem menor que PNG
      dataUrl = cutout ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.86);
    }
    return { dataUrl, cutout };
  } finally {
    URL.revokeObjectURL(url);
  }
}
