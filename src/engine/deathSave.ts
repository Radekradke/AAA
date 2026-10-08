/**
 * Teste contra a morte (PHB 2014): d20 sem modificador de atributo.
 * 20 natural levanta com 1 PV; 1 natural conta duas falhas; 10+ é
 * sucesso; 3 sucessos estabilizam; 3 falhas matam.
 */
export type DeathOutcome = 'revive' | 'stable' | 'success' | 'fail' | 'double' | 'dead';

export interface DeathSaveResult {
  /** Contadores depois do teste. */
  success: number;
  fail: number;
  outcome: DeathOutcome;
}

export function deathSaveOutcome(before: { success: number; fail: number } | undefined, natural: number, total: number): DeathSaveResult {
  const s = Math.max(0, Math.min(3, before?.success ?? 0));
  const f = Math.max(0, Math.min(3, before?.fail ?? 0));
  if (natural === 20) return { success: 0, fail: 0, outcome: 'revive' };
  if (natural === 1) {
    const fail = Math.min(3, f + 2);
    return { success: s, fail, outcome: fail >= 3 ? 'dead' : 'double' };
  }
  if (total >= 10) {
    const success = Math.min(3, s + 1);
    return { success, fail: f, outcome: success >= 3 ? 'stable' : 'success' };
  }
  const fail = Math.min(3, f + 1);
  return { success: s, fail, outcome: fail >= 3 ? 'dead' : 'fail' };
}

const OUTCOMES: DeathOutcome[] = ['revive', 'stable', 'success', 'fail', 'double', 'dead'];
export const isDeathOutcome = (v: unknown): v is DeathOutcome => OUTCOMES.includes(v as DeathOutcome);
