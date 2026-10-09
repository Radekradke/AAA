/**
 * O que cada ferramenta e instrumento faz na mesa — D&D 5e 2014 (Livro do
 * Jogador e as regras de ferramentas do Xanathar), resumido com palavras
 * próprias. `short` vai no cartão; `uses` e `examples` no painel/dica.
 */
export interface ToolInfo {
  /** Linha curta do cartão. */
  short: string;
  /** Para que serve, numa frase. */
  uses: string;
  /** Atributos mais usados nos testes com ela. */
  ability: string;
  /** Exemplos concretos do que dá para fazer. */
  examples: string[];
}

const INSTRUMENT_USES = 'Tocar, compor e entreter. Com proficiência, soma o bônus nos testes de Atuação (CAR) feitos com o instrumento — e dá para ganhar a vida tocando nas tavernas.';

export const TOOL_INFO: Record<string, ToolInfo> = {
  /* ---------- ferramentas de artesão ---------- */
  'alchemists-supplies': {
    short: 'poções, ácidos e substâncias',
    uses: 'Identificar e preparar substâncias alquímicas.',
    ability: 'INT',
    examples: ['Identificar uma poção ou substância desconhecida', 'Preparar ácido, fogo alquímico ou antídoto (com tempo e ouro)', 'Ajuda em Arcanismo e Investigação envolvendo substâncias'],
  },
  'brewers-supplies': {
    short: 'bebidas, água limpa, venenos',
    uses: 'Fermentar bebidas e entender o que vai num copo.',
    ability: 'INT · SAB',
    examples: ['Purificar água para beber', 'Perceber veneno ou impureza numa bebida', 'Avaliar a origem e a qualidade de uma bebida'],
  },
  'calligraphers-supplies': {
    short: 'documentos, códigos, escrita',
    uses: 'Escrever com arte e ler o que documentos escondem.',
    ability: 'INT · DES',
    examples: ['Descobrir quem escreveu um documento e quando', 'Decifrar mapas, códigos e textos ocultos', 'Copiar uma assinatura ou estilo de escrita'],
  },
  'carpenters-tools': {
    short: 'madeira, abrigos, portas',
    uses: 'Construir e consertar estruturas de madeira.',
    ability: 'FOR · INT',
    examples: ['Erguer um abrigo ou uma barricada rápida', 'Achar o ponto fraco de uma porta ou parede de madeira', 'Consertar carroças, barcos pequenos e móveis'],
  },
  'cartographers-tools': {
    short: 'mapas e rotas',
    uses: 'Desenhar e interpretar mapas.',
    ability: 'SAB · INT',
    examples: ['Mapear o caminho percorrido sem se perder', 'Ler mapas antigos e estimar distâncias', 'Planejar a melhor rota de viagem'],
  },
  'cobblers-tools': {
    short: 'calçados, pegadas',
    uses: 'Fazer e consertar calçados — e ler o que eles contam.',
    ability: 'DES · INT',
    examples: ['Descobrir de onde alguém veio pelo calçado e pelas pegadas', 'Fazer um compartimento secreto num salto', 'Manter o grupo bem calçado em viagens longas'],
  },
  'cooks-utensils': {
    short: 'refeições que recuperam',
    uses: 'Cozinhar bem — inclusive no meio do mato.',
    ability: 'SAB · CON',
    examples: ['Uma boa refeição no descanso curto ajuda o grupo a recuperar PV extras', 'Perceber comida estragada ou envenenada', 'Preparar rações que duram mais'],
  },
  'glassblowers-tools': {
    short: 'vidro, frascos, lentes',
    uses: 'Trabalhar o vidro e avaliar objetos de vidro.',
    ability: 'INT · DES',
    examples: ['Fazer frascos, lentes e garrafas', 'Avaliar a origem e o valor de uma peça de vidro', 'Saber o que um frasco já guardou pelos resíduos'],
  },
  'jewelers-tools': {
    short: 'gemas e joias',
    uses: 'Avaliar e lapidar gemas e joias.',
    ability: 'INT · SAB',
    examples: ['Dizer o valor real de uma gema ou joia', 'Identificar uma falsificação', 'Lapidar ou reengastar pedras'],
  },
  'leatherworkers-tools': {
    short: 'couro, armaduras leves',
    uses: 'Curtir e trabalhar o couro.',
    ability: 'DES · INT',
    examples: ['Consertar armaduras de couro, bolsas e selas', 'Identificar a origem de uma pele ou couro', 'Fazer bainhas, cintos e alforjes'],
  },
  'masons-tools': {
    short: 'pedra, paredes, passagens',
    uses: 'Trabalhar a pedra e entender construções.',
    ability: 'FOR · INT',
    examples: ['Achar passagens secretas e fraquezas em paredes de pedra', 'Avaliar a idade e a origem de uma construção', 'Derrubar ou reforçar uma parede'],
  },
  'painters-supplies': {
    short: 'pintura, brasões, retratos',
    uses: 'Pintar e reconhecer obras e símbolos.',
    ability: 'SAB · DES',
    examples: ['Reconhecer a autoria e a época de uma pintura', 'Copiar um brasão, símbolo ou mapa com perfeição', 'Fazer um retrato falado de alguém'],
  },
  'potters-tools': {
    short: 'cerâmica e barro',
    uses: 'Modelar o barro e ler cerâmicas.',
    ability: 'INT · SAB',
    examples: ['Descobrir a origem de um vaso e o que ele guardou', 'Consertar ou fazer potes e jarros', 'Datar ruínas pelos cacos de cerâmica'],
  },
  'smiths-tools': {
    short: 'armas e armaduras de metal',
    uses: 'Forjar e consertar metal.',
    ability: 'FOR · INT',
    examples: ['Consertar armas e armaduras de metal', 'Avaliar a qualidade de uma arma', 'Forçar ou soltar correntes, grades e fechaduras simples'],
  },
  'tinkers-tools': {
    short: 'mecanismos e engenhocas',
    uses: 'Consertar e montar mecanismos pequenos.',
    ability: 'DES · INT',
    examples: ['Consertar objetos mecânicos quebrados', 'Desmontar um mecanismo para ver como funciona', 'Improvisar uma engenhoca simples (o Gnomo das Rochas faz brinquedos)'],
  },
  'weavers-tools': {
    short: 'tecidos, roupas, cordas',
    uses: 'Tecer, costurar e consertar tecidos.',
    ability: 'DES',
    examples: ['Consertar roupas, velas e cordas', 'Identificar a origem de um tecido', 'Ajustar roupas para um disfarce'],
  },
  'woodcarvers-tools': {
    short: 'flechas, arcos, entalhes',
    uses: 'Entalhar a madeira.',
    ability: 'DES · INT',
    examples: ['Fazer e consertar flechas, arcos e cajados', 'Entalhar figuras, símbolos e ferramentas', 'Identificar o tipo e a origem de uma madeira'],
  },

  /* ---------- instrumentos musicais ---------- */
  lute: { short: 'cordas · o clássico dos bardos', uses: INSTRUMENT_USES, ability: 'CAR', examples: ['Cordas dedilhadas, leve de carregar', 'O instrumento preferido dos bardos'] },
  flute: { short: 'sopro · leve e discreta', uses: INSTRUMENT_USES, ability: 'CAR', examples: ['Cabe em qualquer bolso', 'Som doce, ótimo para encantar plateias'] },
  drum: { short: 'percussão · marca o ritmo', uses: INSTRUMENT_USES, ability: 'CAR', examples: ['Ouvido de longe: bom para sinais e marchas', 'Anima danças e batalhas'] },
  lyre: { short: 'cordas · elegante, de cortes', uses: INSTRUMENT_USES, ability: 'CAR', examples: ['Pequena e refinada', 'Combina com salões nobres e templos'] },
  horn: { short: 'sopro · alto, para sinais', uses: INSTRUMENT_USES, ability: 'CAR', examples: ['Chama aliados à distância', 'Anuncia chegadas e batalhas'] },
  viol: { short: 'arco e cordas · melancólica', uses: INSTRUMENT_USES, ability: 'CAR', examples: ['Tocada com arco', 'Ótima para baladas tristes e salões'] },
  bagpipes: { short: 'sopro · alta e marcante', uses: INSTRUMENT_USES, ability: 'CAR', examples: ['Impossível não ouvir', 'De festivais e de exércitos em marcha'] },
  'pan-flute': { short: 'sopro · pastoril e feérica', uses: INSTRUMENT_USES, ability: 'CAR', examples: ['Tubos de bambu de tamanhos diferentes', 'Lembra campos, sátiros e florestas'] },
  shawm: { short: 'sopro de palheta · estridente', uses: INSTRUMENT_USES, ability: 'CAR', examples: ['Som forte e anasalado', 'De feiras e procissões'] },
  dulcimer: { short: 'cordas percutidas · de mesa', uses: INSTRUMENT_USES, ability: 'CAR', examples: ['Tocado com martelinhos', 'Pesado: melhor para quem não viaja leve'] },
};
