/**
 * Sessão ao vivo (multiplayer) — ONLINE-FIRST, separada da ficha.
 * Espelha as tabelas de supabase/multiplayer_session.sql.
 *
 * Campanha (meses/anos) → Sessão (uma noite de jogo) → Encontro (um combate)
 * → Combatentes (jogadores, monstros, NPCs).
 */
export type SessionStatus = 'planned' | 'active' | 'paused' | 'finished';
export type EncounterStatus = 'preparing' | 'active' | 'paused' | 'finished';
export type CombatantType = 'player' | 'monster' | 'npc';
export type EventVisibility = 'public' | 'master' | 'private';

export interface GameSession {
  id: string;
  campaignId: string;
  name: string;
  status: SessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Encounter {
  id: string;
  sessionId: string;
  campaignId: string;
  name: string;
  status: EncounterStatus;
  round: number;
  activeCombatantId: string | null;
  /** Sobe a cada mudança de ordem/turno — protege contra corrida entre navegadores. */
  revision: number;
  startedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
}

export interface Combatant {
  id: string;
  encounterId: string;
  sessionId: string;
  campaignId: string;
  type: CombatantType;
  /** Ficha vinculada (jogadores). */
  sheetId: string | null;
  /** Dono da ficha — pode rolar a própria iniciativa. */
  ownerId: string | null;
  /** Futuro: instância de monstro do bestiário. */
  monsterInstanceId: string | null;
  name: string;
  initiative: number | null;
  initiativeBonus: number;
  turnOrder: number;
  hpCurrent: number | null;
  hpMax: number | null;
  armorClass: number | null;
  conditions: string[];
  /** Oculto dos jogadores (emboscada) — só o mestre vê. */
  hidden: boolean;
  /** Monstros iguais que agem juntos. */
  groupKey: string | null;
  /** Ficha do bestiário (id do SRD), se veio de lá. */
  monsterRef: string | null;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: string;
  actorId: string | null;
  targetId: string | null;
  payload: Record<string, unknown>;
  visibility: EventVisibility;
  createdAt: string;
}

/** Um ataque na crônica: quem, em quem, com o quê, a rolagem contra a CA e o efeito no PV. */
export interface StrikeLog {
  by: string;
  target: string;
  hit: boolean;
  crit: boolean;
  damage: number;
  type?: string;
  note?: string;
  /** Golpe/ação usada (ex.: "Cimitarra"). */
  action?: string;
  /** Total da rolagem de ataque e a CA do alvo. */
  roll?: number;
  ac?: number;
  round?: number;
  hpBefore?: number;
  hpAfter?: number;
}

/** Quem está conectado agora (Supabase Presence). */
export interface PresencePlayer {
  userId: string;
  name: string;
  role: 'master' | 'player';
  characterId: string | null;
  characterName: string | null;
  onlineAt: string;
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';
