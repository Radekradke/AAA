import type { ItemDescription } from './types';

/** Armas do Livro do Jogador 2014: o que são e para que servem na mesa. */
export const WEAPON_DESCRIPTIONS: Record<string, ItemDescription> = {
  // ---- Simples corpo a corpo ----
  'w-club': {
    desc: 'Um pedaço de madeira dura, às vezes reforçado com pregos ou tiras de couro. É a arma mais antiga que existe: qualquer camponês sabe usar, e ninguém estranha vê-la pendurada no cinto.',
    use: 'Barata e leve: serve de segunda arma ou de reserva quando a principal cai no chão.',
    tags: ['Barata', 'Discreta'],
  },
  'w-dagger': {
    desc: 'Lâmina curta de dois gumes, feita para caber na bota, na manga ou atrás do cinto. Corta corda, abre carta lacrada e encerra discussões em becos escuros.',
    use: 'Usa Força ou Destreza, pode ser arremessada e é leve: ótima para lutar com duas armas ou ter sempre uma escondida.',
    tags: ['Discreta', 'Barata'],
  },
  'w-greatclub': {
    desc: 'Um tronco aparado no formato de porrete, pesado o bastante para exigir as duas mãos. Não tem elegância alguma: é só o peso da madeira caindo de cima.',
    use: 'Dano bom por um preço quase nulo; como ocupa as duas mãos, não combina com escudo.',
    tags: ['Barata'],
  },
  'w-handaxe': {
    desc: 'Cabo curto e cabeça de ferro afiada de um lado só. De manhã corta lenha para a fogueira do acampamento; à tarde voa girando na direção de um goblin.',
    use: 'Leve e arremessável: carregue dois ou três para atacar de longe e lutar com duas armas.',
    tags: ['Sobrevivência'],
  },
  'w-javelin': {
    desc: 'Haste leve com ponta de ferro, balanceada para o arremesso. Legionários marcham com um feixe delas nas costas para quebrar a carga inimiga antes do choque das linhas.',
    use: 'Arremesso de longo alcance (9/36 m) usando Força: o ataque à distância de quem não tem arco.',
    tags: ['Barata'],
  },
  'w-lighthammer': {
    desc: 'Martelo pequeno de ferreiro adaptado para a guerra, de cabeça quadrada e cabo envolto em couro. Anões costumam levar um par deles, um de cada lado do cinto.',
    use: 'Leve e arremessável: a versão de concussão do machado de mão.',
    tags: ['Barata'],
  },
  'w-mace': {
    desc: 'Uma cabeça de metal com flanges sobre um cabo firme. Feita para amassar elmos e quebrar ossos por baixo da armadura, é a arma preferida de muitos clérigos de guerra.',
    use: 'Arma simples e confiável de uma mão: fica ótima ao lado de um escudo.',
  },
  'w-quarterstaff': {
    desc: 'Bastão de madeira da altura de quem o carrega, gasto nas pontas de tanto bater no chão da estrada. Apoio de viajante, cajado de mago e, quando preciso, uma arma surpreendentemente rápida.',
    use: 'Versátil (1d8 com as duas mãos) e quase de graça; muitos conjuradores usam o próprio bordão como foco.',
    tags: ['Barata', 'Exploração'],
  },
  'w-sickle': {
    desc: 'Lâmina curva de colheita presa a um cabo curto. Nas mãos de um druida ou de um camponês revoltado, ela colhe outras coisas além de trigo.',
    use: 'Leve, boa como segunda arma; parece ferramenta de campo, não arma de guerra.',
    tags: ['Discreta', 'Barata'],
  },
  'w-spear': {
    desc: 'Haste comprida com ponta de ferro, a arma mais comum de milícias e caçadores. Mantém o inimigo longe, aguenta a investida de um javali e ainda pode ser arremessada.',
    use: 'Faz de tudo: uma mão com escudo, as duas mãos para 1d8 ou arremesso a 6/18 m.',
    tags: ['Barata', 'Sobrevivência'],
  },
  // ---- Simples à distância ----
  'w-lightcrossbow': {
    desc: 'Um arco montado de lado sobre uma coronha de madeira, com gatilho e alavanca de armar. Qualquer um aprende a mirar em uma tarde, por isso as guardas das cidades a adoram.',
    use: 'Bom dano à distância (1d8, 24/96 m) com Destreza; a recarga limita a um disparo por ação.',
  },
  'w-dart': {
    desc: 'Pequena ponta de metal com penas na cauda, levada às dezenas num estojo de couro. Sozinho parece brinquedo; uma chuva deles faz qualquer um procurar abrigo.',
    use: 'Acuidade e arremesso: o ataque à distância mais barato que usa Destreza.',
    tags: ['Discreta', 'Barata'],
  },
  'w-shortbow': {
    desc: 'Arco compacto de madeira flexível, fácil de usar a cavalo ou no meio da mata fechada. É a arma de caçadores, batedores e de todo halfling que se preze.',
    use: 'Ataque à distância de arma simples (1d6, 24/96 m); precisa das duas mãos e de flechas.',
    tags: ['Sobrevivência'],
  },
  'w-sling': {
    desc: 'Uma tira de couro e dois cordões, nada mais. As pedras do rio viram munição, e um pastor treinado acerta um lobo a trinta metros de distância.',
    use: 'Não pesa nada e a munição está em qualquer chão: dano baixo, mas você nunca fica desarmado.',
    tags: ['Discreta', 'Barata'],
  },
  // ---- Marciais corpo a corpo ----
  'w-battleaxe': {
    desc: 'Lâmina larga em forma de meia-lua presa a um cabo de freixo. O peso fica todo na ponta, e cada golpe chega com o corpo inteiro por trás.',
    use: 'Uma mão com escudo para 1d8, ou as duas para 1d10.',
  },
  'w-flail': {
    desc: 'Uma bola de ferro cravejada, presa ao cabo por uma corrente curta. Ela contorna a borda do escudo e acerta exatamente onde o adversário não esperava.',
    use: 'Arma marcial de uma mão que causa dano de concussão (1d8).',
  },
  'w-glaive': {
    desc: 'Uma lâmina de faca enorme na ponta de uma haste longa. Na linha de frente, mantém o inimigo a três metros enquanto corta tudo o que tenta se aproximar.',
    use: 'Alcance de 3 m e 1d10: você acerta quem chega perto antes que ele chegue em você.',
    tags: ['Controle'],
  },
  'w-greataxe': {
    desc: 'Cabeça dupla de aço sobre um cabo que só se segura com as duas mãos. É a arma de quem prefere resolver a luta inteira em um golpe só.',
    use: 'O maior dado entre as armas (1d12): a favorita dos bárbaros, brilha num acerto crítico.',
  },
  'w-greatsword': {
    desc: 'Lâmina longa como um homem, com empunhadura comprida e guarda larga. Exige treino e força, e cada movimento desenha um arco que limpa o espaço ao redor.',
    use: '2d6 de dano: o resultado mais estável entre as armas pesadas.',
  },
  'w-halberd': {
    desc: 'Machado, lança e gancho reunidos na ponta de uma única haste. Guardas de castelo a usam para derrubar cavaleiros e manter corredores fechados.',
    use: 'Alcance de 3 m e 1d10, como a glaive: a diferença entre as duas é só de estilo.',
    tags: ['Controle', 'Defesa'],
  },
  'w-lance': {
    desc: 'Haste longa e pesada feita para a carga a cavalo, com uma guarda em cone que protege a mão. Montado, o cavaleiro acerta com o peso do animal inteiro.',
    use: '1d12 com alcance; tem desvantagem contra quem está a 1,5 m e, desmontado, pede as duas mãos.',
    tags: ['Montado'],
  },
  'w-longsword': {
    desc: 'A espada dos cavaleiros e das baladas: lâmina reta de dois gumes, cruzeta simples e pomo pesado. É equilibrada para uma mão e ainda melhor com as duas.',
    use: 'Versátil: 1d8 com escudo ou 1d10 com as duas mãos.',
  },
  'w-maul': {
    desc: 'Um bloco de ferro maciço sobre um cabo grosso, quase uma marreta de guerra. Não corta nada: esmaga armadura, escudo e quem estiver por trás deles.',
    use: '2d6 de concussão; ótimo contra esqueletos e criaturas que sofrem mais com impacto.',
  },
  'w-morningstar': {
    desc: 'Cabeça esférica eriçada de cravos sobre um cabo de madeira. Junta o peso de uma maça com a perfuração das pontas de ferro.',
    use: '1d8 perfurante de uma mão: alternativa à espada longa para quem luta de escudo.',
  },
  'w-pike': {
    desc: 'Uma haste de mais de cinco metros com uma ponta pequena de aço. Sozinho é desajeitado; numa fileira de soldados, vira uma muralha de pontas.',
    use: 'Alcance de 3 m e 1d10; é a arma mais pesada da lista (9 kg).',
    tags: ['Defesa', 'Controle'],
  },
  'w-rapier': {
    desc: 'Lâmina fina e longa com uma guarda trabalhada em espiral. É a arma dos duelistas: vence pela ponta e pela velocidade, nunca pela força bruta.',
    use: 'Acuidade com 1d8: o melhor dano de uma mão para quem luta com Destreza.',
    tags: ['Social'],
  },
  'w-scimitar': {
    desc: 'Lâmina curva que se alarga perto da ponta, feita para cortes rápidos do alto de um cavalo ou em giros na areia do deserto.',
    use: 'Leve e com Acuidade: excelente para lutar com duas armas usando Destreza.',
  },
  'w-shortsword': {
    desc: 'Lâmina reta de um palmo e meio, prática nos espaços apertados de túneis, conveses de navio e becos sem saída.',
    use: 'Leve e com Acuidade (1d6 perfurante): o par clássico de espadas do ladino.',
    tags: ['Discreta'],
  },
  'w-trident': {
    desc: 'Três pontas farpadas no topo de uma haste. Arma de pescador e de gladiador, perfeita para quem luta com os pés na água.',
    use: 'Versátil e arremessável, como a lança, mas com o treino de arma marcial.',
  },
  'w-warpick': {
    desc: 'Uma ponta de aço curva como a de uma picareta de mineiro, feita para furar placas de armadura. É muito comum entre os anões das montanhas.',
    use: '1d8 perfurante de uma mão; combina com escudo.',
  },
  'w-warhammer': {
    desc: 'Cabeça de martelo de um lado e esporão do outro, num cabo reforçado de metal. Amassa armaduras como se fossem panelas de cozinha.',
    use: 'Versátil e de concussão: 1d8 com escudo ou 1d10 com as duas mãos.',
  },
  'w-whip': {
    desc: 'Couro trançado que estala como um pequeno trovão. Mais assusta do que fere, mas alcança longe e enrola braços, pernas e armas.',
    use: 'Alcance de 3 m com Acuidade, com dano baixo (1d4).',
    tags: ['Controle'],
  },
  // ---- Marciais à distância ----
  'w-blowgun': {
    desc: 'Um tubo de madeira oca por onde se sopra um dardo fino. Silenciosa e fácil de esconder, é arma de caçador da floresta — e de assassino, quando o dardo vem envenenado.',
    use: 'Sempre causa 1 de dano: vale pelo veneno que você passar na agulha.',
    tags: ['Discreta', 'Furtividade'],
  },
  'w-handcrossbow': {
    desc: 'Uma besta em miniatura, disparada com uma mão só. Cara e delicada, é a arma de espiões e de nobres que não confiam nem na própria guarda.',
    use: 'Leve: deixa a outra mão livre; 1d6 a 9/36 m.',
    tags: ['Discreta', 'Furtividade'],
  },
  'w-heavycrossbow': {
    desc: 'Arco de aço com manivela de engrenagens que leva tempo para armar. Quando enfim dispara, o virote atravessa escudos de madeira como papel.',
    use: '1d10 a 30/120 m, o maior dano à distância; é pesada e lenta de recarregar.',
  },
  'w-longbow': {
    desc: 'Um arco da altura de quem o usa, feito de teixo escolhido com cuidado. Exige anos de treino e, em troca, acerta mais longe do que qualquer outra arma.',
    use: 'Alcance de 45/180 m com 1d8; precisa das duas mãos e de flechas.',
  },
  'w-net': {
    desc: 'Malha de corda grossa com pesos nas bordas, girada no ar e lançada sobre o alvo. Não fere ninguém: só deixa a vítima enroscada e presa no lugar.',
    use: 'Deixa um alvo Grande ou menor impedido até ele escapar (FOR CD 10) ou cortar a rede.',
    tags: ['Arremessável', 'Controle'],
  },
};
