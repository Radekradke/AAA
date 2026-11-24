import type { FogConfig, Wall } from '@/types/stage';

/**
 * Visão dinâmica do mapa (pura, testável): de onde o peão está, até onde as
 * paredes deixam ver. Tudo em casas. É o "polígono de visibilidade" clássico
 * (o mesmo princípio do Foundry e do Owlbear): um raio para cada ponta de
 * parede (e dois vizinhos, para passar rente às quinas), o ponto mais perto
 * onde cada raio bate, e os pontos em ordem de ângulo formam a área vista.
 */
export interface Pt {
  x: number;
  y: number;
}
type Seg = [Pt, Pt];

/** Paredes que bloqueiam agora (porta aberta não bloqueia). */
export function blockingWalls(walls: Wall[] | undefined): Wall[] {
  return (walls ?? []).filter((w) => !(w.door && w.open));
}

/** Onde o raio (o + t·d, t ≥ 0) cruza o segmento; t ou null. */
function rayHit(o: Pt, dx: number, dy: number, a: Pt, b: Pt): number | null {
  const sx = b.x - a.x;
  const sy = b.y - a.y;
  const den = dx * sy - dy * sx;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((a.x - o.x) * sy - (a.y - o.y) * sx) / den;
  const u = ((a.x - o.x) * dy - (a.y - o.y) * dx) / den;
  if (t < 0 || u < -1e-9 || u > 1 + 1e-9) return null;
  return t;
}

/** Borda do tabuleiro, em casas. */
export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Área que se vê de `o`, presa ao tabuleiro.
 * Devolve os vértices do polígono em ordem de ângulo.
 */
export function visibilityPolygon(o: Pt, walls: Wall[], b: Bounds): Pt[] {
  const { x0, y0, x1, y1 } = b;
  const segs: Seg[] = [
    [{ x: x0, y: y0 }, { x: x1, y: y0 }],
    [{ x: x1, y: y0 }, { x: x1, y: y1 }],
    [{ x: x1, y: y1 }, { x: x0, y: y1 }],
    [{ x: x0, y: y1 }, { x: x0, y: y0 }],
  ];
  for (const wl of walls) segs.push([{ x: wl.x1, y: wl.y1 }, { x: wl.x2, y: wl.y2 }]);

  const angles: number[] = [];
  const seen = new Set<string>();
  for (const [a, b] of segs) {
    for (const q of [a, b]) {
      const k = `${q.x},${q.y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const ang = Math.atan2(q.y - o.y, q.x - o.x);
      angles.push(ang - 1e-4, ang, ang + 1e-4);
    }
  }
  angles.sort((x, y) => x - y);

  const pts: Pt[] = [];
  for (const ang of angles) {
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let best = Infinity;
    for (const [a, b] of segs) {
      const t = rayHit(o, dx, dy, a, b);
      if (t !== null && t < best) best = t;
    }
    if (best === Infinity) continue;
    const p = { x: o.x + dx * best, y: o.y + dy * best };
    const last = pts[pts.length - 1];
    if (!last || Math.abs(last.x - p.x) > 1e-6 || Math.abs(last.y - p.y) > 1e-6) pts.push(p);
  }
  return pts;
}

/** Ponto dentro do polígono (par-ímpar). */
export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Visão dinâmica ligada nesta névoa? */
export function visionOn(fog: FogConfig | undefined): boolean {
  return !!fog?.on && !!fog.vision;
}

/** Distância do ponto ao segmento (para apagar/abrir a parede mais perto do clique). */
export function distToWall(p: Pt, w: Wall): number {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p.x - w.x1) * dx + (p.y - w.y1) * dy) / len)) : 0;
  return Math.hypot(p.x - (w.x1 + t * dx), p.y - (w.y1 + t * dy));
}

/** A parede mais perto do ponto, se estiver a menos de `max` casas. */
export function nearestWall(p: Pt, walls: Wall[], max = 0.35): number {
  let best = -1;
  let bd = max;
  walls.forEach((w, i) => {
    const d = distToWall(p, w);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

/** Quinas de meia casa: paredes encaixam na grade sem ficar duras demais. */
export function snapHalf(v: number): number {
  return Math.round(v * 2) / 2;
}

/* ---------- movimento ---------- */

function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

/** O caminho reto de a até b atravessa alguma parede (porta fechada conta)? */
export function pathBlocked(a: Pt, b: Pt, walls: Wall[]): boolean {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  for (const w of blockingWalls(walls)) {
    const sx = w.x2 - w.x1;
    const sy = w.y2 - w.y1;
    const den = cross(rx, ry, sx, sy);
    if (Math.abs(den) < 1e-12) continue; // paralelos: andar rente à parede não é atravessar
    const t = cross(w.x1 - a.x, w.y1 - a.y, sx, sy) / den;
    const u = cross(w.x1 - a.x, w.y1 - a.y, rx, ry) / den;
    if (t > 1e-6 && t < 1 - 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) return true;
  }
  return false;
}

/* ---------- luz e visão no escuro ---------- */

/** Quem enxerga: polígono do que está à vista + alcance da visão no escuro (casas; 0 = nenhuma). */
export interface Viewer {
  at: Pt;
  poly: Pt[];
  dark: number;
}
/** Fonte de luz: até onde ilumina (casas) e o que ela alcança sem parede no meio. */
export interface LightSource {
  at: Pt;
  poly: Pt[];
  r: number;
}

/**
 * Este ponto está à vista de alguém? Com o ambiente claro, basta a linha de
 * visão; no escuro, o ponto também precisa estar iluminado por alguma luz ou
 * dentro da visão no escuro de quem olha (PHB 2014: vê na escuridão como se
 * fosse penumbra).
 */
export function seen(p: Pt, viewers: Viewer[], lights: LightSource[], dark: boolean): boolean {
  const lit = () => lights.some((l) => Math.hypot(p.x - l.at.x, p.y - l.at.y) <= l.r && pointInPolygon(p, l.poly));
  return viewers.some((v) => {
    if (!pointInPolygon(p, v.poly)) return false;
    if (!dark) return true;
    return Math.hypot(p.x - v.at.x, p.y - v.at.y) <= v.dark || lit();
  });
}

/* ---------- lembrança do explorado ---------- */

/** Casas (chave "x,y") cujo centro está à vista agora. */
export function cellsSeen(b: Bounds, isSeen: (p: Pt) => boolean): string[] {
  const out: string[] = [];
  for (let y = Math.floor(b.y0); y < Math.ceil(b.y1); y++) {
    for (let x = Math.floor(b.x0); x < Math.ceil(b.x1); x++) {
      if (isSeen({ x: x + 0.5, y: y + 0.5 })) out.push(`${x},${y}`);
    }
  }
  return out;
}

/** Junta casas vizinhas da mesma linha em faixas (menos retângulos para desenhar). */
export function cellRuns(keys: Iterable<string>): { x: number; y: number; w: number }[] {
  const rows = new Map<number, number[]>();
  for (const k of keys) {
    const [x, y] = k.split(',').map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const r = rows.get(y) ?? [];
    r.push(x);
    rows.set(y, r);
  }
  const out: { x: number; y: number; w: number }[] = [];
  for (const [y, xs] of rows) {
    xs.sort((a, b) => a - b);
    let start = xs[0];
    let prev = xs[0];
    for (let i = 1; i <= xs.length; i++) {
      const x = xs[i];
      if (x === prev + 1) {
        prev = x;
        continue;
      }
      out.push({ x: start, y, w: prev - start + 1 });
      start = prev = x;
    }
  }
  return out;
}

/** Luz carregada (PHB 2014, luz plena + penumbra), em metros. */
export const LIGHT_PRESETS: { id: string; label: string; m: number }[] = [
  { id: 'vela', label: 'Vela', m: 3 },
  { id: 'tocha', label: 'Tocha', m: 12 },
  { id: 'lanterna', label: 'Lanterna', m: 18 },
];
