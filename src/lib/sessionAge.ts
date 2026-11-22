import type { GameSession } from '@/types/session';

/**
 * Sessão esquecida aberta: o mestre fecha o app sem encerrar e, dias depois,
 * os jogadores ainda veem "ao vivo". Uma noite de jogo longa cabe em 12 horas;
 * passou disso, a sessão conta como esquecida (o mestre é lembrado de
 * encerrar e a lista de mesas não chama os jogadores para ela).
 */
export const STALE_SESSION_MS = 12 * 60 * 60 * 1000;

/** Há quanto tempo está aberta (desde que começou; sem início, desde que foi criada). */
export function sessionOpenFor(s: Pick<GameSession, 'startedAt' | 'createdAt'>, now = Date.now()): number {
  const at = Date.parse(s.startedAt ?? s.createdAt ?? '');
  return Number.isFinite(at) ? Math.max(0, now - at) : 0;
}

export function isStaleSession(s: Pick<GameSession, 'startedAt' | 'createdAt'>, now = Date.now()): boolean {
  return sessionOpenFor(s, now) > STALE_SESSION_MS;
}

/** "há 14 horas", "há 2 dias". */
export function openForLabel(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'há menos de 1 hora';
  if (h < 48) return `há ${h} hora${h > 1 ? 's' : ''}`;
  const d = Math.floor(h / 24);
  return `há ${d} dias`;
}
