/** XP mínimo para cada nível (Livro do Jogador 2014, índice = nível − 1). */
export const XP_BY_LEVEL = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

/** Nível que esse XP alcança (1–20). */
export function levelForXp(xp: number): number {
  let lvl = 1;
  for (let i = 0; i < XP_BY_LEVEL.length; i++) if (xp >= XP_BY_LEVEL[i]) lvl = i + 1;
  return lvl;
}

/** Progresso até o próximo nível a partir do nível atual. */
export function xpProgress(xp: number, level: number): { next: number | null; pct: number; canLevel: boolean } {
  const lvl = Math.max(1, Math.min(20, level));
  if (lvl >= 20) return { next: null, pct: 100, canLevel: false };
  const from = XP_BY_LEVEL[lvl - 1];
  const next = XP_BY_LEVEL[lvl];
  return { next, pct: Math.max(0, Math.min(100, ((xp - from) / (next - from)) * 100)), canLevel: xp >= next };
}
