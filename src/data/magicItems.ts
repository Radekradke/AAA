import type { Item, ItemCategory, MagicEffects, Rarity } from '@/types/dnd';
import type { ItemCharges, ItemSpellGrant } from '@/types/character';

/**
 * Itens mágicos do Guia do Mestre (D&D 5e 2014) — seleção dos mais usados.
 * Os números que a ficha sabe aplicar ficam em `magic` (CA, salvaguardas,
 * atributo fixo, ataque/CD de magia, deslocamento, resistência); o resto é
 * descrito em `note`. Itens com sintonia só valem sintonizados (máx. 3).
 * Preços são a faixa sugerida por raridade. Resumos parafraseados.
 * Armas, armaduras e escudos +1/+2/+3 saem do catálogo normal escolhendo o
 * encantamento na hora de adicionar.
 */
const PRICE: Record<Rarity, number> = { comum: 100, incomum: 500, raro: 5000, 'muito-raro': 50000, lendario: 200000 };

function M(
  id: string,
  name: string,
  group: string,
  category: ItemCategory,
  rarity: Rarity,
  note: string,
  opts: { attune?: boolean | string[]; kg?: number; magic?: MagicEffects; heal?: string; spells?: ItemSpellGrant[]; charges?: ItemCharges; gp?: number; extra?: Partial<Item> } = {},
): Item {
  return {
    id, name, category, rarity, note, group,
    weight: opts.kg ?? 0,
    value: opts.gp ?? PRICE[rarity],
    attunement: !!opts.attune || undefined,
    attuneBy: Array.isArray(opts.attune) ? opts.attune : undefined,
    magic: opts.magic,
    heal: opts.heal,
    grantsSpells: opts.spells,
    charges: opts.charges,
    ...opts.extra,
  };
}

/** Varinhas de 7 cargas: recuperam 1d6+1 ao amanhecer; na última carga, d20 = 1 vira cinzas. */
const WAND7: ItemCharges = { max: 7, regain: '1d6+1', emptyRisk: { text: 'A varinha se desfaz em cinzas.', remove: true } };
/** Cajados de 10 cargas: recuperam 1d6+4 ao amanhecer; na última carga, d20 = 1 o cajado se perde. */
const STAFF10 = (what: string): ItemCharges => ({ max: 10, regain: '1d6+4', emptyRisk: { text: what, remove: true } });
/** Magia de item que gasta cargas (R = recarga controlada pelas cargas do item). */
const C = (spellId: string, cost = 1, x: Partial<ItemSpellGrant> = {}): ItemSpellGrant => ({ spellId, recharge: 'long', cost, ...x });

const PO = 'Poções e pergaminhos';
const AN = 'Anéis';
const VE = 'Vestimentas';
const VA = 'Varinhas, cajados e bastões';
const MA = 'Maravilhosos';
const AR = 'Armas mágicas';
const AM = 'Armaduras mágicas';

export const MAGIC_ITEMS: Item[] = [
  // ---- poções (beber cura na hora pelo inventário) ----
  M('p-heal', 'Poção de Cura', PO, 'consumable', 'comum', 'Recupera 2d4+2 PV', { heal: '2d4+2', kg: 0.25, gp: 50 }),
  M('p-heal-greater', 'Poção de Cura Maior', PO, 'consumable', 'incomum', 'Recupera 4d4+4 PV', { heal: '4d4+4', kg: 0.25, gp: 150 }),
  M('p-heal-superior', 'Poção de Cura Superior', PO, 'consumable', 'raro', 'Recupera 8d4+8 PV', { heal: '8d4+8', kg: 0.25, gp: 500 }),
  M('p-heal-supreme', 'Poção de Cura Suprema', PO, 'consumable', 'muito-raro', 'Recupera 10d4+20 PV', { heal: '10d4+20', kg: 0.25, gp: 1350 }),
  M('p-climbing', 'Poção de Escalada', PO, 'consumable', 'comum', '1 hora: deslocamento de escalada igual ao de caminhada e vantagem em Atletismo para escalar', { kg: 0.25, gp: 75 }),
  M('p-animal', 'Poção de Amizade Animal', PO, 'consumable', 'incomum', '1 hora: conjura Amizade Animal à vontade (CD 13)', { kg: 0.25 }),
  M('p-firebreath', 'Poção de Sopro de Fogo', PO, 'consumable', 'incomum', '1 hora: ação bônus para cuspir fogo (4d6, DES CD 13 metade), 3 vezes', { kg: 0.25 }),
  M('p-growth', 'Poção de Crescimento', PO, 'consumable', 'incomum', '1d4 horas: efeito ampliar de Aumentar/Reduzir', { kg: 0.25 }),
  M('p-giant-hill', 'Poção de Força de Gigante da Colina', PO, 'consumable', 'incomum', '1 hora: FOR passa a 21', { kg: 0.25 }),
  M('p-giant-frost', 'Poção de Força de Gigante do Gelo', PO, 'consumable', 'raro', '1 hora: FOR passa a 23', { kg: 0.25 }),
  M('p-giant-fire', 'Poção de Força de Gigante do Fogo', PO, 'consumable', 'raro', '1 hora: FOR passa a 25', { kg: 0.25 }),
  M('p-giant-cloud', 'Poção de Força de Gigante das Nuvens', PO, 'consumable', 'muito-raro', '1 hora: FOR passa a 27', { kg: 0.25 }),
  M('p-giant-storm', 'Poção de Força de Gigante da Tempestade', PO, 'consumable', 'lendario', '1 hora: FOR passa a 29', { kg: 0.25 }),
  M('p-poison', 'Poção de Veneno', PO, 'consumable', 'incomum', 'Parece cura: 3d6 de veneno e envenenado (CON CD 13)', { kg: 0.25 }),
  M('p-resistance', 'Poção de Resistência', PO, 'consumable', 'incomum', '1 hora: resistência a um tipo de dano', { kg: 0.25, gp: 300 }),
  M('p-waterbreathing', 'Poção de Respirar na Água', PO, 'consumable', 'incomum', '1 hora: respira debaixo d’água', { kg: 0.25, gp: 180 }),
  M('p-diminution', 'Poção de Diminuição', PO, 'consumable', 'raro', '1d4 horas: efeito reduzir de Aumentar/Reduzir', { kg: 0.25 }),
  M('p-gaseous', 'Poção de Forma Gasosa', PO, 'consumable', 'raro', '1 hora: efeito de Forma Gasosa', { kg: 0.25 }),
  M('p-heroism', 'Poção de Heroísmo', PO, 'consumable', 'raro', '1 hora: 10 PV temporários e efeito de Bênção', { kg: 0.25 }),
  M('p-invulnerability', 'Poção de Invulnerabilidade', PO, 'consumable', 'raro', '1 minuto: resistência a todo dano', { kg: 0.25 }),
  M('p-mindreading', 'Poção de Ler Mentes', PO, 'consumable', 'raro', '1 hora: efeito de Detectar Pensamentos (CD 13)', { kg: 0.25 }),
  M('p-clairvoyance', 'Poção de Clarividência', PO, 'consumable', 'raro', 'Efeito de Clarividência', { kg: 0.25 }),
  M('p-flying', 'Poção de Voo', PO, 'consumable', 'muito-raro', '1 hora: deslocamento de voo igual ao de caminhada', { kg: 0.25 }),
  M('p-invisibility', 'Poção de Invisibilidade', PO, 'consumable', 'muito-raro', '1 hora: invisível (acaba ao atacar ou conjurar)', { kg: 0.25 }),
  M('p-longevity', 'Poção da Longevidade', PO, 'consumable', 'muito-raro', 'Rejuvenesce 1d6+6 anos', { kg: 0.25 }),
  M('p-speed', 'Poção de Velocidade', PO, 'consumable', 'muito-raro', '1 minuto: efeito de Velocidade', { kg: 0.25 }),
  M('p-vitality', 'Poção de Vitalidade', PO, 'consumable', 'muito-raro', 'Remove exaustão e doenças; dados de vida curam o máximo por 24 h', { kg: 0.25 }),
  M('p-elixir-health', 'Elixir da Saúde', PO, 'consumable', 'raro', 'Cura doenças e as condições cego, surdo, paralisado e envenenado', { kg: 0.25 }),
  M('p-oil-slipperiness', 'Óleo da Escorregadia', PO, 'consumable', 'incomum', '8 horas: efeito de Movimentação Livre; ou vira área de Graxa', { kg: 0.25 }),
  M('p-oil-etherealness', 'Óleo da Eterealidade', PO, 'consumable', 'raro', '1 hora: efeito de Forma Etérea', { kg: 0.25 }),
  M('p-oil-sharpness', 'Óleo da Afiação', PO, 'consumable', 'muito-raro', '1 hora: arma cortante/perfurante vira +3', { kg: 0.25 }),
  M('p-philter-love', 'Filtro do Amor', PO, 'consumable', 'incomum', '1 hora: encantado pela primeira criatura que vir', { kg: 0.25 }),
  M('p-scroll-1', 'Pergaminho de Magia (1º círculo)', PO, 'consumable', 'comum', 'Conjura uma magia de 1º círculo da sua lista (CD 13, ataque +5)', { gp: 75 }),
  M('p-scroll-3', 'Pergaminho de Magia (3º círculo)', PO, 'consumable', 'incomum', 'Magia de 3º círculo (CD 15, ataque +7); fora da sua lista: teste de atributo', { gp: 300 }),

  // ---- anéis ----
  M('m-ring-prot', 'Anel de Proteção', AN, 'ring', 'raro', '+1 na CA e nas salvaguardas', { attune: true, magic: { saves: 1 }, extra: { acBonus: 1 } }),
  M('m-ring-resist', 'Anel de Resistência', AN, 'ring', 'raro', 'Resistência a um tipo de dano (conforme a gema)'),
  M('m-ring-feather', 'Anel da Queda Suave', AN, 'ring', 'raro', 'Cai 18 m por rodada, sem dano de queda', { attune: true }),
  M('m-ring-freeaction', 'Anel da Ação Livre', AN, 'ring', 'raro', 'Terreno difícil não custa extra; magia não reduz seu deslocamento nem paralisa/impede', { attune: true }),
  M('m-ring-jumping', 'Anel do Salto', AN, 'ring', 'incomum', 'Salto à vontade (ação bônus)', { attune: true }),
  M('m-ring-mindshield', 'Anel do Escudo Mental', AN, 'ring', 'incomum', 'Imune a ler pensamentos, mentiras detectadas e localização por magia', { attune: true }),
  M('m-ring-swimming', 'Anel da Natação', AN, 'ring', 'incomum', 'Deslocamento de natação de 12 m'),
  M('m-ring-warmth', 'Anel do Calor', AN, 'ring', 'incomum', 'Resistência a frio; confortável até −45 °C', { attune: true, magic: { resistances: ['frio'] } }),
  M('m-ring-waterwalking', 'Anel de Andar na Água', AN, 'ring', 'incomum', 'Anda sobre líquidos como se fossem chão'),
  M('m-ring-evasion', 'Anel da Evasão', AN, 'ring', 'raro', '3 cargas: reação para passar numa salvaguarda de DES em vez de falhar (recupera 1d3 ao amanhecer)', { attune: true, charges: { max: 3, regain: '1d3' } }),
  M('m-ring-invisibility', 'Anel da Invisibilidade', AN, 'ring', 'lendario', 'Fica invisível à vontade (ação)', { attune: true }),
  M('m-ring-spellstoring', 'Anel de Armazenar Magias', AN, 'ring', 'raro', 'Guarda até 5 círculos de magia para conjurar depois', { attune: true }),
  M('m-ring-regeneration', 'Anel da Regeneração', AN, 'ring', 'muito-raro', 'Recupera 1d6 PV a cada 10 minutos; membros perdidos voltam', { attune: true }),

  // ---- vestimentas e acessórios ----
  M('m-cloak-prot', 'Manto de Proteção', VE, 'wondrous', 'incomum', '+1 na CA e nas salvaguardas', { attune: true, kg: 0.5, magic: { ac: 1, saves: 1 } }),
  M('m-cloak', 'Manto do Deslocamento', VE, 'wondrous', 'raro', 'Ataques contra você têm desvantagem até você sofrer dano (volta no seu turno)', { attune: true, kg: 0.5 }),
  M('m-cloak-elvenkind', 'Manto Élfico', VE, 'wondrous', 'incomum', 'Capuz erguido: vantagem em Furtividade; Percepção para vê-lo em desvantagem', { attune: true, kg: 0.5 }),
  M('m-cloak-bat', 'Manto do Morcego', VE, 'wondrous', 'raro', 'Vantagem em Furtividade; voo de 12 m na penumbra/escuridão', { attune: true, kg: 0.5 }),
  M('m-cloak-manta', 'Manto da Arraia', VE, 'wondrous', 'incomum', 'Respira na água; natação de 18 m', { kg: 0.5 }),
  M('m-boots-elvenkind', 'Botas Élficas', VE, 'wondrous', 'incomum', 'Passos silenciosos: vantagem em Furtividade para andar em silêncio', { kg: 0.5 }),
  M('m-boots-striding', 'Botas de Caminhar e Saltar', VE, 'wondrous', 'incomum', 'Deslocamento mínimo de 9 m; salta 3× a distância', { attune: true, kg: 0.5 }),
  M('m-boots-speed', 'Botas da Velocidade', VE, 'wondrous', 'raro', 'Ação bônus: deslocamento dobrado e ataques de oportunidade em desvantagem (10 min/dia)', { attune: true, kg: 0.5 }),
  M('m-boots-winged', 'Botas Aladas', VE, 'wondrous', 'incomum', 'Voo igual ao deslocamento por até 4 horas/dia', { attune: true, kg: 0.5 }),
  M('m-boots-levitation', 'Botas da Levitação', VE, 'wondrous', 'raro', 'Levitação à vontade (em si mesmo)', { attune: true, kg: 0.5 }),
  M('m-bracers-defense', 'Braçadeiras de Defesa', VE, 'wondrous', 'raro', '+2 na CA sem armadura e sem escudo', { attune: true, kg: 0.5, magic: { ac: 2, unarmoredOnly: true } }),
  M('m-bracers-archery', 'Braçadeiras do Arqueiro', VE, 'wondrous', 'incomum', 'Proficiência em arco longo e curto; +2 de dano com eles', { attune: true, kg: 0.5 }),
  M('m-gauntlets-ogre', 'Manoplas de Força do Ogro', VE, 'wondrous', 'incomum', 'FOR passa a 19', { attune: true, kg: 1, magic: { setAbility: { str: 19 } } }),
  M('m-headband-intellect', 'Tiara do Intelecto', VE, 'wondrous', 'incomum', 'INT passa a 19', { attune: true, magic: { setAbility: { int: 19 } } }),
  M('m-amulet-health', 'Amuleto da Saúde', VE, 'wondrous', 'raro', 'CON passa a 19', { attune: true, kg: 0.5, magic: { setAbility: { con: 19 } } }),
  M('m-belt-hill', 'Cinto de Força de Gigante da Colina', VE, 'wondrous', 'raro', 'FOR passa a 21', { attune: true, kg: 0.5, magic: { setAbility: { str: 21 } } }),
  M('m-belt-frost', 'Cinto de Força de Gigante do Gelo', VE, 'wondrous', 'muito-raro', 'FOR passa a 23', { attune: true, kg: 0.5, magic: { setAbility: { str: 23 } } }),
  M('m-belt-fire', 'Cinto de Força de Gigante do Fogo', VE, 'wondrous', 'muito-raro', 'FOR passa a 25', { attune: true, kg: 0.5, magic: { setAbility: { str: 25 } } }),
  M('m-belt-cloud', 'Cinto de Força de Gigante das Nuvens', VE, 'wondrous', 'lendario', 'FOR passa a 27', { attune: true, kg: 0.5, magic: { setAbility: { str: 27 } } }),
  M('m-belt-storm', 'Cinto de Força de Gigante da Tempestade', VE, 'wondrous', 'lendario', 'FOR passa a 29', { attune: true, kg: 0.5, magic: { setAbility: { str: 29 } } }),
  M('m-belt-dwarven', 'Cinto Anão', VE, 'wondrous', 'raro', '+2 CON (máx. 20), fala anão, visão no escuro 18 m', { attune: true, kg: 0.5, magic: { addAbility: { con: { bonus: 2, max: 20 } } } }),
  M('m-goggles-night', 'Óculos da Noite', VE, 'wondrous', 'incomum', 'Visão no escuro de 18 m'),
  M('m-eyes-eagle', 'Olhos de Águia', VE, 'wondrous', 'incomum', 'Vantagem em Percepção pela visão', { attune: true }),
  M('m-periapt-wound', 'Periapto de Fechar Ferimentos', VE, 'wondrous', 'incomum', 'Estabiliza sozinho; dados de vida curam o dobro', { attune: true }),
  M('m-periapt-poison', 'Periapto da Prova contra Veneno', VE, 'wondrous', 'raro', 'Imune a dano de veneno e à condição envenenado', { magic: { resistances: ['veneno (imune)'] } }),
  M('m-stone-luck', 'Pedra da Sorte', VE, 'wondrous', 'incomum', '+1 em testes de atributo e salvaguardas', { attune: true, magic: { saves: 1, checks: 1 } }),
  M('m-robe-archmagi', 'Manto do Arquimago', VE, 'wondrous', 'lendario', 'CA 15 + DES sem armadura; vantagem contra magia; +2 no ataque e CD de magia', { attune: ['sorcerer', 'warlock', 'wizard'], kg: 2, magic: { unarmoredAC: { base: 15, ability: 'dex' }, spellAttack: 2, spellDC: 2 } }),
  M('m-torch-eternal', 'Tocha Eterna', MA, 'wondrous', 'comum', 'Chama mágica que não esquenta nem apaga', { kg: 0.5 }),

  // ---- varinhas, cajados e bastões ----
  M('m-wand-warmage1', 'Varinha do Mago de Guerra +1', VA, 'wondrous', 'incomum', '+1 no ataque de magia; ignora meia cobertura', { attune: ['spellcaster'], kg: 0.5, magic: { spellAttack: 1 } }),
  M('m-wand-warmage2', 'Varinha do Mago de Guerra +2', VA, 'wondrous', 'raro', '+2 no ataque de magia; ignora meia cobertura', { attune: ['spellcaster'], kg: 0.5, magic: { spellAttack: 2 } }),
  M('m-wand-warmage3', 'Varinha do Mago de Guerra +3', VA, 'wondrous', 'muito-raro', '+3 no ataque de magia; ignora meia cobertura', { attune: ['spellcaster'], kg: 0.5, magic: { spellAttack: 3 } }),
  M('m-rod-pact1', 'Bastão do Guardião do Pacto +1', VA, 'wondrous', 'incomum', 'Bruxo: +1 no ataque e na CD de magia; recupera 1 espaço 1×/dia', { attune: ['warlock'], kg: 1, magic: { spellAttack: 1, spellDC: 1 } }),
  M('m-rod-pact2', 'Bastão do Guardião do Pacto +2', VA, 'wondrous', 'raro', 'Bruxo: +2 no ataque e na CD de magia; recupera 1 espaço 1×/dia', { attune: ['warlock'], kg: 1, magic: { spellAttack: 2, spellDC: 2 } }),
  M('m-rod-pact3', 'Bastão do Guardião do Pacto +3', VA, 'wondrous', 'muito-raro', 'Bruxo: +3 no ataque e na CD de magia; recupera 1 espaço 1×/dia', { attune: ['warlock'], kg: 1, magic: { spellAttack: 3, spellDC: 3 } }),
  M('m-wand-missiles', 'Varinha de Mísseis Mágicos', VA, 'wondrous', 'incomum', '7 cargas: Mísseis Mágicos — 1 carga no 1º círculo, +1 círculo por carga extra (recupera 1d6+1 ao amanhecer)', { kg: 0.5, charges: WAND7, spells: [C('sp-misseis', 1, { upcast: true })] }),
  M('m-wand-web', 'Varinha de Teia', VA, 'wondrous', 'incomum', '7 cargas: Teia (CD 15) por 1 carga (recupera 1d6+1 ao amanhecer)', { attune: ['spellcaster'], kg: 0.5, charges: WAND7, spells: [C('sp-teiaaranha', 1, { dc: 15 })] }),
  M('m-wand-magicdetection', 'Varinha de Detecção de Magia', VA, 'wondrous', 'incomum', '3 cargas: Detectar Magia por 1 carga (recupera 1d3 ao amanhecer)', { kg: 0.5, charges: { max: 3, regain: '1d3' }, spells: [C('sp-detectar')] }),
  M('m-wand-fireballs', 'Varinha de Bolas de Fogo', VA, 'wondrous', 'raro', '7 cargas: Bola de Fogo (CD 15) — 1 carga no 3º círculo, +1 círculo por carga extra (recupera 1d6+1 ao amanhecer)', { attune: ['spellcaster'], kg: 0.5, charges: WAND7, spells: [C('sp-bolafogo', 1, { upcast: true, dc: 15 })] }),
  M('m-wand-lightning', 'Varinha de Relâmpagos', VA, 'wondrous', 'raro', '7 cargas: Relâmpago (CD 15) — 1 carga no 3º círculo, +1 círculo por carga extra (recupera 1d6+1 ao amanhecer)', { attune: ['spellcaster'], kg: 0.5, charges: WAND7, spells: [C('sp-relampago', 1, { upcast: true, dc: 15 })] }),
  M('m-wand-paralysis', 'Varinha da Paralisia', VA, 'wondrous', 'raro', '7 cargas: 1 carga dispara um raio — CON CD 15 ou paralisado por 1 minuto (repete no fim de cada turno) (recupera 1d6+1 ao amanhecer)', { attune: ['spellcaster'], kg: 0.5, charges: WAND7 }),
  M('m-staff-healing', 'Cajado da Cura', VA, 'wondrous', 'raro', 'Bardo, clérigo ou druida · 10 cargas: Curar Ferimentos (1 carga por círculo, até o 4º), Restauração Menor (2), Curar Ferimentos em Massa (5) — usa o seu modificador de conjuração (recupera 1d6+4 ao amanhecer)', { attune: ['bard', 'cleric', 'druid'], kg: 2, charges: STAFF10('O cajado some num clarão de luz.'), spells: [C('sp-curar', 1, { perLevel: true, maxLevel: 4 }), C('sp-restauracao', 2), C('sp-curargrupo', 5)], extra: { weapon: { baseId: 'w-quarterstaff', damageDice: 1, damageDie: 6, damageType: 'concussão', type: 'simple', range: 'melee', properties: ['Versátil'], versatileDie: 8 } } }),
  M('m-staff-fire', 'Cajado do Fogo', VA, 'wondrous', 'muito-raro', 'Druida, feiticeiro, bruxo ou mago · resistência a fogo · 10 cargas: Mãos Flamejantes (1), Bola de Fogo (3), Muralha de Fogo (4) — com a sua CD (recupera 1d6+4 ao amanhecer)', { attune: ['druid', 'sorcerer', 'warlock', 'wizard'], kg: 2, magic: { resistances: ['fogo'] }, charges: STAFF10('O cajado vira cinzas.'), spells: [C('sp-flechacida', 1), C('sp-bolafogo', 3), C('sp-muralha', 4)], extra: { weapon: { baseId: 'w-quarterstaff', damageDice: 1, damageDie: 6, damageType: 'concussão', type: 'simple', range: 'melee', properties: ['Versátil'], versatileDie: 8 } } }),
  M('m-staff-frost', 'Cajado do Gelo', VA, 'wondrous', 'muito-raro', 'Druida, feiticeiro, bruxo ou mago · resistência a frio · 10 cargas: Névoa Obscurecente (1), Tempestade de Gelo (4), Muralha de Gelo (4), Cone do Frio (5) — com a sua CD (recupera 1d6+4 ao amanhecer)', { attune: ['druid', 'sorcerer', 'warlock', 'wizard'], kg: 2, magic: { resistances: ['frio'] }, charges: STAFF10('O cajado vira água e escorre.'), spells: [C('sp-nevoa', 1), C('sp-tempestade', 4), C('phb-wall-ice', 4), C('sp-conemar', 5)], extra: { weapon: { baseId: 'w-quarterstaff', damageDice: 1, damageDie: 6, damageType: 'concussão', type: 'simple', range: 'melee', properties: ['Versátil'], versatileDie: 8 } } }),
  M('m-staff-power', 'Cajado do Poder', VA, 'wondrous', 'muito-raro', 'Feiticeiro, bruxo ou mago · bordão +2 · +2 na CA, salvaguardas e ataque de magia · 20 cargas: Mísseis Mágicos (1), Raio do Enfraquecimento (1), Levitação (2), Bola de Fogo de 5º (5), Relâmpago de 5º (5), Imobilizar Monstro (5), Cone do Frio (5), Muralha de Energia (5), Globo de Invulnerabilidade (6) — com a sua CD (recupera 2d8+4 ao amanhecer)', { attune: ['sorcerer', 'warlock', 'wizard'], kg: 2, magic: { ac: 2, saves: 2, spellAttack: 2 }, charges: { max: 20, regain: '2d8+4', emptyRisk: { text: 'O cajado mantém o +2 em ataque e dano, mas perde todas as outras propriedades.' } }, spells: [C('sp-misseis', 1), C('sp-aterrorizar', 1), C('phb-levitate', 2), C('sp-bolafogo', 5, { castLevel: 5 }), C('sp-relampago', 5, { castLevel: 5 }), C('phb-hold-monster', 5), C('sp-conemar', 5), C('phb-wall-force', 5), C('phb-globe-invulnerability', 6)], extra: { weapon: { baseId: 'w-quarterstaff', damageDice: 1, damageDie: 6, damageType: 'concussão', type: 'simple', range: 'melee', properties: ['Versátil'], versatileDie: 8, magicBonus: 2 } } }),

  // ---- maravilhosos ----
  M('m-bag-holding', 'Bolsa Devoradora (Bolsa de Guardar)', MA, 'wondrous', 'incomum', 'Guarda 250 kg / 1,8 m³ e pesa sempre 7,5 kg', { kg: 7.5 }),
  M('m-haversack', 'Mochila Prática de Heward', MA, 'wondrous', 'raro', 'Três bolsos mágicos; o item pedido está sempre no topo', { kg: 2.5 }),
  M('m-rope-climbing', 'Corda da Escalada', MA, 'wondrous', 'incomum', '18 m de corda que se move e amarra ao comando', { kg: 1.5 }),
  M('m-immovable-rod', 'Bastão Imóvel', MA, 'wondrous', 'incomum', 'Botão: fica parado no ar, aguentando até 4 toneladas', { kg: 1 }),
  M('m-decanter', 'Decantador de Água Infinita', MA, 'wondrous', 'incomum', 'Jorra água doce ou salgada ao comando', { kg: 1 }),
  M('m-driftglobe', 'Globo Flutuante', MA, 'wondrous', 'incomum', 'Luz ou Luz do Dia; flutua e segue você', { kg: 0.5 }),
  M('m-sending-stones', 'Pedras Mensageiras', MA, 'wondrous', 'incomum', 'Par de pedras: Enviar Mensagem 1×/dia entre elas'),
  M('m-hat-disguise', 'Chapéu do Disfarce', MA, 'wondrous', 'incomum', 'Disfarçar-se à vontade', { attune: true }),
  M('m-necklace-fireballs', 'Colar de Bolas de Fogo', MA, 'wondrous', 'raro', 'Contas que viram Bola de Fogo (CD 15) ao serem arremessadas'),
  M('m-gem-seeing', 'Gema da Visão', MA, 'wondrous', 'raro', '3 cargas: visão verdadeira de 36 m por 10 minutos (recupera 1d3 ao amanhecer)', { attune: true, charges: { max: 3, regain: '1d3' } }),
  M('m-ioun-protection', 'Pedra Ioun (Proteção)', MA, 'wondrous', 'raro', '+1 na CA enquanto orbita sua cabeça', { attune: true, magic: { ac: 1 } }),
  M('m-ioun-awareness', 'Pedra Ioun (Percepção)', MA, 'wondrous', 'raro', 'Não pode ser surpreendido enquanto consciente', { attune: true }),
  M('m-ioun-fortitude', 'Pedra Ioun (Fortitude)', MA, 'wondrous', 'muito-raro', '+2 CON (máx. 20)', { attune: true, magic: { addAbility: { con: { bonus: 2, max: 20 } } } }),
  M('m-ioun-insight', 'Pedra Ioun (Discernimento)', MA, 'wondrous', 'muito-raro', '+2 SAB (máx. 20)', { attune: true, magic: { addAbility: { wis: { bonus: 2, max: 20 } } } }),
  M('m-ioun-intellect', 'Pedra Ioun (Intelecto)', MA, 'wondrous', 'muito-raro', '+2 INT (máx. 20)', { attune: true, magic: { addAbility: { int: { bonus: 2, max: 20 } } } }),
  M('m-ioun-leadership', 'Pedra Ioun (Liderança)', MA, 'wondrous', 'muito-raro', '+2 CAR (máx. 20)', { attune: true, magic: { addAbility: { cha: { bonus: 2, max: 20 } } } }),
  M('m-ioun-strength', 'Pedra Ioun (Força)', MA, 'wondrous', 'muito-raro', '+2 FOR (máx. 20)', { attune: true, magic: { addAbility: { str: { bonus: 2, max: 20 } } } }),
  M('m-ioun-agility', 'Pedra Ioun (Agilidade)', MA, 'wondrous', 'muito-raro', '+2 DES (máx. 20)', { attune: true, magic: { addAbility: { dex: { bonus: 2, max: 20 } } } }),
  M('m-portable-hole', 'Buraco Portátil', MA, 'wondrous', 'raro', 'Tecido que vira um buraco de 1,8 m de diâmetro e 3 m de fundo'),
  M('m-deck-many', 'Baralho das Muitas Coisas', MA, 'wondrous', 'lendario', 'Sacar cartas traz sorte… ou desgraça'),

  // ---- armas mágicas com nome (as +1/+2/+3 genéricas saem do catálogo de armas) ----
  M('mw-flametongue', 'Língua de Fogo (Espada Longa)', AR, 'weapon', 'raro', 'Ação bônus: acende a lâmina — +2d6 de fogo em cada acerto; luz de 12 m', {
    attune: true, kg: 1.5,
    extra: { weapon: { baseId: 'w-longsword', damageDice: 1, damageDie: 8, damageType: 'cortante', type: 'martial', range: 'melee', properties: ['Versátil'], versatileDie: 10, bonusDamage: { dice: 2, die: 6, type: 'fogo' } } },
  }),
  M('mw-frostbrand', 'Marca Gélida (Espada Longa)', AR, 'weapon', 'muito-raro', '+1d6 de frio em cada acerto; resistência a fogo', {
    attune: true, kg: 1.5, magic: { resistances: ['fogo'] },
    extra: { weapon: { baseId: 'w-longsword', damageDice: 1, damageDie: 8, damageType: 'cortante', type: 'martial', range: 'melee', properties: ['Versátil'], versatileDie: 10, bonusDamage: { dice: 1, die: 6, type: 'frio' } } },
  }),
  M('mw-sunblade', 'Lâmina Solar', AR, 'weapon', 'raro', 'Espada longa de luz +2 (acuidade), radiante; +1d8 contra mortos-vivos', {
    attune: true, kg: 1.5,
    extra: { weapon: { baseId: 'w-longsword', damageDice: 1, damageDie: 8, damageType: 'radiante', type: 'martial', range: 'melee', properties: ['Versátil'], versatileDie: 10, finesse: true, magicBonus: 2 } },
  }),
  M('mw-daggervenom', 'Adaga do Veneno', AR, 'weapon', 'raro', 'Adaga +1; 1×/dia: +2d10 de veneno e envenenado (CON CD 15)', {
    kg: 0.5,
    extra: { weapon: { baseId: 'w-dagger', damageDice: 1, damageDie: 4, damageType: 'perfurante', type: 'simple', range: 'melee', properties: ['Leve', 'Arremesso'], finesse: true, thrown: true, rangeLabel: '6/18 m', magicBonus: 1 } },
  }),
  M('mw-javelin-lightning', 'Azagaia do Relâmpago', AR, 'weapon', 'incomum', 'Vira um raio: linha de 36 m com 4d6 elétrico (DES CD 13); +4d6 no alvo', {
    kg: 1,
    extra: { weapon: { baseId: 'w-javelin', damageDice: 1, damageDie: 6, damageType: 'perfurante', type: 'simple', range: 'melee', properties: ['Arremesso'], thrown: true, rangeLabel: '9/36 m' } },
  }),
  M('mw-mace-disruption', 'Maça da Ruptura', AR, 'weapon', 'raro', '+2d6 radiante contra corruptores e mortos-vivos', {
    attune: true, kg: 2,
    extra: { weapon: { baseId: 'w-mace', damageDice: 1, damageDie: 6, damageType: 'concussão', type: 'simple', range: 'melee', properties: [] } },
  }),
  M('mw-berserker-axe', 'Machado do Berserker', AR, 'weapon', 'raro', 'Machado +1; +1 PV por nível; amaldiçoado (fúria ao ser ferido)', {
    attune: true, kg: 2, magic: { hpPerLevel: 1 },
    extra: { weapon: { baseId: 'w-battleaxe', damageDice: 1, damageDie: 8, damageType: 'cortante', type: 'martial', range: 'melee', properties: ['Versátil'], versatileDie: 10, magicBonus: 1 } },
  }),
  M('mw-oathbow', 'Arco do Juramento', AR, 'weapon', 'muito-raro', 'Arco longo: inimigo jurado — vantagem e +3d6 perfurante', {
    attune: true, kg: 1,
    extra: { weapon: { baseId: 'w-longbow', damageDice: 1, damageDie: 8, damageType: 'perfurante', type: 'martial', range: 'ranged', properties: ['Munição', 'Pesada', 'Duas mãos'], rangeLabel: '45/180 m' } },
  }),
  M('mw-holyavenger', 'Vingadora Sagrada', AR, 'weapon', 'lendario', 'Espada longa +3 (Paladino); +2d10 radiante contra corruptores e mortos-vivos; aura de resistência a magia', {
    attune: ['paladin'], kg: 1.5,
    extra: { weapon: { baseId: 'w-longsword', damageDice: 1, damageDie: 8, damageType: 'cortante', type: 'martial', range: 'melee', properties: ['Versátil'], versatileDie: 10, magicBonus: 3 } },
  }),
  M('mw-vorpal', 'Espada Vorpal', AR, 'weapon', 'lendario', 'Espada cortante +3; 20 natural pode decapitar', {
    attune: true, kg: 1.5,
    extra: { weapon: { baseId: 'w-longsword', damageDice: 1, damageDie: 8, damageType: 'cortante', type: 'martial', range: 'melee', properties: ['Versátil'], versatileDie: 10, magicBonus: 3 } },
  }),

  // ---- armaduras mágicas com nome ----
  M('ma-mithral', 'Cota de Malha de Mithral', AM, 'armor', 'incomum', 'CA 16 · sem requisito de FOR e sem desvantagem em Furtividade', {
    kg: 13.75, extra: { armor: { baseAC: 16, category: 'pesada', addDex: false } },
  }),
  M('ma-adamantine', 'Armadura de Placas de Adamante', AM, 'armor', 'incomum', 'CA 18 · acertos críticos contra você viram acertos normais', {
    kg: 32.5, extra: { armor: { baseAC: 18, category: 'pesada', addDex: false, strReq: 15, stealthDisadvantage: true } },
  }),
  M('ma-elven-chain', 'Camisão Élfico', AM, 'armor', 'raro', 'Camisão de malha +1 · conta como armadura leve (DES sem limite)', {
    kg: 10, extra: { armor: { baseAC: 13, category: 'leve', addDex: true, magicBonus: 1 } },
  }),
  M('ma-dragonscale', 'Armadura de Escamas de Dragão', AM, 'armor', 'muito-raro', 'Brunea +1 · resistência ao tipo do dragão; vantagem contra presença aterradora', {
    attune: true, kg: 22.5, extra: { armor: { baseAC: 14, category: 'média', addDex: true, maxDexBonus: 2, magicBonus: 1 } },
  }),
  M('ms-sentinel', 'Escudo Sentinela', AM, 'shield', 'incomum', '+2 CA · vantagem em iniciativa e Percepção', { kg: 3, extra: { acBonus: 2 } }),
  M('ms-animated', 'Escudo Animado', AM, 'shield', 'muito-raro', '+2 CA · flutua e protege sozinho por 1 minuto', { attune: true, kg: 3, extra: { acBonus: 2 } }),
];

/** Encantamento +1/+2/+3 aplicado a uma arma, armadura ou escudo do catálogo. */
export const ENCHANT_RARITY: Record<number, { weapon: Rarity; armor: Rarity; shield: Rarity }> = {
  1: { weapon: 'incomum', armor: 'raro', shield: 'incomum' },
  2: { weapon: 'raro', armor: 'muito-raro', shield: 'raro' },
  3: { weapon: 'muito-raro', armor: 'lendario', shield: 'muito-raro' },
};

export function enchantItem(item: Item, bonus: number): Item {
  if (!bonus) return item;
  const r = ENCHANT_RARITY[bonus];
  if (item.weapon) {
    return {
      ...item, id: `${item.id}-plus${bonus}`, name: `${item.name} +${bonus}`, rarity: r.weapon, value: PRICE[r.weapon],
      note: `${item.note} · +${bonus} no ataque e dano`, group: 'Armas mágicas',
      weapon: { ...item.weapon, magicBonus: bonus },
    };
  }
  if (item.armor) {
    return {
      ...item, id: `${item.id}-plus${bonus}`, name: `${item.name} +${bonus}`, rarity: r.armor, value: PRICE[r.armor],
      note: `${item.note} · +${bonus} na CA`, group: 'Armaduras mágicas',
      armor: { ...item.armor, magicBonus: bonus },
    };
  }
  if (item.category === 'shield') {
    return {
      ...item, id: `${item.id}-plus${bonus}`, name: `${item.name} +${bonus}`, rarity: r.shield, value: PRICE[r.shield],
      note: `+${2 + bonus} CA`, group: 'Armaduras mágicas', acBonus: (item.acBonus ?? 2) + bonus,
    };
  }
  return item;
}
