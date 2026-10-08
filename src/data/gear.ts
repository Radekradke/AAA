import type { Item, ItemCategory, WeaponData } from '@/types/dnd';

/**
 * Equipamento de aventura do Livro do Jogador (2014): itens, munição, focos,
 * pacotes, ferramentas, instrumentos, jogos, montarias, arreios e veículos.
 * Peso em kg (1 lb ≈ 0,5 kg), preço em po (1 pp = 0,1 po; 1 pc = 0,01 po).
 * Resumos curtos parafraseados — não é o texto do livro.
 */
function G(id: string, name: string, group: string, kg: number, gp: number, note: string, category: ItemCategory = 'gear', extra: Partial<Item> = {}): Item {
  return { id, name, category, rarity: 'comum', weight: kg, value: gp, note, group, ...extra };
}

const AV = 'Aventura';
const AM = 'Munição';
const FO = 'Focos de conjuração';
const RO = 'Roupas';
const PA = 'Pacotes';
const KI = 'Kits';
const AR = 'Ferramentas de artesão';
const IN = 'Instrumentos musicais';
const JO = 'Jogos';
const MO = 'Montarias';
const VE = 'Arreios e veículos';
const CO = 'Consumíveis';

/** Cajado (foco arcano ou druídico) também é um bordão (PHB 2014). */
const STAFF: WeaponData = { baseId: 'w-quarterstaff', damageDice: 1, damageDie: 6, damageType: 'concussão', type: 'simple', range: 'melee', properties: ['Versátil'], versatileDie: 8 };

export const GEAR: Item[] = [
  // ---- itens que já existiam (ids mantidos) ----
  G('g-backpack', 'Mochila', AV, 2.5, 2, 'Carrega 0,03 m³ / 15 kg de equipamento'),
  G('g-explorer', 'Pacote de Explorador', PA, 29.5, 10, 'Mochila, saco de dormir, kit de refeição, pederneira, 10 tochas, 10 rações, odre e corda de 15 m'),
  G('g-rope', 'Corda de Cânhamo (15 m)', AV, 5, 1, '2 PV; romper exige FOR CD 17'),
  G('g-torch', 'Tocha', AV, 0.5, 0.01, 'Luz plena 6 m + penumbra 6 m por 1 hora; como arma: 1 de dano de fogo'),
  G('g-rations', 'Rações (1 dia)', AV, 1, 0.5, 'Comida seca de viagem'),
  G('g-healkit', 'Kit de Curandeiro', KI, 1.5, 5, '10 usos: estabiliza uma criatura a 0 PV sem teste de Medicina'),
  G('g-thieves', 'Ferramentas de Ladrão', KI, 0.5, 25, 'Abrir fechaduras e desarmar armadilhas (proficiência soma no teste)', 'tool'),

  // ---- aventura ----
  G('g-abacus', 'Ábaco', AV, 1, 2, 'Contas e cálculos'),
  G('g-ballbearings', 'Esferas de Metal (1.000)', AV, 1, 1, 'Espalhadas num quadrado de 3 m: DES CD 10 ou cai derrubado'),
  G('g-barrel', 'Barril', AV, 35, 2, 'Guarda 150 L de líquido ou 0,11 m³ de sólidos'),
  G('g-basket', 'Cesto', AV, 1, 0.4, 'Guarda 0,06 m³ / 20 kg'),
  G('g-bedroll', 'Saco de Dormir', AV, 3.5, 1, 'Para dormir ao relento'),
  G('g-bell', 'Sino', AV, 0, 1, 'Alarme ou sinal'),
  G('g-blanket', 'Cobertor', AV, 1.5, 0.5, 'Aquece nas noites frias'),
  G('g-blocktackle', 'Roldana e Talha', AV, 2.5, 1, 'Levanta até 4× o peso que você levantaria'),
  G('g-book', 'Livro', AV, 2.5, 25, 'Poesia, história, tratado ou relatos'),
  G('g-bottle', 'Garrafa de Vidro', AV, 1, 2, '0,7 L'),
  G('g-bucket', 'Balde', AV, 1, 0.05, '11 L de líquido'),
  G('g-caltrops', 'Estrepes (saco com 20)', AV, 1, 1, 'Área de 1,5 m: quem entra faz DES CD 15 ou para, sofre 1 perfurante e perde 3 m de deslocamento'),
  G('g-candle', 'Vela', AV, 0, 0.01, 'Luz plena 1,5 m + penumbra 1,5 m por 1 hora'),
  G('g-casebolt', 'Estojo de Virotes', AV, 0.5, 1, 'Guarda 20 virotes'),
  G('g-casemap', 'Estojo de Mapas e Pergaminhos', AV, 0.5, 1, 'Guarda 10 folhas enroladas'),
  G('g-chain', 'Corrente (3 m)', AV, 5, 5, '10 PV; romper exige FOR CD 20'),
  G('g-chalk', 'Giz', AV, 0, 0.01, 'Marcar caminhos'),
  G('g-chest', 'Baú', AV, 12.5, 5, 'Guarda 0,34 m³ / 150 kg'),
  G('g-climbers', 'Kit de Escalada', KI, 6, 25, 'Pitons, luvas e arnês: ancorado, não cai mais de 7,5 m'),
  G('g-componentpouch', 'Bolsa de Componentes', FO, 1, 25, 'Componentes materiais sem custo das magias'),
  G('g-crowbar', 'Pé de Cabra', AV, 2.5, 2, 'Vantagem em testes de FOR onde a alavanca ajuda'),
  G('g-fishing', 'Equipamento de Pesca', AV, 2, 1, 'Vara, linha, anzóis e iscas'),
  G('g-flask', 'Frasco ou Caneca', AV, 0.5, 0.02, '0,5 L'),
  G('g-grapplinghook', 'Gancho de Escalada', AV, 2, 2, 'Prende numa borda para escalar com corda'),
  G('g-hammer', 'Martelo', AV, 1.5, 1, 'Ferramenta de uso geral'),
  G('g-sledgehammer', 'Marreta', AV, 5, 2, 'Quebrar portas e pedras'),
  G('g-holywater', 'Água Benta (frasco)', CO, 0.5, 25, 'Arremesso 6 m: 2d6 radiante em corruptor ou morto-vivo', 'consumable'),
  G('g-hourglass', 'Ampulheta', AV, 0.5, 25, 'Marca o tempo'),
  G('g-huntingtrap', 'Armadilha de Caça', AV, 12.5, 5, 'FOR CD 13 para escapar; 1d4 perfurante e impedido'),
  G('g-ink', 'Tinta (frasco de 30 ml)', AV, 0, 10, 'Para escrever'),
  G('g-inkpen', 'Pena de Escrever', AV, 0, 0.02, 'Para escrever'),
  G('g-jug', 'Jarro', AV, 2, 0.02, '4 L de líquido'),
  G('g-ladder', 'Escada (3 m)', AV, 12.5, 0.1, 'Madeira'),
  G('g-lamp', 'Lampião', AV, 0.5, 0.5, 'Luz plena 4,5 m + penumbra 9 m; 6 horas por frasco de óleo'),
  G('g-lanternbull', 'Lanterna Furta-fogo', AV, 1, 10, 'Cone de luz plena 18 m + penumbra 18 m; 6 horas por óleo'),
  G('g-lanternhood', 'Lanterna Coberta', AV, 1, 5, 'Luz plena 9 m + penumbra 9 m; pode baixar a cobertura'),
  G('g-lock', 'Cadeado', AV, 0.5, 10, 'Com chave; abrir sem ela: DES CD 15 com ferramentas de ladrão'),
  G('g-magnifying', 'Lupa', AV, 0, 100, 'Acende fogo ao sol; vantagem em avaliar objetos pequenos'),
  G('g-manacles', 'Algemas', AV, 3, 2, 'Pequeno ou Médio; escapar DES CD 20, romper FOR CD 20'),
  G('g-messkit', 'Kit de Refeição', AV, 0.5, 0.2, 'Prato, copo e talheres de lata'),
  G('g-mirror', 'Espelho de Aço', AV, 0.25, 5, 'Olhar por cantos, sinalizar'),
  G('g-oil', 'Óleo (frasco)', CO, 0.5, 0.1, 'Arremesso 6 m espalha óleo; aceso: 5 de dano de fogo', 'consumable'),
  G('g-paper', 'Papel (folha)', AV, 0, 0.2, 'Para escrever'),
  G('g-parchment', 'Pergaminho (folha)', AV, 0, 0.1, 'Para escrever'),
  G('g-perfume', 'Perfume (frasco)', AV, 0, 5, 'Aroma marcante'),
  G('g-pick', 'Picareta de Mineiro', AV, 5, 2, 'Cavar rocha'),
  G('g-piton', 'Piton', AV, 0.1, 0.05, 'Cravo de escalada'),
  G('g-pole', 'Vara (3 m)', AV, 3.5, 0.05, 'Testar o chão à frente'),
  G('g-pot', 'Panela de Ferro', AV, 5, 2, '4 L'),
  G('g-pouch', 'Bolsa', AV, 0.5, 0.5, 'Guarda 0,006 m³ / 3 kg'),
  G('g-quiver', 'Aljava', AV, 0.5, 1, 'Guarda 20 flechas'),
  G('g-ram', 'Aríete Portátil', AV, 17.5, 4, '+4 em FOR para arrombar portas (vantagem com ajuda)'),
  G('g-robes', 'Mantos', RO, 2, 1, 'Vestes simples ou cerimoniais'),
  G('g-ropesilk', 'Corda de Seda (15 m)', AV, 2.5, 10, '2 PV; romper exige FOR CD 17'),
  G('g-sack', 'Saco', AV, 0.25, 0.01, 'Guarda 0,03 m³ / 15 kg'),
  G('g-scale', 'Balança de Mercador', AV, 1.5, 5, 'Pesa até 1 kg com precisão'),
  G('g-sealingwax', 'Lacre de Cera', AV, 0, 0.5, 'Sela cartas'),
  G('g-shovel', 'Pá', AV, 2.5, 2, 'Cavar'),
  G('g-whistle', 'Apito de Sinal', AV, 0, 0.05, 'Som agudo à distância'),
  G('g-signet', 'Anel de Sinete', AV, 0, 5, 'Carimba lacres com seu brasão'),
  G('g-soap', 'Sabão', AV, 0, 0.02, 'Higiene'),
  G('g-spellbook', 'Grimório', AV, 1.5, 50, '100 páginas para as magias do mago'),
  G('g-spikes', 'Cravos de Ferro (10)', AV, 2.5, 1, 'Travar portas, ancorar cordas'),
  G('g-spyglass', 'Luneta', AV, 0.5, 1000, 'Aumenta 2× o que você vê'),
  G('g-tent', 'Tenda (2 pessoas)', AV, 10, 2, 'Abrigo simples e portátil'),
  G('g-tinderbox', 'Pederneira', AV, 0.5, 0.5, 'Acende tocha em 1 ação; outros fogos em 1 minuto'),
  G('g-vial', 'Frasco (vial)', AV, 0, 1, '120 ml'),
  G('g-waterskin', 'Odre', AV, 2.5, 0.2, '2 L de água'),
  G('g-whetstone', 'Pedra de Amolar', AV, 0.5, 0.01, 'Afia lâminas'),

  // ---- itens que só aparecem dentro dos pacotes (sem preço na tabela do livro) ----
  G('g-string', 'Barbante (3 m)', AV, 0, 0, 'Vem no Pacote de Assaltante'),
  G('g-almsbox', 'Caixa de Esmolas', AV, 0.5, 0, 'Vem no Pacote de Sacerdote'),
  G('g-incense', 'Bloco de Incenso', AV, 0, 0, 'Vem no Pacote de Sacerdote'),
  G('g-censer', 'Incensário', AV, 0.5, 0, 'Vem no Pacote de Sacerdote'),
  G('g-vestments', 'Vestes Cerimoniais', RO, 2, 0, 'Vem no Pacote de Sacerdote'),
  G('g-sandbag', 'Saquinho de Areia', AV, 0.5, 0, 'Seca a tinta · vem no Pacote de Estudioso'),
  G('g-knife', 'Faca Pequena', AV, 0.25, 0, 'Apontar penas e cortar papel · vem no Pacote de Estudioso'),

  // ---- consumíveis ----
  G('g-acid', 'Ácido (frasco)', CO, 0.5, 25, 'Arremesso 6 m: 2d6 de ácido', 'consumable'),
  G('g-alchemistfire', 'Fogo Alquímico (frasco)', CO, 0.5, 50, 'Arremesso 6 m: 1d4 de fogo por turno até apagar (DES CD 10)', 'consumable'),
  G('g-antitoxin', 'Antitoxina (frasco)', CO, 0, 50, 'Vantagem contra veneno por 1 hora', 'consumable'),
  G('g-poison', 'Veneno Básico (frasco)', CO, 0, 100, 'Cobre uma arma ou 3 munições: 1d4 de veneno por 1 minuto', 'consumable'),

  // ---- munição ----
  G('g-arrows', 'Flechas (20)', AM, 0.5, 1, 'Para arcos'),
  G('g-needles', 'Agulhas de Zarabatana (50)', AM, 0.5, 1, 'Para zarabatana'),
  G('g-bolts', 'Virotes (20)', AM, 0.75, 1, 'Para bestas'),
  G('g-bullets', 'Balas de Funda (20)', AM, 0.75, 0.04, 'Para funda'),

  // ---- focos de conjuração ----
  G('g-focus-crystal', 'Foco Arcano: Cristal', FO, 0.5, 10, 'Feiticeiro, Bruxo, Mago'),
  G('g-focus-orb', 'Foco Arcano: Orbe', FO, 1.5, 20, 'Feiticeiro, Bruxo, Mago'),
  G('g-focus-rod', 'Foco Arcano: Bastão', FO, 1, 10, 'Feiticeiro, Bruxo, Mago'),
  G('g-focus-staff', 'Foco Arcano: Cajado', FO, 2, 5, 'Feiticeiro, Bruxo, Mago · também serve de bordão (1d6, versátil 1d8)', 'gear', { weapon: STAFF }),
  G('g-focus-wand', 'Foco Arcano: Varinha', FO, 0.5, 10, 'Feiticeiro, Bruxo, Mago'),
  G('g-druidic-mistletoe', 'Foco Druídico: Ramo de Visco', FO, 0, 1, 'Druida'),
  G('g-druidic-totem', 'Foco Druídico: Totem', FO, 0, 1, 'Druida'),
  G('g-druidic-staff', 'Foco Druídico: Cajado de Madeira', FO, 2, 5, 'Druida · também serve de bordão (1d6, versátil 1d8)', 'gear', { weapon: STAFF }),
  G('g-druidic-wand', 'Foco Druídico: Varinha de Teixo', FO, 0.5, 10, 'Druida'),
  G('g-holy-amulet', 'Símbolo Sagrado: Amuleto', FO, 0.5, 5, 'Clérigo, Paladino'),
  G('g-holy-emblem', 'Símbolo Sagrado: Emblema', FO, 0, 5, 'Clérigo, Paladino (no escudo ou na roupa)'),
  G('g-holy-reliquary', 'Símbolo Sagrado: Relicário', FO, 1, 5, 'Clérigo, Paladino'),

  // ---- roupas ----
  G('g-clothes-common', 'Roupas Comuns', RO, 1.5, 0.5, 'Do dia a dia'),
  G('g-clothes-costume', 'Fantasia', RO, 2, 5, 'Para apresentações'),
  G('g-clothes-fine', 'Roupas Finas', RO, 3, 15, 'Para a nobreza e a corte'),
  G('g-clothes-traveler', 'Roupas de Viajante', RO, 2, 2, 'Resistentes para a estrada'),

  // ---- pacotes ----
  G('g-pack-burglar', 'Pacote de Assaltante', PA, 22, 16, 'Mochila, 1.000 esferas, 3 m de linha, sino, 5 velas, pé de cabra, martelo, 10 pitons, lanterna coberta, 2 óleos, 5 rações, pederneira, odre, corda 15 m'),
  G('g-pack-diplomat', 'Pacote de Diplomata', PA, 18, 39, 'Baú, 2 estojos, roupas finas, tinta, pena, lampião, 2 óleos, 5 papéis, perfume, lacre, sabão'),
  G('g-pack-dungeoneer', 'Pacote de Explorador de Masmorras', PA, 30.5, 12, 'Mochila, pé de cabra, martelo, 10 pitons, 10 tochas, pederneira, 10 rações, odre, corda 15 m'),
  G('g-pack-entertainer', 'Pacote de Artista', PA, 19, 40, 'Mochila, saco de dormir, 2 fantasias, 5 velas, 5 rações, odre, kit de disfarce'),
  G('g-pack-priest', 'Pacote de Sacerdote', PA, 12, 19, 'Mochila, cobertor, 10 velas, pederneira, caixa de esmolas, 2 incensos, incensário, vestes, 2 rações, odre'),
  G('g-pack-scholar', 'Pacote de Estudioso', PA, 5, 40, 'Mochila, livro de estudo, tinta, pena, 10 pergaminhos, saquinho de areia, faquinha'),

  // ---- kits ----
  G('g-disguise', 'Kit de Disfarce', KI, 1.5, 25, 'Cosméticos, tinta de cabelo e adereços', 'tool'),
  G('g-forgery', 'Kit de Falsificação', KI, 2.5, 15, 'Papéis, tintas, selos e lacres', 'tool'),
  G('g-herbalism', 'Kit de Herbalismo', KI, 1.5, 5, 'Identificar plantas; fazer antitoxina e poção de cura', 'tool'),
  G('g-navigator', 'Ferramentas de Navegador', KI, 1, 25, 'Traçar rotas e não se perder no mar', 'tool'),
  G('g-poisoner', 'Kit de Envenenador', KI, 1, 50, 'Criar e aplicar venenos', 'tool'),

  // ---- ferramentas de artesão ----
  G('g-tool-alchemist', 'Suprimentos de Alquimista', AR, 4, 50, 'Alquimia', 'tool'),
  G('g-tool-brewer', 'Suprimentos de Cervejeiro', AR, 4.5, 20, 'Fermentação e bebidas', 'tool'),
  G('g-tool-calligrapher', 'Suprimentos de Calígrafo', AR, 2.5, 10, 'Escrita decorativa', 'tool'),
  G('g-tool-carpenter', 'Ferramentas de Carpinteiro', AR, 3, 8, 'Madeira e construção', 'tool'),
  G('g-tool-cartographer', 'Ferramentas de Cartógrafo', AR, 3, 15, 'Mapas', 'tool'),
  G('g-tool-cobbler', 'Ferramentas de Sapateiro', AR, 2.5, 5, 'Calçados', 'tool'),
  G('g-tool-cook', 'Utensílios de Cozinheiro', AR, 4, 1, 'Cozinha', 'tool'),
  G('g-tool-glassblower', 'Ferramentas de Vidreiro', AR, 2.5, 30, 'Vidro', 'tool'),
  G('g-tool-jeweler', 'Ferramentas de Joalheiro', AR, 1, 25, 'Joias e gemas', 'tool'),
  G('g-tool-leatherworker', 'Ferramentas de Curtidor', AR, 2.5, 5, 'Couro', 'tool'),
  G('g-tool-mason', 'Ferramentas de Pedreiro', AR, 4, 10, 'Pedra', 'tool'),
  G('g-tool-painter', 'Suprimentos de Pintor', AR, 2.5, 10, 'Pintura', 'tool'),
  G('g-tool-potter', 'Ferramentas de Oleiro', AR, 1.5, 10, 'Cerâmica', 'tool'),
  G('g-tool-smith', 'Ferramentas de Ferreiro', AR, 4, 20, 'Metal', 'tool'),
  G('g-tool-tinker', 'Ferramentas de Funileiro', AR, 5, 50, 'Consertos e engenhocas', 'tool'),
  G('g-tool-weaver', 'Ferramentas de Tecelão', AR, 2.5, 1, 'Tecidos', 'tool'),
  G('g-tool-woodcarver', 'Ferramentas de Entalhador', AR, 2.5, 1, 'Entalhe em madeira', 'tool'),

  // ---- instrumentos ----
  G('g-inst-bagpipes', 'Gaita de Foles', IN, 3, 30, 'Instrumento de sopro', 'tool'),
  G('g-inst-drum', 'Tambor', IN, 1.5, 6, 'Percussão', 'tool'),
  G('g-inst-dulcimer', 'Saltério', IN, 5, 25, 'Cordas percutidas', 'tool'),
  G('g-inst-flute', 'Flauta', IN, 0.5, 2, 'Sopro', 'tool'),
  G('g-inst-lute', 'Alaúde', IN, 1, 35, 'Cordas', 'tool'),
  G('g-inst-lyre', 'Lira', IN, 1, 30, 'Cordas', 'tool'),
  G('g-inst-horn', 'Trompa', IN, 1, 3, 'Metal', 'tool'),
  G('g-inst-panflute', 'Flauta de Pã', IN, 1, 12, 'Sopro', 'tool'),
  G('g-inst-shawm', 'Charamela', IN, 0.5, 2, 'Sopro de palheta dupla', 'tool'),
  G('g-inst-viol', 'Viola de Arco', IN, 0.5, 30, 'Cordas friccionadas', 'tool'),

  // ---- jogos ----
  G('g-game-dice', 'Jogo de Dados', JO, 0, 0.1, 'Dados de osso', 'tool'),
  G('g-game-dragonchess', 'Xadrez de Dragão', JO, 0.25, 1, 'Tabuleiro e peças', 'tool'),
  G('g-game-cards', 'Baralho', JO, 0, 0.5, 'Cartas de jogar', 'tool'),
  G('g-game-threedragon', 'Ante dos Três Dragões', JO, 0, 1, 'Jogo de cartas', 'tool'),

  // ---- montarias ----
  G('g-mount-camel', 'Camelo', MO, 0, 50, 'Deslocamento 15 m · carga 240 kg', 'other'),
  G('g-mount-donkey', 'Burro ou Mula', MO, 0, 8, 'Deslocamento 12 m · carga 210 kg', 'other'),
  G('g-mount-elephant', 'Elefante', MO, 0, 200, 'Deslocamento 12 m · carga 660 kg', 'other'),
  G('g-mount-drafthorse', 'Cavalo de Tração', MO, 0, 50, 'Deslocamento 12 m · carga 270 kg', 'other'),
  G('g-mount-ridinghorse', 'Cavalo de Montaria', MO, 0, 75, 'Deslocamento 18 m · carga 240 kg', 'other'),
  G('g-mount-mastiff', 'Mastim', MO, 0, 25, 'Deslocamento 12 m · carga 97 kg (montaria de pequenos)', 'other'),
  G('g-mount-pony', 'Pônei', MO, 0, 30, 'Deslocamento 12 m · carga 112 kg', 'other'),
  G('g-mount-warhorse', 'Cavalo de Guerra', MO, 0, 400, 'Deslocamento 18 m · carga 270 kg · treinado para combate', 'other'),

  // ---- arreios e veículos ----
  G('g-tack-bridle', 'Freio e Rédeas', VE, 0.5, 2, 'Para conduzir a montaria', 'other'),
  G('g-tack-feed', 'Ração Animal (1 dia)', VE, 5, 0.05, 'Alimento da montaria', 'other'),
  G('g-tack-saddle-riding', 'Sela de Montaria', VE, 12.5, 10, 'Sela comum', 'other'),
  G('g-tack-saddle-military', 'Sela Militar', VE, 15, 20, 'Vantagem para não cair da montaria', 'other'),
  G('g-tack-saddle-pack', 'Sela de Carga', VE, 7.5, 5, 'Para animais de carga', 'other'),
  G('g-tack-saddle-exotic', 'Sela Exótica', VE, 20, 60, 'Para montarias aquáticas ou voadoras', 'other'),
  G('g-tack-saddlebags', 'Alforjes', VE, 4, 4, 'Bolsas para a montaria', 'other'),
  G('g-tack-stabling', 'Estábulo (1 dia)', VE, 0, 0.5, 'Abrigo e cuidado para a montaria', 'other'),
  G('g-veh-cart', 'Carroça', VE, 100, 15, 'Veículo de tração simples', 'other'),
  G('g-veh-wagon', 'Carroção', VE, 200, 35, 'Veículo de carga grande', 'other'),
  G('g-veh-carriage', 'Carruagem', VE, 300, 100, 'Transporte de passageiros', 'other'),
  G('g-veh-chariot', 'Biga', VE, 50, 250, 'Carro de guerra', 'other'),
  G('g-veh-sled', 'Trenó', VE, 150, 20, 'Para neve e gelo', 'other'),
  G('g-veh-rowboat', 'Barco a Remo', VE, 50, 50, '2,25 km/h', 'other'),
  G('g-veh-keelboat', 'Barco de Quilha', VE, 0, 3000, '1,5 km/h · 1 tripulante, 6 passageiros', 'other'),
  G('g-veh-sailing', 'Veleiro', VE, 0, 10000, '3 km/h · 20 tripulantes, 20 passageiros', 'other'),
];
