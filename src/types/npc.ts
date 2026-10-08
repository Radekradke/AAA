/** NPC da campanha — parte pública (jogadores veem) e segredo (só o mestre). */
export interface CampaignNpc {
  id: string;
  campaignId: string;
  name: string;
  /** Papel na história ("Taverneira de Pedra Branca"). */
  role: string;
  /** O que os jogadores sabem. */
  summary: string;
  /** Retrato pequeno (data URL). */
  portrait: string | null;
  /** Jogadores veem na galeria e nas menções do diário. */
  revealed: boolean;
  /**
   * Criado de improviso nesta sessão (console do mestre). Fica fora da galeria
   * da campanha até o mestre "Guardar na campanha" (vira null).
   */
  improvisedIn: string | null;
  updatedAt: string;
}

export interface NpcStats {
  /** Base do bestiário (ex.: "veteran", "mage"). */
  monsterRef?: string;
  ac?: number;
  hp?: number;
  initiativeBonus?: number;
  level?: number;
  /** Ficha completa do mestre (criada no criador de personagem). */
  sheetId?: string;
}

export interface NpcSecret {
  npcId: string;
  notes: string;
  stats: NpcStats;
}
