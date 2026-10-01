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
    contents: ['94 magias', '15 talentos raciais'],
  },
  {
    id: 'tce',
    label: 'Caldeirão de Tasha para Tudo',
    short: 'Tasha',
    year: 2020,
    contents: ['Origem personalizada (mover bônus raciais e trocar proficiências)', 'Linhagem Personalizada', '15 talentos', '21 magias'],
  },
  {
    id: 'races',
    label: 'Raças de outros livros',
    short: 'Raças extras',
    year: 2016,
    contents: ['Aasimar, Tabaxi, Golias, Kenku e Povo Lagarto (Volo)', 'Forjado Bélico (Eberron)'],
  },
];

/** Selo curto do livro nas listas (magias, talentos). */
export const SOURCE_SHORT: Record<string, string> = { 'PHB 2014': 'Livro do Jogador', XGE: 'Xanathar', TCE: 'Tasha' };

/** Pacote de cada fonte de talento/magia/subclasse (PHB = sempre ligado). */
export const SOURCE_PACK: Record<string, PackId | null> = {
  'PHB 2014': null,
  XGE: 'xge',
  TCE: 'tce',
};

/* Pacotes ligados agora — o uiStore mantém isto em dia; dados e motor só leem. */
let enabled: Partial<Record<PackId, boolean>> = {};

export function setEnabledPacks(packs: Partial<Record<PackId, boolean>>): void {
  enabled = { ...packs };
}

/** Conteúdo desta fonte está visível? (PHB e fonte ausente = sempre) */
export function sourceEnabled(source: string | undefined): boolean {
  const pack = source ? SOURCE_PACK[source] : null;
  return !pack || !!enabled[pack];
}
