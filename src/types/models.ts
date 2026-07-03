import type { Character } from './character';

/**
 * Modelos da camada de persistência e sincronização.
 * A ficha (Character) já é o snapshot completo do personagem — identidade,
 * atributos, evolução, PV atual, inventário, magias, diário e estado de
 * combate — e é salva inteira (campo snapshot/JSONB na nuvem).
 */

/** Estado de sincronização de uma ficha. */
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'offline';

/** Linha da tabela `sheets` no Supabase (Postgres). */
export interface SheetRow {
  id: string;
  user_id: string;
  title: string;
  character_name: string;
  class_id: string;
  race_id: string;
  level: number;
  /** Versão do schema da ficha (Character.schema) para migrações futuras. */
  sheet_version: number;
  /** Snapshot completo da ficha (JSONB) — o Character inteiro. */
  snapshot: Character;
  /** Timestamps em ms (bigint no banco) para comparação direta com o local. */
  created_at: number;
  updated_at: number;
  last_played_at: number | null;
}

/** Alteração local aguardando envio (fila offline). */
export interface LocalChange {
  sheetId: string;
  kind: 'upsert' | 'delete';
  at: number;
}

/** Conflito detectado: local e nuvem mudaram desde a última sincronização. */
export interface SyncConflict {
  sheetId: string;
  name: string;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
}

/* ============================================================
   Modo Mestre / Sala (fundação — implementar sobre Supabase
   Realtime; ver docs/SUPABASE.md para o SQL correspondente).
   ============================================================ */

/** Campanha/sala criada por um mestre. */
export interface Campaign {
  id: string;
  masterId: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export type CampaignRole = 'master' | 'player';

/** Vínculo usuário ↔ campanha (jogador entra via convite). */
export interface CampaignMember {
  id: string;
  campaignId: string;
  userId: string;
  role: CampaignRole;
  joinedAt: number;
}

/** Link de convite gerado pelo mestre (token único, expira/limita usos). */
export interface InviteLink {
  id: string;
  campaignId: string;
  token: string;
  createdBy: string;
  expiresAt: number | null;
  maxUses: number | null;
  uses: number;
}

/** Permissões que o jogador concede ao mestre sobre a própria ficha. */
export interface MasterPermission {
  /** Ver atributos, perícias, PV, CA, recursos, inventário e magias. */
  view: boolean;
  /** Editar inventário (conceder itens/recompensas). */
  editInventory: boolean;
  /** Escrever anotações de campanha na ficha. */
  editCampaignNotes: boolean;
  /** Alterar XP/nível (recompensas de progressão). */
  editProgression: boolean;
}

/** Ficha compartilhada numa campanha (jogador controla; mestre vê/edita conforme permissões). */
export interface SharedCharacterSheet {
  id: string;
  campaignId: string;
  sheetId: string;
  ownerId: string;
  permissions: MasterPermission;
  sharedAt: number;
}

export const DEFAULT_MASTER_PERMISSION: MasterPermission = {
  view: true,
  editInventory: false,
  editCampaignNotes: true,
  editProgression: false,
};
