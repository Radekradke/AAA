import type { ItemDescription } from './types';

/** Montarias, arreios, veículos, focos de conjuração e roupas do Livro do Jogador 2014. */
export const TRAVEL_DESCRIPTIONS: Record<string, ItemDescription> = {
  // ---- Montarias ----
  'g-mount-camel': {
    desc: 'Alto, de passo balançado e humor terrível, o camelo atravessa dunas por dias sem beber. Cospe em quem não respeita.',
    use: 'Montaria para o deserto: 15 m de deslocamento e carga de 240 kg.',
    tags: ['Montado', 'Sobrevivência'],
  },
  'g-mount-donkey': {
    desc: 'Paciente, teimoso e incansável, o burro carrega mais do que parece. Dá um coice certeiro em quem tenta mexer na carga.',
    use: 'Animal de carga barato: leva 210 kg pelos caminhos estreitos.',
    tags: ['Montado', 'Barata'],
  },
  'g-mount-elephant': {
    desc: 'Uma montanha cinzenta que anda, com presas de marfim e memória longa. Carrega uma casa nas costas ou derruba uma muralha de escudos.',
    use: 'Carga de 660 kg; leva várias pessoas e assusta exércitos inteiros.',
    tags: ['Montado'],
  },
  'g-mount-drafthorse': {
    desc: 'Pernas grossas, peito largo e cascos do tamanho de pratos. Feito para puxar arado e carroça, não para galopar.',
    use: 'Puxa carroças e carroções; carga de 270 kg a 12 m.',
    tags: ['Montado'],
  },
  'g-mount-ridinghorse': {
    desc: 'Esguio e rápido, com crina ao vento e um olhar que reconhece o dono. É o cavalo das estradas, dos mensageiros e das fugas.',
    use: 'Viagens rápidas: 18 m de deslocamento; foge do combate, não é treinado para ele.',
    tags: ['Montado', 'Exploração'],
  },
  'g-mount-mastiff': {
    desc: 'Um cão enorme de mandíbula forte e lealdade sem fim. Para halflings e gnomos, é montaria; para os outros, um guarda que não dorme.',
    use: 'Montaria para criaturas Pequenas: 12 m de deslocamento e 97 kg de carga.',
    tags: ['Montado'],
  },
  'g-mount-pony': {
    desc: 'Baixinho, peludo e esperto, o pônei aguenta frio, trilha de montanha e criança puxando a crina. Preferido de anões e halflings.',
    use: 'Montaria de criaturas Pequenas ou animal de carga leve (112 kg).',
    tags: ['Montado', 'Barata'],
  },
  'g-mount-warhorse': {
    desc: 'Músculo, ferradura e coragem treinada desde potro. Não se assusta com espadas, fogo ou gritos, e investe quando o cavaleiro manda.',
    use: 'Treinado para o combate: 18 m de deslocamento e não foge no meio da luta.',
    tags: ['Montado', 'Defesa'],
  },
  // ---- Arreios e cuidado ----
  'g-tack-bridle': {
    desc: 'Couro trançado, freio de metal e rédeas longas. Sem ele, quem decide o caminho é o cavalo.',
    use: 'Necessário para conduzir a montaria com controle.',
    tags: ['Montado'],
  },
  'g-tack-feed': {
    desc: 'Um saco de aveia, feno e cevada para um dia. Um cavalo bem alimentado é um cavalo que não larga você no meio da estrada.',
    use: 'Um dia de comida para a montaria nas viagens longe de pasto.',
    tags: ['Montado', 'Gasta ao usar'],
  },
  'g-tack-saddle-riding': {
    desc: 'Couro macio sobre armação de madeira, com estribos e cilha. A sela de toda viagem a cavalo.',
    use: 'Montar com conforto em viagens comuns.',
    tags: ['Montado'],
  },
  'g-tack-saddle-military': {
    desc: 'Sela de arção alto, com apoio nas costas e laterais reforçadas, feita para manter o cavaleiro firme no choque da carga.',
    use: 'Vantagem nos testes para não cair da montaria em combate.',
    tags: ['Montado', 'Defesa'],
  },
  'g-tack-saddle-pack': {
    desc: 'Uma armação de madeira com ganchos e correias para prender carga dos dois lados do animal. Não é para gente sentar.',
    use: 'Prende sacos, barris e baús no lombo do animal de carga.',
    tags: ['Montado'],
  },
  'g-tack-saddle-exotic': {
    desc: 'Sela sob medida com correias extras, feita para grifos, hipogrifos ou cavalos-marinhos gigantes. Cada uma é única e cara.',
    use: 'Obrigatória para montar criaturas aquáticas ou voadoras.',
    tags: ['Montado'],
  },
  'g-tack-saddlebags': {
    desc: 'Duas bolsas de couro ligadas por uma faixa, penduradas dos dois lados da sela. Guardam o que você quer ter à mão durante a cavalgada.',
    use: 'Mais espaço de carga na montaria, sem pesar nas suas costas.',
    tags: ['Montado'],
  },
  'g-tack-stabling': {
    desc: 'Uma baia coberta, palha limpa, água fresca e um cavalariço que escova o pelo. O animal agradece, e você dorme tranquilo na estalagem.',
    use: 'Abrigo e cuidado para a montaria por um dia enquanto o grupo fica na cidade.',
    tags: ['Montado', 'Gasta ao usar'],
  },
  // ---- Veículos ----
  'g-veh-cart': {
    desc: 'Duas rodas, uma caixa de madeira e um varal para um animal. Leva colheita à feira e aventureiros cansados de volta para casa.',
    use: 'Transporte simples de carga, puxado por um cavalo, pônei ou burro.',
    tags: ['Exploração'],
  },
  'g-veh-wagon': {
    desc: 'Quatro rodas, cobertura de lona e espaço para a mudança de uma família. Lento, barulhento e indispensável numa caravana.',
    use: 'Carga grande e abrigo sobre rodas para viagens longas.',
    tags: ['Exploração'],
  },
  'g-veh-carriage': {
    desc: 'Cabine fechada com portas, janelas de vidro e bancos estofados, puxada por dois cavalos. Chegar de carruagem já é meia negociação vencida.',
    use: 'Transporte de passageiros com conforto e status.',
    tags: ['Social'],
  },
  'g-veh-chariot': {
    desc: 'Plataforma leve de duas rodas, puxada por cavalos a galope, com espaço para condutor e guerreiro. Arma antiga de reis e generais.',
    use: 'Carro de guerra rápido para duas pessoas.',
  },
  'g-veh-sled': {
    desc: 'Esquis de madeira sob uma plataforma, puxados por cães ou cavalos. Desliza por onde rodas atolariam.',
    use: 'Atravessar neve e gelo com carga.',
    tags: ['Sobrevivência'],
  },
  'g-veh-rowboat': {
    desc: 'Um bote de tábuas com dois remos e um banco. Cruza o rio, chega à costa e foge do navio que está afundando.',
    use: 'Travessias curtas na água; cabe nos conveses de navios maiores.',
    tags: ['Exploração'],
  },
  'g-veh-keelboat': {
    desc: 'Barco comprido de fundo chato, empurrado com varas ou puxado da margem. Desce rios carregando mercadoria e passageiros.',
    use: 'Viagens por rio com um tripulante e até seis passageiros.',
    tags: ['Exploração'],
  },
  'g-veh-sailing': {
    desc: 'Mastros altos, velas de lona e um porão cheio de histórias. Com bom vento, leva o grupo a terras que nem estão no mapa.',
    use: 'Viagens pelo mar com tripulação de 20 e espaço para 20 passageiros.',
    tags: ['Exploração'],
  },
  // ---- Focos de conjuração ----
  'g-componentpouch': {
    desc: 'Uma bolsinha de couro com dezenas de compartimentos: penas, pó de prata, enxofre, pétalas secas e coisas que é melhor não perguntar.',
    use: 'Substitui os componentes materiais sem custo das magias.',
  },
  'g-focus-crystal': {
    desc: 'Uma ponta de quartzo lapidada que brilha por dentro quando a magia passa por ela. Fria ao toque, mesmo no verão.',
    use: 'Foco arcano para feiticeiro, bruxo e mago: dispensa componentes materiais sem custo.',
    tags: ['Discreta'],
  },
  'g-focus-orb': {
    desc: 'Uma esfera de vidro ou pedra polida do tamanho de uma maçã, onde névoas parecem girar sozinhas.',
    use: 'Foco arcano: segure na mão para conjurar sem os componentes materiais comuns.',
    tags: ['Frágil'],
  },
  'g-focus-rod': {
    desc: 'Um bastão curto de metal ou madeira escura, com runas gravadas em espiral. Parece cetro, pesa como ferramenta.',
    use: 'Foco arcano que também passa por insígnia de autoridade.',
    tags: ['Social'],
  },
  'g-focus-staff': {
    desc: 'Um cajado alto de madeira escolhida, com cristal ou entalhes no topo. É ao mesmo tempo foco, apoio de viagem e arma.',
    use: 'Foco arcano que também serve de bordão (1d6, versátil 1d8).',
    tags: ['Exploração'],
  },
  'g-focus-wand': {
    desc: 'Uma varinha fina de madeira nobre, do comprimento de um antebraço. Aponta, e a magia segue o gesto.',
    use: 'Foco arcano leve e discreto para conjurar com uma mão.',
    tags: ['Discreta'],
  },
  'g-druidic-mistletoe': {
    desc: 'Um ramo de visco colhido na lua certa com foice de ouro, amarrado com fita verde. Ainda cheira a floresta.',
    use: 'Foco druídico: dispensa os componentes materiais sem custo das magias de druida.',
    tags: ['Discreta'],
  },
  'g-druidic-totem': {
    desc: 'Penas, ossos, dentes e contas presos num cordão ou num pequeno bastão. Cada peça lembra um animal que ensinou alguma coisa.',
    use: 'Foco druídico feito de lembranças da natureza.',
    tags: ['Sobrevivência'],
  },
  'g-druidic-staff': {
    desc: 'Um galho grosso de árvore viva, nunca cortado com metal, que ainda solta folhas na primavera.',
    use: 'Foco druídico que também serve de bordão (1d6, versátil 1d8).',
    tags: ['Exploração'],
  },
  'g-druidic-wand': {
    desc: 'Uma varinha de teixo, a árvore da vida e da morte, polida pelas mãos de gerações de druidas.',
    use: 'Foco druídico leve para conjurar com uma mão.',
    tags: ['Discreta'],
  },
  'g-holy-amulet': {
    desc: 'O símbolo da divindade em prata ou bronze, pendurado no pescoço por uma corrente. Fica quente quando a fé é posta à prova.',
    use: 'Símbolo sagrado para clérigos e paladinos; usado à vista, no peito.',
    tags: ['Social'],
  },
  'g-holy-emblem': {
    desc: 'O símbolo da divindade pintado ou gravado no escudo, ou bordado na túnica. Os inimigos sabem em nome de quem você luta.',
    use: 'Símbolo sagrado no escudo ou na roupa: conjura com a mão do escudo ocupada.',
    tags: ['Defesa'],
  },
  'g-holy-reliquary': {
    desc: 'Uma caixinha de metal trabalhado que guarda um fragmento sagrado: osso de santo, lasca de altar ou pó de um templo destruído.',
    use: 'Símbolo sagrado para clérigos e paladinos; carregado na mão ou no cinto.',
    tags: ['Social'],
  },
  // ---- Roupas ----
  'g-robes': {
    desc: 'Tecido longo e solto, com mangas largas e capuz. Usado por magos, monges, eremitas e por quem não liga para moda.',
    use: 'Vestimenta simples ou cerimonial; não conta como armadura.',
  },
  'g-vestments': {
    desc: 'Vestes bordadas com as cores e os símbolos de uma fé, guardadas para os dias de rito. Quem as veste fala pelo templo.',
    use: 'Rituais e cerimônias; identificam você como sacerdote.',
    tags: ['Social'],
  },
  'g-clothes-common': {
    desc: 'Camisa, calça ou saia, cinto e sapatos simples, de tecido grosso e cores de terra. Ninguém olha duas vezes para quem está assim.',
    use: 'Roupa do dia a dia; ajuda a se misturar ao povo.',
    tags: ['Discreta', 'Barata'],
  },
  'g-clothes-costume': {
    desc: 'Tecidos vistosos, plumas, máscaras e remendos coloridos de um figurino de palco. Pode ser um rei, um monstro ou um palhaço.',
    use: 'Apresentações e disfarces exagerados.',
    tags: ['Social'],
  },
  'g-clothes-fine': {
    desc: 'Seda, veludo, botões de prata e bordados delicados. Abre os portões da corte e fecha a boca dos porteiros.',
    use: 'Necessária para ser levado a sério entre nobres e na corte.',
    tags: ['Social'],
  },
  'g-clothes-traveler': {
    desc: 'Botas de cano alto, capa com capuz e tecidos grossos que aguentam vento, poeira e chuva. Feitas para a estrada, não para o salão.',
    use: 'Viajar com conforto em qualquer clima.',
    tags: ['Sobrevivência'],
  },
};
