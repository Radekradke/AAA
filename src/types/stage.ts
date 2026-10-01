/**
 * Palco da mesa (supabase/palco.sql): o que o mestre põe na tela de todos —
 * mapa tático com peões, imagem de ambientação ou cutscene narrada — e os
 * handouts (cartas, pistas) entregues a um ou a todos os jogadores.
 */
export type SceneKind = 'map' | 'image' | 'cutscene';

/** Grade do mapa, em pixels da imagem original. */
export interface GridConfig {
  /** Lado de uma casa (1,5 m). */
  size: number;
  /** Deslocamento da primeira linha/coluna. */
  ox: number;
  oy: number;
  /** Desenhar a grade por cima (mapas que já têm quadriculado podem esconder). */
  show: boolean;
  /** Mapa sem imagem: tamanho do tabuleiro em casas. */
  cols?: number;
  rows?: number;
  /** Névoa de guerra: com ela ligada, jogadores só veem as áreas reveladas. */
  fog?: FogConfig;
}

/** Retângulo em casas. */
export interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FogConfig {
  on: boolean;
  reveal: CellRect[];
}

/** Ferramentas do mapa (inspiradas em Foundry VTT / Owlbear Rodeo / Dungeon Revealer). */
export type MapTool = 'move' | 'measure' | 'circle' | 'cone' | 'line' | 'square' | 'laser' | 'reveal' | 'cover';
export type MarkKind = 'measure' | 'circle' | 'cone' | 'line' | 'square';

/** Régua ou molde de área desenhado por alguém da mesa (efêmero, por broadcast). */
export interface MapMark {
  id: string;
  by: string;
  who: string;
  color: string;
  kind: MarkKind;
  /** Em casas (fracionárias). */
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export interface LaserTrail {
  by: string;
  color: string;
  points: { x: number; y: number }[];
  at: number;
}

export interface CutsceneBeat {
  path: string | null;
  text: string;
}

export interface Scene {
  id: string;
  campaignId: string;
  kind: SceneKind;
  name: string;
  imagePath: string | null;
  grid: GridConfig;
  beats: CutsceneBeat[];
  revealed: boolean;
  sort: number;
  updatedAt: string;
}

/** O que está no ar para todo mundo agora. */
export interface StageState {
  campaignId: string;
  sceneId: string | null;
  beat: number;
  updatedAt: string;
}

export type TokenKind = 'hero' | 'npc' | 'monster' | 'marker';

export interface Token {
  id: string;
  sceneId: string;
  campaignId: string;
  kind: TokenKind;
  label: string;
  sheetId: string | null;
  ownerId: string | null;
  npcId: string | null;
  combatantId: string | null;
  monsterRef: string | null;
  color: string | null;
  /** Retrato enviado pelo mestre (Storage) — vence a arte da ficha/NPC. */
  imagePath: string | null;
  /** Posição em casas (canto superior esquerdo). */
  x: number;
  y: number;
  /** Tamanho em casas (1 = Médio, 2 = Grande…). */
  size: number;
  hidden: boolean;
}

export interface Handout {
  id: string;
  campaignId: string;
  title: string;
  body: string;
  imagePath: string | null;
  /** null = todos da mesa. */
  recipients: string[] | null;
  shownAt: string | null;
  createdAt: string;
}

export interface StagePing {
  id: string;
  x: number;
  y: number;
  color: string;
  who: string;
}

export const DEFAULT_GRID: GridConfig = { size: 70, ox: 0, oy: 0, show: true };
/** Cada casa vale 1,5 m (5 pés) — Livro do Jogador. */
export const CELL_METERS = 1.5;
