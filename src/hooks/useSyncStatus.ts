import { useSaveStatusStore } from '@/store/saveStatusStore';

/** Estado de salvamento/sincronização para a UI (local, nuvem, pendências, conflitos). */
export function useSyncStatus() {
  return useSaveStatusStore();
}
