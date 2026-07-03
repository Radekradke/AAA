import { describe, expect, it } from 'vitest';
import { decideSyncAction } from '../offlineSyncService';

describe('sincronização offline-first: decisão por ficha', () => {
  it('nunca sincronizada → push', () => {
    expect(decideSyncAction({ updatedAt: 100 }, null)).toBe('push');
  });

  it('só o local mudou desde a última sync → push (local vence)', () => {
    expect(decideSyncAction({ updatedAt: 200, lastSyncedAt: 100 }, 100)).toBe('push');
  });

  it('só a nuvem mudou → pull', () => {
    expect(decideSyncAction({ updatedAt: 100, lastSyncedAt: 100 }, 300)).toBe('pull');
  });

  it('os dois mudaram → conflito (usuário escolhe)', () => {
    expect(decideSyncAction({ updatedAt: 250, lastSyncedAt: 100 }, 300)).toBe('conflict');
  });

  it('nada mudou → noop', () => {
    expect(decideSyncAction({ updatedAt: 100, lastSyncedAt: 100 }, 100)).toBe('noop');
  });

  it('nuvem antiga não sobrescreve alteração local offline', () => {
    // editou offline (updatedAt 500) após sync em 400; nuvem parada em 400
    expect(decideSyncAction({ updatedAt: 500, lastSyncedAt: 400 }, 400)).toBe('push');
  });
});
