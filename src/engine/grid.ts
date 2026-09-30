import { CELL_METERS } from '@/types/stage';
import type { GridConfig } from '@/types/stage';

/**
 * Contas do mapa tático (puras, testáveis). Posição dos peões em casas; a
 * imagem do mapa em pixels; a grade liga os dois.
 */

/** Distância em casas pela regra do Livro do Jogador: diagonal conta 1. */
export function cellDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(Math.round(bx - ax)), Math.abs(Math.round(by - ay)));
}

export function metersBetween(ax: number, ay: number, bx: number, by: number): number {
  return cellDistance(ax, ay, bx, by) * CELL_METERS;
}

/** "4,5 m" */
export function fmtMeters(m: number): string {
  return `${m.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m`;
}

/** Pixel da imagem → casa (fracionária). */
export function pxToCell(g: GridConfig, px: number, py: number): { x: number; y: number } {
  return { x: (px - g.ox) / g.size, y: (py - g.oy) / g.size };
}

/** Canto da casa → pixel da imagem. */
export function cellToPx(g: GridConfig, cx: number, cy: number): { x: number; y: number } {
  return { x: g.ox + cx * g.size, y: g.oy + cy * g.size };
}

/** Encaixa o canto do peão na casa mais próxima (peão Grande ocupa 2×2…). */
export function snapCell(x: number, y: number): { x: number; y: number } {
  return { x: Math.round(x), y: Math.round(y) };
}

/** Calibração rápida: "o mapa tem N quadrados na largura". */
export function gridFromColumns(imageWidth: number, columns: number, prev: GridConfig): GridConfig {
  const size = imageWidth / Math.max(1, columns);
  return { ...prev, size: Math.round(size * 100) / 100, ox: 0, oy: 0 };
}

/** Tamanho do tabuleiro em pixels (imagem, ou tabuleiro em branco). */
export function boardSize(g: GridConfig, image: { w: number; h: number } | null): { w: number; h: number } {
  if (image) return image;
  return { w: (g.cols ?? 30) * g.size, h: (g.rows ?? 20) * g.size };
}

/** Zoom que faz o tabuleiro caber na área visível, centralizado. */
export function fitView(board: { w: number; h: number }, view: { w: number; h: number }, pad = 16): { x: number; y: number; z: number } {
  const z = Math.max(0.05, Math.min((view.w - pad * 2) / board.w, (view.h - pad * 2) / board.h, 3));
  return { z, x: (view.w - board.w * z) / 2, y: (view.h - board.h * z) / 2 };
}

/** Zoom em torno de um ponto da tela (o ponto fica parado sob o dedo/mouse). */
export function zoomAt(v: { x: number; y: number; z: number }, sx: number, sy: number, factor: number, min = 0.05, max = 6) {
  const z = Math.min(max, Math.max(min, v.z * factor));
  const k = z / v.z;
  return { z, x: sx - (sx - v.x) * k, y: sy - (sy - v.y) * k };
}
