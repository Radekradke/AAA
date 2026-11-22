import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PERSIST_RETRY_MS, canAskAgain, formatBytes, protectIfNeeded } from '../storagePersist';

// ambiente node: localStorage/sessionStorage de mentira
const mem = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};
vi.stubGlobal('localStorage', fakeStorage);
vi.stubGlobal('sessionStorage', fakeStorage);


function mockStorage(api: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, 'storage', { value: api, configurable: true });
}

beforeEach(() => localStorage.clear());
afterEach(() => mockStorage(undefined));

describe('armazenamento persistente', () => {
  it('não pede nada sem heróis', async () => {
    const persist = vi.fn(async () => true);
    mockStorage({ persist, persisted: async () => false });
    expect(await protectIfNeeded(0)).toBe(false);
    expect(persist).not.toHaveBeenCalled();
  });

  it('já protegido: não pergunta de novo', async () => {
    const persist = vi.fn(async () => true);
    mockStorage({ persist, persisted: async () => true });
    expect(await protectIfNeeded(2)).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('negou: só volta a pedir sozinho depois de 7 dias', async () => {
    const persist = vi.fn(async () => false);
    mockStorage({ persist, persisted: async () => false });
    expect(await protectIfNeeded(1)).toBe(false);
    expect(await protectIfNeeded(1)).toBe(false);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(canAskAgain(Date.now() + PERSIST_RETRY_MS + 1)).toBe(true);
  });

  it('navegador sem a API: segue sem erro', async () => {
    mockStorage(undefined);
    expect(await protectIfNeeded(3)).toBe(false);
  });

  it('formatBytes em pt-BR', () => {
    expect(formatBytes(undefined)).toBe('—');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(13_002_342)).toBe('12,4 MB');
    expect(formatBytes(10_737_418_240)).toBe('10 GB');
    expect(formatBytes(1_610_612_736)).toBe('1,5 GB');
  });
});
