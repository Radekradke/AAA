import type { Race, Subrace } from '@/types/dnd';

/**
 * Raças/espécies iniciais (estrutura genérica e expansível).
 * Bônus de atributo representados de forma simplificada e somados ao valor base.
 */
export const RACES: Race[] = [
  {
    id: 'human',
    label: 'Humano',
    mono: 'H',
    jewel: '#3E78C8',
    abilityBonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    bonus: '+1 em tudo',
    desc: 'Versáteis e ambiciosos, presentes em toda parte do mundo conhecido.',
    traits: ['Versatilidade', 'Idioma adicional'],
    speed: 9,
  },
  {
    id: 'elf',
    label: 'Elfo',
    mono: 'E',
    jewel: '#2E9D6E',
    abilityBonus: { dex: 2 },
    bonus: '+2 Destreza',
    desc: 'Graciosos e longevos, ligados à magia e aos segredos da natureza.',
    traits: ['Visão no Escuro', 'Sentidos Aguçados', 'Ancestral Feérico', 'Transe'],
    speed: 9,
  },
  {
    id: 'dwarf',
    label: 'Anão',
    mono: 'A',
    jewel: '#C2483A',
    abilityBonus: { con: 2 },
    bonus: '+2 Constituição',
    desc: 'Resistentes e teimosos, forjados na pedra e na tradição milenar das montanhas.',
    traits: ['Visão no Escuro', 'Resistência a veneno', 'Combate anão'],
    speed: 7.5,
  },
  {
    id: 'halfling',
    label: 'Halfling',
    mono: 'H',
    jewel: '#C9892E',
    abilityBonus: { dex: 2 },
    bonus: '+2 Destreza',
    desc: 'Pequenos, sortudos e surpreendentemente corajosos diante do perigo.',
    traits: ['Sortudo', 'Bravura', 'Agilidade Halfling'],
    speed: 7.5,
  },
  {
    id: 'half-elf',
    label: 'Meio-Elfo',
    mono: 'M',
    jewel: '#4FA37A',
    abilityBonus: { cha: 2, dex: 1, wis: 1 },
    bonus: '+2 CAR · +1 / +1',
    desc: 'Andarilhos entre dois mundos, carismáticos e adaptáveis por natureza.',
    traits: ['Visão no Escuro', 'Ancestral Feérico', 'Versatilidade'],
    speed: 9,
  },
  {
    id: 'half-orc',
    label: 'Meio-Orc',
    mono: 'M',
    jewel: '#7E5BB0',
    abilityBonus: { str: 2, con: 1 },
    bonus: '+2 FOR · +1 CON',
    desc: 'Força brutal temperada por uma vontade indomável de sobreviver.',
    traits: ['Resistência Implacável', 'Ataques Selvagens', 'Visão no Escuro'],
    speed: 9,
  },
  {
    id: 'gnome',
    label: 'Gnomo',
    mono: 'G',
    jewel: '#C8A23E',
    abilityBonus: { int: 2 },
    bonus: '+2 Inteligência',
    desc: 'Curiosos e inventivos, encontram maravilha em cada engenhoca e mistério.',
    traits: ['Visão no Escuro', 'Astúcia Gnômica'],
    speed: 7.5,
  },
  {
    id: 'tiefling',
    label: 'Tiefling',
    mono: 'T',
    jewel: '#B43A5E',
    abilityBonus: { cha: 2, int: 1 },
    bonus: '+2 CAR · +1 INT',
    desc: 'Marcados por uma herança infernal, orgulhosos apesar da desconfiança alheia.',
    traits: ['Visão no Escuro', 'Resistência a fogo', 'Legado Infernal'],
    speed: 9,
  },
  {
    id: 'dragonborn',
    label: 'Draconato',
    mono: 'D',
    jewel: '#C24A2E',
    abilityBonus: { str: 2, cha: 1 },
    bonus: '+2 FOR · +1 CAR',
    desc: 'Descendentes de dragões, orgulhosos e marcados pela linhagem ancestral.',
    traits: ['Sopro Dracônico', 'Resistência elemental'],
    speed: 9,
  },
];

export const SUBRACES: Record<string, Subrace[]> = {
  dwarf: [
    { id: 'hill-dwarf', label: 'Anão da Colina', abilityBonus: { wis: 1 } },
    { id: 'mountain-dwarf', label: 'Anão da Montanha', abilityBonus: { str: 2 } },
  ],
  elf: [
    { id: 'high-elf', label: 'Alto Elfo', abilityBonus: { int: 1 } },
    { id: 'wood-elf', label: 'Elfo da Floresta', abilityBonus: { wis: 1 } },
    { id: 'drow', label: 'Drow', abilityBonus: { cha: 1 } },
  ],
  halfling: [
    { id: 'lightfoot', label: 'Pés Leves', abilityBonus: { cha: 1 } },
    { id: 'stout', label: 'Robusto', abilityBonus: { con: 1 } },
  ],
  gnome: [
    { id: 'forest-gnome', label: 'Gnomo da Floresta', abilityBonus: { dex: 1 } },
    { id: 'rock-gnome', label: 'Gnomo das Rochas', abilityBonus: { con: 1 } },
  ],
};

export const RACE_BY_ID: Record<string, Race> = Object.fromEntries(
  RACES.map((r) => [r.id, r]),
);

export function getRace(id: string): Race {
  return RACE_BY_ID[id] ?? RACES[0];
}

export function getSubraces(raceId: string): Subrace[] {
  return SUBRACES[raceId] ?? [];
}

export function getSubrace(raceId: string, subId: string | null): Subrace | undefined {
  if (!subId) return undefined;
  return getSubraces(raceId).find((s) => s.id === subId);
}
