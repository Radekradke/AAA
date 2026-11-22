import { describe, expect, it } from 'vitest';
import { canDeliver, recipientsText, toggleRecipient } from '../handoutRecipients';
import { isStaleSession, openForLabel, sessionOpenFor, STALE_SESSION_MS } from '../sessionAge';

describe('handout: para quem vai', () => {
  it('desmarcar o último jogador vira NINGUÉM, nunca "todos"', () => {
    expect(toggleRecipient(null, 'bruno')).toEqual(['bruno']);
    expect(toggleRecipient(['bruno'], 'carla')).toEqual(['bruno', 'carla']);
    expect(toggleRecipient(['bruno'], 'bruno')).toEqual([]);
    expect(canDeliver([])).toBe(false);
    expect(canDeliver(null)).toBe(true);
    expect(canDeliver(['bruno'])).toBe(true);
  });
  it('texto do botão diz exatamente quem recebe', () => {
    const name = (id: string) => ({ b: 'Bruno', c: 'Carla', d: 'Davi' })[id] ?? '?';
    expect(recipientsText(null, name)).toBe('todos');
    expect(recipientsText([], name)).toBe('ninguém');
    expect(recipientsText(['b'], name)).toBe('Bruno');
    expect(recipientsText(['b', 'c', 'd'], name)).toBe('Bruno, Carla e Davi');
  });
});

describe('sessão esquecida aberta', () => {
  const now = Date.parse('2026-11-22T20:00:00Z');
  it('uma noite longa não conta; mais de 12 horas conta', () => {
    expect(isStaleSession({ startedAt: '2026-11-22T13:00:00Z', createdAt: '' }, now)).toBe(false);
    expect(isStaleSession({ startedAt: '2026-11-21T19:00:00Z', createdAt: '' }, now)).toBe(true);
    // sem início registrado: conta da criação
    expect(isStaleSession({ startedAt: null, createdAt: '2026-11-20T20:00:00Z' }, now)).toBe(true);
    expect(sessionOpenFor({ startedAt: null, createdAt: 'lixo' }, now)).toBe(0);
    expect(STALE_SESSION_MS).toBe(12 * 3_600_000);
  });
  it('rótulo em horas e depois em dias', () => {
    expect(openForLabel(30 * 60_000)).toBe('há menos de 1 hora');
    expect(openForLabel(3_600_000)).toBe('há 1 hora');
    expect(openForLabel(14 * 3_600_000)).toBe('há 14 horas');
    expect(openForLabel(3 * 24 * 3_600_000)).toBe('há 3 dias');
  });
});
