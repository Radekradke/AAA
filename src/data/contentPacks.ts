/**
 * Pacotes de conteúdo: livros além do Livro do Jogador 2014 que o grupo pode
 * ligar ou desligar. Conteúdo de um pacote desligado some das listas de
 * escolha — fichas que já usam esse conteúdo continuam funcionando.
 */
export type PackId = 'xge' | 'tce' | 'races';

export interface ContentPack {
  id: PackId;
  label: string;
  short: string;
  year: number;
  /** O que o pacote traz hoje no app. */
  contents: string[];
}

export const CONTENT_PACKS: ContentPack[] = [
  {
    id: 'xge',
    label: 'Guia de Xanathar para Todas as Coisas',
    short: 'Xanathar',
    year: 2017,
    contents: ['15 talentos raciais'],
  },
  {
    id: 'tce',
    label: 'Caldeirão de Tasha para Tudo',
    short: 'Tasha',
    year: 2020,
    contents: ['Origem personalizada (mover bônus raciais e trocar proficiências)', 'Linhagem Personalizada', '15 talentos'],
  },
  {
    id: 'races',
    label: 'Raças de outros livros',
    short: 'Raças extras',
    year: 2016,
    contents: ['Aasimar, Tabaxi, Golias, Kenku e Povo Lagarto (Volo)', 'Forjado Bélico (Eberron)'],
  },
];

/** Pacote de cada fonte de talento/magia/subclasse (PHB = sempre ligado). */
export const SOURCE_PACK: Record<string, PackId | null> = {
  'PHB 2014': null,
  XGE: 'xge',
  TCE: 'tce',
};
