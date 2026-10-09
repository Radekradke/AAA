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
  /** Sintonia restrita (copiada do catálogo; itens novos leem do catálogo). */
  attuneBy?: string[];
  /** Efeitos automáticos de item mágico (ver MagicEffects). */
  magic?: import('./dnd').MagicEffects;
  /** Dados de cura ao beber/usar (poções). */
  heal?: string;
  /** Valor aproximado em peças de ouro. */
  value?: number;
  /**
   * Magias concedidas pelo item (estilo BG3): um bastão pode dar "Criar Água"
   * à vontade, um arco pode dar "Raio de Gelo" 1×/descanso curto, etc.
   * Só valem quando o item está equipado ou sintonizado.
   */
  grantsSpells?: ItemSpellGrant[];
  /** Cargas do item (cajados, varinhas…). */
  charges?: ItemCharges;
  /** Item criado/alterado pelo usuário (Forja) — marcado visualmente. */
  homebrew?: boolean;
  /**
   * Como o item é usado (Forja): `worn` = vestível (amuleto, capa, botas…),
   * vale enquanto vestido; `body` = parte do corpo (olho, braço, implante…),
   * vale sempre e não sai do personagem. Sem valor: item comum.
   */
  wear?: 'worn' | 'body';
  /** Vestível: está vestido agora. */
  worn?: boolean;
  /** Arte do item (opcional): vira uma carta ao lado dos detalhes. */
  image?: string | null;
  /**
   * Onde o item fica quando NÃO está equipado (escolha do jogador ao arrastar
   * ou em "Guardar no Baú"). Sem valor: tesouros e itens mágicos vão ao Baú,
   * o resto à Mochila.
   */
  location?: 'mochila' | 'bau';
}

/** Efeito de magia ativo no personagem — somado pela ficha até acabar. */
export interface ActiveSpellEffect {
  spellId: string;
  name: string;
  /** Quando acaba: no início do seu próximo turno, ao romper a concentração, ou no descanso longo. */
  until: 'turn' | 'concentration' | 'rest';
  /** Resumo curto para o chip ("+5 CA", "CA 13 + DES"…). */
  label: string;
  ac?: number;
  /** CA base alternativa sem armadura (Armadura Arcana: 13 + DES). */
  acBase?: number;
  /** CA mínima (Pele de Árvore: 16). */
  acMin?: number;
  speed?: number;
  /** Deslocamento dobrado (Acelerar). */
  speedDouble?: boolean;
  maxHp?: number;
  /** PV temporários renovados no início de cada turno (Heroísmo). */
  tempPerTurn?: number;
}

/** Magia concedida por um item (recarga por descanso ou à vontade). */
export interface ItemSpellGrant {
  spellId: string;
  /** 'atwill' = à vontade (como truque); 'short'/'long' = por descanso. */
  recharge: 'atwill' | 'short' | 'long';
  /** Quantos usos por descanso (recharge short/long). Padrão 1. */
  uses?: number;
  /** Item com cargas: quantas cargas a magia gasta (padrão 1). */
  cost?: number;
  /** Cargas por círculo (Cajado da Cura: Curar Ferimentos, 1 carga por círculo até `maxLevel`). */
  perLevel?: boolean;
  /** Círculo máximo com `perLevel`. */
  maxLevel?: number;
  /** Conjura sempre neste círculo (Cajado do Poder: Bola de Fogo de 5º). */
  castLevel?: number;
  /** Cada carga extra sobe 1 círculo (Varinha de Bolas de Fogo, de Mísseis Mágicos). */
  upcast?: boolean;
  /** CD fixa do item (varinhas: 15). Sem valor: usa a CD de quem empunha. */
  dc?: number;
}

/** Cargas de um item mágico (cajados, varinhas, alguns anéis). */
export interface ItemCharges {
  max: number;
  /** Quanto volta ao amanhecer (no app: no descanso longo) — dados ("1d6+4") ou "all". */
  regain: string;
  /** Ao gastar a última carga, rola-se um d20: no 1 acontece isto. */
  emptyRisk?: { text: string; remove?: boolean };
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

/** Companheiro, montaria ou familiar do herói (base do catálogo ou livre). */
export interface Ally {
  id: string;
  kind: 'companheiro' | 'montaria' | 'familiar';
  name: string;
  /** Fera de base (data/beasts); sem base = criatura livre (homebrew). */
  beastId?: string | null;
  portrait?: string | null;
  hpCurrent?: number;
  /** Ajustes livres (sobrepõem a base). */
  hpMax?: number;
  ac?: number;
  speed?: string;
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
  /** Campos antigos (antes da Crônica de texto livre): lidos só se `body` não existir. */
  summary: string;
  npcs: string;
  locations: string;
  quests: string;
  treasure: string;
  notes: string;
  /** Número da sessão (1, 2, 3…). */
  session?: number;
  /** Texto livre da sessão, com @NPC/@Herói e #Lugar. */
  body?: string;
  /** Criada em (ms). */
  at?: number;
}

/* ---------------- Diário do jogador (pessoal, fica na ficha) ---------------- */

export type DiaryNoteColor = 'gold' | 'red' | 'green' | 'blue' | 'violet';

/** Rabisco: anotação rápida tipo post-it. */
export interface DiaryNote {
  id: string;
  text: string;
  color?: DiaryNoteColor;
  pinned?: boolean;
  done?: boolean;
  at: number;
}

export interface DiaryObjective {
  id: string;
  text: string;
  done: boolean;
}

/** Missão do Quadro da Guilda. */
export interface DiaryQuest {
  id: string;
  title: string;
  status: 'rumor' | 'active' | 'done' | 'failed';
  giver?: string;
  reward?: string;
  deadline?: string;
  priority?: 'low' | 'normal' | 'high';
  objectives: DiaryObjective[];
  notes?: string;
  at: number;
}

/** Pista do mural de investigação. */
export interface DiaryClue {
  id: string;
  title: string;
  text: string;
  source?: string;
  status: 'unverified' | 'confirmed' | 'false';
  verdict?: string;
  /** Imagem comprimida (data URL). */
  image?: string;
  questId?: string;
  /** Veio de um handout do mestre (a imagem fica no armazenamento da mesa). */
  handoutId?: string;
  handoutImage?: string | null;
  at: number;
}

/** O que o jogador acha de alguém citado (página Pessoas). */
export interface DiaryPersonNote {
  opinion?: 'ally' | 'neutral' | 'suspect' | 'enemy';
  note?: string;
}

export interface Diary {
  notes: DiaryNote[];
  quests: DiaryQuest[];
  clues: DiaryClue[];
  /** Chave = nome normalizado da pessoa. */
  people: Record<string, DiaryPersonNote>;
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
  /** `sneak`: Ataque Furtivo já usado neste turno (limpa no "Novo turno"). */
  turn: { action: boolean; bonus: boolean; reaction: boolean; sneak?: boolean };
  moveUsed: number;
  conditions: string[];
  /** Níveis de exaustão (0–6, PHB 2014). Opcional para fichas antigas. */
  exhaustion?: number;
  /** Concentração ativa numa magia (lembrete de salvaguarda de CON). */
  concentration?: boolean;
  /**
   * Efeitos ligados que somam dano a cada acerto: Bruxaria, Marca do Caçador
   * (somem ao romper a concentração) e Fúria (some no descanso).
   */
  marks?: Array<'hex' | 'huntersMark' | 'rage'>;
  /** Magias com efeito ativo em você (Armadura Arcana, Escudo, Auxílio…). */
  spellEffects?: ActiveSpellEffect[];
  /** Magias conjuradas neste turno (mostra "usado" até o Novo turno). */
  castThisTurn?: string[];
  /** Recursos de classe consumidos (id -> usados). */
  resources: Record<string, number>;
  /** Usos gastos de magias concedidas por itens (chave `uid:spellId` -> usados). */
  itemSpellUses?: Record<string, number>;
  /** Cargas gastas de itens com cargas (uid -> gastas). */
  itemCharges?: Record<string, number>;
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
  /** Escolhas de classe feitas neste nível (chave `classe.chave` → ids). */
  choices?: Record<string, string[]>;
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
  /**
   * Retrato enviado pelo jogador (data URL WebP ≈ 40–150 KB, já reduzido e
   * recortado). Sem valor: arte da raça/aparência ou a arte padrão.
   */
  portrait?: string | null;
  // identidade
  raceId: string;
  subraceId: string | null;
  /** Atributos escolhidos no bônus racial à escolha (Meio-Elfo). */
  raceAbilityChoice?: AbilityKey[];
  /**
   * Origem personalizada (Caldeirão de Tasha): bônus raciais redistribuídos e
   * perícias/idiomas da raça trocados. Ausente = regras normais da raça.
   */
  customOrigin?: {
    /** Bônus de atributo da raça, já redistribuídos (substituem os da raça). */
    asi?: Partial<Record<AbilityKey, number>>;
    /** Perícia da raça → perícia escolhida no lugar. */
    skillSwap?: Record<string, import('./dnd').SkillKey>;
    /** Idioma da raça → idioma escolhido no lugar. */
    langSwap?: Record<string, string>;
  } | null;
  /** Raça homebrew usada por esta ficha (cópia embutida: funciona offline e na tela do mestre). */
  customRace?: import('./dnd').Race | null;
  classId: string;
  backgroundId: string;
  alignment: string;
  age: string;
  concept: string;
  level: number;
  /** Pontos de experiência acumulados (opcional: mesas por marco não usam). */
  xp?: number;
  /**
   * Ordens do mestre já aplicadas nesta ficha (ids de eventos da mesa ao
   * vivo). Fica na ficha — que sincroniza — para o celular e o PC não
   * aplicarem o mesmo dano duas vezes.
   */
  appliedEvents?: string[];
  /** Feitos da carta (contadores + quando cada selo foi conquistado). */
  deeds?: import('@/engine/deeds').HeroDeeds;
  /** Cicatrizes gravadas na carta (mestre ou jogador). */
  scars?: import('@/engine/deeds').Scar[];
  /** Título exibido sob o nome (id de um feito conquistado que dá título). */
  title?: string | null;
  /** Dado conquistado escolhido (data/diceTrophies); null = o do tema. */
  diceSkin?: string | null;
  /** Sessões da mesa ao vivo jogadas com esta ficha (linha da jornada). */
  sessions?: { id: string; name: string; at: string }[];
  /** Níveis por classe (pronto para multiclasse). */
  classLevels: { classId: string; level: number }[];
  subclassId: string | null;
  /** Talentos escolhidos (ids de data/feats). */
  feats: string[];
  /**
   * Escolhas de classe acumuladas (Metamagia, Estilo de Luta, Manobras…):
   * chave `classe.chave` → ids das opções (ver data/classChoices).
   */
  choices?: Record<string, string[]>;
  /** Companheiro de Patrulheiro (Mestre das Feras): nome e PV atuais. A fera vem de `choices['ranger.companion']`. */
  companion?: { name?: string; hpCurrent?: number; portrait?: string | null };
  /** Companheiros, montarias e familiares (qualquer herói), com carta e retrato próprios. */
  allies?: Ally[];
  /** Trocas de magia conhecida disponíveis (1 por nível ganho em classe de magias conhecidas). */
  spellSwaps?: number;
  /** Mago: magias copiadas para o grimório pagando ouro (não gastam as grátis do nível). */
  spellbookCopied?: string[];
  /** Aumentos de atributo acumulados por ASI/talentos. */
  asiBonuses: Partial<AbilityScores>;
  /** Linha do tempo de evolução, nível a nível. */
  levelHistory: LevelUpRecord[];
  /** Legado (PHB 2014: tem/não tem). Espelha `inspirationPoints > 0`. */
  inspiration: boolean;
  /** Pontos de Inspiração acumulados (mesas que deixam acumular). */
  inspirationPoints?: number;
  campaign: CampaignSettings;
  // atributos base (antes dos bônus raciais)
  baseAbilities: AbilityScores;
  /** Como os atributos foram gerados na criação (lembrado ao voltar à etapa). */
  abilityMethod?: 'array' | 'pointbuy' | 'roll' | 'manual';
  /** 4d6 de cada uma das 6 rolagens (o menor é descartado) — para o mestre conferir. */
  abilityRolls?: number[][];
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
  /** Kit inicial escolhido na criação (Livro do Jogador: opções "(a) ou (b)"). */
  startingKit?: Record<string, { option: string; picks?: string[] }>;
  inventory: InventoryItem[];
  equipped: EquippedSlots;
  knownSpells: string[];
  preparedSpells: string[];
  // narrativa
  journal: JournalEntry[];
  notes: string;
  /** Diário pessoal: rabiscos, missões, pistas e pessoas. */
  diary?: Diary;
  // estado de jogo
  combat: CombatState;
  createdAt: number;
  updatedAt: number;
  /** Última sincronização com a nuvem (ms); ausente = nunca sincronizada. */
  lastSyncedAt?: number;
  /**
   * Versão da nuvem (`updated_at`) que este aparelho viu por último — a base
   * comum dos dois lados. Mudou na nuvem = `updated_at` diferente dela; mudou
   * aqui = `updatedAt` diferente dela. Não depende do relógio dos aparelhos.
   */
  syncBase?: number;
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
