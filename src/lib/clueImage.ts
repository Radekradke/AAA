import { compressImage } from '@/services/mediaService';

/** Teto de cada imagem de pista guardada na ficha. */
export const CLUE_IMAGE_BYTES = 180 * 1024;

/** Tentativas de tamanho/qualidade, da mais nítida para a mais leve. */
const STEPS: [number, number][] = [
  [1000, 0.74],
  [820, 0.64],
  [640, 0.55],
  [480, 0.5],
];

const toDataUrl = (blob: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('Não deu para ler a imagem.'));
    r.readAsDataURL(blob);
  });

/**
 * Imagem de pista (bilhete, mapa, foto do símbolo…) para guardar dentro da
 * ficha, offline: reduz e comprime até caber em ~180 KB.
 */
export async function clueImage(file: File): Promise<string> {
  let last: Blob | null = null;
  for (const [side, q] of STEPS) {
    const { blob } = await compressImage(file, side, q);
    last = blob;
    if (blob.size <= CLUE_IMAGE_BYTES) break;
  }
  return toDataUrl(last!);
}
