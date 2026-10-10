import type { ItemDescription } from './types';

/** Varinhas, cajados, bastões, armas e armaduras mágicas (Guia do Mestre 2014). */
export const ARCANE_DESCRIPTIONS: Record<string, ItemDescription> = {
  // ---- Varinhas, cajados e bastões ----
  'm-wand-warmage1': {
    desc: 'Uma varinha de madeira escura com ponteira de prata, feita para magos que lutam na linha de frente.',
    use: 'Para conjuradores de ataque: menos erros e menos inimigos protegidos atrás de mesas.',
  },
  'm-wand-warmage2': {
    desc: 'A mesma varinha de mago de guerra, com runas mais finas e uma gema na base que brilha a cada feitiço.',
    use: 'Faz truques de dano acertarem quase sempre.',
  },
  'm-wand-warmage3': {
    desc: 'Uma varinha de mestre de batalha, quente ao toque, com a ponteira gasta de tantos combates.',
    use: 'A varinha definitiva do mago de batalha.',
  },
  'm-rod-pact1': {
    desc: 'Um bastão curto de madeira negra com o símbolo do patrono gravado. Quando o bruxo o segura, a voz do pacto fica mais forte.',
    use: 'Um espaço de pacto a mais por dia faz muita diferença para o bruxo.',
  },
  'm-rod-pact2': {
    desc: 'Um bastão de metal frio com olhos gravados que parecem acompanhar quem passa. O patrono olha através dele.',
    use: 'Melhora a Rajada Mística e todas as suas CDs.',
  },
  'm-rod-pact3': {
    desc: 'Um bastão que sussurra na língua do patrono e pulsa no ritmo do coração do bruxo, mesmo quando ele dorme.',
    use: 'O maior presente que um patrono pode dar.',
  },
  'm-wand-missiles': {
    desc: 'Uma varinha fina que solta faíscas azuis pela ponta mesmo em repouso. Aponte, e dardos de luz partem sem errar.',
    use: 'Mísseis Mágicos nunca erram: ótimo para acabar com inimigos feridos.',
  },
  'm-wand-web': {
    desc: 'Uma varinha de madeira clara com fios prateados enrolados nela, como se uma aranha morasse ali.',
    use: 'Prenda inimigos num corredor e deixe os arqueiros trabalharem.',
    tags: ['Controle'],
  },
  'm-wand-magicdetection': {
    desc: 'Uma varinha de cristal transparente que vibra de leve perto de qualquer coisa encantada, como um cão farejador.',
    use: 'Ache tesouros mágicos sem gastar espaço de magia.',
    tags: ['Exploração'],
  },
  'm-wand-fireballs': {
    desc: 'Uma varinha de madeira chamuscada, sempre morna, com cheiro de enxofre. Uma palavra, e o salão inteiro vira fogo.',
    use: 'Cuidado com aliados na área: a explosão não escolhe.',
    tags: ['Inflamável'],
  },
  'm-wand-lightning': {
    desc: 'Uma varinha de metal azulado que arrepia os pelos do braço de quem a segura. Dispara um raio em linha reta.',
    use: 'Alinhe os inimigos num corredor para acertar todos.',
  },
  'm-wand-paralysis': {
    desc: 'Uma varinha de osso branco com a ponta de âmbar, onde um inseto parece congelado no meio do voo.',
    use: 'Paralisado sofre acerto crítico de quem está perto: grite para o guerreiro.',
    tags: ['Controle'],
  },
  'm-staff-healing': {
    desc: 'Um cajado de madeira clara entalhado com folhas e mãos abertas. Nas mãos de um curandeiro, cada carga é uma vida salva.',
    use: 'Economiza os espaços do clérigo para outras magias.',
    tags: ['Cura'],
  },
  'm-staff-fire': {
    desc: 'Um cajado de madeira negra com veios vermelhos que brilham como brasas. O ar treme de calor ao redor dele.',
    use: 'Também protege você das suas próprias chamas.',
    tags: ['Inflamável'],
  },
  'm-staff-frost': {
    desc: 'Um cajado de madeira azulada coberto de geada que nunca derrete, com um cristal de gelo no topo.',
    use: 'Controle de área e dano no mesmo cajado.',
  },
  'm-staff-power': {
    desc: 'Um cajado alto de madeira e metal, com uma gema no topo que concentra poder bruto. Quebrá-lo de propósito libera uma explosão devastadora.',
    use: 'Quebrar o cajado é o último recurso: a explosão atinge você também.',
    tags: ['Defesa'],
  },
  // ---- Armas mágicas ----
  'mw-flametongue': {
    desc: 'Uma espada longa com runas de fogo na lâmina. Diga a palavra, e chamas sobem pelo aço e iluminam o campo de batalha.',
    use: 'Acenda antes da luta: ilumina e queima ao mesmo tempo.',
    tags: ['Fonte de luz'],
  },
  'mw-frostbrand': {
    desc: 'Uma espada longa de lâmina pálida, sempre coberta de uma fina camada de gelo. O frio dela queima mais que o fogo.',
    use: 'Ótima contra criaturas de fogo e em lugares quentes.',
    tags: ['Defesa'],
  },
  'mw-sunblade': {
    desc: 'Apenas um cabo de espada, até que você diga a palavra: uma lâmina de luz pura surge, brilhante como o meio-dia.',
    use: 'Guardada, é só um cabo: ninguém sabe que você está armado.',
    tags: ['Fonte de luz', 'Discreta'],
  },
  'mw-daggervenom': {
    desc: 'Uma adaga de lâmina negra com um sulco por onde escorre um veneno grosso, que aparece sozinho uma vez por dia.',
    use: 'Guarde o veneno do dia para o alvo mais perigoso.',
    tags: ['Discreta'],
  },
  'mw-javelin-lightning': {
    desc: 'Uma azagaia de ponta de cobre que estala de eletricidade. Arremessada, vira um raio que atravessa tudo no caminho.',
    use: 'Volta a funcionar ao amanhecer: use na primeira grande luta.',
  },
  'mw-mace-disruption': {
    desc: 'Uma maça de prata com o símbolo do sol na cabeça. Mortos-vivos sentem o golpe dela queimar até a alma.',
    use: 'Essencial em criptas e cemitérios.',
  },
  'mw-berserker-axe': {
    desc: 'Um machado pesado com uma lâmina que parece sedenta de sangue. Quem o empunha ganha força, e perde o controle quando é ferido.',
    use: 'Cuidado: a maldição faz você atacar quem estiver mais perto.',
  },
  'mw-oathbow': {
    desc: 'Um arco longo de madeira élfica que sussurra na língua dos elfos quando a corda é puxada. Ele ajuda você a cumprir um juramento de vingança.',
    use: 'Escolha o inimigo jurado com cuidado: só vale um por vez.',
  },
  'mw-holyavenger': {
    desc: 'Uma espada sagrada de aço branco, forjada para paladinos de coração puro. Ao seu redor, magias hostis perdem força.',
    use: 'Nas mãos de um paladino, a aura protege todo o grupo.',
    tags: ['Defesa'],
  },
  'mw-vorpal': {
    desc: 'Uma espada com lâmina tão fina que mal se enxerga de lado. Diz a lenda que um golpe perfeito separa a cabeça do corpo.',
    use: 'Cada 20 natural pode encerrar a luta na hora.',
  },
  // ---- Armaduras e escudos mágicos ----
  'ma-mithral': {
    desc: 'Uma cota de malha de mithral, metal leve e prateado que brilha mesmo no escuro. Pesa como roupa e protege como aço.',
    use: 'CA 16 sem exigir Força e sem desvantagem em Furtividade: a malha de quem precisa de silêncio.',
    tags: ['Furtividade'],
  },
  'ma-adamantine': {
    desc: 'Placas de adamante escuro, o metal mais duro do mundo. Lâminas escorregam e golpes certeiros perdem a força.',
    use: 'CA 18, e acertos críticos contra você viram acertos normais.',
    tags: ['Defesa'],
  },
  'ma-elven-chain': {
    desc: 'Uma malha élfica tão fina e leve que pode ser usada por baixo da roupa. Faz quase nenhum som.',
    use: 'Camisão +1 que conta como armadura leve: soma toda a sua Destreza na CA.',
    tags: ['Furtividade', 'Discreta'],
  },
  'ma-dragonscale': {
    desc: 'Escamas de um dragão adulto costuradas sobre couro, ainda com o brilho da cor original. O medo de dragões não alcança quem a veste.',
    use: 'Brunea +1, resistência ao elemento do dragão e vantagem contra presença aterradora.',
    tags: ['Defesa'],
  },
  'ms-sentinel': {
    desc: 'Um escudo com um olho pintado no centro, que parece acompanhar cada movimento ao redor e nunca pisca.',
    use: '+2 de CA, vantagem em iniciativa e em Percepção.',
    tags: ['Defesa'],
  },
  'ms-animated': {
    desc: 'Um escudo com runas que acendem ao comando. Ele sai do braço, flutua ao seu lado e bloqueia golpes sozinho.',
    use: '+2 de CA; ao comando, protege sozinho por um minuto e deixa as mãos livres.',
    tags: ['Defesa'],
  },
};
