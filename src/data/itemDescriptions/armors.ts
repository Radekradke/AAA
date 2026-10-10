import type { ItemDescription } from './types';

/** Armaduras e escudo do Livro do Jogador 2014. */
export const ARMOR_DESCRIPTIONS: Record<string, ItemDescription> = {
  // ---- Leves ----
  'a-padded': {
    desc: 'Camadas de tecido grosso costuradas e recheadas, como um colchão vestido. Protege um pouco, esquenta muito e faz um farfalhar que denuncia quem tenta andar escondido.',
    use: 'CA 11 + DES, mas com desvantagem em Furtividade: só vale se não houver outra à mão.',
    tags: ['Barata'],
  },
  'a-leather': {
    desc: 'Peitoral e ombreiras de couro fervido em óleo, duros o bastante para desviar um corte e leves o bastante para correr e escalar. É a escolha de quem vive de agilidade: ladinos, patrulheiros e bardos.',
    use: 'CA 11 + seu modificador de Destreza, sem atrapalhar a Furtividade.',
    tags: ['Barata', 'Furtividade'],
  },
  'a-studded': {
    desc: 'Couro reforçado com rebites e pequenas placas de metal. Continua leve e silencioso, mas aguenta golpes que atravessariam o couro simples.',
    use: 'CA 12 + DES: a melhor armadura leve, preferida de ladinos e patrulheiros.',
    tags: ['Furtividade'],
  },
  // ---- Médias ----
  'a-hide': {
    desc: 'Couro grosso e pelagem de animais costurados em camadas, comum entre os povos das terras frias. É quente, pesada e fácil de remendar em volta da fogueira.',
    use: 'CA 12 + DES (máx. 2) sem desvantagem em Furtividade, por um preço baixo.',
    tags: ['Barata', 'Sobrevivência'],
  },
  'a-chainshirt': {
    desc: 'Uma camisa de anéis de metal entrelaçados, usada entre camadas de roupa. Protege o tronco sem chamar atenção e quase não faz barulho.',
    use: 'CA 13 + DES (máx. 2) e nenhuma desvantagem em Furtividade.',
    tags: ['Discreta', 'Furtividade'],
  },
  'a-scale': {
    desc: 'Um casaco de couro coberto de escamas de metal sobrepostas, como a pele de um peixe. Brilha ao sol e tilinta a cada passo.',
    use: 'CA 14 + DES (máx. 2), ao custo de desvantagem em Furtividade.',
  },
  'a-breastplate': {
    desc: 'Uma peça única de metal moldada ao tronco, com couro flexível nos braços e pernas. Protege o essencial e deixa o corpo livre para se mexer.',
    use: 'CA 14 + DES (máx. 2) sem desvantagem em Furtividade: a melhor média para quem precisa de silêncio.',
    tags: ['Furtividade'],
  },
  'a-halfplate': {
    desc: 'Placas moldadas cobrem o tronco, os ombros e as coxas; o resto é couro e malha. Quase tão protetora quanto uma armadura completa, e um pouco menos pesada.',
    use: 'CA 15 + DES (máx. 2), a maior entre as médias; tem desvantagem em Furtividade.',
  },
  // ---- Pesadas ----
  'a-ringmail': {
    desc: 'Couro grosso com anéis de metal costurados por cima. É uma proteção antiga e pesada, bem mais barata que uma malha de verdade.',
    use: 'CA 14 fixa e desvantagem em Furtividade; serve como primeira armadura pesada.',
    tags: ['Barata'],
  },
  'a-chainmail': {
    desc: 'Uma túnica inteira de anéis de aço entrelaçados, com capuz e acolchoado por baixo. É a armadura clássica dos soldados e dos clérigos de guerra.',
    use: 'CA 16 fixa; pede FOR 13 e dá desvantagem em Furtividade.',
  },
  'a-splint': {
    desc: 'Tiras verticais de metal rebitadas sobre couro, com malha protegendo as articulações. Rústica, barulhenta e muito resistente.',
    use: 'CA 17 fixa; pede FOR 15 e dá desvantagem em Furtividade.',
  },
  'a-plate': {
    desc: 'Aço moldado sob medida que cobre o corpo inteiro, do elmo às botas, com cada junta pensada para se mover. Custa uma fortuna e passa de pai para filho por gerações.',
    use: 'CA 18, a maior do livro; pede FOR 15 e dá desvantagem em Furtividade.',
    tags: ['Defesa'],
  },
  // ---- Escudo ----
  's-shield': {
    desc: 'Madeira reforçada ou metal batido, preso ao braço por correias de couro. Bloqueia golpes, flechas e, com sorte, um pouco do bafo de um dragão.',
    use: '+2 de CA enquanto estiver numa das mãos; combina com qualquer arma de uma mão.',
    tags: ['Defesa'],
  },
};
