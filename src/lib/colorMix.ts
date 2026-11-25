/** Mistura duas cores hex (#rrggbb) — t = 0 devolve a, t = 1 devolve b. */
export function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/** Tons do metal (latão envelhecido) dos selos de segredo. */
export const SEAL_METAL = { hi: '#f4dfa6', mid: '#a9823f', lo: '#3b2a12', white: '#ffffff', black: '#000000' } as const;
