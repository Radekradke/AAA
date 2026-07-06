/**
 * Tipos base do domínio D&D 5e usados pela engine e pelos dados.
 * Mantidos genéricos e expansíveis — fáceis de estender com homebrew.
 */

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export type AbilityScores = Record<AbilityKey, number>;

export type SkillKey =
  | 'acrobatics'
  | 'animalHandling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleightOfHand'
  | 'stealth'
  | 'survival';

/** Categoria mecânica da classe — define se conjura magias. */
export type ClassKind = 'Marcial' | 'Conjurador' | 'Pacto';

export interface Race {
  id: string;
  label: string;
  mono: string;
  jewel: string;
  /** Bônus de atributo concedidos pela raça (somados ao valor base). */
  abilityBonus: Partial<AbilityScores>;
  /** Texto curto do bônus para exibição. */
  bonus: string;
  desc: string;
  traits: string[];
  speed: number;
  /** Alcance da visão no escuro em metros (PHB 2014); ausente = sem visão no escuro. */
  darkvision?: number;
  /** Idiomas concedidos pela raça. */
  languages?: string[];
  /** Resistências a dano concedidas pela raça. */
  resistances?: string[];
  /** Proficiências em perícia automáticas (ex.: Elfo → Percepção). */
  skillProfs?: SkillKey[];
  /** Perícias extras à escolha do jogador (ex.: Meio-Elfo → 2). */
  extraSkillPicks?: number;
  /** Vídeo de fundo próprio da raça na criação (opcional; cai no padrão). */
  video?: string;
}

export interface Subrace {
  id: string;
  label: string;
  abilityBonus?: Partial<AbilityScores>;
  /** Texto curto do bônus para exibição. */
  bonus?: string;
  /** Ajuste de deslocamento em metros. */
  speedBonus?: number;
  /** PV adicionais por nível, usado por linhagens como Anão da Colina. */
  hpPerLevel?: number;
  /** Substitui o alcance de visão no escuro da raça (ex.: Drow 36 m). */
  darkvision?: number;
  resistances?: string[];
  traits?: string[];
}

/** Fonte oficial de um talento/antecedente. */
export type SourceBook = 'PHB 2014' | 'XGE';

/** Talento (PHB 2014 / Xanathar) com efeitos mecânicos rastreáveis. */
export interface Feat {
  id: string;
  label: string;
  /** Resumo parafraseado curto — nunca texto integral dos livros. */
  desc: string;
  source: SourceBook;
  /** Pré-requisito em texto (exibição). */
  prereq?: string;
  /** Valores mínimos de atributo exigidos (validados na evolução). */
  prereqAbility?: Partial<AbilityScores>;
  /** Raças que podem escolher (talentos raciais de Xanathar). */
  prereqRaces?: string[];
  /** Exige capacidade de conjurar magias. */
  prereqCaster?: boolean;
  /** Regras especiais / observações de mesa. */
  notes?: string;
  /** +1 em um atributo à escolha entre estes (meio-talentos). */
  abilityChoice?: AbilityKey[];
  /** PV adicionais por nível (Durão). */
  hpPerLevel?: number;
  /** Bônus de deslocamento em metros (Móbil). */
  speedBonus?: number;
  /** Bônus de iniciativa (Alerta). */
  initiativeBonus?: number;
  /** Bônus de Percepção passiva (Observador). */
  passivePerceptionBonus?: number;
}

/** Subclasse (PHB 2014): arquetipo com características por nível de classe. */
/**
 * Bônus mecânicos SEMPRE ATIVOS de uma subclasse (aplicados no
 * deriveCharacter). Características de uso ativo (Canalizar Divindade,
 * manobras, ki, etc.) continuam como texto — só o que é passivo e
 * derivável entra aqui.
 */
export interface SubclassBonus {
  /** PV extra por nível de personagem (ex.: Resiliência Dracônica +1). */
  hpPerLevel?: number;
  /** CA sem armadura alternativa (ex.: Dracônico 13 + DES). */
  unarmoredAC?: { base: number; ability: AbilityKey };
  /** Bônus fixo de CA. */
  acBonus?: number;
  /** Deslocamento extra (metros). */
  speedBonus?: number;
  /** Bônus de iniciativa. */
  initiativeBonus?: number;
  /** Resistências a dano concedidas. */
  resistances?: string[];
  /** Proficiências concedidas (rótulos, para exibição). */
  proficiencies?: string[];
  /**
   * Faixa de crítico por nível de classe (ex.: { 3: 19, 15: 18 } =
   * crítico em 19–20 a partir do nível 3 e 18–20 a partir do 15).
   */
  critRange?: Record<number, number>;
}

export interface Subclass {
  id: string;
  classId: string;
  label: string;
  desc: string;
  /** Características: nível de classe → nomes. */
  features: Record<number, string[]>;
  /** Bônus mecânicos passivos (aplicados automaticamente na ficha). */
  bonuses?: SubclassBonus;
}

export interface DndClass {
  id: string;
  label: string;
  mono: string;
  /** Dado de vida, ex.: 'd10'. */
  die: string;
  hitDie: number;
  /** Atributo primário (chave). */
  prim: AbilityKey;
  primShort: string;
  kind: ClassKind;
  jewel: string;
  blurb: string;
  /** Atributos com proficiência em teste de resistência. */
  savingThrows: AbilityKey[];
  /** Perícias entre as quais o jogador escolhe. */
  skillChoices: SkillKey[];
  /** Quantas perícias o jogador escolhe. */
  skillPicks: number;
  /** Recursos especiais de combate por classe. */
  resources?: ClassResourceDef[];
  /** Proficiências com ferramentas concedidas pela classe (ids de data/tools). */
  tools?: string[];
  spellcasting?: boolean;
  /**
   * Atributo de conjuração, quando diferente do primário (PHB 2014).
   * Ex.: Patrulheiro tem primário DES, mas conjura com Sabedoria.
   * Ausente = usa `prim`.
   */
  spellAbility?: AbilityKey;
  /** Vídeo de fundo próprio da classe na criação (prioridade sobre a raça). */
  video?: string;
}

export interface ClassResourceDef {
  id: string;
  label: string;
  desc: string;
  /** Recupera em descanso curto ou longo. */
  recharge: 'short' | 'long';
  /** Quantidade total (por nível 1 base; expansível). */
  max: number;
}

export interface Background {
  id: string;
  label: string;
  desc: string;
  /** Nome da característica de antecedente (PHB 2014). */
  featureName?: string;
  /** Traço narrativo curto usado para explicar o impacto do antecedente. */
  feature: string;
  /** Perícias concedidas pelo antecedente. */
  skills: SkillKey[];
  /** Ferramentas concedidas (ids de data/tools ou rótulos livres). */
  tools?: string[];
  /** Quantos idiomas adicionais o jogador escolhe. */
  languagesCount?: number;
  /** Equipamento inicial concedido (itens de mochila em texto). */
  equipment?: string[];
  /** Moedas iniciais do antecedente (po). */
  startingGold?: number;
  source?: SourceBook;
  /** Atributos que combinam com as perícias do antecedente e ajudam na distribuição. */
  suggestedAbilities: AbilityKey[];
}

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'gear'
  | 'tool'
  | 'consumable'
  | 'wondrous'
  | 'ring'
  | 'treasure'
  | 'other';

export type Rarity = 'comum' | 'incomum' | 'raro' | 'muito-raro' | 'lendario';

export type WeaponType = 'simple' | 'martial';
export type WeaponRange = 'melee' | 'ranged';
export type DamageType =
  | 'cortante'
  | 'perfurante'
  | 'concussão'
  | 'fogo'
  | 'gelo'
  | 'ácido'
  | 'elétrico'
  | 'radiante'
  | 'necrótico'
  | 'força'
  | 'veneno'
  | 'psíquico'
  | 'trovejante';

export interface WeaponData {
  /** Número de dados de dano (geralmente 1). */
  damageDice: number;
  damageDie: number;
  damageType: DamageType;
  type: WeaponType;
  range: WeaponRange;
  /** Propriedades em português (Leve, Versátil, Acuidade, etc.). */
  properties: string[];
  /** Dado de dano alternativo para armas Versáteis (empunhadura a duas mãos). */
  versatileDie?: number;
  /**
   * Dano extra de OUTRO tipo (ex.: +2d6 fogo numa Lâmina Flamejante).
   * Rolado junto do dano da arma, sem somar o modificador de atributo,
   * e dobra os dados no crítico como qualquer dano de arma.
   */
  bonusDamage?: { dice: number; die: number; type: DamageType };
  /** Bônus mágico estruturado (+1/+2/+3) somado em acerto e dano. */
  magicBonus?: number;
  /** Usa Destreza no ataque/dano (acuidade ou arma à distância). */
  finesse?: boolean;
  thrown?: boolean;
  /** Distância "normal/longa" em metros para descrição. */
  rangeLabel?: string;
}

export interface ArmorData {
  /** CA base concedida. */
  baseAC: number;
  category: 'leve' | 'média' | 'pesada';
  /** Soma o modificador de Destreza (com teto para médias). */
  addDex: boolean;
  maxDexBonus?: number;
  /** Requisito mínimo de Força (penalidade de deslocamento ignorada por simplicidade). */
  strReq?: number;
  stealthDisadvantage?: boolean;
}

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  note: string;
  rarity: Rarity;
  weight: number;
  /** Pode receber sintonia (attunement). */
  attunement?: boolean;
  weapon?: WeaponData;
  armor?: ArmorData;
  /** Bônus de CA fixo (escudos, anéis de proteção). */
  acBonus?: number;
}

export interface Spell {
  id: string;
  level: number;
  name: string;
  school: string;
}

export interface RarityDef {
  label: string;
  color: string;
}

export interface ThemeDef {
  bg: string;
  bg2: string;
  panel: string;
  panel2: string;
  steel: string;
  line: string;
  acc: string;
  acc2: string;
  accSoft: string;
  gold: string;
  goldB: string;
  ink: string;
  muted: string;
  danger: string;
  bloom: string;
  particle: string;
  label: string;
}

export type ThemeName = 'frio' | 'brasa' | 'verdejante';
