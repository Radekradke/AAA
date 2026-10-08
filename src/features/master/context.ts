import { createContext, useContext } from 'react';
import type { SharedHero } from '@/components/session/MasterDeck';
import type { CampaignNpc, NpcSecret } from '@/types/npc';
import type { Campaign } from '@/types/models';

/**
 * Dados que o console inteiro usa e que vêm de UMA fonte (o workspace):
 * a campanha, os heróis vinculados e os NPCs com segredos. Uma única
 * assinatura de NPCs para o console todo (antes cada painel abria a sua).
 */
export interface MasterCtx {
  campaign: Campaign;
  userId: string;
  heroes: SharedHero[];
  npcs: CampaignNpc[];
  secrets: Record<string, NpcSecret>;
  reloadNpcs: () => void;
}

export const MasterContext = createContext<MasterCtx | null>(null);

export function useMaster(): MasterCtx {
  const ctx = useContext(MasterContext);
  if (!ctx) throw new Error('useMaster fora do console do mestre');
  return ctx;
}

/** Herói da mesa a partir da ficha (ou do dono) — para destinatários e inspetor. */
export function heroName(h: SharedHero): string {
  return h.snapshot?.name || 'Herói';
}
