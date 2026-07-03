import { useCharacterStore } from '@/store/characterStore';
import { useSaveStatusStore } from '@/store/saveStatusStore';
import { characterSheetService, fromRow } from './characterSheetService';
import { cloudEnabled } from './supabaseClient';
import type { Character } from '@/types/character';
import type { SyncConflict } from '@/types/models';

/**
 * Sincronização offline-first. A verdade local vive no IndexedDB; quando
 * há internet e usuário logado, empurra pendências e puxa novidades.
 *
 * Decisão por ficha (simples de propósito, sem merge):
 * - só local mudou desde a última sync  → push (local vence);
 * - só a nuvem mudou                    → pull (traz da nuvem);
 * - os dois mudaram                     → conflito (usuário escolhe);
 * - nada mudou                          → noop.
 */
export type SyncAction = 'push' | 'pull' | 'conflict' | 'noop';

export function decideSyncAction(
  local: { updatedAt: number; lastSyncedAt?: number },
  remoteUpdatedAt: number | null,
): SyncAction {
  if (remoteUpdatedAt === null) return 'push'; // nunca subiu
  const base = local.lastSyncedAt ?? 0;
  const localChanged = local.updatedAt > base;
  const remoteChanged = remoteUpdatedAt > base;
  if (localChanged && remoteChanged) return 'conflict';
  if (localChanged) return 'push';
  if (remoteChanged) return 'pull';
  return 'noop';
}

let syncing = false;

/** Sincroniza todas as fichas do usuário logado. Seguro chamar repetidamente. */
export async function syncNow(userId: string): Promise<void> {
  if (!cloudEnabled() || syncing) return;
  const status = useSaveStatusStore.getState();
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    status.setCloud('offline');
    return;
  }
  syncing = true;
  status.setCloud('syncing');
  try {
    const store = useCharacterStore.getState();

    // exclusões pendentes primeiro
    for (const id of store.pendingDeletes) {
      await characterSheetService.deleteSheet(id);
    }
    if (store.pendingDeletes.length) {
      useCharacterStore.setState({ pendingDeletes: [] });
    }

    const rows = await characterSheetService.pullSheets(userId);
    const remoteById = new Map(rows.map((r) => [r.id, r]));
    const now = Date.now();
    const conflicts: SyncConflict[] = [];
    const nextChars: Character[] = [];

    for (const local of useCharacterStore.getState().characters) {
      if (local.ownerId !== userId || local.draft) {
        nextChars.push(local);
        continue;
      }
      const remote = remoteById.get(local.id);
      remoteById.delete(local.id);
      const action = decideSyncAction(local, remote ? remote.updated_at : null);
      if (action === 'push') {
        await characterSheetService.pushSheet(local, userId);
        nextChars.push({ ...local, lastSyncedAt: now, syncStatus: 'synced' });
      } else if (action === 'pull') {
        nextChars.push({ ...fromRow(remote!, userId), lastSyncedAt: now, syncStatus: 'synced' });
      } else if (action === 'conflict') {
        conflicts.push({
          sheetId: local.id,
          name: local.name,
          localUpdatedAt: local.updatedAt,
          remoteUpdatedAt: remote!.updated_at,
        });
        nextChars.push({ ...local, syncStatus: 'conflict' });
      } else {
        nextChars.push({ ...local, syncStatus: 'synced' });
      }
    }

    // fichas que só existem na nuvem (outro dispositivo) → baixa
    for (const row of remoteById.values()) {
      nextChars.push({ ...fromRow(row, userId), lastSyncedAt: now, syncStatus: 'synced' });
    }

    useCharacterStore.setState({ characters: nextChars });
    status.setConflicts(conflicts);
    if (!conflicts.length) status.setCloud('synced');
    status.setPending(0);
  } catch (e) {
    status.setCloud('error', e instanceof Error ? e.message : 'Falha ao sincronizar.');
  } finally {
    syncing = false;
  }
}

/** Resolve um conflito mantendo a versão escolhida pelo usuário. */
export async function resolveConflict(userId: string, sheetId: string, keep: 'local' | 'cloud'): Promise<void> {
  const store = useCharacterStore.getState();
  const local = store.characters.find((c) => c.id === sheetId);
  const status = useSaveStatusStore.getState();
  try {
    if (keep === 'local' && local) {
      await characterSheetService.pushSheet(local, userId);
      useCharacterStore.setState({
        characters: store.characters.map((c) =>
          c.id === sheetId ? { ...c, lastSyncedAt: Date.now(), syncStatus: 'synced' } : c,
        ),
      });
    } else {
      const rows = await characterSheetService.pullSheets(userId);
      const remote = rows.find((r) => r.id === sheetId);
      if (remote) {
        useCharacterStore.setState({
          characters: store.characters.map((c) =>
            c.id === sheetId ? { ...fromRow(remote, userId), lastSyncedAt: Date.now(), syncStatus: 'synced' } : c,
          ),
        });
      }
    }
    status.setConflicts(useSaveStatusStore.getState().conflicts.filter((c) => c.sheetId !== sheetId));
  } catch (e) {
    status.setCloud('error', e instanceof Error ? e.message : 'Falha ao resolver conflito.');
  }
}

/* Modo Mestre/Sala (futuro): a mesma malha de sync serve de base — a
   campanha assina mudanças das fichas compartilhadas via Supabase
   Realtime (canal por campaign_id) em vez de pull manual. Conectar em
   services/campaignService.ts quando for implementado. */
