import type { Monster } from '@/data/bestiary';
import { crValue } from '@/data/bestiary';
import { parseDice } from './spellCast';

/**
 * Regras do Guia do Mestre (2014) para montar encontros: limiares de XP por
 * nível, multiplicador pelo número de monstros e ajuste pelo tamanho do grupo.
 */
const THRESHOLDS: Record<number, [number, number, number, number]> = {
  1: [25, 50, 75, 100], 2: [50, 100, 150, 200], 3: [75, 150, 225, 400], 4: [125, 250, 375, 500],
  5: [250, 500, 750, 1100], 6: [300, 600, 900, 1400], 7: [350, 750, 1100, 1700], 8: [450, 900, 1400, 2100],
  9: [550, 1100, 1600, 2400], 10: [600, 1200, 1900, 2800], 11: [800, 1600, 2400, 3600], 12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100], 14: [1250, 2500, 3800, 5700], 15: [1400, 2800, 4300, 6400], 16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800], 18: [2100, 4200, 6300, 9500], 19: [2400, 4900, 7300, 10900], 20: [2800, 5700, 8500, 12700],
};

const MULTIPLIERS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

/** Índice na tabela de multiplicadores pelo número de monstros (1, 2, 3–6, 7–10, 11–14, 15+). */
function multIndex(count: number): number {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count <= 6) return 3;
  if (count <= 10) return 4;
  if (count <= 14) return 5;
  return 6;
}

export type Difficulty = 'trivial' | 'fácil' | 'médio' | 'difícil' | 'mortal';

export interface EncounterBudget {
  /** XP que os jogadores ganham (soma do XP dos monstros). */
  xp: number;
  /** XP ajustado (com o multiplicador) — é o que mede a dificuldade. */
  adjusted: number;
  multiplier: number;
  thresholds: { easy: number; medium: number; hard: number; deadly: number };
  difficulty: Difficulty;
  /** XP por jogador ao vencer. */
  perPlayer: number;
}

export function encounterBudget(partyLevels: number[], monsterXps: number[]): EncounterBudget | null {
  const party = partyLevels.filter((l) => l >= 1);
  const monsters = monsterXps.filter((x) => x > 0);
  if (!party.length) return null;
  const th = party.reduce(
    (acc, lvl) => {
      const t = THRESHOLDS[Math.min(20, Math.max(1, lvl))];
      return { easy: acc.easy + t[0], medium: acc.medium + t[1], hard: acc.hard + t[2], deadly: acc.deadly + t[3] };
    },
    { easy: 0, medium: 0, hard: 0, deadly: 0 },
  );
  const xp = monsters.reduce((s, x) => s + x, 0);
  // grupos pequenos (1–2) sobem um degrau; grandes (6+) descem um
  let idx = multIndex(monsters.length);
  if (party.length < 3) idx += 1;
  else if (party.length >= 6) idx -= 1;
  const multiplier = monsters.length ? MULTIPLIERS[Math.max(0, Math.min(MULTIPLIERS.length - 1, idx))] : 1;
  const adjusted = Math.round(xp * multiplier);
  const difficulty: Difficulty =
    adjusted >= th.deadly ? 'mortal' : adjusted >= th.hard ? 'difícil' : adjusted >= th.medium ? 'médio' : adjusted >= th.easy ? 'fácil' : 'trivial';
  return { xp, adjusted, multiplier, thresholds: th, difficulty, perPlayer: Math.floor(xp / party.length) };
}

export const abilityMod = (score: number) => Math.floor((score - 10) / 2);

/** PV do monstro: média do livro ou rolados pelos dados de vida. */
export function monsterHp(m: Monster, mode: 'average' | 'roll', rand: () => number = Math.random): number {
  if (mode === 'average') return m.hp;
  const d = parseDice(m.hpDice);
  if (!d) return m.hp;
  let sum = 0;
  for (let i = 0; i < d.count; i++) sum += 1 + Math.floor(rand() * d.sides);
  const minus = m.hpDice.match(/-(\d+)$/);
  return Math.max(1, sum + d.bonus - (minus ? Number(minus[1]) : 0));
}

/** Filtro por faixa de ND. */
export function inCrRange(m: Monster, min: number, max: number): boolean {
  const v = crValue(m.cr);
  return v >= min && v <= max;
}

/** "1d6+2" → dados para rolar (aceita "1", "2d8"). */
export function damageDice(expr: string): { count: number; sides: number; bonus: number } | null {
  if (/^\d+$/.test(expr.trim())) return { count: 0, sides: 1, bonus: Number(expr) };
  const m = expr.replace(/\s/g, '').match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) return null;
  return { count: Number(m[1]), sides: Number(m[2]), bonus: m[3] ? Number(m[3]) : 0 };
}
