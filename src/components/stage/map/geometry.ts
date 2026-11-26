import type { GridConfig } from '@/types/stage';

/** Casa (fracionária) → pixel da imagem do mapa, no eixo dado. */
export type CellPx = (c: number, axis: 'x' | 'y') => number;

export function cellPxFor(g: Pick<GridConfig, 'ox' | 'oy' | 'size'>): CellPx {
  return (c, axis) => (axis === 'x' ? g.ox : g.oy) + c * g.size;
}

/** "x,y x,y …" de um polígono em casas, para <polygon points>. */
export function polyPoints(poly: { x: number; y: number }[], px: CellPx): string {
  return poly.map((q) => `${px(q.x, 'x')},${px(q.y, 'y')}`).join(' ');
}

/** Iniciais do peão sem retrato ("Goblin #2" → "G2"). */
export function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const num = label.match(/\d+$/)?.[0];
  return (parts[0][0] + (num ?? parts[1]?.[0] ?? '')).toUpperCase();
}
