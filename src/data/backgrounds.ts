import type { Background } from '@/types/dnd';

/** Antecedentes iniciais — concedem proficiência em perícias. */
export const BACKGROUNDS: Background[] = [
  {
    id: 'soldier',
    label: 'Soldado',
    desc: 'Treinado para a guerra, conhece disciplina, táticas e a vida de quartel. Combina bem com personagens que resolvem conflito na linha de frente ou por presença intimidadora.',
    feature: 'Vivência militar: hierarquia, patrulhas, marchas e leitura de campo de batalha.',
    skills: ['athletics', 'intimidation'],
    suggestedAbilities: ['str', 'cha'],
  },
  {
    id: 'acolyte',
    label: 'Acólito',
    desc: 'Serviu em um templo, dedicado aos ritos e mistérios de uma fé. Funciona para heróis guiados por crença, dever sagrado ou conflito espiritual.',
    feature: 'Vida de templo: cerimônias, símbolos religiosos, ordens sagradas e dilemas de fé.',
    skills: ['insight', 'religion'],
    suggestedAbilities: ['wis', 'int'],
  },
  {
    id: 'criminal',
    label: 'Criminoso',
    desc: 'Viveu à margem da lei, conhecendo o submundo e seus contatos. Favorece personagens discretos, manipuladores ou acostumados a riscos calculados.',
    feature: 'Contato no submundo: códigos, rotas de fuga, favores e reputações perigosas.',
    skills: ['deception', 'stealth'],
    suggestedAbilities: ['cha', 'dex'],
  },
  {
    id: 'sage',
    label: 'Sábio',
    desc: 'Passou a vida entre livros e arquivos em busca de conhecimento. Ideal para quem transforma investigação, magia e memória em vantagem.',
    feature: 'Pesquisador: bibliotecas, arquivos, teorias antigas e perguntas que ninguém quis fazer.',
    skills: ['arcana', 'history'],
    suggestedAbilities: ['int'],
  },
  {
    id: 'folk-hero',
    label: 'Herói do Povo',
    desc: 'Veio de origem humilde, mas o destino o chamou para algo maior. Dá ao personagem uma ligação forte com aldeias, trabalhadores e causas simples.',
    feature: 'Campeão local: respeito popular, histórias exageradas e coragem nascida da necessidade.',
    skills: ['animalHandling', 'survival'],
    suggestedAbilities: ['wis'],
  },
  {
    id: 'noble',
    label: 'Nobre',
    desc: 'Nascido em berço de privilégio, acostumado ao poder e à etiqueta. Brilha em intriga social, história de linhagens e negociações formais.',
    feature: 'Privilégio de berço: brasões, cortes, genealogias, títulos e portas que se abrem.',
    skills: ['history', 'persuasion'],
    suggestedAbilities: ['int', 'cha'],
  },
  {
    id: 'outlander',
    label: 'Forasteiro',
    desc: 'Cresceu longe da civilização, em harmonia com a terra selvagem. Sustenta exploradores, caçadores, guias e sobreviventes resistentes.',
    feature: 'Memória das trilhas: rotas, clima, caça, terreno difícil e sinais deixados pela natureza.',
    skills: ['athletics', 'survival'],
    suggestedAbilities: ['str', 'wis'],
  },
  {
    id: 'charlatan',
    label: 'Charlatão',
    desc: 'Vive de trapaça e lábia, sempre um passo à frente dos enganados. Ótimo para personagens de disfarce, truque, jogo social e mãos rápidas.',
    feature: 'Identidade flexível: golpes, blefes, pequenas falsificações e fuga antes da conta chegar.',
    skills: ['deception', 'sleightOfHand'],
    suggestedAbilities: ['cha', 'dex'],
  },
  {
    id: 'entertainer',
    label: 'Artista',
    desc: 'Vive dos palcos, tavernas e praças, encantando plateias com música, dança, atuação ou acrobacia. Ideal para quem move o grupo pela presença e pelo carisma.',
    feature: 'Querido do público: hospedagem em troca de espetáculo, contatos artísticos e fama crescente.',
    skills: ['acrobatics', 'performance'],
    suggestedAbilities: ['cha', 'dex'],
  },
  {
    id: 'guild-artisan',
    label: 'Artesão de Guilda',
    desc: 'Membro de uma guilda de ofício — ferreiro, alquimista, joalheiro — com orgulho do trabalho e da reputação. Bom para personagens práticos e bem relacionados.',
    feature: 'Membro de guilda: ofício respeitado, contatos comerciais e abrigo em filiais da guilda.',
    skills: ['insight', 'persuasion'],
    suggestedAbilities: ['wis', 'cha'],
  },
  {
    id: 'hermit',
    label: 'Eremita',
    desc: 'Passou anos em reclusão, buscando iluminação, cura ou um segredo. Combina com personagens introspectivos que guardam uma descoberta importante.',
    feature: 'Descoberta na solidão: um conhecimento ou verdade única revelada durante o isolamento.',
    skills: ['medicine', 'religion'],
    suggestedAbilities: ['wis', 'int'],
  },
  {
    id: 'sailor',
    label: 'Marujo',
    desc: 'Cresceu no convés, entre tempestades, portos e camaradagem rude. Sustenta aventureiros resistentes, ágeis e acostumados a perigo constante.',
    feature: 'Passagem de navio: transporte marítimo para você e o grupo em troca de ajuda a bordo.',
    skills: ['athletics', 'perception'],
    suggestedAbilities: ['str', 'dex'],
  },
  {
    id: 'urchin',
    label: 'Órfão das Ruas',
    desc: 'Sobreviveu sozinho desde cedo nas vielas da cidade, dominando furtos e fugas. Ótimo para personagens espertos, ágeis e difíceis de prender.',
    feature: 'Segredos da cidade: atalhos, esgotos e passagens que permitem cruzar a urbe sem ser visto.',
    skills: ['sleightOfHand', 'stealth'],
    suggestedAbilities: ['dex', 'wis'],
  },
];

export const BACKGROUND_BY_ID: Record<string, Background> = Object.fromEntries(
  BACKGROUNDS.map((b) => [b.id, b]),
);

export function getBackground(id: string): Background {
  return BACKGROUND_BY_ID[id] ?? BACKGROUNDS[0];
}
