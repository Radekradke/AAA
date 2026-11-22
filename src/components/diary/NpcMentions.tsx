import { useEffect, useState } from 'react';
import { npcService } from '@/services/npcService';
import { cloudEnabled } from '@/services/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { CampaignNpc } from '@/types/npc';
import { isCloudAccount } from '@/lib/identity';

/** NPCs revelados das mesas em que a ficha está (com cópia offline). */
export function useSheetNpcs(sheetId: string): CampaignNpc[] {
  const user = useAuthStore((s) => s.user);
  const [npcs, setNpcs] = useState<CampaignNpc[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`fv-npcs-${sheetId}`) ?? '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (!cloudEnabled() || !user || !isCloudAccount(user)) return;
    let alive = true;
    void npcService.forSheet(sheetId).then((l) => alive && setNpcs(l));
    return () => {
      alive = false;
    };
  }, [sheetId, user]);
  return npcs;
}
