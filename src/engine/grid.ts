import { CELL_METERS } from '@/types/stage';
import type { CellRect, FogConfig, GridConfig, MapMark } from '@/types/stage';

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

// ---------------------------------------------------------------------
// Moldes de área (5e): raio/comprimento em casas inteiras de 1,5 m
// ---------------------------------------------------------------------

/** Comprimento do molde em casas (mínimo 1), pela distância euclidiana. */
export function markLength(m: Pick<MapMark, 'from' | 'to'>): number {
  return Math.max(1, Math.round(Math.hypot(m.to.x - m.from.x, m.to.y - m.from.y)));
}

/** Meia-abertura do cone de 5e: a largura no fim é igual ao comprimento (≈ 53°). */
export const CONE_HALF_ANGLE = Math.atan(0.5);

/** O ponto (em casas) está dentro do molde? Usado para listar quem a magia pega. */
export function pointInMark(m: MapMark, px: number, py: number): boolean {
  const L = markLength(m);
  const dx = px - m.from.x, dy = py - m.from.y;
  const ang = Math.atan2(m.to.y - m.from.y, m.to.x - m.from.x);
  // coordenadas no eixo do molde
  const along = dx * Math.cos(ang) + dy * Math.sin(ang);
  const across = -dx * Math.sin(ang) + dy * Math.cos(ang);
  switch (m.kind) {
    case 'circle':
      return Math.hypot(dx, dy) <= L + 1e-6;
    case 'square': {
      // cubo: a partir do ponto de origem, no sentido arrastado
      const sx = Math.sign(m.to.x - m.from.x) || 1, sy = Math.sign(m.to.y - m.from.y) || 1;
      const lx = dx * sx, ly = dy * sy;
      return lx >= -1e-6 && ly >= -1e-6 && lx <= L + 1e-6 && ly <= L + 1e-6;
    }
    case 'line':
      // linha de 1,5 m de largura
      return along >= -1e-6 && along <= L + 1e-6 && Math.abs(across) <= 0.5 + 1e-6;
    case 'cone':
      return along > 0 && along <= L + 1e-6 && Math.abs(across) <= along * Math.tan(CONE_HALF_ANGLE) + 1e-6;
    default:
      return false;
  }
}

/** Pontas do cone (em casas) para desenhar o triângulo. */
export function conePoints(m: MapMark): { x: number; y: number }[] {
  const L = markLength(m);
  const ang = Math.atan2(m.to.y - m.from.y, m.to.x - m.from.x);
  const half = (L / 2) * 1; // largura total = L
  const ex = m.from.x + Math.cos(ang) * L, ey = m.from.y + Math.sin(ang) * L;
  return [
    { x: m.from.x, y: m.from.y },
    { x: ex - Math.sin(ang) * half, y: ey + Math.cos(ang) * half },
    { x: ex + Math.sin(ang) * half, y: ey - Math.cos(ang) * half },
  ];
}

// ---------------------------------------------------------------------
// Névoa de guerra: lista de retângulos revelados (em casas)
// ---------------------------------------------------------------------

/** Retângulo normalizado entre duas casas (inclusive), em casas inteiras. */
export function rectBetween(ax: number, ay: number, bx: number, by: number): CellRect {
  const x0 = Math.floor(Math.min(ax, bx)), y0 = Math.floor(Math.min(ay, by));
  const x1 = Math.floor(Math.max(ax, bx)), y1 = Math.floor(Math.max(ay, by));
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const overlaps = (a: CellRect, b: CellRect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** a − b: até 4 retângulos que sobram de `a` quando `b` é coberto. */
export function subtractRect(a: CellRect, b: CellRect): CellRect[] {
  if (!overlaps(a, b)) return [a];
  const out: CellRect[] = [];
  const top = b.y - a.y, bottom = a.y + a.h - (b.y + b.h);
  if (top > 0) out.push({ x: a.x, y: a.y, w: a.w, h: top });
  if (bottom > 0) out.push({ x: a.x, y: b.y + b.h, w: a.w, h: bottom });
  const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
  const left = b.x - a.x, right = a.x + a.w - (b.x + b.w);
  if (left > 0) out.push({ x: a.x, y: y0, w: left, h: y1 - y0 });
  if (right > 0) out.push({ x: b.x + b.w, y: y0, w: right, h: y1 - y0 });
  return out;
}

export function revealArea(fog: FogConfig, r: CellRect): FogConfig {
  // tira o que já estava revelado dentro de r para não acumular retângulos repetidos
  return { on: true, reveal: [...fog.reveal.flatMap((x) => subtractRect(x, r)), r].slice(-400) };
}

export function coverArea(fog: FogConfig, r: CellRect): FogConfig {
  return { on: true, reveal: fog.reveal.flatMap((x) => subtractRect(x, r)) };
}

/** A casa que contém o ponto (em casas) está revelada? */
export function isRevealed(fog: FogConfig | undefined, px: number, py: number): boolean {
  if (!fog?.on) return true;
  return fog.reveal.some((r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h);
}
