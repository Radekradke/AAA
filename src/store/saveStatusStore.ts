import { create } from 'zustand';
import type { SyncConflict } from '@/types/models';

export type LocalSaveState = 'idle' | 'saving' | 'saved';
export type CloudSaveState =
  | 'disabled' // Supabase não configurado ou usuário offline/convidado
  | 'offline' // sem internet, alterações pendentes
  | 'pending' // online, aguardando sincronizar
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'error';

interface SaveStatusState {
  local: LocalSaveState;
  cloud: CloudSaveState;
  pendingCount: number;
  conflicts: SyncConflict[];
  lastError: string | null;
  setLocal: (s: LocalSaveState) => void;
  setCloud: (s: CloudSaveState, error?: string | null) => void;
  setPending: (n: number) => void;
  setConflicts: (c: SyncConflict[]) => void;
}

/** Estado discreto de salvamento — alimentado pela persistência e pela sync. */
export const useSaveStatusStore = create<SaveStatusState>((set) => ({
  local: 'idle',
  cloud: 'disabled',
  pendingCount: 0,
  conflicts: [],
  lastError: null,
  setLocal: (local) => set({ local }),
  setCloud: (cloud, lastError = null) => set({ cloud, lastError }),
  setPending: (pendingCount) => set({ pendingCount }),
  setConflicts: (conflicts) =>
    set((s) => ({
      conflicts,
      cloud: conflicts.length ? 'conflict' : s.cloud === 'conflict' ? 'synced' : s.cloud,
    })),
}));
