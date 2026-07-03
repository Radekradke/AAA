import type { AbilityKey, SkillKey } from '@/types/dnd';

export interface SkillDef {
  key: SkillKey;
  label: string;
  ability: AbilityKey;
}

/** As 18 perícias de D&D 5e, com rótulos em português. */
export const SKILLS: SkillDef[] = [
  { key: 'acrobatics', label: 'Acrobacia', ability: 'dex' },
  { key: 'animalHandling', label: 'Adestrar Animais', ability: 'wis' },
  { key: 'arcana', label: 'Arcanismo', ability: 'int' },
  { key: 'athletics', label: 'Atletismo', ability: 'str' },
  { key: 'deception', label: 'Enganação', ability: 'cha' },
  { key: 'history', label: 'História', ability: 'int' },
  { key: 'insight', label: 'Intuição', ability: 'wis' },
  { key: 'intimidation', label: 'Intimidação', ability: 'cha' },
  { key: 'investigation', label: 'Investigação', ability: 'int' },
  { key: 'medicine', label: 'Medicina', ability: 'wis' },
  { key: 'nature', label: 'Natureza', ability: 'int' },
  { key: 'perception', label: 'Percepção', ability: 'wis' },
  { key: 'performance', label: 'Atuação', ability: 'cha' },
  { key: 'persuasion', label: 'Persuasão', ability: 'cha' },
  { key: 'religion', label: 'Religião', ability: 'int' },
  { key: 'sleightOfHand', label: 'Prestidigitação', ability: 'dex' },
  { key: 'stealth', label: 'Furtividade', ability: 'dex' },
  { key: 'survival', label: 'Sobrevivência', ability: 'wis' },
];

export const SKILL_BY_KEY: Record<SkillKey, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.key, s]),
) as Record<SkillKey, SkillDef>;

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'Força',
  dex: 'Destreza',
  con: 'Constituição',
  int: 'Inteligência',
  wis: 'Sabedoria',
  cha: 'Carisma',
};

export const ABILITY_SHORT: Record<AbilityKey, string> = {
  str: 'FOR',
  dex: 'DES',
  con: 'CON',
  int: 'INT',
  wis: 'SAB',
  cha: 'CAR',
};

/** Cor de identidade de cada atributo (detalhe premium, sem poluir). */
export const ABILITY_COLORS: Record<AbilityKey, string> = {
  str: '#D95448', // ferro em brasa
  dex: '#8FC45A', // verde ágil
  con: '#C24E63', // rubi/terra
  int: '#4FA3E3', // azul arcano
  wis: '#A379E8', // violeta místico
  cha: '#E8AA5C', // dourado rosado
};
