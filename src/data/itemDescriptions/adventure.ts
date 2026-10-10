import type { ItemDescription } from './types';

/** Equipamento de aventura do Livro do Jogador 2014 (o que se leva na mochila). */
export const ADVENTURE_DESCRIPTIONS: Record<string, ItemDescription> = {
  'g-backpack': {
    desc: 'Lona encerada, alças de couro largas e uma aba que fecha com fivela. Já viu chuva, lama e masmorra, e ainda tem espaço para mais um pão no fundo.',
    use: 'Onde vai quase tudo o que você carrega: cabe 15 kg de equipamento.',
    tags: ['Exploração'],
  },
  'g-rope': {
    desc: 'Quinze metros de cânhamo trançado, áspero na mão e com cheiro de porto. Sobe muralha, desce poço, amarra prisioneiro e puxa companheiro de volta do abismo.',
    use: 'Escalar, descer, amarrar e arrastar: sempre há um uso; romper pede FOR CD 17.',
    tags: ['Exploração', 'Barata'],
  },
  'g-torch': {
    desc: 'Um bastão de madeira com a ponta enrolada em pano embebido em resina. Ilumina pouco, fumega muito e é a primeira coisa que se acende ao descer uma escada escura.',
    use: 'Luz plena de 6 m (mais 6 m de penumbra) por uma hora; em último caso, vira arma de fogo improvisada.',
    tags: ['Fonte de luz', 'Inflamável', 'Gasta ao usar'],
  },
  'g-rations': {
    desc: 'Carne seca, biscoito duro, frutas passas e nozes, embrulhados em pano. Não é um banquete, mas aguenta a viagem sem estragar.',
    use: 'Um dia de comida por porção: conte uma por personagem a cada dia de jornada.',
    tags: ['Sobrevivência', 'Gasta ao usar'],
  },
  'g-abacus': {
    desc: 'Moldura de madeira com contas deslizando em varetas de metal. Nas mãos de um mercador experiente, conta mais rápido do que qualquer escriba.',
    use: 'Contas, câmbio e inventário de tesouro sem errar a soma.',
    tags: ['Social'],
  },
  'g-ballbearings': {
    desc: 'Um saquinho pesado de esferas de metal do tamanho de ervilhas. Espalhadas no chão, transformam qualquer corredor numa pista de patinação traiçoeira.',
    use: 'Cobrem um quadrado de 3 m: quem passa faz DES CD 10 ou cai; ótimas para fugas.',
    tags: ['Controle'],
  },
  'g-barrel': {
    desc: 'Aduelas de carvalho presas por aros de ferro, cheirando a vinho velho. Guarda água para uma travessia, salga carne para o inverno ou esconde um ladrão pequeno.',
    use: 'Grande demais para a mochila: guarda 150 L de líquido para viagens longas ou para a base do grupo.',
  },
  'g-basket': {
    desc: 'Vime trançado com alças firmes, do tipo que se vê em toda feira. Leva ervas colhidas, pães quentes ou cogumelos de reputação duvidosa.',
    use: 'Carrega até 20 kg do que não cabe na mochila, como colheita e compras.',
    tags: ['Barata'],
  },
  'g-bedroll': {
    desc: 'Lã grossa enrolada e presa com tiras de couro, que se estende no chão ao fim do dia. Não deixa a umidade da terra subir até os ossos.',
    use: 'Noite ao relento sem acordar dolorido: o básico de qualquer acampamento.',
    tags: ['Sobrevivência'],
  },
  'g-bell': {
    desc: 'Um sininho de latão com badalo de ferro, do tamanho de um polegar. Pendurado num fio esticado, avisa quando alguém tropeça perto do acampamento.',
    use: 'Alarme improvisado para a vigília, ou sinal combinado entre o grupo.',
    tags: ['Barata'],
  },
  'g-blanket': {
    desc: 'Lã tecida em padrão de xadrez, com a borda gasta de tanto uso. Aquece nas noites frias e, dobrada, serve de travesseiro.',
    use: 'Conforto nas noites geladas; vale mais em montanhas e no inverno.',
    tags: ['Sobrevivência', 'Barata'],
  },
  'g-blocktackle': {
    desc: 'Um conjunto de polias de madeira, ganchos de ferro e corda. Com paciência, uma pessoa sozinha ergue o que exigiria quatro.',
    use: 'Levanta até quatro vezes o peso que você ergueria: tirar baú de fosso, içar carga, abrir grade pesada.',
    tags: ['Exploração'],
  },
  'g-book': {
    desc: 'Capa de couro gasta e páginas amareladas, cheias de anotações nas margens. Pode ser poesia, história, um tratado de botânica ou o diário de alguém que não voltou.',
    use: 'Pesquisa, passatempo ou pista: o mestre decide o que está escrito ali.',
    tags: ['Social'],
  },
  'g-bottle': {
    desc: 'Vidro grosso e esverdeado, com rolha de cortiça. Guarda vinho, água limpa ou um bilhete que espera ser jogado ao mar.',
    use: 'Leva até 0,7 L de líquido; quebra se cair com força.',
    tags: ['Frágil'],
  },
  'g-bucket': {
    desc: 'Madeira com aros de ferro e uma alça de corda. Tira água do poço, apaga fogueira e, virado ao contrário, vira banquinho.',
    use: 'Carrega 11 L de água: apagar fogo, encher odres, lavar o acampamento.',
    tags: ['Barata'],
  },
  'g-caltrops': {
    desc: 'Pequenas peças de ferro com quatro pontas, que caem sempre com uma virada para cima. Espalhadas numa passagem, fazem perseguidores pensar duas vezes.',
    use: 'Cobrem 1,5 m: quem entra faz DES CD 15 ou para, sofre dano e anda mais devagar.',
    tags: ['Controle'],
  },
  'g-candle': {
    desc: 'Cera de abelha com pavio de algodão, que pinga devagar sobre o castiçal. Luz suficiente para ler um pergaminho, nunca para enxergar o fim de um corredor.',
    use: 'Luz curta (1,5 m) por uma hora; pesa nada e dura bem na mochila.',
    tags: ['Fonte de luz', 'Inflamável', 'Gasta ao usar'],
  },
  'g-casebolt': {
    desc: 'Estojo de madeira e couro preso à coxa ou ao cinto, com tampa que não deixa os virotes caírem na corrida.',
    use: 'Leva 20 virotes à mão para quem usa besta.',
  },
  'g-casemap': {
    desc: 'Um tubo de couro endurecido com tampa de rosca, forrado por dentro para não amassar o que guarda. Mapas, cartas e pergaminhos chegam secos do outro lado do rio.',
    use: 'Protege até 10 folhas enroladas de água, dobras e mãos curiosas.',
    tags: ['Exploração'],
  },
  'g-chain': {
    desc: 'Elos grossos de ferro forjado, pesados e frios ao toque. Prende prisioneiro, tranca portão e não se rompe com qualquer puxão.',
    use: 'Bem mais resistente que corda (romper pede FOR CD 20); combine com um cadeado.',
    tags: ['Controle'],
  },
  'g-chalk': {
    desc: 'Um bastão branco que suja os dedos e as paredes. Setas desenhadas nas pedras são a diferença entre sair do labirinto e virar parte dele.',
    use: 'Marcar o caminho numa masmorra, deixar recados ou desenhar um mapa no chão.',
    tags: ['Exploração', 'Barata'],
  },
  'g-chest': {
    desc: 'Madeira escura com cantoneiras de ferro e fechadura robusta. É o lugar certo para o ouro, os segredos e tudo o que não deve ser levado nas costas.',
    use: 'Guarda até 150 kg: o baú do grupo na carroça, na estalagem ou na base.',
  },
  'g-crowbar': {
    desc: 'Barra de ferro com uma ponta achatada e outra curva. Abre caixotes, força janelas e convence portas teimosas.',
    use: 'Vantagem em testes de Força em que a alavanca ajuda, como forçar portas e tampas.',
    tags: ['Exploração'],
  },
  'g-fishing': {
    desc: 'Uma vara de bambu, linha de crina, anzóis de osso e um potinho de iscas. Paciência não vem junto, mas o jantar às vezes vem.',
    use: 'Comida fresca perto da água durante a viagem, sem gastar rações.',
    tags: ['Sobrevivência'],
  },
  'g-flask': {
    desc: 'Uma caneca de estanho amassada ou um frasco de couro, companheiro de todas as tavernas. Leva o vinho do jantar ou o chá da vigília.',
    use: 'Meio litro de bebida sempre à mão.',
    tags: ['Barata'],
  },
  'g-grapplinghook': {
    desc: 'Três garras de ferro curvas presas a um anel. Amarrado na ponta de uma corda e lançado com jeito, morde a borda de um muro e aguenta a subida.',
    use: 'Com uma corda, chega a parapeitos e telhados que seriam impossíveis de alcançar.',
    tags: ['Exploração'],
  },
  'g-hammer': {
    desc: 'Cabeça de ferro, cabo de nogueira e anos de pregos tortos. Ferramenta de todo carpinteiro e de todo aventureiro que já precisou travar uma porta.',
    use: 'Cravar pitons, montar acampamento e consertar o que quebrou na estrada.',
    tags: ['Exploração', 'Barata'],
  },
  'g-sledgehammer': {
    desc: 'Uma cabeça de ferro do tamanho de um pão sobre um cabo longo. Feita para pedreiras, também resolve paredes falsas e fechaduras enferrujadas.',
    use: 'Quebrar pedra, portas e correntes quando sutileza não é opção.',
    tags: ['Exploração'],
  },
  'g-hourglass': {
    desc: 'Dois bulbos de vidro presos numa moldura de latão, com areia fina escorrendo de um para o outro. Marca o turno da vigília e a paciência de quem espera.',
    use: 'Contar o tempo de uma tarefa, de uma vigília ou de um ritual.',
    tags: ['Frágil'],
  },
  'g-huntingtrap': {
    desc: 'Mandíbulas de ferro dentadas presas a uma corrente, armadas por uma mola pesada. Quem pisa nela não sai andando.',
    use: 'Prende quem pisa (FOR CD 13 para escapar) e causa dano: proteja o acampamento ou cace sem esperar.',
    tags: ['Controle', 'Sobrevivência'],
  },
  'g-ink': {
    desc: 'Um frasquinho de tinta negra feita de fuligem e goma, tampado com cera. Mancha os dedos, a roupa e, com sorte, o papel.',
    use: 'Escrever cartas, copiar mapas, registrar o diário ou, para magos, copiar magias.',
    tags: ['Frágil'],
  },
  'g-inkpen': {
    desc: 'Uma pena de ganso aparada em ponta fina, levemente manchada de tinta. Escreve tratados, contratos e confissões.',
    use: 'Junto com a tinta, deixa você escrever qualquer coisa.',
    tags: ['Barata'],
  },
  'g-jug': {
    desc: 'Barro cozido com uma alça e uma boca estreita. Guarda água fresca na sombra, ou cerveja para a noite.',
    use: 'Quatro litros de líquido, bom para o acampamento ou a base.',
    tags: ['Frágil'],
  },
  'g-ladder': {
    desc: 'Duas traves de madeira e degraus amarrados com corda. Desajeitada de carregar, mas não há atalho mais simples para uma janela alta.',
    use: 'Sobe 3 m sem teste de escalada; pesa e ocupa espaço.',
    tags: ['Exploração'],
  },
  'g-lamp': {
    desc: 'Uma lamparina de barro ou latão com bico de pavio, que queima óleo com chama estável. Ilumina a mesa, o quarto ou a câmara do tesouro.',
    use: 'Luz plena de 4,5 m por seis horas com um frasco de óleo.',
    tags: ['Fonte de luz', 'Inflamável'],
  },
  'g-lanternbull': {
    desc: 'Uma lanterna de metal com uma única janela e um espelho por dentro, que lança a luz num facho comprido. O guarda vê longe, e quem está atrás dele fica no escuro.',
    use: 'Cone de luz plena de 18 m: ilumina longe sem clarear o grupo inteiro.',
    tags: ['Fonte de luz', 'Exploração'],
  },
  'g-lanternhood': {
    desc: 'Lanterna de metal com janelas de vidro e uma cobertura que desce por fora. Clareia em volta e, num instante, vira só um brilho fraco.',
    use: 'Luz plena de 9 m que você abafa para não ser visto.',
    tags: ['Fonte de luz', 'Furtividade'],
  },
  'g-lock': {
    desc: 'Um cadeado de ferro pesado com sua chave de dentes complicados. Não para um bom ladrão, mas faz ele demorar e suar.',
    use: 'Trancar baú, porta ou corrente; abrir sem a chave pede DES CD 15 com ferramentas de ladrão.',
  },
  'g-magnifying': {
    desc: 'Uma lente de vidro polido com cabo de osso. Revela assinaturas falsas, marcas de ourives e, ao sol, acende uma fogueira.',
    use: 'Vantagem para avaliar ou examinar objetos pequenos; acende fogo sem pederneira num dia de sol.',
    tags: ['Frágil', 'Exploração'],
  },
  'g-manacles': {
    desc: 'Duas argolas de ferro ligadas por corrente curta, com fechadura e chave. O fim da linha para muitos fugitivos.',
    use: 'Prende uma criatura Pequena ou Média: escapar pede DES CD 20, e romper, FOR CD 20.',
    tags: ['Controle'],
  },
  'g-messkit': {
    desc: 'Prato, copo e talheres de lata que se encaixam numa caixinha. Faz barulho de panela a cada passo.',
    use: 'O jantar no acampamento com um mínimo de dignidade.',
    tags: ['Sobrevivência', 'Barata'],
  },
  'g-mirror': {
    desc: 'Uma placa de aço polido do tamanho da mão, com moldura simples. Mostra o que há depois da esquina sem mostrar a sua cabeça.',
    use: 'Espiar cantos, sinalizar ao sol e olhar uma medusa sem encará-la.',
    tags: ['Exploração'],
  },
  'g-paper': {
    desc: 'Uma folha de papel de trapo, fina e clara, cara demais para desperdiçar. Cartas importantes merecem papel, não pergaminho.',
    use: 'Escrever cartas, decretos e mapas.',
    tags: ['Frágil', 'Inflamável'],
  },
  'g-parchment': {
    desc: 'Pele de animal raspada e esticada até virar folha. Mais resistente que o papel, aguenta viagem, chuva e o tempo.',
    use: 'Escrever o que precisa durar: contratos, mapas e pergaminhos de magia.',
    tags: ['Inflamável'],
  },
  'g-perfume': {
    desc: 'Um frasquinho de vidro lapidado com essência de flores, especiarias ou resinas raras. Uma gota diz mais sobre quem chega do que o próprio nome.',
    use: 'Causar boa impressão na corte ou disfarçar o cheiro de três dias de estrada.',
    tags: ['Social', 'Frágil'],
  },
  'g-pick': {
    desc: 'Ponta de ferro de um lado e lâmina larga do outro, num cabo longo. Ferramenta de mineiro, abre túneis e quebra paredes de pedra.',
    use: 'Cavar rocha e terra dura; abrir passagem onde não havia.',
    tags: ['Exploração'],
  },
  'g-piton': {
    desc: 'Um cravo de ferro com argola na ponta, cravado na fenda da rocha a marteladas. Pequeno, mas segura uma vida inteira pendurada numa corda.',
    use: 'Ancorar corda em paredes de pedra para escalar e descer com segurança.',
    tags: ['Exploração', 'Barata'],
  },
  'g-pole': {
    desc: 'Uma vara de madeira de três metros, reta e leve. Os aventureiros mais velhos dizem que ela já salvou mais vidas do que muita espada.',
    use: 'Cutucar o chão e as paredes antes de pisar: encontra armadilhas e poços.',
    tags: ['Exploração', 'Barata'],
  },
  'g-pot': {
    desc: 'Panela pesada de ferro fundido, preta de fuligem por fora. Ensopado para seis, desde que alguém tenha caçado alguma coisa.',
    use: 'Cozinhar para o grupo no acampamento.',
    tags: ['Sobrevivência'],
  },
  'g-pouch': {
    desc: 'Uma bolsinha de couro macio fechada por cordão, presa ao cinto. Guarda moedas, componentes de magia e pequenos tesouros.',
    use: 'O que você precisa pegar rápido: moedas, gemas, componentes (até 3 kg).',
    tags: ['Discreta', 'Barata'],
  },
  'g-quiver': {
    desc: 'Couro endurecido com alça de ombro, de onde as penas das flechas despontam por cima. A mão do arqueiro acha a próxima flecha sem olhar.',
    use: 'Leva 20 flechas à mão para quem usa arco.',
  },
  'g-ram': {
    desc: 'Um tronco reforçado com uma cabeça de ferro e alças dos lados. Não há fechadura que resista a ele, só portas mais grossas.',
    use: '+4 em Força para arrombar portas (e vantagem se alguém ajudar a carregar).',
    tags: ['Exploração'],
  },
  'g-ropesilk': {
    desc: 'Quinze metros de seda trançada, macia e surpreendentemente forte. Ocupa metade do espaço do cânhamo e quase não pesa.',
    use: 'Mesma resistência da corda comum, com metade do peso.',
    tags: ['Exploração'],
  },
  'g-sack': {
    desc: 'Um saco de juta com cordão na boca, que serve para tudo: batatas, roupas sujas ou o tesouro de um dragão que não está olhando.',
    use: 'Leva até 15 kg do que você recolher pelo caminho.',
    tags: ['Barata'],
  },
  'g-scale': {
    desc: 'Pratos de latão pendurados numa trave, com um estojo de pesos pequenos. Mercadores honestos e desonestos juram pela mesma balança.',
    use: 'Pesar ouro, gemas e ingredientes com precisão; desmascara moeda falsa.',
    tags: ['Social'],
  },
  'g-sealingwax': {
    desc: 'Um bastão de cera vermelha que se derrete na chama e pinga sobre a dobra da carta. Rompido, denuncia quem leu o que não devia.',
    use: 'Selar cartas e documentos; com um sinete, prova de onde vieram.',
    tags: ['Social'],
  },
  'g-shovel': {
    desc: 'Lâmina de ferro num cabo de madeira, gasta de tanto cavar. Abre trincheira, enterra fogueira e, às vezes, desenterra o que estava escondido.',
    use: 'Cavar terra: trincheiras, covas, tesouros enterrados.',
    tags: ['Exploração'],
  },
  'g-whistle': {
    desc: 'Um apito de osso ou de latão com um som agudo que atravessa a mata e as paredes de pedra. Quem ouve sabe que algo deu errado.',
    use: 'Chamar o grupo de longe ou dar o sinal combinado.',
    tags: ['Barata'],
  },
  'g-signet': {
    desc: 'Um anel de ouro ou prata com o brasão da família gravado ao contrário. Pressionado na cera quente, vale tanto quanto uma assinatura.',
    use: 'Prova de identidade e de autoridade: lacra cartas com o seu brasão.',
    tags: ['Social'],
  },
  'g-soap': {
    desc: 'Um bloco de sabão de sebo e cinzas, perfumado com ervas. Depois de três dias de masmorra, o item mais precioso da mochila.',
    use: 'Higiene antes de uma audiência; ninguém leva a sério um herói fedendo a esgoto.',
    tags: ['Social', 'Barata'],
  },
  'g-spellbook': {
    desc: 'Um livro de capa grossa e cem páginas de pergaminho fino, cheio de diagramas, runas e anotações do próprio mago. Perdê-lo é perder anos de estudo.',
    use: 'Onde o mago guarda as magias que conhece; é dele que prepara as magias do dia.',
    tags: ['Inflamável'],
  },
  'g-spikes': {
    desc: 'Dez cravos de ferro grossos e quadrados, do comprimento de um palmo. Cravados no batente, uma porta não abre mais por fora.',
    use: 'Travar portas, prender cordas e criar pontos de ancoragem.',
    tags: ['Exploração', 'Barata'],
  },
  'g-spyglass': {
    desc: 'Tubos de latão que se encaixam uns nos outros, com lentes nas pontas. Do alto do mastro, mostra a vela pirata antes que ela veja você.',
    use: 'Enxerga o dobro de longe: batedores, marinheiros e vigias.',
    tags: ['Exploração', 'Frágil'],
  },
  'g-tent': {
    desc: 'Lona encerada, estacas e varetas, que se arma em poucos minutos. Abrigo para dois aventureiros e todas as reclamações deles.',
    use: 'Abrigo contra chuva e vento para duas pessoas.',
    tags: ['Sobrevivência'],
  },
  'g-tinderbox': {
    desc: 'Uma caixinha de latão com pederneira, aço e mecha seca. Com um gesto rápido, a fagulha pega e a escuridão recua.',
    use: 'Acende uma tocha em uma ação; outra fogueira leva um minuto.',
    tags: ['Sobrevivência', 'Barata'],
  },
  'g-vial': {
    desc: 'Um frasquinho de vidro fino com rolha, do tamanho de um dedo. Guarda poções, venenos, amostras e sangue de criaturas estranhas.',
    use: 'Guardar 120 ml: poções, venenos ou uma amostra para estudar.',
    tags: ['Frágil', 'Barata'],
  },
  'g-waterskin': {
    desc: 'Couro costurado e encerado com bocal de madeira. Pendurado no ombro, é o primeiro item que se enche ao achar um riacho.',
    use: 'Dois litros de água: o essencial de cada jornada.',
    tags: ['Sobrevivência', 'Barata'],
  },
  'g-whetstone': {
    desc: 'Uma pedra plana e cinzenta, lisa de um lado e áspera do outro. O chiado da lâmina sobre ela é a música de todo acampamento de soldados.',
    use: 'Manter lâminas afiadas na estrada.',
    tags: ['Barata'],
  },
  'g-string': {
    desc: 'Três metros de barbante fino e resistente. Pouca coisa, até ser a linha que dispara o sino na porta.',
    use: 'Amarrações pequenas, armadilhas de aviso e medir distâncias.',
    tags: ['Barata', 'Discreta'],
  },
  'g-almsbox': {
    desc: 'Uma caixinha de madeira com fenda na tampa e o símbolo de uma divindade entalhado. Ninguém nega uma moeda a quem a carrega com humildade.',
    use: 'Recolher doações em nome do templo; abre portas entre os fiéis.',
    tags: ['Social'],
  },
  'g-incense': {
    desc: 'Um bloco de resina perfumada que solta fumaça densa e doce ao queimar. Os templos dizem que ela leva as preces mais alto.',
    use: 'Rituais, oferendas e cerimônias religiosas.',
    tags: ['Inflamável', 'Gasta ao usar'],
  },
  'g-censer': {
    desc: 'Um recipiente de metal perfurado pendurado em correntes, balançado devagar durante os ritos. A fumaça desenha caminhos no ar do templo.',
    use: 'Queimar incenso nas cerimônias; símbolo de ofício do sacerdote.',
    tags: ['Social'],
  },
  'g-sandbag': {
    desc: 'Um saquinho de areia fina para polvilhar sobre a tinta fresca. Sem ele, cada carta vira um borrão.',
    use: 'Secar a tinta de cartas e anotações sem borrar.',
    tags: ['Barata'],
  },
  'g-knife': {
    desc: 'Uma faca pequena de lâmina fina, feita para apontar penas e cortar papel. Nas mãos erradas, também corta o cordão de uma bolsa.',
    use: 'Apontar penas, abrir cartas, cortar barbante.',
    tags: ['Discreta', 'Barata'],
  },
};
