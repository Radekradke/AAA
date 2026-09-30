import type { RollResult } from '@/engine/dice';

export function rollTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Estatísticas rápidas de um conjunto de rolagens. */
export function rollStats(rolls: RollResult[]) {
  return {
    count: rolls.length,
    crits: rolls.filter((r) => r.crit).length,
    fails: rolls.filter((r) => r.fail).length,
    best: rolls.reduce<RollResult | null>((b, r) => (!r.damage && (!b || r.total > b.total) ? r : b), null),
  };
}

/**
 * Texto para as Anotações do Diário: cabeçalho com data e contagem, depois
 * uma linha por rolagem em ordem cronológica (a mais antiga primeiro).
 */
export function rollLogText(rolls: RollResult[], now = Date.now()): string {
  if (rolls.length === 0) return '';
  const s = rollStats(rolls);
  const date = new Date(now).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const head = `🎲 Rolagens da sessão (${date}) — ${s.count} rolagem(ns)` +
    (s.crits ? `, ${s.crits} crítico(s)` : '') +
    (s.fails ? `, ${s.fails} falha(s) crítica(s)` : '');
  const lines = [...rolls]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((r) => {
      const tag = r.crit ? ' ★ CRÍTICO' : r.fail ? ' ✖ FALHA' : '';
      return `• ${rollTime(r.timestamp)} ${r.label}: ${r.total} (${r.expr} [${r.rolls.join(', ')}])${tag}`;
    });
  return [head, ...lines].join('\n');
}
