import type { ItemDescription } from './types';

/** Ferramentas de artesão, instrumentos musicais e jogos do Livro do Jogador 2014. */
export const CRAFT_DESCRIPTIONS: Record<string, ItemDescription> = {
  // ---- Ferramentas de artesão ----
  'g-tool-alchemist': {
    desc: 'Frascos de vidro, um alambique pequeno, pilão, pinças e uma coleção de pós que mudam de cor ao serem misturados. O cheiro de enxofre não sai mais da roupa.',
    use: 'Com proficiência, identifica substâncias e prepara ácido, fogo alquímico e outros compostos.',
    tags: ['Frágil'],
  },
  'g-tool-brewer': {
    desc: 'Um tacho de cobre, sacos de malte e lúpulo, tubos e um termômetro de vidro. Há quem diga que nenhum reino se sustenta sem cervejeiros.',
    use: 'Com proficiência, avalia e purifica bebidas e prepara cerveja para vender ou fazer amigos.',
    tags: ['Social'],
  },
  'g-tool-calligrapher': {
    desc: 'Penas de vários cortes, tintas coloridas, folhas de ouro e réguas finas. Um convite escrito por um calígrafo parece ter saído do próprio palácio.',
    use: 'Com proficiência, ajuda a escrever documentos elegantes e a reconhecer letras falsificadas.',
    tags: ['Social'],
  },
  'g-tool-carpenter': {
    desc: 'Serrote, formões, martelo, pregos e uma plaina, enrolados num avental de couro. Ponte quebrada, porta emperrada ou barricada às pressas, tudo começa aqui.',
    use: 'Com proficiência, ajuda a construir, consertar e desmontar estruturas de madeira.',
    tags: ['Exploração'],
  },
  'g-tool-cartographer': {
    desc: 'Compassos, réguas, tintas e pergaminhos grandes enrolados num tubo. Cada viagem bem documentada vira um mapa que outros vão disputar.',
    use: 'Com proficiência, ajuda a desenhar mapas precisos e a se orientar por eles.',
    tags: ['Exploração'],
  },
  'g-tool-cobbler': {
    desc: 'Agulhas grossas, sovela, linha encerada e retalhos de couro. Sola gasta na estrada é problema que se resolve na fogueira.',
    use: 'Com proficiência, conserta calçados e, com malícia, esconde algo dentro de um salto.',
    tags: ['Discreta'],
  },
  'g-tool-cook': {
    desc: 'Facas, colheres de pau, temperos em saquinhos e uma panela que já viu de tudo. Um bom cozinheiro transforma rato de esgoto em ensopado aceitável.',
    use: 'Com proficiência, prepara refeições que animam o grupo e identifica comida estragada ou envenenada.',
    tags: ['Sobrevivência', 'Social'],
  },
  'g-tool-glassblower': {
    desc: 'Cano de sopro, pinças, tesouras de metal e pedaços de vidro colorido. No calor do forno, a areia vira frasco, lente ou vitral.',
    use: 'Com proficiência, ajuda a avaliar e moldar objetos de vidro.',
    tags: ['Frágil'],
  },
  'g-tool-jeweler': {
    desc: 'Lupas, pinças minúsculas, limas e um pano de veludo. Nas mãos de um joalheiro, uma pedra comum revela se vale um castelo ou um copo de cerveja.',
    use: 'Com proficiência, avalia gemas e joias e ajuda a lapidar e engastar pedras.',
    tags: ['Social'],
  },
  'g-tool-leatherworker': {
    desc: 'Facas curvas, furadores, agulhas grossas e tinta para couro. Dá forma a cintos, bainhas, armaduras leves e bolsas com fundo falso.',
    use: 'Com proficiência, conserta e cria peças de couro, como bainhas e armaduras leves.',
  },
  'g-tool-mason': {
    desc: 'Talhadeiras, maceta, colher de pedreiro e um prumo de chumbo. Quem conhece pedra percebe a parede falsa antes de bater nela.',
    use: 'Com proficiência, ajuda a construir com pedra e a achar passagens secretas em alvenaria.',
    tags: ['Exploração'],
  },
  'g-tool-painter': {
    desc: 'Cavalete dobrável, pincéis de pelo fino, pigmentos em potinhos e telas esticadas. Um retrato encomendado abre portas que ouro não abre.',
    use: 'Com proficiência, pinta retratos e cenas e reconhece obras falsas.',
    tags: ['Social'],
  },
  'g-tool-potter': {
    desc: 'Estiletes, raspadores, uma pequena roda de oleiro e saquinhos de argila. Vasos, jarros e telhas nascem da lama do rio.',
    use: 'Com proficiência, molda cerâmica e reconhece a origem de vasos antigos.',
  },
  'g-tool-smith': {
    desc: 'Martelos, tenazes, limas e um avental de couro chamuscado. Com uma bigorna e fogo forte, a espada lascada volta a cortar.',
    use: 'Com proficiência, conserta e forja armas, armaduras e peças de metal.',
  },
  'g-tool-tinker': {
    desc: 'Um estojo de bolsos cheios de engrenagens, molas, alicates e parafusos de todos os tamanhos. Para o funileiro, nada quebrado está perdido.',
    use: 'Com proficiência, conserta objetos e monta pequenas engenhocas.',
  },
  'g-tool-weaver': {
    desc: 'Um tear portátil, fusos, agulhas e novelos de lã e linho. Do fio nascem capas, velas de barco e tapeçarias que contam histórias.',
    use: 'Com proficiência, conserta e tece roupas, tecidos e cordas.',
  },
  'g-tool-woodcarver': {
    desc: 'Facas de entalhe, goivas e uma lixa grossa. Um pedaço de galho vira estatueta, flecha ou cabo de arma em uma noite de vigília.',
    use: 'Com proficiência, entalha madeira e faz flechas, cabos e pequenas peças.',
    tags: ['Sobrevivência'],
  },
  // ---- Instrumentos musicais ----
  'g-inst-bagpipes': {
    desc: 'Um fole de couro com tubos de madeira que soltam um som alto e insistente. Nas montanhas, chama clãs inteiros para a batalha.',
    use: 'Com proficiência, apresentações; serve de foco para bardos. Ninguém consegue ignorar.',
    tags: ['Social'],
  },
  'g-inst-drum': {
    desc: 'Pele esticada sobre um aro de madeira, tocada com as mãos ou com baquetas. Marca o ritmo da marcha, da dança e do coração antes da luta.',
    use: 'Com proficiência, apresentações e sinais à distância; serve de foco para bardos.',
    tags: ['Social'],
  },
  'g-inst-dulcimer': {
    desc: 'Uma caixa de madeira com cordas esticadas, tocada com pequenos martelos. O som parece de chuva caindo em sinos.',
    use: 'Com proficiência, apresentações delicadas; serve de foco para bardos.',
    tags: ['Social'],
  },
  'g-inst-flute': {
    desc: 'Um tubo de madeira ou osso com furos para os dedos. Leve no bolso, doce ao ouvido, perfeita para noites de estrada.',
    use: 'Com proficiência, apresentações; serve de foco para bardos e cabe em qualquer canto.',
    tags: ['Social', 'Discreta'],
  },
  'g-inst-lute': {
    desc: 'Corpo bojudo de madeira, braço curto e cordas de tripa. É o instrumento de todo bardo de taverna e de toda canção de amor mal cantada.',
    use: 'Com proficiência, apresentações; o foco de bardo mais clássico.',
    tags: ['Social'],
  },
  'g-inst-lyre': {
    desc: 'Uma moldura em forma de ferradura com cordas dedilhadas. Dizem que os primeiros poemas épicos foram cantados ao som dela.',
    use: 'Com proficiência, apresentações solenes; serve de foco para bardos.',
    tags: ['Social'],
  },
  'g-inst-horn': {
    desc: 'Um chifre ou tubo de latão curvado, com som grave que viaja longe pelos vales. Anuncia caçadas, reis e invasões.',
    use: 'Com proficiência, apresentações e sinais ouvidos de muito longe; serve de foco para bardos.',
    tags: ['Social'],
  },
  'g-inst-panflute': {
    desc: 'Tubos de cana de tamanhos diferentes amarrados lado a lado. O som lembra o vento nas árvores e os sátiros dançando na clareira.',
    use: 'Com proficiência, apresentações; serve de foco para bardos, leve e pequena.',
    tags: ['Social', 'Discreta'],
  },
  'g-inst-shawm': {
    desc: 'Um tubo de madeira com palheta dupla e som agudo e anasalado. Toca alto o bastante para ser ouvido sobre a festa toda.',
    use: 'Com proficiência, apresentações em festas e praças; serve de foco para bardos.',
    tags: ['Social'],
  },
  'g-inst-viol': {
    desc: 'Corpo de madeira e cordas tocadas com um arco de crina. Consegue chorar e rir na mesma melodia.',
    use: 'Com proficiência, apresentações emocionantes; serve de foco para bardos.',
    tags: ['Social'],
  },
  // ---- Jogos ----
  'g-game-dice': {
    desc: 'Dados de osso ou marfim, gastos nas quinas, guardados num copinho de couro. Toda taverna tem uma mesa onde eles rolam a noite inteira.',
    use: 'Com proficiência, ganhar apostas e perceber quando os dados estão viciados.',
    tags: ['Social', 'Discreta'],
  },
  'g-game-dragonchess': {
    desc: 'Um tabuleiro de três níveis com peças de dragões, cavaleiros e magos. Partidas inteiras atravessam a noite em silêncio.',
    use: 'Com proficiência, vencer partidas de estratégia e impressionar nobres e estudiosos.',
    tags: ['Social'],
  },
  'g-game-cards': {
    desc: 'Um baralho de cartas pintadas à mão, com reis, rainhas e figuras estranhas. Às vezes uma carta a mais aparece na manga.',
    use: 'Com proficiência, jogos de cartas, apostas e truques de mão.',
    tags: ['Social', 'Discreta'],
  },
  'g-game-threedragon': {
    desc: 'Cartas com dragões coloridos e regras que ninguém explica do mesmo jeito. É o jogo favorito de mercenários e de quem gosta de blefar.',
    use: 'Com proficiência, ganhar apostas e ler o blefe de quem está do outro lado da mesa.',
    tags: ['Social'],
  },
};
