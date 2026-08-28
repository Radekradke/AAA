import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { useSaveStatusStore } from '@/store/saveStatusStore';
import { cloudEnabled } from '@/services/supabaseClient';
import { syncNow } from '@/services/offlineSyncService';
import { useOnlineStatus } from './useOnlineStatus';

const SYNC_DEBOUNCE_MS = 4000;

/**
 * Orquestra a sincronização (montar uma vez, no App):
 * - ao logar e ao voltar a conexão → sincroniza;
 * - após edições (debounce de 4 s) → empurra pendências;
 * - convidado/local ou sem Supabase → indicador 'disabled'/'offline'.
 */
export function useCloudSync(): void {
  const user = useAuthStore((s) => s.user);
  const online = useOnlineStatus();
  const canSync = cloudEnabled() && !!user && !user.guest;

  // restaura a sessão persistida do Supabase (login lembrado entre visitas)
  useEffect(() => {
    if (!cloudEnabled() || useAuthStore.getState().user) return;
    void import('@/services/authService').then(({ authService }) =>
      authService.currentUser().then((u) => {
        if (u && !useAuthStore.getState().user) useAuthStore.getState().setUser(u);
      }),
    );
  }, []);

  // estado-base do indicador
  useEffect(() => {
    const status = useSaveStatusStore.getState();
    if (!canSync) status.setCloud('disabled');
    else if (!online) status.setCloud('offline');
    else status.setCloud('pending');
  }, [canSync, online]);

  // login / reconexão
  useEffect(() => {
    if (canSync && online) void syncNow(user!.id);
  }, [canSync, online, user]);

  // edições → push com debounce (autosave na nuvem)
  useEffect(() => {
    if (!canSync) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useCharacterStore.subscribe((state, prev) => {
      if (state.characters === prev.characters && state.pendingDeletes === prev.pendingDeletes) return;
      // pendência real: ficha DESTA conta (rascunho não conta) ainda fora da nuvem
      const pending = state.characters.filter(
        (c) => c.ownerId === user!.id && !c.draft && (c.syncStatus === 'pending' || !c.lastSyncedAt),
      ).length;
      const total = pending + state.pendingDeletes.length;
      useSaveStatusStore.getState().setPending(total);
      if (!navigator.onLine) {
        useSaveStatusStore.getState().setCloud('offline');
        return;
      }
      if (total === 0) return; // nada a enviar — não reagenda sync à toa
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void syncNow(user!.id), SYNC_DEBOUNCE_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [canSync, user]);
}
