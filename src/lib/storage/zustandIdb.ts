import type { StateStorage } from 'zustand/middleware';
import { idbAvailable, idbGet, idbSet, idbDel } from './idb';
import { useSaveStatusStore } from '@/store/saveStatusStore';

/**
 * Storage assíncrono para o zustand/persist sobre IndexedDB, com AUTOSAVE
 * DEBOUNCED: as mutações da ficha disparam gravação, mas o disco só é
 * tocado após 900 ms sem edições (e sempre no flush ao sair/ocultar a
 * página). Migra automaticamente o dado antigo do localStorage na
 * primeira execução. Alimenta o indicador "Salvando…/Salvo".
 */
const DEBOUNCE_MS = 900;

const memory = new Map<string, string>(); // fallback para testes/SSR
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const lastValue = new Map<string, string>();

async function write(name: string, value: string) {
  useSaveStatusStore.getState().setLocal('saving');
  try {
    if (idbAvailable()) await idbSet(name, value);
    else memory.set(name, value);
    useSaveStatusStore.getState().setLocal('saved');
  } catch {
    useSaveStatusStore.getState().setLocal('idle');
  }
}

function flush(name?: string) {
  for (const [key, timer] of timers) {
    if (name && key !== name) continue;
    clearTimeout(timer);
    timers.delete(key);
    const value = lastValue.get(key);
    if (value !== undefined) void write(key, value);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export const idbStateStorage: StateStorage = {
  async getItem(name) {
    if (!idbAvailable()) return memory.get(name) ?? null;
    const stored = await idbGet<string>(name);
    if (stored !== undefined) return stored;
    // migração única: dado antigo do localStorage → IndexedDB
    try {
      const legacy = localStorage.getItem(name);
      if (legacy) {
        await idbSet(name, legacy);
        localStorage.removeItem(name);
        return legacy;
      }
    } catch {
      /* localStorage indisponível */
    }
    return null;
  },
  setItem(name, value) {
    lastValue.set(name, value);
    const prev = timers.get(name);
    if (prev) clearTimeout(prev);
    timers.set(
      name,
      setTimeout(() => {
        timers.delete(name);
        void write(name, value);
      }, DEBOUNCE_MS),
    );
  },
  async removeItem(name) {
    lastValue.delete(name);
    const prev = timers.get(name);
    if (prev) clearTimeout(prev);
    if (idbAvailable()) await idbDel(name);
    else memory.delete(name);
  },
};
