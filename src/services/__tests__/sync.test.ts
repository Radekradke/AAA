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

describe('sincronização por versão (syncBase)', () => {
  it('outro aparelho editou ANTES mas subiu DEPOIS → pull (antes passava batido)', () => {
    // este aparelho sincronizou às 10:05 vendo a versão 100; o outro editou às 10:02 (102) e subiu às 10:20
    expect(decideSyncAction({ updatedAt: 100, lastSyncedAt: 1005, syncBase: 100 }, 102)).toBe('pull');
  });

  it('relógio do outro aparelho atrasado não esconde a mudança', () => {
    expect(decideSyncAction({ updatedAt: 500, syncBase: 500 }, 300)).toBe('pull');
  });

  it('edição local com relógio atrasado ainda conta como mudança', () => {
    expect(decideSyncAction({ updatedAt: 90, syncBase: 100 }, 100)).toBe('push');
  });

  it('os dois mudaram desde a base → conflito', () => {
    expect(decideSyncAction({ updatedAt: 150, syncBase: 100 }, 120)).toBe('conflict');
  });

  it('nada mudou desde a base → noop', () => {
    expect(decideSyncAction({ updatedAt: 100, syncBase: 100, lastSyncedAt: 1 }, 100)).toBe('noop');
  });
});
