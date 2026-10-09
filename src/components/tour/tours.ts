import type { TourId } from '@/store/uiStore';

export interface TourStep {
  /** Seletores CSS em ordem de preferência; vale o primeiro visível na tela. */
  target: string[];
  title: string;
  body: string;
}

/**
 * Roteiros dos tours guiados. Cada passo aponta para um elemento real da
 * tela (atributos data-tour ou classes estáveis); passos cujo alvo não está
 * visível (ex.: só existe no PC) são pulados sozinhos.
 */
export const TOURS: Record<TourId, TourStep[]> = {
  sheet: [
    {
      target: ['[data-tour="sheet-head"]'],
      title: 'Seu herói',
      body: 'Nome, linhagem, classe e nível. Os botões − e + mudam o nível; o ícone de imagem troca a arte pela sua.',
    },
    {
      target: ['[data-tour="tabs"]'],
      title: 'As abas',
      body: 'Mesa reúne o que você usa no turno. Ficha, Combate, Inventário, Magias, Evoluir, Descanso e Diário guardam o resto.',
    },
    {
      target: ['[data-tour="hp"]'],
      title: 'Pontos de vida',
      body: 'Aplique dano e cura com os botões rápidos ou digitando um valor. A barra muda de cor conforme o perigo, e a inspiração fica ao lado.',
    },
    {
      target: ['[data-tour="vitals"]'],
      title: 'Toque para ver a conta',
      body: 'Passe o mouse (ou segure o dedo) num número para ver de onde ele vem. Iniciativa e dados de vida também rolam ao tocar.',
    },
    {
      target: ['[data-tour="abilities"]'],
      title: 'Atributos',
      body: 'Cada placa rola um teste do atributo com o modificador certo. O resultado aparece no centro da tela.',
    },
    {
      target: ['[data-tour="turn"]'],
      title: 'O seu turno',
      body: 'Role a iniciativa, marque ação, ação bônus e reação conforme gasta, e use Novo turno para zerar tudo.',
    },
    {
      target: ['.fv-tour-advisor'],
      title: 'O que eu rolo?',
      body: 'Descreva o que quer fazer ("escalar o muro") e a ficha sugere o teste e o bônus. Ótimo para quem está começando.',
    },
    {
      target: ['[data-tour="rollmode"]'],
      title: 'Vantagem e desvantagem',
      body: 'Escolha antes de rolar: o próximo teste de d20 sai com dois dados e fica com o maior (ou o menor).',
    },
    {
      target: ['[data-tour="more"]'],
      title: 'Mais opções',
      body: 'Menu principal, configurações, temas, exportar a ficha e refazer este tour. Pronto, boa aventura!',
    },
  ],
  creator: [
    {
      target: ['.fv-forge-rail', '.fv-forge-progress'],
      title: 'Os capítulos',
      body: 'Origem, Caminho, Dons (as escolhas do 1º nível), Passado, Atributos, Perícias, Magias (para quem conjura), Equipamento e Despertar. Toque num capítulo para ir e voltar quando quiser.',
    },
    {
      target: ['.fv-options'],
      title: 'Escolha uma opção',
      body: 'Cada cartão é uma escolha. O selecionado fica destacado; trocar é só tocar em outro.',
    },
    {
      target: ['.fv-detail'],
      title: 'O que muda na ficha',
      body: 'Aqui aparece a descrição e tudo o que a escolha dá: atributos, perícias, idiomas e recursos.',
    },
    {
      target: ['.fv-forge-hero', '.fv-foot-hero'],
      title: 'Seu herói tomando forma',
      body: 'O retrato, os atributos e o que ainda falta escolher. Toque numa pendência para ir direto até ela.',
    },
    {
      target: ['.fv-foot-cta'],
      title: 'Avançar',
      body: 'Passa para o próximo capítulo. Tudo é salvo sozinho; no fim, Despertar cria a ficha.',
    },
  ],
};
