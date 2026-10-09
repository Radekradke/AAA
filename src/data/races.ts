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
    languages: ['Comum', '1 idioma à escolha'],
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
    darkvision: 18,
    skillProfs: ['perception'],
    languages: ['Comum', 'Élfico'],
  },
  {
    id: 'dwarf',
    label: 'Anão',
    mono: 'A',
    jewel: '#C2483A',
    abilityBonus: { con: 2 },
    bonus: '+2 Constituição',
    desc: 'Resistentes e teimosos, forjados na pedra e na tradição milenar das montanhas.',
    traits: ['Visão no Escuro', 'Resistência a veneno', 'Combate anão', 'Proficiência com Ferramentas', 'Especialização em Rochas'],
    speed: 7.5,
    darkvision: 18,
    resistances: ['veneno'],
    languages: ['Comum', 'Anão'],
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
    languages: ['Comum', 'Halfling'],
  },
  {
    id: 'half-elf',
    label: 'Meio-Elfo',
    mono: 'M',
    jewel: '#4FA37A',
    abilityBonus: { cha: 2 },
    // PHB 2014: +1 em dois atributos à escolha (exceto Carisma)
    abilityChoice: { count: 2, amount: 1, exclude: ['cha'], default: ['dex', 'wis'] },
    bonus: '+2 CAR · +1 / +1 à escolha',
    desc: 'Andarilhos entre dois mundos, carismáticos e adaptáveis por natureza.',
    traits: ['Visão no Escuro', 'Ancestral Feérico', 'Versatilidade em Perícias'],
    speed: 9,
    darkvision: 18,
    extraSkillPicks: 2,
    languages: ['Comum', 'Élfico', '1 idioma à escolha'],
  },
  {
    id: 'half-orc',
    label: 'Meio-Orc',
    mono: 'M',
    jewel: '#7E5BB0',
    abilityBonus: { str: 2, con: 1 },
    bonus: '+2 FOR · +1 CON',
    desc: 'Força brutal temperada por uma vontade indomável de sobreviver.',
    traits: ['Resistência Implacável', 'Ataques Selvagens', 'Visão no Escuro', 'Ameaçador'],
    speed: 9,
    darkvision: 18,
    skillProfs: ['intimidation'],
    languages: ['Comum', 'Orc'],
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
    darkvision: 18,
    languages: ['Comum', 'Gnômico'],
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
    darkvision: 18,
    resistances: ['fogo'],
    languages: ['Comum', 'Infernal'],
  },
  {
    id: 'dragonborn',
    label: 'Draconato',
    mono: 'D',
    jewel: '#C24A2E',
    video: '/assets/bg.mp4',
    abilityBonus: { str: 2, cha: 1 },
    bonus: '+2 FOR · +1 CAR',
    desc: 'Descendentes de dragões, orgulhosos e marcados pela linhagem ancestral.',
    traits: ['Ancestral Dracônico', 'Sopro', 'Resistência a Dano'],
    speed: 9,
    languages: ['Comum', 'Dracônico'],
  },
];

/**
 * Ancestral Dracônico (PHB 2014): a cor do dragão define o tipo de dano do
 * Sopro e a resistência. Fica como "sub-raça" para reaproveitar a escolha.
 */
const DRAGON_LINES: [string, string, string, 'linha' | 'cone', 'DES' | 'CON'][] = [
  ['black', 'Preto', 'ácido', 'linha', 'DES'],
  ['blue', 'Azul', 'elétrico', 'linha', 'DES'],
  ['brass', 'Latão', 'fogo', 'linha', 'DES'],
  ['bronze', 'Bronze', 'elétrico', 'linha', 'DES'],
  ['copper', 'Cobre', 'ácido', 'linha', 'DES'],
  ['gold', 'Ouro', 'fogo', 'cone', 'DES'],
  ['green', 'Verde', 'veneno', 'cone', 'CON'],
  ['red', 'Vermelho', 'fogo', 'cone', 'DES'],
  ['silver', 'Prata', 'frio', 'cone', 'CON'],
  ['white', 'Branco', 'frio', 'cone', 'CON'],
];

export function dragonAncestry(subraceId: string | null): { type: string; area: string; save: 'DES' | 'CON' } | null {
  const row = DRAGON_LINES.find(([id]) => `dragon-${id}` === subraceId);
  return row ? { type: row[2], area: row[3] === 'linha' ? 'linha de 1,5 × 9 m' : 'cone de 4,5 m', save: row[4] } : null;
}

export const SUBRACES: Record<string, Subrace[]> = {
  dwarf: [
    {
      id: 'hill-dwarf',
      label: 'Anão da Colina',
      abilityBonus: { wis: 1 },
      bonus: '+1 SAB · +1 PV/nível',
      hpPerLevel: 1,
      traits: ['Tenacidade Anã'],
    },
    { id: 'mountain-dwarf', label: 'Anão da Montanha', abilityBonus: { str: 2 }, bonus: '+2 FOR · armaduras médias', traits: ['Treinamento Anão com Armaduras'] },
  ],
  elf: [
    { id: 'high-elf', label: 'Alto Elfo', abilityBonus: { int: 1 }, bonus: '+1 INT', languages: ['1 idioma à escolha'], traits: ['Treinamento Élfico com Armas', 'Truque de Mago', 'Idioma adicional'] },
    {
      id: 'wood-elf',
      label: 'Elfo da Floresta',
      abilityBonus: { wis: 1 },
      bonus: '+1 SAB · +1,5 m',
      speedBonus: 1.5,
      traits: ['Treinamento Élfico com Armas', 'Pés Ligeiros', 'Máscara da Natureza'],
    },
    { id: 'drow', label: 'Drow', abilityBonus: { cha: 1 }, bonus: '+1 CAR', darkvision: 36, traits: ['Visão Superior no Escuro', 'Sensibilidade à Luz Solar', 'Magia Drow', 'Treinamento Drow com Armas'] },
  ],
  halfling: [
    { id: 'lightfoot', label: 'Pés Leves', abilityBonus: { cha: 1 }, bonus: '+1 CAR', traits: ['Furtividade Natural'] },
    { id: 'stout', label: 'Robusto', abilityBonus: { con: 1 }, bonus: '+1 CON', resistances: ['veneno'], traits: ['Resiliência Robusta'] },
  ],
  dragonborn: DRAGON_LINES.map(([id, label, type, shape, save]) => ({
    id: `dragon-${id}`,
    label: `Dragão ${label}`,
    bonus: `${type} · ${shape} · ${save}`,
    resistances: [type],
    traits: [`Sopro (${type})`],
  })),
  gnome: [
    { id: 'forest-gnome', label: 'Gnomo da Floresta', abilityBonus: { dex: 1 }, bonus: '+1 DES', traits: ['Ilusionista Nato', 'Falar com Bestas Pequenas'] },
    { id: 'rock-gnome', label: 'Gnomo das Rochas', abilityBonus: { con: 1 }, bonus: '+1 CON', traits: ['Conhecimento de Artífice', 'Engenhoqueiro'] },
  ],
};

export const RACE_BY_ID: Record<string, Race> = Object.fromEntries(
  RACES.map((r) => [r.id, r]),
);

/** Raças homebrew conhecidas neste aparelho (das fichas e da biblioteca do jogador). */
const HOMEBREW = new Map<string, Race>();

export function registerRace(race: Race | null | undefined): void {
  if (!race?.id || RACE_BY_ID[race.id]) return;
  const cur = HOMEBREW.get(race.id);
  if (!cur || (race.updatedAt ?? 0) >= (cur.updatedAt ?? 0)) HOMEBREW.set(race.id, race);
}

export function unregisterRace(id: string): void {
  HOMEBREW.delete(id);
}

export function getRace(id: string): Race {
  return RACE_BY_ID[id] ?? HOMEBREW.get(id) ?? RACES[0];
}

/** Raça da ficha: a homebrew embutida vence (e fica registrada para o resto do app). */
export function raceOf(char: { raceId: string; customRace?: Race | null }): Race {
  if (char.customRace && char.customRace.id === char.raceId) {
    registerRace(char.customRace);
    return char.customRace;
  }
  return getRace(char.raceId);
}

export function getSubraces(raceId: string): Subrace[] {
  return SUBRACES[raceId] ?? HOMEBREW.get(raceId)?.subraces ?? [];
}

export function getSubrace(raceId: string, subId: string | null): Subrace | undefined {
  if (!subId) return undefined;
  return getSubraces(raceId).find((s) => s.id === subId);
}
