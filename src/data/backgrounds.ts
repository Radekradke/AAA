import type { Background } from '@/types/dnd';

/** Antecedentes iniciais — concedem proficiência em perícias. */
export const BACKGROUNDS: Background[] = [
  {
    id: 'soldier',
    label: 'Soldado',
    desc: 'Treinado para a guerra, conhece disciplina, táticas e a vida de quartel.',
    skills: ['athletics', 'intimidation'],
  },
  {
    id: 'acolyte',
    label: 'Acólito',
    desc: 'Serviu em um templo, dedicado aos ritos e mistérios de uma fé.',
    skills: ['insight', 'religion'],
  },
  {
    id: 'criminal',
    label: 'Criminoso',
    desc: 'Viveu à margem da lei, conhecendo o submundo e seus contatos.',
    skills: ['deception', 'stealth'],
  },
  {
    id: 'sage',
    label: 'Sábio',
    desc: 'Passou a vida entre livros e arquivos em busca de conhecimento.',
    skills: ['arcana', 'history'],
  },
  {
    id: 'folk-hero',
    label: 'Herói do Povo',
    desc: 'Veio de origem humilde, mas o destino o chamou para algo maior.',
    skills: ['animalHandling', 'survival'],
  },
  {
    id: 'noble',
    label: 'Nobre',
    desc: 'Nascido em berço de privilégio, acostumado ao poder e à etiqueta.',
    skills: ['history', 'persuasion'],
  },
  {
    id: 'outlander',
    label: 'Forasteiro',
    desc: 'Cresceu longe da civilização, em harmonia com a terra selvagem.',
    skills: ['athletics', 'survival'],
  },
  {
    id: 'charlatan',
    label: 'Charlatão',
    desc: 'Vive de trapaça e lábia, sempre um passo à frente dos enganados.',
    skills: ['deception', 'sleightOfHand'],
  },
];

export const BACKGROUND_BY_ID: Record<string, Background> = Object.fromEntries(
  BACKGROUNDS.map((b) => [b.id, b]),
);

export function getBackground(id: string): Background {
  return BACKGROUND_BY_ID[id] ?? BACKGROUNDS[0];
}
