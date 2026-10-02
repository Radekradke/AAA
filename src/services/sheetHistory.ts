import { idbAvailable, idbDel, idbGet, idbSet } from '@/lib/storage/idb';
import type { Character } from '@/types/character';

/**
 * Histórico da ficha: versões antigas guardadas NESTE aparelho (IndexedDB),
 * para voltar no tempo. Entram sozinhas:
 * - ao começar a mexer depois de um tempo parado (uma por "sessão" de edição);
 * - antes de subir de nível;
 * - a versão descartada num conflito de sincronização;
 * - a versão atual, antes de restaurar outra;
 * - quando o jogador guarda uma versão à mão.
 * Fica no máximo MAX_ENTRIES por ficha (as mais antigas saem).
 */

export type HistoryReason = 'auto' | 'levelup' | 'conflict' | 'restore' | 'manual';

export interface HistoryEntry {
  id: string;
  at: number;
  reason: HistoryReason;
  label: string;
  char: Character;
}

export const MAX_ENTRIES = 30;
/** Edições a menos de 20 min da última versão guardada contam como a mesma sessão. */
export const SESSION_GAP_MS = 20 * 60_000;

const key = (sheetId: string) => `fv-history:${sheetId}`;
const memory = new Map<string, HistoryEntry[]>(); // testes / sem IndexedDB
const listeners = new Set<(sheetId: string) => void>();

async function read(sheetId: string): Promise<HistoryEntry[]> {
  if (!idbAvailable()) return memory.get(sheetId) ?? [];
  try {
    return (await idbGet<HistoryEntry[]>(key(sheetId))) ?? [];
  } catch {
    return [];
  }
}

async function write(sheetId: string, list: HistoryEntry[]): Promise<void> {
  if (!idbAvailable()) memory.set(sheetId, list);
  else await idbSet(key(sheetId), list);
  listeners.forEach((fn) => fn(sheetId));
}

/** Versões guardadas, da mais nova para a mais antiga. */
export function listHistory(sheetId: string): Promise<HistoryEntry[]> {
  return read(sheetId);
}

/** Avisa quando o histórico de alguma ficha muda (para a tela atualizar). */
export function onHistoryChange(fn: (sheetId: string) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let queue: Promise<unknown> = Promise.resolve();

/** Guarda uma versão (serializado: gravações seguidas não se atropelam). */
export function recordVersion(char: Character, reason: HistoryReason, label: string, at = Date.now()): Promise<void> {
  const snapshot = structuredClone(char);
  const job = queue.then(async () => {
    const list = await read(char.id);
    // a mesma versão de novo (mesmo updatedAt) não precisa de outra entrada
    if (list[0] && list[0].char.updatedAt === snapshot.updatedAt && list[0].reason === reason) return;
    const entry: HistoryEntry = { id: `${at.toString(36)}${Math.random().toString(36).slice(2, 6)}`, at, reason, label, char: snapshot };
    await write(char.id, [entry, ...list].slice(0, MAX_ENTRIES));
  });
  queue = job.catch(() => undefined);
  return job;
}

export async function clearHistory(sheetId: string): Promise<void> {
  memory.delete(sheetId);
  if (idbAvailable()) await idbDel(key(sheetId)).catch(() => undefined);
  listeners.forEach((fn) => fn(sheetId));
}

/* ---------- captura automática ---------- */

const lastAuto = new Map<string, number>();

/**
 * Decide o que guardar quando a ficha muda de `prev` para `next`:
 * subiu de nível → guarda a de antes; primeira edição desde que o app abriu
 * (ou depois de 20 min da última versão guardada) → guarda a de antes, o
 * ponto de partida da sessão.
 */
export function autoCapture(prev: Character, next: Character, now = Date.now()): { reason: HistoryReason; label: string } | null {
  if (prev.draft || next.draft || prev.updatedAt === next.updatedAt) return null;
  if (next.level > prev.level) return { reason: 'levelup', label: `Antes de subir para o nível ${next.level}` };
  if (now - (lastAuto.get(prev.id) ?? 0) < SESSION_GAP_MS) return null;
  return { reason: 'auto', label: 'Antes de uma sessão de edição' };
}

/** Liga a captura automática no store das fichas. Retorna o "desligar". */
export function watchCharacters(subscribe: (fn: (state: { characters: Character[] }, prev: { characters: Character[] }) => void) => () => void): () => void {
  return subscribe((state, prev) => {
    if (state.characters === prev.characters) return;
    const before = new Map(prev.characters.map((c) => [c.id, c]));
    const now = Date.now();
    for (const next of state.characters) {
      const old = before.get(next.id);
      if (!old || old === next) continue;
      const hit = autoCapture(old, next, now);
      if (!hit) continue;
      lastAuto.set(next.id, now);
      void recordVersion(old, hit.reason, hit.label, now).catch(() => undefined);
    }
  });
}

/** Só para testes. */
export function __resetHistory() {
  memory.clear();
  lastAuto.clear();
  queue = Promise.resolve();
}
