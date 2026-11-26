import type { ConnectionState, PresencePlayer } from '@/types/session';

/**
 * A mesa conversa por dois canais: o da SESSÃO (combate, rolagens) e o do
 * PALCO (mapa). Para quem joga é uma coisa só — "estou ao vivo?" e "quem
 * está aqui?" — então o cabeçalho mostra a soma dos dois.
 */
const WORST: ConnectionState[] = ['offline', 'reconnecting', 'connecting', 'connected', 'idle'];

/** O pior estado entre os canais em uso (canal parado — idle — não conta). */
export function linkState(...states: ConnectionState[]): ConnectionState {
  const used: ConnectionState[] = states.filter((s) => s !== 'idle');
  if (!used.length) return 'idle';
  return WORST.find((w) => used.includes(w)) ?? 'idle';
}

/**
 * Quem está na mesa por qualquer um dos canais, uma pessoa uma vez. A
 * presença da sessão vem primeiro (traz o herói escolhido); a do palco
 * completa quem só está com o mapa aberto.
 */
export function mergeOnline(session: PresencePlayer[], stage: PresencePlayer[]): PresencePlayer[] {
  const byUser = new Map<string, PresencePlayer>();
  for (const p of [...session, ...stage]) if (p.userId && !byUser.has(p.userId)) byUser.set(p.userId, p);
  return [...byUser.values()].sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'master' ? -1 : 1));
}

/** Jogadas feitas sem rede esperando para sair (" · 2 jogadas na fila"). */
export function queuedLabel(n: number): string {
  return n > 0 ? ` · ${n} ${n === 1 ? 'jogada' : 'jogadas'} na fila` : '';
}
