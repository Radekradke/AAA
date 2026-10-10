import type { ItemDescription } from './types';

/** Pacotes, kits, consumíveis e munição do Livro do Jogador 2014. */
export const SUPPLY_DESCRIPTIONS: Record<string, ItemDescription> = {
  // ---- Pacotes (entram abertos na ficha) ----
  'g-explorer': {
    desc: 'Tudo o que um viajante precisa para atravessar o reino: mochila, saco de dormir, tochas, rações, odre e corda, comprado de uma vez no mercado.',
    use: 'Entra aberto na mochila: cada tocha e cada ração viram itens que você gasta.',
    tags: ['Exploração', 'Sobrevivência'],
  },
  'g-pack-burglar': {
    desc: 'A sacola de quem entra onde não foi convidado: pé de cabra, esferas para fugas, lanterna coberta, pitons e corda.',
    use: 'Entra aberto na mochila, pronto para invasões, telhados e saídas apressadas.',
    tags: ['Furtividade', 'Exploração'],
  },
  'g-pack-diplomat': {
    desc: 'Roupas finas, perfume, papel, tinta, lacre e um baú para guardar tudo com elegância. Para quem resolve as coisas com palavras.',
    use: 'Entra aberto no inventário: tudo para cartas, audiências e jantares na corte.',
    tags: ['Social'],
  },
  'g-pack-dungeoneer': {
    desc: 'O equipamento de quem desce sob a terra: tochas, pé de cabra, martelo, pitons, corda e comida para dez dias.',
    use: 'Entra aberto na mochila: luz, ferramentas e comida para longas masmorras.',
    tags: ['Exploração'],
  },
  'g-pack-entertainer': {
    desc: 'Fantasias, um kit de disfarce, velas e o essencial para a estrada. Para quem vive de palco em palco, de taverna em taverna.',
    use: 'Entra aberto na mochila: figurino e maquiagem para se apresentar (ou se esconder).',
    tags: ['Social'],
  },
  'g-pack-priest': {
    desc: 'Vestes cerimoniais, incenso, incensário, velas e uma caixa de esmolas, tudo o que um sacerdote leva para servir longe do templo.',
    use: 'Entra aberto na mochila: o necessário para ritos, preces e caridade na estrada.',
    tags: ['Social'],
  },
  'g-pack-scholar': {
    desc: 'Um livro de estudo, tinta, pena, pergaminhos e uma faquinha para apontar a pena. Para quem viaja aprendendo e anotando tudo.',
    use: 'Entra aberto na mochila: material de escrita e estudo.',
    tags: ['Social'],
  },
  // ---- Kits (uma ferramenta só) ----
  'g-healkit': {
    desc: 'Uma bolsa de couro com ataduras limpas, pomadas, talas e agulha de sutura. Não fecha feridas por magia, mas impede que um amigo sangre até a morte.',
    use: 'Estabiliza uma criatura a 0 PV sem teste de Medicina; tem 10 usos.',
    tags: ['Cura', 'Gasta ao usar'],
  },
  'g-thieves': {
    desc: 'Um estojo de couro enrolado com gazuas, limas finas, espelhinho e tesoura de ponta. Na mão certa, nenhuma fechadura é definitiva.',
    use: 'Com proficiência, soma ao teste para abrir fechaduras e desarmar armadilhas.',
    tags: ['Furtividade', 'Discreta'],
  },
  'g-climbers': {
    desc: 'Pitons, luvas de couro grosso, ganchos para as botas e um arnês com mosquetão. Com ele, a parede de pedra vira caminho.',
    use: 'Preso por ele, você não cai mais de 7,5 m, nem sai do lugar ancorado sem querer.',
    tags: ['Exploração'],
  },
  'g-disguise': {
    desc: 'Pós, tintas para cabelo, cola de cílios, barbas postiças e pequenos adereços. Com tempo e espelho, você vira outra pessoa.',
    use: 'Com proficiência, ajuda a criar e sustentar um disfarce convincente.',
    tags: ['Social', 'Furtividade'],
  },
  'g-forgery': {
    desc: 'Papéis de vários tipos, tintas, carimbos falsos e lacres de cores diferentes. Uma assinatura de duque custa uma tarde de trabalho.',
    use: 'Com proficiência, ajuda a falsificar documentos, selos e assinaturas.',
    tags: ['Social', 'Discreta'],
  },
  'g-herbalism': {
    desc: 'Bolsinhas de ervas secas, um pilão, tesoura de poda e um caderno de ilustrações botânicas. O conhecimento das plantas que curam e das que matam.',
    use: 'Identificar plantas e preparar antitoxina e poções de cura.',
    tags: ['Cura', 'Sobrevivência'],
  },
  'g-navigator': {
    desc: 'Sextante, bússola, compasso, réguas e cartas náuticas. Com elas, o céu da noite vira um mapa.',
    use: 'Com proficiência, traça rotas e evita que o grupo se perca no mar ou na estrada.',
    tags: ['Exploração'],
  },
  'g-poisoner': {
    desc: 'Frascos de vidro, pinças, luvas grossas e uma coleção de substâncias que ninguém deveria cheirar. Arte perigosa, e quase sempre ilegal.',
    use: 'Com proficiência, ajuda a preparar, identificar e aplicar venenos.',
    tags: ['Furtividade', 'Discreta'],
  },
  // ---- Consumíveis ----
  'g-holywater': {
    desc: 'Água abençoada num ritual demorado e guardada num frasco com o símbolo da divindade. Para os vivos, só molha; para os mortos que andam, queima.',
    use: 'Arremesso de 6 m: 2d6 radiante em corruptores e mortos-vivos.',
    tags: ['Frágil'],
  },
  'g-oil': {
    desc: 'Óleo grosso e escorregadio num frasco de barro. Abastece lampiões, lubrifica dobradiças e, aceso no chão, vira uma barreira de fogo.',
    use: 'Combustível do lampião; arremessado e aceso, causa 5 de dano de fogo.',
    tags: ['Inflamável', 'Frágil'],
  },
  'g-acid': {
    desc: 'Um líquido turvo que fumega e corrói até a rolha, guardado num frasco de vidro grosso. Derrete fechaduras, correntes e pele.',
    use: 'Arremesso de 6 m: 2d6 de ácido no alvo.',
    tags: ['Frágil'],
  },
  'g-alchemistfire': {
    desc: 'Um líquido pegajoso que se inflama ao contato com o ar. Gruda no alvo e continua queimando até alguém conseguir apagar.',
    use: 'Arremesso de 6 m: 1d4 de fogo por turno até o alvo apagar (DES CD 10).',
    tags: ['Inflamável', 'Frágil'],
  },
  'g-antitoxin': {
    desc: 'Um líquido amargo e esverdeado, destilado de raízes e venenos diluídos. O gosto é horrível, mas a ideia é não morrer.',
    use: 'Bebido, dá vantagem contra veneno por uma hora.',
    tags: ['Cura'],
  },
  'g-poison': {
    desc: 'Um frasquinho de líquido escuro e oleoso que se espalha pela lâmina ou pela ponta das flechas. Ninguém o vende em voz alta.',
    use: 'Cobre uma arma ou três munições: o alvo atingido faz o teste ou sofre dano de veneno.',
    tags: ['Discreta'],
  },
  // ---- Munição ----
  'g-arrows': {
    desc: 'Vinte hastes retas com ponta de ferro e penas de ganso. Cada uma foi conferida contra a luz para não ter empenamento.',
    use: 'Munição de arcos; depois do combate, metade das usadas pode ser recuperada.',
  },
  'g-needles': {
    desc: 'Cinquenta agulhas finas de metal ou espinho, quase invisíveis entre os dedos. Sozinhas, picam; com veneno, derrubam.',
    use: 'Munição da zarabatana; combine com veneno.',
    tags: ['Discreta'],
  },
  'g-bolts': {
    desc: 'Vinte virotes curtos e grossos, com aletas de couro. Saem da besta com força para atravessar couro e madeira.',
    use: 'Munição de bestas; recupere parte deles depois do combate.',
  },
  'g-bullets': {
    desc: 'Vinte bolinhas de chumbo, mais certeiras do que as pedras do rio. Pesam no bolso e no crânio de quem recebe.',
    use: 'Munição de funda (pedras comuns também servem).',
    tags: ['Barata'],
  },
};
