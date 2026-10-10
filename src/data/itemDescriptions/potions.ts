import type { ItemDescription } from './types';

/** Poções, óleos, filtros e pergaminhos (Guia do Mestre 2014). */
export const POTION_DESCRIPTIONS: Record<string, ItemDescription> = {
  'p-heal': {
    desc: 'Um líquido vermelho que brilha de leve quando o frasco é agitado. Tem gosto de cereja e ferro, e as feridas começam a fechar antes do último gole.',
    use: 'Beber é uma ação; dá para despejar na boca de um aliado caído e trazê-lo de volta.',
  },
  'p-heal-greater': {
    desc: 'Vermelho mais escuro e espesso, com pontos dourados que giram sozinhos. Os alquimistas cobram caro, e com razão.',
    use: 'Guarde para quando a luta apertar: vale mais que duas poções comuns.',
  },
  'p-heal-superior': {
    desc: 'Um rubi líquido que aquece a mão através do vidro. Ossos quebrados voltam ao lugar com um estalo.',
    use: 'Tira um aliado do perigo de uma vez; ótima para o tanque do grupo.',
  },
  'p-heal-supreme': {
    desc: 'Quase negra de tão vermelha, com um brilho que pulsa como um coração. Dizem que só é preparada em noites de lua cheia.',
    use: 'Rara e cara: é a reserva para o pior momento da campanha.',
  },
  'p-climbing': {
    desc: 'Três camadas de cor que não se misturam: marrom, prata e branco. Depois de bebida, os dedos grudam na pedra como os de uma lagartixa.',
    use: 'Beba antes de muralhas, penhascos e torres; dura o bastante para uma invasão inteira.',
    tags: ['Exploração'],
  },
  'p-animal': {
    desc: 'Um líquido turvo com cheiro de mato, que parece mexer sozinho no frasco. Os bichos da floresta passam a ver você como um dos seus.',
    use: 'Resolve encontros com lobos, ursos e cavalos sem tirar a espada da bainha.',
    tags: ['Social', 'Sobrevivência'],
  },
  'p-firebreath': {
    desc: 'Laranja como brasa, com bolhas que estouram em faíscas. A garganta esquenta, o hálito fumega e a próxima palavra sai em chamas.',
    use: 'Ação bônus por baforada: combine com o seu ataque normal no mesmo turno.',
    tags: ['Inflamável'],
  },
  'p-growth': {
    desc: 'Um líquido vermelho com uma gota minúscula que cresce e encolhe no meio do frasco. Em segundos, as roupas ficam apertadas.',
    use: 'Ótima antes de uma luta corpo a corpo, ou para alcançar algo alto.',
  },
  'p-giant-hill': {
    desc: 'Um líquido cinzento e turvo com uma lasca de unha de gigante flutuando no fundo. Os músculos incham e as mãos parecem pedras.',
    use: 'Arremesse inimigos, carregue o ferido e abra portas emperradas.',
  },
  'p-giant-frost': {
    desc: 'Azul pálido e gelado ao toque, com cristais de neve que não derretem. Depois do gole, o frio não incomoda e a força sobe.',
    use: 'Arremessa pedras, quebra portas de carvalho e segura a parede que desaba.',
  },
  'p-giant-fire': {
    desc: 'Um líquido âmbar que borbulha como metal derretido. O calor sobe pelo corpo e cada músculo endurece como uma forja.',
    use: 'Para o guerreiro, é um turno de dano enorme; para o mago, uma surpresa.',
  },
  'p-giant-cloud': {
    desc: 'Um líquido nebuloso que flutua dentro do frasco como uma nuvem presa. Quem bebe sente que poderia carregar uma torre.',
    use: 'Ergue carroças e vence qualquer queda de braço com um gigante.',
  },
  'p-giant-storm': {
    desc: 'Um líquido escuro onde pequenos relâmpagos cruzam de um lado a outro. Trovões abafados ecoam no peito de quem bebe.',
    use: 'Durante uma hora, ninguém no reino é mais forte que você.',
  },
  'p-poison': {
    desc: 'Parece uma poção de cura em tudo: cor, cheiro e brilho. A diferença só aparece depois do gole, quando a barriga começa a queimar.',
    use: 'Na mão do grupo, vira armadilha: troque pela poção de cura de um vilão.',
    tags: ['Discreta'],
  },
  'p-resistance': {
    desc: 'A cor muda conforme o elemento: vermelho para fogo, azul para frio, amarelo para raio. A pele ganha um brilho fosco que segura o golpe.',
    use: 'Beba antes de enfrentar um dragão ou entrar numa forja: escolha o elemento certo.',
    tags: ['Defesa'],
  },
  'p-waterbreathing': {
    desc: 'Um líquido verde-água com uma bolha de ar presa no meio que nunca sobe. Depois do gole, respirar debaixo d’água fica tão natural quanto em terra.',
    use: 'Explore naufrágios, rios subterrâneos e templos submersos sem pressa.',
    tags: ['Exploração'],
  },
  'p-diminution': {
    desc: 'Um líquido transparente com uma gota azul que encolhe sem parar. Em segundos, o mundo fica enorme ao seu redor.',
    use: 'Passa por buracos de rato, grades e frestas; esconde-se em qualquer canto.',
    tags: ['Furtividade'],
  },
  'p-gaseous': {
    desc: 'Um frasco que parece vazio, mas pesa. Ao abrir, uma névoa sobe e, depois do gole, o corpo se desfaz no ar.',
    use: 'A fuga perfeita de uma cela ou de uma luta perdida.',
    tags: ['Exploração', 'Furtividade'],
  },
  'p-heroism': {
    desc: 'Um líquido azul-celeste que brilha como o céu ao amanhecer. O medo vai embora e o coração bate firme.',
    use: 'Beba antes do chefe: os PV temporários absorvem o primeiro golpe.',
    tags: ['Defesa'],
  },
  'p-invulnerability': {
    desc: 'Um líquido metálico e pesado, como mercúrio. Por um minuto, a pele fica dura feito aço e as lâminas mal arranham.',
    use: 'Um minuto inteiro aguentando metade do dano: aguenta o sopro do dragão.',
    tags: ['Defesa'],
  },
  'p-mindreading': {
    desc: 'Um líquido roxo e denso com nuvens rosadas girando dentro. Depois do gole, vozes que ninguém disse começam a sussurrar.',
    use: 'Use num interrogatório ou numa negociação para descobrir o que não dizem.',
    tags: ['Social'],
  },
  'p-clairvoyance': {
    desc: 'Um líquido amarelado com um olho pintado no rótulo que parece piscar. A visão escapa do corpo e vai para outro lugar.',
    use: 'Espie o salão do castelo antes de invadir.',
    tags: ['Exploração'],
  },
  'p-flying': {
    desc: 'Um líquido claro com uma pena branca que flutua no meio sem tocar o vidro. Os pés deixam o chão logo depois do último gole.',
    use: 'Atravessa abismos, alcança torres e escapa de qualquer cerco.',
    tags: ['Exploração'],
  },
  'p-invisibility': {
    desc: 'O frasco parece vazio, mas a mão sente o líquido mexer. Quem bebe some, junto com tudo o que está vestindo.',
    use: 'Passe pelos guardas, roube a chave e saia antes que alguém perceba.',
    tags: ['Furtividade'],
  },
  'p-longevity': {
    desc: 'Um líquido âmbar onde boia um fragmento de casca de árvore milenar. Rugas somem, cabelos voltam a escurecer.',
    use: 'Recompensa de fim de campanha: devolve anos de vida a um herói idoso.',
  },
  'p-speed': {
    desc: 'Um líquido amarelo-vivo com pequenas faíscas que correm de um lado para o outro. O mundo ao redor parece desacelerar.',
    use: 'Use no turno em que tudo precisa dar certo: ação extra e mais CA.',
  },
  'p-vitality': {
    desc: 'Um líquido vermelho-sangue que pulsa no ritmo do coração de quem o segura. O cansaço e as doenças vão embora num gole.',
    use: 'Salva o grupo depois de uma marcha forçada ou de uma praga.',
    tags: ['Cura'],
  },
  'p-elixir-health': {
    desc: 'Um líquido límpido com bolhas brancas que sobem sem parar. Olhos voltam a enxergar, ouvidos a ouvir e venenos perdem a força.',
    use: 'Leve um para expedições a lugares de pragas, venenos e maldições.',
    tags: ['Cura'],
  },
  'p-oil-slipperiness': {
    desc: 'Um óleo preto e escorregadio que mal fica dentro do frasco. Espalhado na pele, nada consegue segurar você.',
    use: 'Escapa de agarrões e de cordas; derramado, derruba perseguidores.',
    tags: ['Controle'],
  },
  'p-oil-etherealness': {
    desc: 'Um óleo cinza-pérola que se evapora devagar ao contato com o ar. Quem o espalha no corpo fica transparente e atravessa paredes.',
    use: 'Atravessa a parede do cofre e volta sem deixar rastro.',
    tags: ['Exploração'],
  },
  'p-oil-sharpness': {
    desc: 'Um óleo prateado que brilha como gume recém-afiado. Uma camada fina sobre a lâmina faz o aço cortar como seda.',
    use: 'Passe antes de uma luta difícil: a arma mais forte do grupo fica +3.',
  },
  'p-philter-love': {
    desc: 'Um líquido rosado com uma bolha em forma de coração que sobe e desce. Não cria amor, mas cria um encanto muito convincente.',
    use: 'Encanto, não amor: o efeito passa, e a pessoa pode lembrar.',
    tags: ['Social'],
  },
  'p-scroll-1': {
    desc: 'Um rolo de pergaminho amarrado com fita, coberto de runas que brilham de leve quando lidas em voz alta. As palavras somem depois de ditas.',
    use: 'Bom para magias de utilidade que você não quer preparar todo dia.',
    tags: ['Frágil', 'Inflamável'],
  },
  'p-scroll-3': {
    desc: 'Um pergaminho grosso com selo de cera e runas mais complicadas, que esquentam os dedos. Ler sem preparo pode dar errado.',
    use: 'Guarde para emergências: um Contramágica ou Bola de Fogo na hora certa.',
    tags: ['Frágil', 'Inflamável'],
  },
};
