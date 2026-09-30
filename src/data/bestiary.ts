import type { AbilityKey } from '@/types/dnd';

/**
 * Bestiário da Mesa — criaturas do SRD 5.1 mais usadas em mesa.
 *
 * Este trabalho inclui material do System Reference Document 5.1 ("SRD 5.1")
 * da Wizards of the Coast LLC (https://dnd.wizards.com/resources/systems-reference-document),
 * licenciado sob Creative Commons Atribuição 4.0 Internacional
 * (https://creativecommons.org/licenses/by/4.0/legalcode). Nomes traduzidos e
 * textos resumidos com palavras próprias.
 *
 * Distâncias em metros (1,5 m = 5 pés).
 */
export const BESTIARY_CREDIT =
  'Criaturas do SRD 5.1 (Wizards of the Coast), licença CC BY 4.0 — números oficiais, textos resumidos.';

export interface MonsterAction {
  name: string;
  /** Bônus de ataque (ausente = salvaguarda ou efeito). */
  toHit?: number;
  /** Alcance/distância ("1,5 m", "24/96 m"). */
  reach?: string;
  /** Dano principal, ex.: "1d6+2". */
  damage?: string;
  type?: string;
  /** Dano extra de outro tipo no mesmo acerto. */
  extra?: { damage: string; type: string };
  /** Salvaguarda que a ação força (CD). */
  save?: { dc: number; ability: AbilityKey; half?: boolean };
  /** Recarga ("5–6") ou usos. */
  recharge?: string;
  note?: string;
}

export interface Monster {
  id: string;
  name: string;
  /** Nome original do SRD (busca em inglês). */
  en: string;
  cr: string;
  xp: number;
  size: 'Miúdo' | 'Pequeno' | 'Médio' | 'Grande' | 'Enorme' | 'Imenso';
  type: string;
  ac: number;
  acNote?: string;
  hp: number;
  hpDice: string;
  speed: string;
  abilities: Record<AbilityKey, number>;
  senses?: string;
  languages?: string;
  saves?: string;
  skills?: string;
  resist?: string;
  immune?: string;
  vuln?: string;
  traits?: { name: string; desc: string }[];
  multiattack?: string;
  actions: MonsterAction[];
  reactions?: { name: string; desc: string }[];
}

const XP: Record<string, number> = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300,
  '7': 2900, '8': 3900, '9': 5000, '10': 5900, '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
  '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000, '21': 33000, '22': 41000, '23': 50000, '24': 62000,
};
export const xpForCr = (cr: string) => XP[cr] ?? 0;

/** Valor numérico do ND (1/4 → 0,25) para ordenar/filtrar. */
export const crValue = (cr: string) => (cr.includes('/') ? 1 / Number(cr.split('/')[1]) : Number(cr));

const ab = (str: number, dex: number, con: number, int: number, wis: number, cha: number) => ({ str, dex, con, int, wis, cha });

type Base = Omit<Monster, 'xp'>;
const M = (m: Base): Monster => ({ ...m, xp: xpForCr(m.cr) });

export const MONSTERS: Monster[] = [
  // ============ ND 0 – 1/8 ============
  M({
    id: 'rat', name: 'Rato', en: 'Rat', cr: '0', size: 'Miúdo', type: 'Fera', ac: 10, hp: 1, hpDice: '1d4-1', speed: '6 m',
    abilities: ab(2, 11, 9, 2, 10, 4), senses: 'visão no escuro 9 m',
    traits: [{ name: 'Olfato Aguçado', desc: 'Vantagem em Percepção pelo cheiro.' }],
    actions: [{ name: 'Mordida', toHit: 0, reach: '1,5 m', damage: '1', type: 'perfurante' }],
  }),
  M({
    id: 'bandit', name: 'Bandido', en: 'Bandit', cr: '1/8', size: 'Médio', type: 'Humanoide', ac: 12, acNote: 'armadura de couro', hp: 11, hpDice: '2d8+2', speed: '9 m',
    abilities: ab(11, 12, 12, 10, 10, 10), languages: 'Comum',
    actions: [
      { name: 'Cimitarra', toHit: 3, reach: '1,5 m', damage: '1d6+1', type: 'cortante' },
      { name: 'Besta Leve', toHit: 3, reach: '24/96 m', damage: '1d8+1', type: 'perfurante' },
    ],
  }),
  M({
    id: 'cultist', name: 'Cultista', en: 'Cultist', cr: '1/8', size: 'Médio', type: 'Humanoide', ac: 12, acNote: 'armadura de couro', hp: 9, hpDice: '2d8', speed: '9 m',
    abilities: ab(11, 12, 10, 10, 11, 10), skills: 'Enganação +2, Religião +2',
    traits: [{ name: 'Devoção Sombria', desc: 'Vantagem em salvaguardas contra ser enfeitiçado ou amedrontado.' }],
    actions: [{ name: 'Cimitarra', toHit: 3, reach: '1,5 m', damage: '1d6+1', type: 'cortante' }],
  }),
  M({
    id: 'guard', name: 'Guarda', en: 'Guard', cr: '1/8', size: 'Médio', type: 'Humanoide', ac: 16, acNote: 'camisão de malha, escudo', hp: 11, hpDice: '2d8+2', speed: '9 m',
    abilities: ab(13, 12, 12, 10, 11, 10), skills: 'Percepção +2',
    actions: [{ name: 'Lança', toHit: 3, reach: '1,5 m ou 6/18 m', damage: '1d6+1', type: 'perfurante', note: '1d8+1 com duas mãos' }],
  }),
  M({
    id: 'kobold', name: 'Kobold', en: 'Kobold', cr: '1/8', size: 'Pequeno', type: 'Humanoide', ac: 12, hp: 5, hpDice: '2d6-2', speed: '9 m',
    abilities: ab(7, 15, 9, 8, 7, 8), senses: 'visão no escuro 18 m', languages: 'Comum, Dracônico',
    traits: [
      { name: 'Sensibilidade à Luz Solar', desc: 'Desvantagem em ataques e Percepção pela visão sob luz do sol.' },
      { name: 'Táticas de Matilha', desc: 'Vantagem no ataque se um aliado estiver a 1,5 m do alvo.' },
    ],
    actions: [
      { name: 'Adaga', toHit: 4, reach: '1,5 m', damage: '1d4+2', type: 'perfurante' },
      { name: 'Funda', toHit: 4, reach: '9/36 m', damage: '1d4+2', type: 'concussão' },
    ],
  }),
  M({
    id: 'giant-rat', name: 'Rato Gigante', en: 'Giant Rat', cr: '1/8', size: 'Pequeno', type: 'Fera', ac: 12, hp: 7, hpDice: '2d6', speed: '9 m',
    abilities: ab(7, 15, 11, 2, 10, 4), senses: 'visão no escuro 18 m',
    traits: [{ name: 'Táticas de Matilha', desc: 'Vantagem no ataque se um aliado estiver a 1,5 m do alvo.' }],
    actions: [{ name: 'Mordida', toHit: 4, reach: '1,5 m', damage: '1d4+2', type: 'perfurante' }],
  }),
  M({
    id: 'stirge', name: 'Estirge', en: 'Stirge', cr: '1/8', size: 'Miúdo', type: 'Fera', ac: 14, acNote: 'armadura natural', hp: 2, hpDice: '1d4', speed: '3 m, voo 12 m',
    abilities: ab(4, 16, 11, 2, 8, 6), senses: 'visão no escuro 18 m',
    actions: [{ name: 'Drenar Sangue', toHit: 5, reach: '1,5 m', damage: '1d4+3', type: 'perfurante', note: 'Gruda no alvo e drena 1d4+3 por turno até se soltar ou drenar 10 PV.' }],
  }),

  // ============ ND 1/4 ============
  M({
    id: 'goblin', name: 'Goblin', en: 'Goblin', cr: '1/4', size: 'Pequeno', type: 'Humanoide', ac: 15, acNote: 'armadura de couro, escudo', hp: 7, hpDice: '2d6', speed: '9 m',
    abilities: ab(8, 14, 10, 10, 8, 8), skills: 'Furtividade +6', senses: 'visão no escuro 18 m', languages: 'Comum, Goblin',
    traits: [{ name: 'Fuga Ágil', desc: 'Desengajar ou Esconder como ação bônus em cada turno.' }],
    actions: [
      { name: 'Cimitarra', toHit: 4, reach: '1,5 m', damage: '1d6+2', type: 'cortante' },
      { name: 'Arco Curto', toHit: 4, reach: '24/96 m', damage: '1d6+2', type: 'perfurante' },
    ],
  }),
  M({
    id: 'skeleton', name: 'Esqueleto', en: 'Skeleton', cr: '1/4', size: 'Médio', type: 'Morto-vivo', ac: 13, acNote: 'restos de armadura', hp: 13, hpDice: '2d8+4', speed: '9 m',
    abilities: ab(10, 14, 15, 6, 8, 5), vuln: 'concussão', immune: 'veneno; exaustão, envenenado', senses: 'visão no escuro 18 m',
    actions: [
      { name: 'Espada Curta', toHit: 4, reach: '1,5 m', damage: '1d6+2', type: 'perfurante' },
      { name: 'Arco Curto', toHit: 4, reach: '24/96 m', damage: '1d6+2', type: 'perfurante' },
    ],
  }),
  M({
    id: 'zombie', name: 'Zumbi', en: 'Zombie', cr: '1/4', size: 'Médio', type: 'Morto-vivo', ac: 8, hp: 22, hpDice: '3d8+9', speed: '6 m',
    abilities: ab(13, 6, 16, 3, 6, 5), saves: 'SAB +0', immune: 'veneno; envenenado', senses: 'visão no escuro 18 m',
    traits: [{ name: 'Fortitude de Morto-Vivo', desc: 'Se cair a 0 PV (sem ser radiante nem crítico), faz CON CD 5 + dano sofrido: se passar, fica com 1 PV.' }],
    actions: [{ name: 'Pancada', toHit: 3, reach: '1,5 m', damage: '1d6+1', type: 'concussão' }],
  }),
  M({
    id: 'wolf', name: 'Lobo', en: 'Wolf', cr: '1/4', size: 'Médio', type: 'Fera', ac: 13, acNote: 'armadura natural', hp: 11, hpDice: '2d8+2', speed: '12 m',
    abilities: ab(12, 15, 12, 3, 12, 6), skills: 'Percepção +3, Furtividade +4',
    traits: [
      { name: 'Audição e Olfato Aguçados', desc: 'Vantagem em Percepção por audição ou cheiro.' },
      { name: 'Táticas de Matilha', desc: 'Vantagem no ataque se um aliado estiver a 1,5 m do alvo.' },
    ],
    actions: [{ name: 'Mordida', toHit: 4, reach: '1,5 m', damage: '2d4+2', type: 'perfurante', save: { dc: 11, ability: 'str' }, note: 'Se acertar: FOR CD 11 ou cai derrubado.' }],
  }),
  M({
    id: 'boar', name: 'Javali', en: 'Boar', cr: '1/4', size: 'Médio', type: 'Fera', ac: 11, acNote: 'armadura natural', hp: 11, hpDice: '2d8+2', speed: '12 m',
    abilities: ab(13, 11, 12, 2, 9, 5),
    traits: [
      { name: 'Investida', desc: 'Move 6 m em linha reta e acerta: +1d6 cortante e FOR CD 11 ou derrubado.' },
      { name: 'Implacável (1/descanso)', desc: 'Se sofrer até 7 de dano que o levaria a 0 PV, fica com 1 PV.' },
    ],
    actions: [{ name: 'Presa', toHit: 3, reach: '1,5 m', damage: '1d6+1', type: 'cortante' }],
  }),
  M({
    id: 'acolyte', name: 'Acólito', en: 'Acolyte', cr: '1/4', size: 'Médio', type: 'Humanoide', ac: 10, hp: 9, hpDice: '2d8', speed: '9 m',
    abilities: ab(10, 10, 10, 10, 14, 11), skills: 'Medicina +4, Religião +2',
    traits: [{ name: 'Conjurador (SAB, CD 12, +4)', desc: 'Truques: luz, chama sagrada, taumaturgia. 1º (3): bênção, curar ferimentos, santuário.' }],
    actions: [{ name: 'Clava', toHit: 2, reach: '1,5 m', damage: '1d4', type: 'concussão' }],
  }),
  M({
    id: 'drow', name: 'Drow', en: 'Drow', cr: '1/4', size: 'Médio', type: 'Humanoide', ac: 15, acNote: 'camisão de malha', hp: 13, hpDice: '3d8', speed: '9 m',
    abilities: ab(10, 14, 10, 11, 11, 12), skills: 'Percepção +2, Furtividade +4', senses: 'visão no escuro 36 m', languages: 'Élfico, Subcomum',
    traits: [
      { name: 'Ancestral Feérico', desc: 'Vantagem contra enfeitiçar; magia não o faz dormir.' },
      { name: 'Sensibilidade à Luz Solar', desc: 'Desvantagem em ataques e Percepção pela visão sob luz do sol.' },
    ],
    actions: [
      { name: 'Espada Curta', toHit: 4, reach: '1,5 m', damage: '1d6+2', type: 'perfurante' },
      { name: 'Besta de Mão', toHit: 4, reach: '9/36 m', damage: '1d6+2', type: 'perfurante', save: { dc: 13, ability: 'con' }, note: 'CON CD 13 ou envenenado por 1 hora (falhar por 5+: inconsciente).' },
    ],
  }),

  // ============ ND 1/2 ============
  M({
    id: 'orc', name: 'Orc', en: 'Orc', cr: '1/2', size: 'Médio', type: 'Humanoide', ac: 13, acNote: 'gibão de peles', hp: 15, hpDice: '2d8+6', speed: '9 m',
    abilities: ab(16, 12, 16, 7, 11, 10), skills: 'Intimidação +2', senses: 'visão no escuro 18 m', languages: 'Comum, Orc',
    traits: [{ name: 'Agressivo', desc: 'Ação bônus: move até o deslocamento em direção a um inimigo que veja.' }],
    actions: [
      { name: 'Machado Grande', toHit: 5, reach: '1,5 m', damage: '1d12+3', type: 'cortante' },
      { name: 'Azagaia', toHit: 5, reach: '1,5 m ou 9/36 m', damage: '1d6+3', type: 'perfurante' },
    ],
  }),
  M({
    id: 'hobgoblin', name: 'Hobgoblin', en: 'Hobgoblin', cr: '1/2', size: 'Médio', type: 'Humanoide', ac: 18, acNote: 'cota de malha, escudo', hp: 11, hpDice: '2d8+2', speed: '9 m',
    abilities: ab(13, 12, 12, 10, 10, 9), senses: 'visão no escuro 18 m', languages: 'Comum, Goblin',
    traits: [{ name: 'Vantagem Marcial (1×/turno)', desc: '+2d6 de dano se um aliado estiver a 1,5 m do alvo.' }],
    actions: [
      { name: 'Espada Longa', toHit: 3, reach: '1,5 m', damage: '1d8+1', type: 'cortante', note: '1d10+1 com duas mãos' },
      { name: 'Arco Longo', toHit: 3, reach: '45/180 m', damage: '1d8+1', type: 'perfurante' },
    ],
  }),
  M({
    id: 'gnoll', name: 'Gnoll', en: 'Gnoll', cr: '1/2', size: 'Médio', type: 'Humanoide', ac: 15, acNote: 'gibão de peles, escudo', hp: 22, hpDice: '5d8', speed: '9 m',
    abilities: ab(14, 12, 11, 6, 10, 7), senses: 'visão no escuro 18 m', languages: 'Gnoll',
    traits: [{ name: 'Fúria Sangrenta', desc: 'Ao derrubar uma criatura a 0 PV, move metade e morde como ação bônus.' }],
    actions: [
      { name: 'Mordida', toHit: 4, reach: '1,5 m', damage: '1d4+2', type: 'perfurante' },
      { name: 'Lança', toHit: 4, reach: '1,5 m ou 6/18 m', damage: '1d6+2', type: 'perfurante' },
      { name: 'Arco Longo', toHit: 3, reach: '45/180 m', damage: '1d8+1', type: 'perfurante' },
    ],
  }),
  M({
    id: 'thug', name: 'Capanga', en: 'Thug', cr: '1/2', size: 'Médio', type: 'Humanoide', ac: 11, acNote: 'armadura de couro', hp: 32, hpDice: '5d8+10', speed: '9 m',
    abilities: ab(15, 11, 14, 10, 10, 11), skills: 'Intimidação +2',
    traits: [{ name: 'Táticas de Matilha', desc: 'Vantagem no ataque se um aliado estiver a 1,5 m do alvo.' }],
    multiattack: 'Dois ataques corpo a corpo.',
    actions: [
      { name: 'Maça', toHit: 4, reach: '1,5 m', damage: '1d6+2', type: 'concussão' },
      { name: 'Besta Pesada', toHit: 2, reach: '30/120 m', damage: '1d10', type: 'perfurante' },
    ],
  }),
  M({
    id: 'scout', name: 'Batedor', en: 'Scout', cr: '1/2', size: 'Médio', type: 'Humanoide', ac: 13, acNote: 'armadura de couro', hp: 16, hpDice: '3d8+3', speed: '9 m',
    abilities: ab(11, 14, 12, 11, 13, 11), skills: 'Natureza +4, Percepção +5, Furtividade +6, Sobrevivência +5',
    traits: [{ name: 'Visão e Audição Aguçadas', desc: 'Vantagem em Percepção por visão ou audição.' }],
    multiattack: 'Dois ataques corpo a corpo ou dois à distância.',
    actions: [
      { name: 'Espada Curta', toHit: 4, reach: '1,5 m', damage: '1d6+2', type: 'perfurante' },
      { name: 'Arco Longo', toHit: 4, reach: '45/180 m', damage: '1d8+2', type: 'perfurante' },
    ],
  }),
  M({
    id: 'shadow', name: 'Sombra', en: 'Shadow', cr: '1/2', size: 'Médio', type: 'Morto-vivo', ac: 12, hp: 16, hpDice: '3d8+3', speed: '12 m',
    abilities: ab(6, 14, 13, 6, 10, 8), vuln: 'radiante', resist: 'ácido, frio, fogo, elétrico, trovejante; armas não mágicas', immune: 'necrótico, veneno', senses: 'visão no escuro 18 m',
    traits: [{ name: 'Furtividade nas Sombras', desc: 'Na penumbra ou escuridão, pode se Esconder como ação bônus.' }],
    actions: [{ name: 'Drenar Força', toHit: 4, reach: '1,5 m', damage: '2d6+2', type: 'necrótico', note: 'A FOR do alvo cai 1d4 até um descanso; se chegar a 0, morre.' }],
  }),
  M({
    id: 'black-bear', name: 'Urso Negro', en: 'Black Bear', cr: '1/2', size: 'Médio', type: 'Fera', ac: 11, acNote: 'armadura natural', hp: 19, hpDice: '3d8+6', speed: '12 m, escalar 9 m',
    abilities: ab(15, 10, 14, 2, 12, 7), skills: 'Percepção +3',
    multiattack: 'Mordida e garras.',
    actions: [
      { name: 'Mordida', toHit: 3, reach: '1,5 m', damage: '1d6+2', type: 'perfurante' },
      { name: 'Garras', toHit: 3, reach: '1,5 m', damage: '2d4+2', type: 'cortante' },
    ],
  }),
  M({
    id: 'lizardfolk', name: 'Homem-Lagarto', en: 'Lizardfolk', cr: '1/2', size: 'Médio', type: 'Humanoide', ac: 15, acNote: 'armadura natural, escudo', hp: 22, hpDice: '4d8+4', speed: '9 m, natação 9 m',
    abilities: ab(15, 10, 13, 7, 12, 7), skills: 'Percepção +3, Furtividade +4, Sobrevivência +5', languages: 'Dracônico',
    traits: [{ name: 'Prender o Fôlego', desc: 'Fica até 15 minutos sem respirar.' }],
    multiattack: 'Dois ataques corpo a corpo, cada um com uma arma diferente.',
    actions: [
      { name: 'Mordida', toHit: 4, reach: '1,5 m', damage: '1d6+2', type: 'perfurante' },
      { name: 'Clava Pesada', toHit: 4, reach: '1,5 m', damage: '1d6+2', type: 'concussão' },
      { name: 'Azagaia', toHit: 4, reach: '1,5 m ou 9/36 m', damage: '1d6+2', type: 'perfurante' },
    ],
  }),
  M({
    id: 'worg', name: 'Worg', en: 'Worg', cr: '1/2', size: 'Grande', type: 'Monstruosidade', ac: 13, acNote: 'armadura natural', hp: 26, hpDice: '4d10+4', speed: '15 m',
    abilities: ab(16, 13, 13, 7, 11, 8), skills: 'Percepção +4', senses: 'visão no escuro 18 m', languages: 'Goblin, Worg',
    actions: [{ name: 'Mordida', toHit: 5, reach: '1,5 m', damage: '2d6+3', type: 'perfurante', save: { dc: 13, ability: 'str' }, note: 'Se acertar: FOR CD 13 ou derrubado.' }],
  }),

  // ============ ND 1 ============
  M({
    id: 'bugbear', name: 'Bugbear', en: 'Bugbear', cr: '1', size: 'Médio', type: 'Humanoide', ac: 16, acNote: 'gibão de peles, escudo', hp: 27, hpDice: '5d8+5', speed: '9 m',
    abilities: ab(15, 14, 13, 8, 11, 9), skills: 'Furtividade +6, Sobrevivência +2', senses: 'visão no escuro 18 m', languages: 'Comum, Goblin',
    traits: [
      { name: 'Bruto', desc: 'Armas corpo a corpo causam um dado extra (já incluído).' },
      { name: 'Ataque Surpresa', desc: '+2d6 no primeiro acerto contra uma criatura surpresa.' },
    ],
    actions: [
      { name: 'Maça Estrela', toHit: 4, reach: '1,5 m', damage: '2d8+2', type: 'perfurante' },
      { name: 'Azagaia', toHit: 4, reach: '1,5 m ou 9/36 m', damage: '2d6+2', type: 'perfurante', note: '1d6+2 à distância' },
    ],
  }),
  M({
    id: 'dire-wolf', name: 'Lobo Atroz', en: 'Dire Wolf', cr: '1', size: 'Grande', type: 'Fera', ac: 14, acNote: 'armadura natural', hp: 37, hpDice: '5d10+10', speed: '15 m',
    abilities: ab(17, 15, 15, 3, 12, 7), skills: 'Percepção +3, Furtividade +4',
    traits: [{ name: 'Táticas de Matilha', desc: 'Vantagem no ataque se um aliado estiver a 1,5 m do alvo.' }],
    actions: [{ name: 'Mordida', toHit: 5, reach: '1,5 m', damage: '2d6+3', type: 'perfurante', save: { dc: 13, ability: 'str' }, note: 'Se acertar: FOR CD 13 ou derrubado.' }],
  }),
  M({
    id: 'ghoul', name: 'Carniçal', en: 'Ghoul', cr: '1', size: 'Médio', type: 'Morto-vivo', ac: 12, hp: 22, hpDice: '5d8', speed: '9 m',
    abilities: ab(13, 15, 10, 7, 10, 6), immune: 'veneno; enfeitiçado, exaustão, envenenado', senses: 'visão no escuro 18 m',
    actions: [
      { name: 'Mordida', toHit: 2, reach: '1,5 m', damage: '2d6+2', type: 'perfurante' },
      { name: 'Garras', toHit: 4, reach: '1,5 m', damage: '2d4+2', type: 'cortante', save: { dc: 10, ability: 'con' }, note: 'CON CD 10 ou paralisado 1 minuto (repete a cada turno). Elfos e mortos-vivos imunes.' },
    ],
  }),
  M({
    id: 'giant-spider', name: 'Aranha Gigante', en: 'Giant Spider', cr: '1', size: 'Grande', type: 'Fera', ac: 14, acNote: 'armadura natural', hp: 26, hpDice: '4d10+4', speed: '9 m, escalar 9 m',
    abilities: ab(14, 16, 12, 2, 11, 4), skills: 'Furtividade +7', senses: 'percepção às cegas 3 m, visão no escuro 18 m',
    traits: [{ name: 'Andar em Teias', desc: 'Escala sem teste; sente vibrações na teia; ignora restrição de teias.' }],
    actions: [
      { name: 'Mordida', toHit: 5, reach: '1,5 m', damage: '1d8+3', type: 'perfurante', extra: { damage: '2d8', type: 'veneno' }, save: { dc: 11, ability: 'con', half: true }, note: 'Veneno: CON CD 11, metade se passar.' },
      { name: 'Teia', toHit: 5, reach: '9/18 m', recharge: '5–6', note: 'Alvo fica impedido; FOR CD 12 para escapar.' },
    ],
  }),
  M({
    id: 'brown-bear', name: 'Urso Pardo', en: 'Brown Bear', cr: '1', size: 'Grande', type: 'Fera', ac: 11, acNote: 'armadura natural', hp: 34, hpDice: '4d10+12', speed: '12 m, escalar 9 m',
    abilities: ab(19, 10, 16, 2, 13, 7), skills: 'Percepção +3',
    multiattack: 'Mordida e garras.',
    actions: [
      { name: 'Mordida', toHit: 6, reach: '1,5 m', damage: '1d8+4', type: 'perfurante' },
      { name: 'Garras', toHit: 6, reach: '1,5 m', damage: '2d6+4', type: 'cortante' },
    ],
  }),
  M({
    id: 'harpy', name: 'Harpia', en: 'Harpy', cr: '1', size: 'Médio', type: 'Monstruosidade', ac: 11, hp: 38, hpDice: '7d8+7', speed: '6 m, voo 12 m',
    abilities: ab(12, 13, 12, 7, 10, 13), languages: 'Comum',
    multiattack: 'Garras e clava.',
    actions: [
      { name: 'Garras', toHit: 3, reach: '1,5 m', damage: '2d4+1', type: 'cortante' },
      { name: 'Clava', toHit: 3, reach: '1,5 m', damage: '1d4+1', type: 'concussão' },
      { name: 'Canção Sedutora', save: { dc: 11, ability: 'wis' }, note: 'Humanoides a 90 m: SAB CD 11 ou ficam enfeitiçados e vão até a harpia.' },
    ],
  }),
  M({
    id: 'animated-armor', name: 'Armadura Animada', en: 'Animated Armor', cr: '1', size: 'Médio', type: 'Constructo', ac: 18, acNote: 'armadura natural', hp: 33, hpDice: '6d8+6', speed: '7,5 m',
    abilities: ab(14, 11, 13, 1, 3, 1), immune: 'veneno, psíquico; cego, enfeitiçado, surdo, exaustão, amedrontado, paralisado, petrificado, envenenado', senses: 'percepção às cegas 18 m',
    multiattack: 'Dois ataques corpo a corpo.',
    actions: [{ name: 'Pancada', toHit: 4, reach: '1,5 m', damage: '1d6+2', type: 'concussão' }],
  }),
  M({
    id: 'specter', name: 'Espectro', en: 'Specter', cr: '1', size: 'Médio', type: 'Morto-vivo', ac: 12, hp: 22, hpDice: '5d8', speed: 'voo 15 m (pairar)',
    abilities: ab(1, 14, 11, 10, 10, 11), resist: 'ácido, frio, fogo, elétrico, trovejante; armas não mágicas', immune: 'necrótico, veneno', senses: 'visão no escuro 18 m',
    traits: [{ name: 'Movimento Incorpóreo', desc: 'Atravessa criaturas e objetos (1d10 de energia se terminar dentro).' }],
    actions: [{ name: 'Drenar Vida', toHit: 4, reach: '1,5 m', damage: '3d6', type: 'necrótico', save: { dc: 10, ability: 'con' }, note: 'CON CD 10 ou o PV máximo cai no mesmo valor.' }],
  }),

  // ============ ND 2 ============
  M({
    id: 'ogre', name: 'Ogro', en: 'Ogre', cr: '2', size: 'Grande', type: 'Gigante', ac: 11, acNote: 'gibão de peles', hp: 59, hpDice: '7d10+21', speed: '12 m',
    abilities: ab(19, 8, 16, 5, 7, 7), senses: 'visão no escuro 18 m', languages: 'Comum, Gigante',
    actions: [
      { name: 'Clava Grande', toHit: 6, reach: '1,5 m', damage: '2d8+4', type: 'concussão' },
      { name: 'Azagaia', toHit: 6, reach: '1,5 m ou 9/36 m', damage: '2d6+4', type: 'perfurante' },
    ],
  }),
  M({
    id: 'bandit-captain', name: 'Capitão Bandido', en: 'Bandit Captain', cr: '2', size: 'Médio', type: 'Humanoide', ac: 15, acNote: 'couro batido', hp: 65, hpDice: '10d8+20', speed: '9 m',
    abilities: ab(15, 16, 14, 14, 11, 14), saves: 'FOR +4, DES +5, SAB +2', skills: 'Atletismo +4, Enganação +4', languages: 'Comum + 1',
    multiattack: 'Três ataques corpo a corpo: dois de cimitarra e um de adaga (ou dois de adaga à distância).',
    actions: [
      { name: 'Cimitarra', toHit: 5, reach: '1,5 m', damage: '1d6+3', type: 'cortante' },
      { name: 'Adaga', toHit: 5, reach: '1,5 m ou 6/18 m', damage: '1d4+3', type: 'perfurante' },
    ],
    reactions: [{ name: 'Aparar', desc: '+2 na CA contra um ataque corpo a corpo que o acertaria (precisa ver e ter arma).' }],
  }),
  M({
    id: 'priest', name: 'Sacerdote', en: 'Priest', cr: '2', size: 'Médio', type: 'Humanoide', ac: 13, acNote: 'camisão de malha', hp: 27, hpDice: '5d8+5', speed: '9 m',
    abilities: ab(10, 10, 12, 13, 16, 13), skills: 'Medicina +7, Persuasão +3, Religião +4',
    traits: [
      { name: 'Eminência Divina', desc: 'Ao acertar com arma, pode gastar espaço: +3d6 radiante (+1d6 por círculo acima).' },
      { name: 'Conjurador (SAB, CD 13, +5)', desc: 'Truques: luz, chama sagrada, taumaturgia. 1º (4): curar ferimentos, raio guiador, santuário. 2º (3): restauração menor, arma espiritual. 3º (2): dissipar magia, espíritos guardiões.' },
    ],
    actions: [{ name: 'Maça', toHit: 2, reach: '1,5 m', damage: '1d6', type: 'concussão' }],
  }),
  M({
    id: 'gargoyle', name: 'Gárgula', en: 'Gargoyle', cr: '2', size: 'Médio', type: 'Elemental', ac: 15, acNote: 'armadura natural', hp: 52, hpDice: '7d8+21', speed: '9 m, voo 18 m',
    abilities: ab(15, 11, 16, 6, 11, 7), resist: 'armas não mágicas (exceto adamante)', immune: 'veneno; exaustão, envenenado, petrificado', senses: 'visão no escuro 18 m', languages: 'Terrano',
    traits: [{ name: 'Falsa Aparência', desc: 'Parada, é indistinguível de uma estátua.' }],
    multiattack: 'Mordida e garras.',
    actions: [
      { name: 'Mordida', toHit: 4, reach: '1,5 m', damage: '1d6+2', type: 'perfurante' },
      { name: 'Garras', toHit: 4, reach: '1,5 m', damage: '1d6+2', type: 'cortante' },
    ],
  }),
  M({
    id: 'ghast', name: 'Lívido', en: 'Ghast', cr: '2', size: 'Médio', type: 'Morto-vivo', ac: 13, hp: 36, hpDice: '8d8', speed: '9 m',
    abilities: ab(16, 17, 10, 11, 10, 8), resist: 'necrótico', immune: 'veneno; enfeitiçado, exaustão, envenenado', senses: 'visão no escuro 18 m',
    traits: [{ name: 'Fedor', desc: 'Quem começa o turno a 1,5 m: CON CD 10 ou envenenado até o início do próximo turno.' }],
    actions: [
      { name: 'Mordida', toHit: 3, reach: '1,5 m', damage: '2d8+3', type: 'perfurante' },
      { name: 'Garras', toHit: 5, reach: '1,5 m', damage: '2d6+3', type: 'cortante', save: { dc: 10, ability: 'con' }, note: 'CON CD 10 ou paralisado 1 minuto (exceto mortos-vivos).' },
    ],
  }),
  M({
    id: 'mimic', name: 'Mímico', en: 'Mimic', cr: '2', size: 'Médio', type: 'Monstruosidade', ac: 12, acNote: 'armadura natural', hp: 58, hpDice: '9d8+18', speed: '4,5 m',
    abilities: ab(17, 12, 15, 5, 13, 8), immune: 'ácido; derrubado', senses: 'visão no escuro 18 m',
    traits: [
      { name: 'Adesivo', desc: 'Gruda em quem o toca; a criatura fica agarrada (CD 13 para escapar).' },
      { name: 'Falsa Aparência', desc: 'Disfarçado, é indistinguível de um objeto comum (baú, porta…).' },
    ],
    actions: [
      { name: 'Pseudópode', toHit: 5, reach: '1,5 m', damage: '1d8+3', type: 'concussão', note: 'Adere ao alvo.' },
      { name: 'Mordida', toHit: 5, reach: '1,5 m', damage: '1d8+3', type: 'perfurante', extra: { damage: '1d8', type: 'ácido' } },
    ],
  }),
  M({
    id: 'berserker', name: 'Berserker', en: 'Berserker', cr: '2', size: 'Médio', type: 'Humanoide', ac: 13, acNote: 'gibão de peles', hp: 67, hpDice: '9d8+27', speed: '9 m',
    abilities: ab(16, 12, 17, 9, 11, 9),
    traits: [{ name: 'Imprudente', desc: 'Pode atacar com vantagem; ataques contra ele também têm vantagem até o próximo turno.' }],
    actions: [{ name: 'Machado Grande', toHit: 5, reach: '1,5 m', damage: '1d12+3', type: 'cortante' }],
  }),

  // ============ ND 3 ============
  M({
    id: 'owlbear', name: 'Urso-Coruja', en: 'Owlbear', cr: '3', size: 'Grande', type: 'Monstruosidade', ac: 13, acNote: 'armadura natural', hp: 59, hpDice: '7d10+21', speed: '12 m',
    abilities: ab(20, 12, 17, 3, 12, 7), skills: 'Percepção +3', senses: 'visão no escuro 18 m',
    multiattack: 'Bico e garras.',
    actions: [
      { name: 'Bico', toHit: 7, reach: '1,5 m', damage: '1d10+5', type: 'perfurante' },
      { name: 'Garras', toHit: 7, reach: '1,5 m', damage: '2d8+5', type: 'cortante' },
    ],
  }),
  M({
    id: 'knight', name: 'Cavaleiro', en: 'Knight', cr: '3', size: 'Médio', type: 'Humanoide', ac: 18, acNote: 'armadura de placas', hp: 52, hpDice: '8d8+16', speed: '9 m',
    abilities: ab(16, 11, 14, 11, 11, 15), saves: 'CON +4, SAB +2', languages: 'Comum',
    traits: [{ name: 'Bravo', desc: 'Vantagem contra ser amedrontado.' }],
    multiattack: 'Dois ataques corpo a corpo.',
    actions: [
      { name: 'Espada Grande', toHit: 5, reach: '1,5 m', damage: '2d6+3', type: 'cortante' },
      { name: 'Besta Pesada', toHit: 2, reach: '30/120 m', damage: '1d10', type: 'perfurante' },
      { name: 'Liderança', recharge: 'descanso curto', note: '1 minuto: aliados a 9 m somam 1d4 em ataques e salvaguardas.' },
    ],
    reactions: [{ name: 'Aparar', desc: '+2 na CA contra um ataque corpo a corpo que o acertaria.' }],
  }),
  M({
    id: 'minotaur', name: 'Minotauro', en: 'Minotaur', cr: '3', size: 'Grande', type: 'Monstruosidade', ac: 14, acNote: 'armadura natural', hp: 76, hpDice: '9d10+27', speed: '12 m',
    abilities: ab(18, 11, 16, 6, 16, 9), skills: 'Percepção +7', senses: 'visão no escuro 18 m', languages: 'Abissal',
    traits: [
      { name: 'Investida', desc: 'Move 3 m em linha e acerta com os chifres: +2d8 e FOR CD 14 ou empurrado 3 m e derrubado.' },
      { name: 'Imprudente', desc: 'Pode atacar com vantagem; ataques contra ele também têm vantagem.' },
    ],
    actions: [
      { name: 'Machado Grande', toHit: 6, reach: '1,5 m', damage: '2d12+4', type: 'cortante' },
      { name: 'Chifres', toHit: 6, reach: '1,5 m', damage: '2d8+4', type: 'perfurante' },
    ],
  }),
  M({
    id: 'werewolf', name: 'Lobisomem', en: 'Werewolf', cr: '3', size: 'Médio', type: 'Humanoide (metamorfo)', ac: 12, acNote: 'armadura natural na forma híbrida', hp: 58, hpDice: '9d8+18', speed: '9 m (12 m como lobo)',
    abilities: ab(15, 13, 14, 10, 11, 10), immune: 'armas não mágicas e não prateadas', skills: 'Percepção +4, Furtividade +3', languages: 'Comum',
    multiattack: 'Forma híbrida: mordida e garras (ou dois ataques de lança como humano).',
    actions: [
      { name: 'Mordida', toHit: 4, reach: '1,5 m', damage: '1d8+2', type: 'perfurante', save: { dc: 12, ability: 'con' }, note: 'Humanoide: CON CD 12 ou licantropia.' },
      { name: 'Garras', toHit: 4, reach: '1,5 m', damage: '2d4+2', type: 'cortante' },
      { name: 'Lança', toHit: 4, reach: '1,5 m ou 6/18 m', damage: '1d6+2', type: 'perfurante' },
    ],
  }),
  M({
    id: 'basilisk', name: 'Basilisco', en: 'Basilisk', cr: '3', size: 'Médio', type: 'Monstruosidade', ac: 15, acNote: 'armadura natural', hp: 52, hpDice: '8d8+16', speed: '6 m',
    abilities: ab(16, 8, 15, 2, 8, 7), senses: 'visão no escuro 18 m',
    traits: [{ name: 'Olhar Petrificante', desc: 'Quem começa o turno a 9 m e o vê: CON CD 12 ou começa a petrificar (falha de novo = petrificado).' }],
    actions: [{ name: 'Mordida', toHit: 5, reach: '1,5 m', damage: '2d6+3', type: 'perfurante', extra: { damage: '2d6', type: 'veneno' } }],
  }),
  M({
    id: 'wight', name: 'Aparição', en: 'Wight', cr: '3', size: 'Médio', type: 'Morto-vivo', ac: 14, acNote: 'couro batido', hp: 45, hpDice: '6d8+18', speed: '9 m',
    abilities: ab(15, 14, 16, 10, 13, 15), resist: 'necrótico; armas não mágicas e não prateadas', immune: 'veneno; exaustão, envenenado', senses: 'visão no escuro 18 m',
    multiattack: 'Dois ataques de espada longa, ou um de espada longa e um Drenar Vida.',
    actions: [
      { name: 'Drenar Vida', toHit: 4, reach: '1,5 m', damage: '1d6+2', type: 'necrótico', save: { dc: 13, ability: 'con' }, note: 'CON CD 13 ou o PV máximo cai no mesmo valor.' },
      { name: 'Espada Longa', toHit: 4, reach: '1,5 m', damage: '1d8+2', type: 'cortante' },
      { name: 'Arco Longo', toHit: 4, reach: '45/180 m', damage: '1d8+2', type: 'perfurante' },
    ],
  }),
  M({
    id: 'hell-hound', name: 'Cão Infernal', en: 'Hell Hound', cr: '3', size: 'Médio', type: 'Corruptor', ac: 15, acNote: 'armadura natural', hp: 45, hpDice: '7d8+14', speed: '15 m',
    abilities: ab(17, 12, 14, 6, 13, 6), immune: 'fogo', skills: 'Percepção +5', senses: 'visão no escuro 18 m',
    traits: [{ name: 'Táticas de Matilha', desc: 'Vantagem no ataque se um aliado estiver a 1,5 m do alvo.' }],
    actions: [
      { name: 'Mordida', toHit: 5, reach: '1,5 m', damage: '1d8+3', type: 'perfurante', extra: { damage: '2d6', type: 'fogo' } },
      { name: 'Sopro de Fogo', damage: '6d6', type: 'fogo', recharge: '5–6', save: { dc: 12, ability: 'dex', half: true }, note: 'Cone de 4,5 m.' },
    ],
  }),
  M({
    id: 'veteran', name: 'Veterano', en: 'Veteran', cr: '3', size: 'Médio', type: 'Humanoide', ac: 17, acNote: 'armadura de talas', hp: 58, hpDice: '9d8+18', speed: '9 m',
    abilities: ab(16, 13, 14, 10, 11, 10), skills: 'Atletismo +5, Percepção +2', languages: 'Comum',
    multiattack: 'Dois ataques de espada longa (e um de espada curta se estiver com ela).',
    actions: [
      { name: 'Espada Longa', toHit: 5, reach: '1,5 m', damage: '1d8+3', type: 'cortante', note: '1d10+3 com duas mãos' },
      { name: 'Espada Curta', toHit: 5, reach: '1,5 m', damage: '1d6+3', type: 'perfurante' },
      { name: 'Besta Pesada', toHit: 3, reach: '30/120 m', damage: '1d10+1', type: 'perfurante' },
    ],
  }),
  M({
    id: 'doppelganger', name: 'Doppelganger', en: 'Doppelganger', cr: '3', size: 'Médio', type: 'Monstruosidade (metamorfo)', ac: 14, hp: 52, hpDice: '8d8+16', speed: '9 m',
    abilities: ab(11, 18, 14, 11, 12, 14), skills: 'Enganação +6, Intuição +3', senses: 'visão no escuro 18 m', languages: 'Comum',
    traits: [
      { name: 'Emboscador', desc: 'Vantagem contra quem ainda não agiu na primeira rodada.' },
      { name: 'Ataque Surpresa', desc: '+3d6 no primeiro acerto contra uma criatura surpresa.' },
    ],
    multiattack: 'Dois ataques corpo a corpo.',
    actions: [
      { name: 'Pancada', toHit: 6, reach: '1,5 m', damage: '1d6+4', type: 'concussão' },
      { name: 'Ler Pensamentos', note: 'Lê a mente superficial de uma criatura a 18 m.' },
    ],
  }),

  // ============ ND 4–6 ============
  M({
    id: 'ettin', name: 'Ettin', en: 'Ettin', cr: '4', size: 'Grande', type: 'Gigante', ac: 12, acNote: 'armadura natural', hp: 85, hpDice: '10d10+30', speed: '12 m',
    abilities: ab(21, 8, 17, 6, 10, 8), skills: 'Percepção +4', senses: 'visão no escuro 18 m', languages: 'Gigante, Orc',
    traits: [{ name: 'Duas Cabeças', desc: 'Vantagem em Percepção e contra cego, enfeitiçado, surdo, amedrontado, atordoado e inconsciente.' }],
    multiattack: 'Machado de batalha e maça estrela.',
    actions: [
      { name: 'Machado de Batalha', toHit: 7, reach: '1,5 m', damage: '2d8+5', type: 'cortante' },
      { name: 'Maça Estrela', toHit: 7, reach: '1,5 m', damage: '2d8+5', type: 'perfurante' },
    ],
  }),
  M({
    id: 'ghost', name: 'Fantasma', en: 'Ghost', cr: '4', size: 'Médio', type: 'Morto-vivo', ac: 11, hp: 45, hpDice: '10d8', speed: 'voo 12 m (pairar)',
    abilities: ab(7, 13, 10, 10, 12, 17), resist: 'ácido, fogo, elétrico, trovejante; armas não mágicas', immune: 'frio, necrótico, veneno', senses: 'visão no escuro 18 m',
    traits: [{ name: 'Visão Etérea', desc: 'Enxerga 18 m no Plano Etéreo; pode passar entre os planos.' }],
    actions: [
      { name: 'Toque Definhador', toHit: 5, reach: '1,5 m', damage: '4d6+3', type: 'necrótico' },
      { name: 'Semblante Aterrorizante', save: { dc: 13, ability: 'wis' }, note: 'Quem o vê a 18 m: SAB CD 13 ou amedrontado 1 minuto (falhar por 5+: envelhece 1d4×10 anos).' },
      { name: 'Possessão', recharge: '6', save: { dc: 13, ability: 'cha' }, note: 'CAR CD 13 ou o fantasma possui o humanoide.' },
    ],
  }),
  M({
    id: 'troll', name: 'Troll', en: 'Troll', cr: '5', size: 'Grande', type: 'Gigante', ac: 15, acNote: 'armadura natural', hp: 84, hpDice: '8d10+40', speed: '9 m',
    abilities: ab(18, 13, 20, 7, 9, 7), skills: 'Percepção +2', senses: 'visão no escuro 18 m', languages: 'Gigante',
    traits: [{ name: 'Regeneração', desc: 'Recupera 10 PV no início do turno. Dano de ácido ou fogo impede a regeneração nesse turno; só morre se começar o turno a 0 PV sem regenerar.' }],
    multiattack: 'Mordida e duas garras.',
    actions: [
      { name: 'Mordida', toHit: 7, reach: '1,5 m', damage: '1d6+4', type: 'perfurante' },
      { name: 'Garra', toHit: 7, reach: '1,5 m', damage: '2d6+4', type: 'cortante' },
    ],
  }),
  M({
    id: 'hill-giant', name: 'Gigante da Colina', en: 'Hill Giant', cr: '5', size: 'Enorme', type: 'Gigante', ac: 13, acNote: 'armadura natural', hp: 105, hpDice: '10d12+40', speed: '12 m',
    abilities: ab(21, 8, 19, 5, 9, 6), skills: 'Percepção +2', languages: 'Gigante',
    multiattack: 'Dois ataques de clava grande.',
    actions: [
      { name: 'Clava Grande', toHit: 8, reach: '3 m', damage: '3d8+5', type: 'concussão' },
      { name: 'Pedra', toHit: 8, reach: '18/72 m', damage: '3d10+5', type: 'concussão' },
    ],
  }),
  M({
    id: 'wraith', name: 'Espírito Sombrio', en: 'Wraith', cr: '5', size: 'Médio', type: 'Morto-vivo', ac: 13, hp: 67, hpDice: '9d8+27', speed: 'voo 18 m (pairar)',
    abilities: ab(6, 16, 16, 12, 14, 15), resist: 'ácido, frio, fogo, elétrico, trovejante; armas não mágicas e não prateadas', immune: 'necrótico, veneno', senses: 'visão no escuro 18 m',
    actions: [
      { name: 'Drenar Vida', toHit: 6, reach: '1,5 m', damage: '4d8+3', type: 'necrótico', save: { dc: 14, ability: 'con' }, note: 'CON CD 14 ou o PV máximo cai no mesmo valor.' },
      { name: 'Criar Espectro', note: 'Um humanoide morto recentemente vira espectro sob seu controle (máx. 7).' },
    ],
  }),
  M({
    id: 'earth-elemental', name: 'Elemental da Terra', en: 'Earth Elemental', cr: '5', size: 'Grande', type: 'Elemental', ac: 17, acNote: 'armadura natural', hp: 126, hpDice: '12d10+60', speed: '9 m, escavar 9 m',
    abilities: ab(20, 8, 20, 5, 10, 5), vuln: 'trovejante', resist: 'armas não mágicas', immune: 'veneno; exaustão, paralisado, petrificado, envenenado, inconsciente', senses: 'visão no escuro 18 m, sentido sísmico 18 m',
    multiattack: 'Duas pancadas.',
    actions: [{ name: 'Pancada', toHit: 8, reach: '3 m', damage: '2d8+5', type: 'concussão' }],
  }),
  M({
    id: 'gladiator', name: 'Gladiador', en: 'Gladiator', cr: '5', size: 'Médio', type: 'Humanoide', ac: 16, acNote: 'couro batido, escudo', hp: 112, hpDice: '15d8+45', speed: '9 m',
    abilities: ab(18, 15, 16, 10, 12, 15), saves: 'FOR +7, DES +5, CON +6', skills: 'Atletismo +10, Intimidação +5',
    traits: [{ name: 'Bravo', desc: 'Vantagem contra ser amedrontado.' }],
    multiattack: 'Três ataques corpo a corpo ou dois à distância.',
    actions: [
      { name: 'Lança', toHit: 7, reach: '1,5 m ou 6/18 m', damage: '2d6+4', type: 'perfurante' },
      { name: 'Golpe de Escudo', toHit: 7, reach: '1,5 m', damage: '2d4+4', type: 'concussão', save: { dc: 15, ability: 'str' }, note: 'Médio ou menor: FOR CD 15 ou derrubado.' },
    ],
    reactions: [{ name: 'Aparar', desc: '+3 na CA contra um ataque corpo a corpo que o acertaria.' }],
  }),
  M({
    id: 'wyvern', name: 'Serpe', en: 'Wyvern', cr: '6', size: 'Grande', type: 'Dragão', ac: 13, acNote: 'armadura natural', hp: 110, hpDice: '13d10+39', speed: '6 m, voo 24 m',
    abilities: ab(19, 10, 16, 5, 12, 6), skills: 'Percepção +4', senses: 'visão no escuro 18 m',
    multiattack: 'Mordida e ferrão (em voo pode trocar a mordida pelas garras).',
    actions: [
      { name: 'Mordida', toHit: 7, reach: '3 m', damage: '2d6+4', type: 'perfurante' },
      { name: 'Garras', toHit: 7, reach: '1,5 m', damage: '2d8+4', type: 'cortante' },
      { name: 'Ferrão', toHit: 7, reach: '3 m', damage: '2d6+4', type: 'perfurante', extra: { damage: '7d6', type: 'veneno' }, save: { dc: 15, ability: 'con', half: true }, note: 'Veneno: CON CD 15, metade se passar.' },
    ],
  }),
  M({
    id: 'mage', name: 'Mago', en: 'Mage', cr: '6', size: 'Médio', type: 'Humanoide', ac: 12, acNote: '15 com armadura arcana', hp: 40, hpDice: '9d8', speed: '9 m',
    abilities: ab(9, 14, 11, 17, 12, 11), saves: 'INT +6, SAB +4', skills: 'Arcanismo +6, História +6',
    traits: [{ name: 'Conjurador (INT, CD 14, +6)', desc: 'Truques: raio de fogo, luz, mãos mágicas, prestidigitação. 1º: detectar magia, armadura arcana, mísseis mágicos, escudo. 2º: passo nebuloso, sugestão. 3º: contramágica, bola de fogo, voo. 4º: invisibilidade maior, muralha de gelo. 5º: cone de frio.' }],
    actions: [
      { name: 'Adaga', toHit: 5, reach: '1,5 m ou 6/18 m', damage: '1d4+2', type: 'perfurante' },
      { name: 'Bola de Fogo (3º)', damage: '8d6', type: 'fogo', save: { dc: 14, ability: 'dex', half: true }, note: 'Esfera de 6 m a até 45 m.' },
    ],
  }),
  M({
    id: 'medusa', name: 'Medusa', en: 'Medusa', cr: '6', size: 'Médio', type: 'Monstruosidade', ac: 15, acNote: 'armadura natural', hp: 127, hpDice: '17d8+51', speed: '9 m',
    abilities: ab(10, 15, 16, 12, 13, 15), skills: 'Enganação +5, Intuição +4, Percepção +4, Furtividade +5', senses: 'visão no escuro 18 m', languages: 'Comum',
    traits: [{ name: 'Olhar Petrificante', desc: 'Quem começa o turno a 9 m e a vê: CON CD 14 ou começa a petrificar.' }],
    multiattack: 'Cabelo de serpentes e espada curta (ou dois tiros de arco).',
    actions: [
      { name: 'Cabelo de Serpentes', toHit: 5, reach: '1,5 m', damage: '1d4+2', type: 'perfurante', extra: { damage: '4d6', type: 'veneno' } },
      { name: 'Espada Curta', toHit: 5, reach: '1,5 m', damage: '1d6+2', type: 'perfurante' },
      { name: 'Arco Longo', toHit: 5, reach: '45/180 m', damage: '1d8+2', type: 'perfurante', extra: { damage: '2d6', type: 'veneno' } },
    ],
  }),
  M({
    id: 'chimera', name: 'Quimera', en: 'Chimera', cr: '6', size: 'Grande', type: 'Monstruosidade', ac: 14, acNote: 'armadura natural', hp: 114, hpDice: '12d10+48', speed: '9 m, voo 18 m',
    abilities: ab(19, 11, 19, 3, 14, 10), skills: 'Percepção +8', senses: 'visão no escuro 18 m',
    multiattack: 'Mordida, chifres e garras (ou o sopro, se disponível, no lugar da mordida).',
    actions: [
      { name: 'Mordida', toHit: 7, reach: '1,5 m', damage: '2d6+4', type: 'perfurante' },
      { name: 'Chifres', toHit: 7, reach: '1,5 m', damage: '1d12+4', type: 'concussão' },
      { name: 'Garras', toHit: 7, reach: '1,5 m', damage: '2d6+4', type: 'cortante' },
      { name: 'Sopro de Fogo', damage: '7d8', type: 'fogo', recharge: '5–6', save: { dc: 15, ability: 'dex', half: true }, note: 'Cone de 4,5 m.' },
    ],
  }),

  // ============ ND 7+ ============
  M({
    id: 'stone-giant', name: 'Gigante de Pedra', en: 'Stone Giant', cr: '7', size: 'Enorme', type: 'Gigante', ac: 17, acNote: 'armadura natural', hp: 126, hpDice: '11d12+55', speed: '12 m',
    abilities: ab(23, 15, 20, 10, 12, 9), saves: 'DES +5, CON +8, SAB +4', skills: 'Atletismo +12, Percepção +4', senses: 'visão no escuro 18 m', languages: 'Gigante',
    multiattack: 'Dois ataques de clava grande.',
    actions: [
      { name: 'Clava Grande', toHit: 9, reach: '4,5 m', damage: '3d8+6', type: 'concussão' },
      { name: 'Pedra', toHit: 9, reach: '18/72 m', damage: '4d10+6', type: 'concussão', save: { dc: 17, ability: 'str' }, note: 'FOR CD 17 ou derrubado.' },
    ],
    reactions: [{ name: 'Pegar Pedra', desc: 'DES CD 10 para agarrar uma pedra arremessada contra ele.' }],
  }),
  M({
    id: 'young-green-dragon', name: 'Dragão Verde Jovem', en: 'Young Green Dragon', cr: '8', size: 'Grande', type: 'Dragão', ac: 18, acNote: 'armadura natural', hp: 136, hpDice: '16d10+48', speed: '12 m, voo 24 m, natação 12 m',
    abilities: ab(19, 12, 17, 16, 13, 15), saves: 'DES +4, CON +6, SAB +4, CAR +5', skills: 'Enganação +5, Percepção +7, Furtividade +4', immune: 'veneno; envenenado', senses: 'percepção às cegas 9 m, visão no escuro 36 m', languages: 'Comum, Dracônico',
    traits: [{ name: 'Anfíbio', desc: 'Respira ar e água.' }],
    multiattack: 'Mordida e duas garras.',
    actions: [
      { name: 'Mordida', toHit: 7, reach: '3 m', damage: '2d10+4', type: 'perfurante', extra: { damage: '2d6', type: 'veneno' } },
      { name: 'Garra', toHit: 7, reach: '1,5 m', damage: '2d6+4', type: 'cortante' },
      { name: 'Sopro Venenoso', damage: '12d6', type: 'veneno', recharge: '5–6', save: { dc: 14, ability: 'con', half: true }, note: 'Cone de 9 m.' },
    ],
  }),
  M({
    id: 'hydra', name: 'Hidra', en: 'Hydra', cr: '8', size: 'Enorme', type: 'Monstruosidade', ac: 15, acNote: 'armadura natural', hp: 172, hpDice: '15d12+75', speed: '9 m, natação 9 m',
    abilities: ab(20, 12, 20, 2, 10, 7), skills: 'Percepção +6', senses: 'visão no escuro 18 m',
    traits: [
      { name: 'Várias Cabeças', desc: 'Começa com 5 cabeças. 25+ de dano num turno corta uma; no fim do turno nascem duas por cabeça cortada (fogo impede). Sem cabeças, morre.' },
      { name: 'Cabeças Reativas', desc: 'Uma reação extra por cabeça além da primeira (só ataques de oportunidade).' },
    ],
    multiattack: 'Uma mordida por cabeça.',
    actions: [{ name: 'Mordida', toHit: 8, reach: '3 m', damage: '1d10+5', type: 'perfurante' }],
  }),
  M({
    id: 'frost-giant', name: 'Gigante do Gelo', en: 'Frost Giant', cr: '8', size: 'Enorme', type: 'Gigante', ac: 15, acNote: 'armadura de retalhos', hp: 138, hpDice: '12d12+60', speed: '12 m',
    abilities: ab(23, 9, 21, 9, 10, 12), saves: 'CON +8, SAB +3, CAR +4', skills: 'Atletismo +9, Percepção +3', immune: 'frio', languages: 'Gigante',
    multiattack: 'Dois ataques de machado grande.',
    actions: [
      { name: 'Machado Grande', toHit: 9, reach: '3 m', damage: '3d12+6', type: 'cortante' },
      { name: 'Pedra', toHit: 9, reach: '18/72 m', damage: '4d10+6', type: 'concussão' },
    ],
  }),
  M({
    id: 'young-red-dragon', name: 'Dragão Vermelho Jovem', en: 'Young Red Dragon', cr: '10', size: 'Grande', type: 'Dragão', ac: 18, acNote: 'armadura natural', hp: 178, hpDice: '17d10+85', speed: '12 m, escalar 12 m, voo 24 m',
    abilities: ab(23, 10, 21, 14, 11, 19), saves: 'DES +4, CON +9, SAB +4, CAR +8', skills: 'Percepção +8, Furtividade +4', immune: 'fogo', senses: 'percepção às cegas 9 m, visão no escuro 36 m', languages: 'Comum, Dracônico',
    multiattack: 'Mordida e duas garras.',
    actions: [
      { name: 'Mordida', toHit: 10, reach: '3 m', damage: '2d10+6', type: 'perfurante', extra: { damage: '1d6', type: 'fogo' } },
      { name: 'Garra', toHit: 10, reach: '1,5 m', damage: '2d6+6', type: 'cortante' },
      { name: 'Sopro de Fogo', damage: '16d6', type: 'fogo', recharge: '5–6', save: { dc: 17, ability: 'dex', half: true }, note: 'Cone de 9 m.' },
    ],
  }),
  M({
    id: 'vampire', name: 'Vampiro', en: 'Vampire', cr: '13', size: 'Médio', type: 'Morto-vivo (metamorfo)', ac: 16, acNote: 'armadura natural', hp: 144, hpDice: '17d8+68', speed: '9 m',
    abilities: ab(18, 18, 18, 17, 15, 18), saves: 'DES +9, SAB +7, CAR +9', skills: 'Percepção +7, Furtividade +9', resist: 'necrótico; armas não mágicas', senses: 'visão no escuro 36 m', languages: 'os que sabia em vida',
    traits: [
      { name: 'Resistência Lendária (3/dia)', desc: 'Pode transformar uma salvaguarda falha em sucesso.' },
      { name: 'Regeneração', desc: 'Recupera 20 PV no início do turno se tiver 1+ PV e não estiver sob luz do sol ou água corrente. Dano radiante ou água benta impede.' },
      { name: 'Fraquezas', desc: 'Não entra em casa sem convite; água corrente e luz do sol o ferem; estaca no coração o paralisa.' },
    ],
    multiattack: 'Dois ataques, só um deles de mordida.',
    actions: [
      { name: 'Golpe Desarmado', toHit: 9, reach: '1,5 m', damage: '1d8+4', type: 'concussão', note: 'Ou agarra (CD 18 para escapar).' },
      { name: 'Mordida', toHit: 9, reach: '1,5 m', damage: '1d6+4', type: 'perfurante', extra: { damage: '3d6', type: 'necrótico' }, note: 'Só em alvo agarrado, incapacitado ou impedido. O PV máximo cai no necrótico; o vampiro cura o mesmo.' },
      { name: 'Encanto', save: { dc: 17, ability: 'wis' }, note: 'Humanoide a 9 m: SAB CD 17 ou enfeitiçado por 24 horas.' },
    ],
  }),
  M({
    id: 'adult-red-dragon', name: 'Dragão Vermelho Adulto', en: 'Adult Red Dragon', cr: '17', size: 'Enorme', type: 'Dragão', ac: 19, acNote: 'armadura natural', hp: 256, hpDice: '19d12+133', speed: '12 m, escalar 12 m, voo 24 m',
    abilities: ab(27, 10, 25, 16, 13, 21), saves: 'DES +6, CON +13, SAB +7, CAR +11', skills: 'Percepção +13, Furtividade +6', immune: 'fogo', senses: 'percepção às cegas 18 m, visão no escuro 36 m', languages: 'Comum, Dracônico',
    traits: [{ name: 'Resistência Lendária (3/dia)', desc: 'Pode transformar uma salvaguarda falha em sucesso.' }],
    multiattack: 'Presença Aterradora e três ataques: mordida e duas garras.',
    actions: [
      { name: 'Mordida', toHit: 14, reach: '3 m', damage: '2d10+8', type: 'perfurante', extra: { damage: '2d6', type: 'fogo' } },
      { name: 'Garra', toHit: 14, reach: '1,5 m', damage: '2d6+8', type: 'cortante' },
      { name: 'Cauda', toHit: 14, reach: '4,5 m', damage: '2d8+8', type: 'concussão' },
      { name: 'Presença Aterradora', save: { dc: 19, ability: 'wis' }, note: 'Quem o vê a 36 m: SAB CD 19 ou amedrontado 1 minuto.' },
      { name: 'Sopro de Fogo', damage: '18d6', type: 'fogo', recharge: '5–6', save: { dc: 21, ability: 'dex', half: true }, note: 'Cone de 18 m.' },
    ],
    reactions: [{ name: 'Ações Lendárias (3/rodada)', desc: 'Detectar (Percepção), ataque de cauda, ou ataque de asas (2 ações: DES CD 22 ou 2d6+8 e derrubado; o dragão voa metade).' }],
  }),
];

export const MONSTER_BY_ID: Record<string, Monster> = Object.fromEntries(MONSTERS.map((m) => [m.id, m]));
