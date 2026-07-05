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
  /** Valor aproximado em peças de ouro. */
  value?: number;
  /** Item criado/alterado pelo usuário (Forja) — marcado visualmente. */
  homebrew?: boolean;
}

/** Proficiência com ferramenta (id do catálogo ou rótulo livre). */
export interface ToolProf {
  id: string;
  label: string;
  /** Expertise: dobra o bônus de proficiência (ex.: Ladino com Ferramentas de Ladrão). */
  expertise?: boolean;
  /** Origem (antecedente, classe, manual…). */
  source?: string;
  /** Atributo preferido para rolar (sobrepõe o padrão do catálogo). */
  ability?: AbilityKey;
  /** Bônus manual extra (itens, situações fixas). */
  manualBonus?: number;
  notes?: string;
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
  /** Níveis de exaustão (0–6, PHB 2014). Opcional para fichas antigas. */
  exhaustion?: number;
  /** Concentração ativa numa magia (lembrete de salvaguarda de CON). */
  concentration?: boolean;
  /** Recursos de classe consumidos (id -> usados). */
  resources: Record<string, number>;
  spellSlots: Record<number, SpellSlotState>;
}

/** Escolha de ASI/talento registrada num nível. */
export type AsiChoice =
  | { kind: 'asi'; increases: Partial<AbilityScores> }
  | { kind: 'feat'; featId: string; ability?: AbilityKey };

/** Registro de um nível ganho — a linha do tempo de evolução. */
export interface LevelUpRecord {
  /** Nível total do personagem após este ganho. */
  level: number;
  classId: string;
  /** Nível naquela classe após este ganho. */
  classLevel: number;
  /** Como o PV foi obtido neste nível. */
  hpMethod: 'media' | 'rolagem' | 'manual';
  /** Valor do dado/média/manual, SEM o modificador de CON (aplicado no cálculo). */
  hpValue: number;
  /** Características de classe/subclasse ganhas neste nível. */
  features: string[];
  asi?: AsiChoice;
  /** Subclasse escolhida neste nível, se aplicável. */
  subclassId?: string;
  /** Registro sintetizado na migração (média), não escolhido pelo jogador. */
  synthetic?: boolean;
  at: number;
}

/** Configurações da campanha que regem validação de regras. */
export interface CampaignSettings {
  system: '5e-2014';
  allowFeats: boolean;
  allowMulticlass: boolean;
  allowHomebrew: boolean;
  /** Método padrão de PV ao subir de nível. */
  hpMode: 'media' | 'rolagem' | 'manual';
  /** Permite edição manual de atributos pelo mestre (modal Editar). */
  dmEdit: boolean;
}

export const DEFAULT_CAMPAIGN: CampaignSettings = {
  system: '5e-2014',
  allowFeats: true,
  allowMulticlass: false,
  allowHomebrew: true,
  hpMode: 'media',
  dmEdit: true,
};

export interface Character {
  /** Versão do schema para migrações seguras. */
  schema?: number;
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
  /** Níveis por classe (pronto para multiclasse). */
  classLevels: { classId: string; level: number }[];
  subclassId: string | null;
  /** Talentos escolhidos (ids de data/feats). */
  feats: string[];
  /** Aumentos de atributo acumulados por ASI/talentos. */
  asiBonuses: Partial<AbilityScores>;
  /** Linha do tempo de evolução, nível a nível. */
  levelHistory: LevelUpRecord[];
  inspiration: boolean;
  campaign: CampaignSettings;
  // atributos base (antes dos bônus raciais)
  baseAbilities: AbilityScores;
  // proficiências
  skillProfs: SkillKey[];
  /** Perícias com expertise (bônus de proficiência em dobro). */
  skillExpertise: SkillKey[];
  savingThrowProfs: AbilityKey[];
  /** Proficiências com ferramentas, kits, instrumentos e veículos. */
  toolProfs: ToolProf[];
  /** Idiomas além dos raciais (antecedente/escolhas). */
  extraLanguages: string[];
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
  /** Última sincronização com a nuvem (ms); ausente = nunca sincronizada. */
  lastSyncedAt?: number;
  /** Estado de sincronização ('synced' | 'pending' | 'conflict' | 'offline'). */
  syncStatus?: import('./models').SyncStatus;
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
