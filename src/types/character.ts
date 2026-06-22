import type { AbilityKey, AbilityScores, SkillKey } from './dnd';

/** Moedas de D&D 5e. */
export type CoinKey = 'pp' | 'gp' | 'ep' | 'sp' | 'cp';
export type Coins = Record<CoinKey, number>;

export interface InventoryItem {
  /** Identificador único da instância na mochila. */
  uid: string;
  /** Referência ao item base do catálogo (quando existir). */
  itemId?: string;
  name: string;
  category: string;
  note: string;
  rarity: string;
  weight: number;
  quantity: number;
  favorite: boolean;
  attuned: boolean;
  /** Dados embutidos (para itens criados pelo usuário / homebrew). */
  weapon?: import('./dnd').WeaponData;
  armor?: import('./dnd').ArmorData;
  acBonus?: number;
  attunement?: boolean;
}

export interface EquippedSlots {
  armor: string | null;
  shield: string | null;
  mainHand: string | null;
  offHand: string | null;
  ranged: string | null;
}

export interface JournalEntry {
  id: string;
  title: string;
  date: string;
  summary: string;
  npcs: string;
  locations: string;
  quests: string;
  treasure: string;
  notes: string;
}

export interface SpellSlotState {
  used: number;
  max: number;
}

/** Estado efêmero de combate — reiniciado por descanso/turno. */
export interface CombatState {
  hpTemp: number;
  hitDiceRemaining: number;
  deathSaves: { success: number; fail: number };
  turn: { action: boolean; bonus: boolean; reaction: boolean };
  moveUsed: number;
  conditions: string[];
  /** Recursos de classe consumidos (id -> usados). */
  resources: Record<string, number>;
  spellSlots: Record<number, SpellSlotState>;
}

export interface Character {
  id: string;
  ownerId: string;
  name: string;
  gender: 'masc' | 'fem';
  // identidade
  raceId: string;
  subraceId: string | null;
  classId: string;
  backgroundId: string;
  alignment: string;
  age: string;
  concept: string;
  level: number;
  // atributos base (antes dos bônus raciais)
  baseAbilities: AbilityScores;
  // proficiências
  skillProfs: SkillKey[];
  savingThrowProfs: AbilityKey[];
  // vitalidade
  hpCurrent: number;
  // recursos / posses
  coins: Coins;
  inventory: InventoryItem[];
  equipped: EquippedSlots;
  knownSpells: string[];
  preparedSpells: string[];
  // narrativa
  journal: JournalEntry[];
  notes: string;
  // estado de jogo
  combat: CombatState;
  createdAt: number;
  updatedAt: number;
  /** Personagem ainda em criação (rascunho). */
  draft?: boolean;
}

/** Conta de usuário simples (local). */
export interface User {
  id: string;
  name: string;
  email: string | null;
  guest: boolean;
}
