import { useCharacterStore } from '@/store/characterStore';
import { useSaveStatusStore } from '@/store/saveStatusStore';
import { characterSheetService, fromRow } from './characterSheetService';
import { cloudEnabled } from './supabaseClient';
import type { Character } from '@/types/character';
import type { SheetRow, SyncConflict } from '@/types/models';
import { recordVersion } from './sheetHistory';

/**
 * Sincronização offline-first. A verdade local vive no IndexedDB; quando
 * há internet e usuário logado, empurra pendências e puxa novidades.
 *
 * Decisão por ficha (simples de propósito, sem merge), contra a BASE — a
 * versão da nuvem que este aparelho viu por último (`syncBase`):
 * - só local mudou desde a base  → push (local vence);
 * - só a nuvem mudou             → pull (traz da nuvem);
 * - os dois mudaram              → conflito (usuário escolhe, vendo a diferença);
 * - nada mudou                   → noop.
 *
 * Comparar versões (e não horários) é o que evita perder dados quando o
 * outro aparelho editou antes mas só subiu depois. Fichas antigas, sem
 * `syncBase`, caem na regra por horário até a primeira sincronização.
 */
export type SyncAction = 'push' | 'pull' | 'conflict' | 'noop';

export function decideSyncAction(
  local: { updatedAt: number; lastSyncedAt?: number; syncBase?: number },
  remoteUpdatedAt: number | null,
): SyncAction {
  if (remoteUpdatedAt === null) return 'push'; // nunca subiu
  let localChanged: boolean;
  let remoteChanged: boolean;
  if (local.syncBase !== undefined) {
    localChanged = local.updatedAt !== local.syncBase;
    remoteChanged = remoteUpdatedAt !== local.syncBase;
  } else {
    const base = local.lastSyncedAt ?? 0;
    localChanged = local.updatedAt > base;
    remoteChanged = remoteUpdatedAt > base;
  }
  if (localChanged && remoteChanged) return 'conflict';
  if (localChanged) return 'push';
  if (remoteChanged) return 'pull';
  return 'noop';
}

/** Resultado por ficha, aplicado no fim sobre o estado ATUAL (edições feitas durante a sync não se perdem). */
type Outcome =
  | { kind: 'pushed'; version: number }
  | { kind: 'pulled'; seen: number; char: Character }
  | { kind: 'conflict'; remote: SheetRow }
  | { kind: 'noop'; seen: number; base: number }
  | { kind: 'raced' };

let syncing = false;

/** UUID do Supabase (id de conta na nuvem). Contas locais/convidado usam `u…`/`guest`. */
const CLOUD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Adoção: fichas criadas como convidado/conta local (ownerId não-UUID)
 * passam para o usuário da nuvem no primeiro login. É o que faz
 * "criei offline (ou com conta local), entrei com Google e sincronizou"
 * funcionar — sem isso as fichas antigas ficam órfãs e nunca sobem.
 */
export function adoptLocalCharacters(userId: string): boolean {
  if (!CLOUD_ID.test(userId)) return false; // só adota para uma conta de nuvem
  const { characters } = useCharacterStore.getState();
  const orphans = characters.filter((c) => c.ownerId !== userId && !CLOUD_ID.test(c.ownerId));
  if (!orphans.length) return false;
  useCharacterStore.setState({
    characters: characters.map((c) =>
      c.ownerId !== userId && !CLOUD_ID.test(c.ownerId)
        ? { ...c, ownerId: userId, syncStatus: 'pending' as const, lastSyncedAt: undefined }
        : c,
    ),
  });
  return true;
}

/** Sincroniza todas as fichas do usuário logado. Seguro chamar repetidamente. */
export async function syncNow(userId: string, retry = 0): Promise<void> {
  if (!cloudEnabled() || syncing) return;
  const status = useSaveStatusStore.getState();
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    status.setCloud('offline');
    return;
  }
  syncing = true;
  status.setCloud('syncing');
  try {
    adoptLocalCharacters(userId); // migra fichas locais/convidado para esta conta
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
    const outcomes = new Map<string, Outcome>();
    let raced = false;

    for (const local of useCharacterStore.getState().characters) {
      if (local.ownerId !== userId || local.draft) continue;
      const remote = remoteById.get(local.id);
      remoteById.delete(local.id);
      const action = decideSyncAction(local, remote ? remote.updated_at : null);
      if (action === 'push') {
        // condicional: só grava se a nuvem ainda estiver na versão que acabamos de ler
        const ok = await characterSheetService.pushSheet(local, userId, remote ? remote.updated_at : null);
        outcomes.set(local.id, ok ? { kind: 'pushed', version: local.updatedAt } : { kind: 'raced' });
        raced ||= !ok;
      } else if (action === 'pull') {
        outcomes.set(local.id, { kind: 'pulled', seen: local.updatedAt, char: fromRow(remote!, userId) });
      } else if (action === 'conflict') {
        outcomes.set(local.id, { kind: 'conflict', remote: remote! });
      } else {
        outcomes.set(local.id, { kind: 'noop', seen: local.updatedAt, base: remote!.updated_at });
      }
    }

    // aplica sobre o estado atual: a ficha pode ter sido editada durante os envios
    const now = Date.now();
    const state = useCharacterStore.getState();
    const conflicts: SyncConflict[] = [];
    const nextChars: Character[] = state.characters.map((c) => {
      const o = outcomes.get(c.id);
      if (!o) return c;
      switch (o.kind) {
        case 'pushed':
          // editada durante o envio → continua pendente, já com a base nova
          return { ...c, syncBase: o.version, lastSyncedAt: now, syncStatus: c.updatedAt === o.version ? 'synced' : 'pending' };
        case 'pulled':
          // editada durante a leitura → fica; a próxima sync vê os dois lados mudados
          return c.updatedAt === o.seen ? { ...o.char, syncBase: o.char.updatedAt, lastSyncedAt: now, syncStatus: 'synced' } : c;
        case 'conflict':
          conflicts.push({ sheetId: c.id, name: c.name, localUpdatedAt: c.updatedAt, remoteUpdatedAt: o.remote.updated_at, remote: fromRow(o.remote, userId) });
          return { ...c, syncStatus: 'conflict' };
        case 'noop':
          return c.updatedAt === o.seen ? { ...c, syncBase: o.base, lastSyncedAt: c.lastSyncedAt ?? now, syncStatus: 'synced' } : c;
        case 'raced':
          return { ...c, syncStatus: 'pending' };
      }
    });

    // fichas que só existem na nuvem (outro dispositivo) → baixa (se não foram apagadas aqui no meio)
    const have = new Set(nextChars.map((c) => c.id));
    for (const row of remoteById.values()) {
      if (have.has(row.id) || state.pendingDeletes.includes(row.id)) continue;
      nextChars.push({ ...fromRow(row, userId), syncBase: row.updated_at, lastSyncedAt: now, syncStatus: 'synced' });
    }

    useCharacterStore.setState({ characters: nextChars });
    status.setConflicts(conflicts);
    if (!conflicts.length) status.setCloud(raced ? 'pending' : 'synced');
    status.setPending(nextChars.filter((c) => c.ownerId === userId && !c.draft && c.syncStatus === 'pending').length);
    // outro aparelho gravou entre a leitura e o envio: mais uma rodada decide (push, pull ou conflito)
    if (raced && retry < 2) setTimeout(() => void syncNow(userId, retry + 1), 0);
  } catch (e) {
    status.setCloud('error', e instanceof Error ? e.message : 'Falha ao sincronizar.');
  } finally {
    syncing = false;
  }
}

/**
 * Resolve um conflito mantendo a versão escolhida pelo usuário. A outra não
 * some: vai para o histórico da ficha (dá para restaurar depois).
 */
export async function resolveConflict(userId: string, sheetId: string, keep: 'local' | 'cloud'): Promise<void> {
  const status = useSaveStatusStore.getState();
  const known = status.conflicts.find((c) => c.sheetId === sheetId);
  try {
    const local = useCharacterStore.getState().characters.find((c) => c.id === sheetId);
    if (keep === 'local' && local) {
      if (known?.remote) await recordVersion(known.remote, 'conflict', 'Versão da nuvem, descartada num conflito');
      await characterSheetService.pushSheet(local, userId); // escolha explícita: grava por cima
      const now = Date.now();
      useCharacterStore.setState((s) => ({
        characters: s.characters.map((c) =>
          c.id === sheetId ? { ...c, syncBase: local.updatedAt, lastSyncedAt: now, syncStatus: c.updatedAt === local.updatedAt ? 'synced' : 'pending' } : c,
        ),
      }));
    } else {
      const rows = await characterSheetService.pullSheets(userId);
      const remote = rows.find((r) => r.id === sheetId);
      if (remote) {
        const current = useCharacterStore.getState().characters.find((c) => c.id === sheetId);
        if (current) await recordVersion(current, 'conflict', 'Versão deste aparelho, descartada num conflito');
        const now = Date.now();
        useCharacterStore.setState((s) => ({
          characters: s.characters.map((c) =>
            c.id === sheetId ? { ...fromRow(remote, userId), syncBase: remote.updated_at, lastSyncedAt: now, syncStatus: 'synced' } : c,
          ),
        }));
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
