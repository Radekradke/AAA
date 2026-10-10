import type { ItemDescription } from './types';

/** Anéis, vestimentas e itens maravilhosos (Guia do Mestre 2014). */
export const WONDROUS_DESCRIPTIONS: Record<string, ItemDescription> = {
  // ---- Anéis ----
  'm-ring-prot': {
    desc: 'Um aro de prata simples com runas de proteção gravadas por dentro, onde só a pele as toca. Golpes que acertariam passam raspando.',
    use: 'Ocupa uma das três sintonias, mas melhora tudo ao mesmo tempo.',
    tags: ['Defesa'],
  },
  'm-ring-resist': {
    desc: 'Um anel com uma gema cuja cor diz o que ele segura: rubi para fogo, safira para frio, topázio para raio. O elemento perde a força ao chegar em você.',
    use: 'Escolha a gema pelo inimigo da campanha: fogo contra dragões vermelhos, frio no norte.',
    tags: ['Defesa'],
  },
  'm-ring-feather': {
    desc: 'Um anel de prata com uma pena gravada. Ao cair, o corpo fica leve como folha seca e desce flutuando.',
    use: 'Funciona sozinho ao cair: torres, penhascos e alçapões deixam de matar.',
    tags: ['Exploração'],
  },
  'm-ring-freeaction': {
    desc: 'Um anel de ferro escuro com elos gravados que parecem se soltar. Nenhuma corrente, teia ou magia prende quem o usa por muito tempo.',
    use: 'Ideal contra magos e criaturas que prendem: teias, raios paralisantes, lama.',
  },
  'm-ring-jumping': {
    desc: 'Um anel com a figura de um gafanhoto entalhada. Um impulso leve e você salta como se a gravidade tivesse dado folga.',
    use: 'Atravessa fossos e telhados sem gastar o movimento todo.',
    tags: ['Exploração'],
  },
  'm-ring-mindshield': {
    desc: 'Um anel de ouro com uma pedra leitosa no centro. Por trás dela, a mente fica fechada como um cofre.',
    use: 'Perfeito para espiões e para quem guarda segredos do grupo.',
    tags: ['Social', 'Discreta'],
  },
  'm-ring-swimming': {
    desc: 'Um anel de coral azul com uma onda gravada. Na água, braços e pernas se movem como os de um peixe.',
    use: 'Rios, lagos e naufrágios ficam ao alcance sem teste de Atletismo.',
    tags: ['Exploração'],
  },
  'm-ring-warmth': {
    desc: 'Um anel de cobre que está sempre morno, mesmo enterrado na neve. O frio do inverno passa longe de quem o usa.',
    use: 'Dispensa roupas pesadas em montanhas e terras geladas.',
    tags: ['Sobrevivência'],
  },
  'm-ring-waterwalking': {
    desc: 'Um anel de prata com uma gota de água presa na pedra. Quem o usa pisa no rio como se pisasse em mármore.',
    use: 'Atravessa rios sem ponte e foge pelo lago enquanto os outros nadam.',
    tags: ['Exploração'],
  },
  'm-ring-evasion': {
    desc: 'Um anel de prata trançada que parece escorregar do dedo. Quando o perigo chega, o corpo se move antes de você pensar.',
    use: 'Guarde as cargas para Bolas de Fogo e sopros de dragão.',
    tags: ['Defesa'],
  },
  'm-ring-invisibility': {
    desc: 'Um aro de ouro liso, sem marca nenhuma, que parece ficar frio quando alguém o observa. Coloque-o, e você não está mais lá.',
    use: 'Um dos itens mais poderosos do jogo: entra, ouve e sai sem ser visto.',
    tags: ['Furtividade'],
  },
  'm-ring-spellstoring': {
    desc: 'Um anel com várias pedras pequenas, que acendem conforme magias são guardadas nele. Um conjurador amigo pode deixar o feitiço pronto para você.',
    use: 'Peça ao mago do grupo para guardar um Escudo ou uma Cura para você.',
  },
  'm-ring-regeneration': {
    desc: 'Um anel com uma esmeralda viva por dentro, que pulsa devagar. Cortes fecham, ossos colam e até membros perdidos voltam a crescer.',
    use: 'Volta ao combate depois de um descanso curto quase sem gastar dados de vida.',
    tags: ['Cura'],
  },
  // ---- Vestimentas ----
  'm-cloak-prot': {
    desc: 'Um manto de lã fina com bordas bordadas em fio prateado. Parece comum, mas golpes e magias desviam um pouco ao tocá-lo.',
    use: 'Combina com o Anel de Proteção: os bônus somam.',
    tags: ['Defesa'],
  },
  'm-cloak': {
    desc: 'O tecido ondula como miragem e mostra você meio passo ao lado de onde realmente está. O inimigo sempre mira no lugar errado.',
    use: 'Ótimo para quem fica na linha de frente e quer que os primeiros golpes errem.',
    tags: ['Defesa'],
  },
  'm-cloak-elvenkind': {
    desc: 'Um manto verde e cinza que muda de tom conforme o lugar. Com o capuz erguido, você vira parte da mata ou da sombra.',
    use: 'Erga o capuz antes de entrar em território inimigo.',
    tags: ['Furtividade'],
  },
  'm-cloak-bat': {
    desc: 'Couro escuro e fino que se abre como asas de morcego ao segurar as bordas. Na escuridão, ele leva você pelo ar.',
    use: 'Na escuridão, você voa e se esconde ao mesmo tempo.',
    tags: ['Furtividade'],
  },
  'm-cloak-manta': {
    desc: 'Um manto azul-esverdeado de couro liso como a pele de uma arraia. Com o capuz, a água vira ar.',
    use: 'Para campanhas de mar e rios: explore o fundo sem poção.',
    tags: ['Exploração'],
  },
  'm-boots-elvenkind': {
    desc: 'Botas de couro macio feitas pelos elfos, sem uma única costura à vista. Os passos não fazem barulho, nem sobre folhas secas.',
    use: 'Junto com o Manto Élfico, quase ninguém percebe você.',
    tags: ['Furtividade'],
  },
  'm-boots-striding': {
    desc: 'Botas de cano alto com molas de bronze escondidas no salto. Cada passo rende o dobro, e cada salto, o triplo.',
    use: 'Mesmo com armadura pesada, você anda rápido e salta longe.',
    tags: ['Exploração'],
  },
  'm-boots-speed': {
    desc: 'Botas de couro avermelhado com esporas de ouro. Bata os calcanhares, e o mundo ao redor parece andar em câmera lenta.',
    use: 'Ative no começo da luta: chegue primeiro e saia sem levar golpes.',
  },
  'm-boots-winged': {
    desc: 'Botas de couro com pequenas asas de pena presas no tornozelo, que batem sozinhas quando você pula.',
    use: 'Divida o voo ao longo do dia: atravessar um abismo gasta poucos minutos.',
    tags: ['Exploração'],
  },
  'm-boots-levitation': {
    desc: 'Botas de couro claro, leves como papel. Com um pensamento, você sobe do chão e paira no ar.',
    use: 'Suba até a janela da torre ou fique fora do alcance de quem luta no chão.',
    tags: ['Exploração'],
  },
  'm-bracers-defense': {
    desc: 'Braçadeiras de couro com placas de metal rúnico que se mexem sozinhas para bloquear golpes. Os monges as adoram.',
    use: 'Feitas para monges e magos que não usam armadura.',
    tags: ['Defesa'],
  },
  'm-bracers-archery': {
    desc: 'Braçadeiras de couro gravadas com alvos e flechas. Quem as usa sente o vento e a distância como um arqueiro veterano.',
    use: 'Transformam qualquer um em arqueiro decente; nas mãos de um patrulheiro, letal.',
  },
  'm-gauntlets-ogre': {
    desc: 'Manoplas de ferro grosso com nós de dedos enormes. Dentro delas, as mãos ganham a força bruta de um ogro.',
    use: 'Para quem tem Força baixa: vira um lutador de verdade de um dia para o outro.',
  },
  'm-headband-intellect': {
    desc: 'Uma tiara de prata com uma pedra azul no centro da testa. Pensamentos ficam claros como água e a memória não falha.',
    use: 'O mago agradece; o guerreiro ganha perícias de conhecimento.',
  },
  'm-amulet-health': {
    desc: 'Um amuleto de ouro com um rubi em forma de coração. Doenças, cansaço e golpes parecem pesar menos.',
    use: 'Mais PV em todos os níveis e concentração mais firme para conjuradores.',
  },
  'm-belt-hill': {
    desc: 'Um cinto largo de couro grosso com uma fivela de pedra bruta. A força de um gigante da colina passa para quem o aperta.',
    use: 'Bom para quem bate com Força: mais acerto e mais dano.',
  },
  'm-belt-frost': {
    desc: 'Couro branco de urso polar e uma fivela de gelo que nunca derrete. O frio dá lugar a uma força que esmaga rochas.',
    use: 'Um guerreiro com ele derruba portas e adversários com facilidade.',
  },
  'm-belt-fire': {
    desc: 'Couro escuro e chamuscado com uma fivela de basalto que guarda um brilho de lava. Quem o usa levanta bigornas como se fossem pães.',
    use: 'Atributo acima do limite de um mortal: o dano dispara.',
  },
  'm-belt-cloud': {
    desc: 'Um cinto de tecido cinza e macio como névoa, com fivela de prata em forma de nuvem. Pesa nada, e a força que dá parece não ter fim.',
    use: 'Recompensa lendária para o lutador do grupo.',
  },
  'm-belt-storm': {
    desc: 'Couro azul-escuro com uma fivela onde um raio está preso. Trovões ecoam baixo quando você aperta o punho.',
    use: 'Com ele, nenhuma porta, muralha ou adversário resiste.',
  },
  'm-belt-dwarven': {
    desc: 'Um cinto de couro trançado com placas de ferro gravadas em runas anãs. Quem o usa ganha a resistência e a fala do povo da montanha.',
    use: 'Também ajuda nas conversas com anões, que respeitam quem o veste.',
  },
  'm-goggles-night': {
    desc: 'Óculos de lentes escuras presos por uma tira de couro. Por trás deles, a escuridão vira penumbra.',
    use: 'Para humanos e outros que não enxergam no escuro.',
    tags: ['Exploração'],
  },
  'm-eyes-eagle': {
    desc: 'Lentes de cristal finíssimo que se encaixam nos olhos e enxergam detalhes como uma águia lá do alto.',
    use: 'Ótimos para batedores e vigias: vê o perigo antes do grupo.',
    tags: ['Exploração'],
  },
  'm-periapt-wound': {
    desc: 'Um pingente de pedra vermelha cheia de veios, que esquenta perto de feridas. O sangue estanca sozinho.',
    use: 'Para quem cai muito: ninguém precisa gastar a ação para estabilizar você.',
    tags: ['Cura'],
  },
  'm-periapt-poison': {
    desc: 'Um pingente de prata com uma gota de líquido preto presa no vidro. Nenhum veneno consegue passar por ele.',
    use: 'Perfeito contra aranhas, serpentes, assassinos e drows.',
    tags: ['Defesa'],
  },
  'm-stone-luck': {
    desc: 'Uma pedra lisa e polida, de cor indefinida, que esquenta na palma da mão. A sorte parece andar sempre do seu lado.',
    use: 'Pequena e constante: ajuda em quase todo teste do jogo.',
    tags: ['Discreta'],
  },
  'm-robe-archmagi': {
    desc: 'Um manto bordado com estrelas e símbolos que se movem devagar pelo tecido. Feito para os maiores magos do mundo, protege e amplia o poder de quem o veste.',
    use: 'O sonho de todo mago: proteção e poder no mesmo item.',
    tags: ['Defesa'],
  },
  // ---- Maravilhosos ----
  'm-torch-eternal': {
    desc: 'Uma tocha comum com uma chama mágica que não esquenta, não queima nada e nunca apaga, nem debaixo de chuva.',
    use: 'Não serve para acender fogueiras, já que a chama é fria.',
    tags: ['Fonte de luz'],
  },
  'm-bag-holding': {
    desc: 'Uma bolsa de pano comum por fora e enorme por dentro, aberta para um espaço extradimensional. Coloque o braço e ele some até o ombro.',
    use: 'Carregue o tesouro inteiro do dragão sem sentir o peso.',
    tags: ['Exploração'],
  },
  'm-haversack': {
    desc: 'Uma mochila de couro com dois bolsos laterais e um central, todos maiores por dentro. O item que você procura está sempre por cima.',
    use: 'Achar a poção certa no meio da luta deixa de ser problema.',
    tags: ['Exploração'],
  },
  'm-rope-climbing': {
    desc: 'Dezoito metros de seda fina que se mexem como uma cobra ao comando. Sobe paredes, amarra nós e se enrola de volta.',
    use: 'Mande a corda subir a parede antes de qualquer um.',
    tags: ['Exploração'],
  },
  'm-immovable-rod': {
    desc: 'Uma barra de ferro com um botão numa das pontas. Aperte, e ela fica presa no ar, aguentando o peso de um carroção.',
    use: 'Um dos itens mais criativos do jogo: pense fora da caixa.',
    tags: ['Exploração', 'Controle'],
  },
  'm-decanter': {
    desc: 'Um jarro de barro com tampa, que faz barulho de água mesmo vazio. Diga a palavra, e ela jorra sem parar.',
    use: 'Água para o grupo no deserto, e um jato forte para empurrar alguém.',
    tags: ['Sobrevivência'],
  },
  'm-driftglobe': {
    desc: 'Uma esfera de vidro do tamanho de um punho que acende ao comando e flutua atrás de você como um vaga-lume fiel.',
    use: 'Mãos livres para lutar com escudo e arma sem perder a luz.',
    tags: ['Fonte de luz'],
  },
  'm-sending-stones': {
    desc: 'Duas pedras lisas e gêmeas. Fale com uma, e quem estiver com a outra ouve, não importa a distância.',
    use: 'Deixe uma com o contato na cidade e leve a outra para a masmorra.',
    tags: ['Social'],
  },
  'm-hat-disguise': {
    desc: 'Um chapéu comum que muda de forma junto com você. Com ele, seu rosto, roupa e voz viram os de outra pessoa.',
    use: 'Entre no baile, na guilda rival ou no quartel sem ser reconhecido.',
    tags: ['Social', 'Furtividade'],
  },
  'm-necklace-fireballs': {
    desc: 'Um colar de contas de vidro alaranjado, cada uma com uma pequena chama dentro. Arranque uma, jogue, e ela explode.',
    use: 'Arremesse várias contas juntas para uma explosão maior.',
    tags: ['Inflamável', 'Gasta ao usar'],
  },
  'm-gem-seeing': {
    desc: 'Uma gema facetada que, colocada diante do olho, mostra o mundo como ele realmente é, sem ilusões nem disfarces.',
    use: 'Use contra ilusionistas, metamorfos e portas invisíveis.',
    tags: ['Exploração'],
  },
  'm-ioun-protection': {
    desc: 'Uma pedra rosada que gira em órbita lenta ao redor da sua cabeça, desviando golpes no último instante.',
    use: 'Não ocupa as mãos nem o corpo, só a sintonia.',
    tags: ['Defesa'],
  },
  'm-ioun-awareness': {
    desc: 'Um cristal azul-escuro que orbita sua cabeça e vibra de leve quando algo se aproxima escondido.',
    use: 'Ninguém pega você desprevenido numa emboscada.',
    tags: ['Defesa'],
  },
  'm-ioun-fortitude': {
    desc: 'Uma pedra cor-de-rosa forte que orbita sua cabeça e deixa o corpo mais resistente a cada volta.',
    use: 'Mais PV e concentração mais firme a cada nível.',
  },
  'm-ioun-insight': {
    desc: 'Uma esfera azul-clara que gira devagar ao redor da cabeça e traz clareza para tudo o que você vê e sente.',
    use: 'Bom para clérigos e druidas, e para quem precisa perceber mentiras.',
  },
  'm-ioun-intellect': {
    desc: 'Uma esfera de mármore escarlate e azul que orbita sua cabeça e organiza os pensamentos como uma biblioteca.',
    use: 'O mago agradece: CD de magia e ataque mais altos.',
  },
  'm-ioun-leadership': {
    desc: 'Uma esfera de mármore rosa e verde que orbita sua cabeça e dá a quem a usa uma presença difícil de ignorar.',
    use: '+2 de Carisma (máx. 20): mais presença em toda conversa.',
    tags: ['Social'],
  },
  'm-ioun-strength': {
    desc: 'Um romboide azul-claro que orbita sua cabeça e endurece os músculos um pouco mais a cada volta.',
    use: '+2 de Força (máx. 20): mais dano e mais carga.',
  },
  'm-ioun-agility': {
    desc: 'Uma esfera vermelho-escura que gira rápido ao redor da cabeça e deixa os reflexos afiados como os de um gato.',
    use: 'Mais CA, iniciativa e acerto para quem luta com Destreza.',
  },
  'm-portable-hole': {
    desc: 'Um pano preto e redondo que, estendido numa superfície, vira um buraco de verdade. Dobre de novo, e ele cabe no bolso.',
    use: 'Nunca coloque dentro de uma Bolsa Devoradora: abre um rasgo para o Plano Astral.',
    tags: ['Exploração'],
  },
  'm-deck-many': {
    desc: 'Um baralho de cartas de marfim ou pergaminho com figuras que se movem. Cada carta sacada muda o destino, para o bem ou para o mal.',
    use: 'Combine com o mestre antes de sacar: pode encerrar uma campanha.',
  },
};
