import type { Character, EquippedSlots, InventoryItem } from '@/types/character';
import { itemToInventory, isTwoHanded } from './inventory';
import { proficienciesOf } from './proficiencies';
import { getItem } from '@/data/items';

/**
 * Equipamento inicial do Livro do Jogador (D&D 5e 2014, cap. 3): cada classe
 * recebe itens fixos e escolhe entre opções "(a) ou (b)". Os pacotes
 * (Explorador, Sacerdote…) chegam abertos — corda, tochas e rações viram
 * itens de verdade na mochila. Munição vem junto com arco e besta.
 */

/** [id do catálogo, quantidade] */
export type KitItem = [string, number];

export interface KitPick {
  /** Ids escolhíveis ("qualquer arma marcial"). */
  from: string[];
  /** Quantas escolhas (Guerreiro: duas armas marciais). */
  count?: number;
  label: string;
}

export interface KitOption {
  id: string;
  label: string;
  items?: KitItem[];
  pick?: KitPick;
  /** Só se tiver a proficiência (Clérigo: martelo de guerra, cota de malha). */
  requires?: 'martial' | 'heavy';
}

export interface KitChoice {
  id: string;
  label: string;
  options: KitOption[];
}

export interface ClassKit {
  fixed: KitItem[];
  choices: KitChoice[];
  note: string;
}

/** Escolha feita em cada grupo: a opção e o que foi escolhido nos "qualquer…". */
export type KitSelection = Record<string, { option: string; picks?: string[] }>;

// ---- listas do livro ----
const SIMPLE_MELEE = ['w-club', 'w-dagger', 'w-greatclub', 'w-handaxe', 'w-javelin', 'w-lighthammer', 'w-mace', 'w-quarterstaff', 'w-sickle', 'w-spear'];
const SIMPLE_RANGED = ['w-lightcrossbow', 'w-dart', 'w-shortbow', 'w-sling'];
const SIMPLE = [...SIMPLE_MELEE, ...SIMPLE_RANGED];
const MARTIAL_MELEE = ['w-battleaxe', 'w-flail', 'w-glaive', 'w-greataxe', 'w-greatsword', 'w-halberd', 'w-lance', 'w-longsword', 'w-maul', 'w-morningstar', 'w-pike', 'w-rapier', 'w-scimitar', 'w-shortsword', 'w-trident', 'w-warpick', 'w-warhammer', 'w-whip'];
const MARTIAL = [...MARTIAL_MELEE, 'w-blowgun', 'w-handcrossbow', 'w-heavycrossbow', 'w-longbow', 'w-net'];
const INSTRUMENTS = ['g-inst-bagpipes', 'g-inst-drum', 'g-inst-dulcimer', 'g-inst-flute', 'g-inst-lyre', 'g-inst-horn', 'g-inst-panflute', 'g-inst-shawm', 'g-inst-viol'];
const ARCANE_FOCI = ['g-focus-crystal', 'g-focus-orb', 'g-focus-rod', 'g-focus-staff', 'g-focus-wand'];
const DRUIDIC_FOCI = ['g-druidic-mistletoe', 'g-druidic-totem', 'g-druidic-staff', 'g-druidic-wand'];
const HOLY_SYMBOLS = ['g-holy-amulet', 'g-holy-emblem', 'g-holy-reliquary'];

/** Conteúdo dos pacotes (PHB 2014). */
export const PACK_CONTENTS: Record<string, KitItem[]> = {
  'g-pack-burglar': [['g-backpack', 1], ['g-ballbearings', 1], ['g-string', 1], ['g-bell', 1], ['g-candle', 5], ['g-crowbar', 1], ['g-hammer', 1], ['g-piton', 10], ['g-lanternhood', 1], ['g-oil', 2], ['g-rations', 5], ['g-tinderbox', 1], ['g-waterskin', 1], ['g-rope', 1]],
  'g-pack-diplomat': [['g-chest', 1], ['g-casemap', 2], ['g-clothes-fine', 1], ['g-ink', 1], ['g-inkpen', 1], ['g-lamp', 1], ['g-oil', 2], ['g-paper', 5], ['g-perfume', 1], ['g-sealingwax', 1], ['g-soap', 1]],
  'g-pack-dungeoneer': [['g-backpack', 1], ['g-crowbar', 1], ['g-hammer', 1], ['g-piton', 10], ['g-torch', 10], ['g-tinderbox', 1], ['g-rations', 10], ['g-waterskin', 1], ['g-rope', 1]],
  'g-pack-entertainer': [['g-backpack', 1], ['g-bedroll', 1], ['g-clothes-costume', 2], ['g-candle', 5], ['g-rations', 5], ['g-waterskin', 1], ['g-disguise', 1]],
  'g-explorer': [['g-backpack', 1], ['g-bedroll', 1], ['g-messkit', 1], ['g-tinderbox', 1], ['g-torch', 10], ['g-rations', 10], ['g-waterskin', 1], ['g-rope', 1]],
  'g-pack-priest': [['g-backpack', 1], ['g-blanket', 1], ['g-candle', 10], ['g-tinderbox', 1], ['g-almsbox', 1], ['g-incense', 2], ['g-censer', 1], ['g-vestments', 1], ['g-rations', 2], ['g-waterskin', 1]],
  'g-pack-scholar': [['g-backpack', 1], ['g-book', 1], ['g-ink', 1], ['g-inkpen', 1], ['g-parchment', 10], ['g-sandbag', 1], ['g-knife', 1]],
};

/** Munição que acompanha cada arma de disparo quando o kit não traz. */
const AMMO: Record<string, KitItem[]> = {
  'w-shortbow': [['g-arrows', 1], ['g-quiver', 1]],
  'w-longbow': [['g-arrows', 1], ['g-quiver', 1]],
  'w-lightcrossbow': [['g-bolts', 1], ['g-casebolt', 1]],
  'w-handcrossbow': [['g-bolts', 1], ['g-casebolt', 1]],
  'w-heavycrossbow': [['g-bolts', 1], ['g-casebolt', 1]],
  'w-sling': [['g-bullets', 1]],
  'w-blowgun': [['g-needles', 1]],
};

const pack = (id: string, label: string): KitOption => ({ id, label, items: [[id, 1]] });
const one = (id: string, label: string, n = 1): KitOption => ({ id, label, items: [[id, n]] });
const anyOf = (id: string, label: string, from: string[], count = 1): KitOption => ({ id, label, pick: { from, label, count } });

const KITS: Record<string, ClassKit> = {
  barbarian: {
    fixed: [['g-explorer', 1], ['w-javelin', 4]],
    choices: [
      { id: 'w1', label: 'Arma principal', options: [one('w-greataxe', 'Machado Grande'), anyOf('martial', 'Qualquer arma marcial corpo a corpo', MARTIAL_MELEE)] },
      { id: 'w2', label: 'Arma secundária', options: [one('w-handaxe', 'Dois machados de mão', 2), anyOf('simple', 'Qualquer arma simples', SIMPLE)] },
    ],
    note: 'Sem armadura no kit: a Defesa sem Armadura (10 + DES + CON) faz o trabalho.',
  },
  bard: {
    fixed: [['a-leather', 1], ['w-dagger', 1]],
    choices: [
      { id: 'w1', label: 'Arma', options: [one('w-rapier', 'Rapieira'), one('w-longsword', 'Espada Longa'), anyOf('simple', 'Qualquer arma simples', SIMPLE)] },
      { id: 'pack', label: 'Pacote', options: [pack('g-pack-diplomat', 'Pacote de Diplomata'), pack('g-pack-entertainer', 'Pacote de Artista')] },
      { id: 'inst', label: 'Instrumento (seu foco)', options: [one('g-inst-lute', 'Alaúde'), anyOf('other', 'Outro instrumento', INSTRUMENTS)] },
    ],
    note: 'O instrumento musical é o foco de conjuração do bardo.',
  },
  cleric: {
    fixed: [['s-shield', 1]],
    choices: [
      { id: 'w1', label: 'Arma', options: [one('w-mace', 'Maça'), { ...one('w-warhammer', 'Martelo de Guerra'), requires: 'martial' }] },
      { id: 'armor', label: 'Armadura', options: [one('a-scale', 'Brunea'), one('a-leather', 'Armadura de Couro'), { ...one('a-chainmail', 'Cota de Malha'), requires: 'heavy' }] },
      { id: 'w2', label: 'Distância', options: [{ id: 'xbow', label: 'Besta leve e 20 virotes', items: [['w-lightcrossbow', 1], ['g-bolts', 1], ['g-casebolt', 1]] }, anyOf('simple', 'Qualquer arma simples', SIMPLE)] },
      { id: 'pack', label: 'Pacote', options: [pack('g-pack-priest', 'Pacote de Sacerdote'), pack('g-explorer', 'Pacote de Explorador')] },
      { id: 'holy', label: 'Símbolo sagrado (seu foco)', options: HOLY_SYMBOLS.map((id) => one(id, getItem(id)!.name.replace('Símbolo Sagrado: ', ''))) },
    ],
    note: 'Martelo de guerra e cota de malha só aparecem se o domínio der a proficiência.',
  },
  druid: {
    fixed: [['a-leather', 1], ['g-explorer', 1]],
    choices: [
      { id: 'w1', label: 'Escudo ou arma', options: [one('s-shield', 'Escudo de madeira'), anyOf('simple', 'Qualquer arma simples', SIMPLE)] },
      { id: 'w2', label: 'Arma corpo a corpo', options: [one('w-scimitar', 'Cimitarra'), anyOf('simple-melee', 'Qualquer arma simples corpo a corpo', SIMPLE_MELEE)] },
      { id: 'focus', label: 'Foco druídico', options: DRUIDIC_FOCI.map((id) => one(id, getItem(id)!.name.replace('Foco Druídico: ', ''))) },
    ],
    note: 'Druidas não usam armadura nem escudo de metal.',
  },
  fighter: {
    fixed: [],
    choices: [
      { id: 'armor', label: 'Armadura', options: [one('a-chainmail', 'Cota de Malha'), { id: 'leather-bow', label: 'Couro, arco longo e 20 flechas', items: [['a-leather', 1], ['w-longbow', 1], ['g-arrows', 1], ['g-quiver', 1]] }] },
      { id: 'w1', label: 'Armas', options: [{ id: 'shield', label: 'Uma arma marcial e escudo', items: [['s-shield', 1]], pick: { from: MARTIAL, label: 'Arma marcial' } }, anyOf('two', 'Duas armas marciais', MARTIAL, 2)] },
      { id: 'w2', label: 'Distância', options: [{ id: 'xbow', label: 'Besta leve e 20 virotes', items: [['w-lightcrossbow', 1], ['g-bolts', 1], ['g-casebolt', 1]] }, one('w-handaxe', 'Dois machados de mão', 2)] },
      { id: 'pack', label: 'Pacote', options: [pack('g-pack-dungeoneer', 'Pacote de Explorador de Masmorras'), pack('g-explorer', 'Pacote de Explorador')] },
    ],
    note: 'Escolha entre armadura pesada ou couro com arco longo.',
  },
  monk: {
    fixed: [['w-dart', 10]],
    choices: [
      { id: 'w1', label: 'Arma', options: [one('w-shortsword', 'Espada Curta'), anyOf('simple', 'Qualquer arma simples', SIMPLE)] },
      { id: 'pack', label: 'Pacote', options: [pack('g-pack-dungeoneer', 'Pacote de Explorador de Masmorras'), pack('g-explorer', 'Pacote de Explorador')] },
    ],
    note: 'Monges lutam sem armadura e sem escudo (Defesa sem Armadura: 10 + DES + SAB).',
  },
  paladin: {
    fixed: [['a-chainmail', 1]],
    choices: [
      { id: 'w1', label: 'Armas', options: [{ id: 'shield', label: 'Uma arma marcial e escudo', items: [['s-shield', 1]], pick: { from: MARTIAL, label: 'Arma marcial' } }, anyOf('two', 'Duas armas marciais', MARTIAL, 2)] },
      { id: 'w2', label: 'Secundária', options: [one('w-javelin', 'Cinco azagaias', 5), anyOf('simple-melee', 'Qualquer arma simples corpo a corpo', SIMPLE_MELEE)] },
      { id: 'pack', label: 'Pacote', options: [pack('g-pack-priest', 'Pacote de Sacerdote'), pack('g-explorer', 'Pacote de Explorador')] },
      { id: 'holy', label: 'Símbolo sagrado (seu foco)', options: HOLY_SYMBOLS.map((id) => one(id, getItem(id)!.name.replace('Símbolo Sagrado: ', ''))) },
    ],
    note: 'O símbolo sagrado é o foco de conjuração do paladino.',
  },
  ranger: {
    fixed: [['w-longbow', 1], ['g-quiver', 1], ['g-arrows', 1]],
    choices: [
      { id: 'armor', label: 'Armadura', options: [one('a-scale', 'Brunea'), one('a-leather', 'Armadura de Couro')] },
      { id: 'w1', label: 'Armas', options: [one('w-shortsword', 'Duas espadas curtas', 2), anyOf('simple-melee', 'Duas armas simples corpo a corpo', SIMPLE_MELEE, 2)] },
      { id: 'pack', label: 'Pacote', options: [pack('g-pack-dungeoneer', 'Pacote de Explorador de Masmorras'), pack('g-explorer', 'Pacote de Explorador')] },
    ],
    note: 'Arco longo com aljava e 20 flechas já vêm no kit.',
  },
  rogue: {
    fixed: [['a-leather', 1], ['w-dagger', 2], ['g-thieves', 1]],
    choices: [
      { id: 'w1', label: 'Arma', options: [one('w-rapier', 'Rapieira'), one('w-shortsword', 'Espada Curta')] },
      { id: 'w2', label: 'Distância', options: [{ id: 'bow', label: 'Arco curto e aljava com 20 flechas', items: [['w-shortbow', 1], ['g-quiver', 1], ['g-arrows', 1]] }, one('w-shortsword', 'Espada Curta')] },
      { id: 'pack', label: 'Pacote', options: [pack('g-pack-burglar', 'Pacote de Assaltante'), pack('g-pack-dungeoneer', 'Pacote de Explorador de Masmorras'), pack('g-explorer', 'Pacote de Explorador')] },
    ],
    note: 'Ferramentas de ladrão e duas adagas já vêm no kit.',
  },
  sorcerer: {
    fixed: [['w-dagger', 2]],
    choices: [
      { id: 'w1', label: 'Arma', options: [{ id: 'xbow', label: 'Besta leve e 20 virotes', items: [['w-lightcrossbow', 1], ['g-bolts', 1], ['g-casebolt', 1]] }, anyOf('simple', 'Qualquer arma simples', SIMPLE)] },
      { id: 'focus', label: 'Componentes', options: [one('g-componentpouch', 'Bolsa de componentes'), anyOf('arcane', 'Foco arcano', ARCANE_FOCI)] },
      { id: 'pack', label: 'Pacote', options: [pack('g-pack-dungeoneer', 'Pacote de Explorador de Masmorras'), pack('g-explorer', 'Pacote de Explorador')] },
    ],
    note: 'Bolsa de componentes ou foco arcano: um dos dois é preciso para magias com componente material.',
  },
  warlock: {
    fixed: [['a-leather', 1], ['w-dagger', 2]],
    choices: [
      { id: 'w1', label: 'Arma', options: [{ id: 'xbow', label: 'Besta leve e 20 virotes', items: [['w-lightcrossbow', 1], ['g-bolts', 1], ['g-casebolt', 1]] }, anyOf('simple', 'Qualquer arma simples', SIMPLE)] },
      { id: 'focus', label: 'Componentes', options: [one('g-componentpouch', 'Bolsa de componentes'), anyOf('arcane', 'Foco arcano', ARCANE_FOCI)] },
      { id: 'pack', label: 'Pacote', options: [pack('g-pack-scholar', 'Pacote de Estudioso'), pack('g-pack-dungeoneer', 'Pacote de Explorador de Masmorras')] },
      { id: 'w2', label: 'Arma simples extra', options: [anyOf('simple', 'Qualquer arma simples', SIMPLE)] },
    ],
    note: 'Bolsa de componentes ou foco arcano: um dos dois é preciso para magias com componente material.',
  },
  wizard: {
    fixed: [['g-spellbook', 1]],
    choices: [
      { id: 'w1', label: 'Arma', options: [one('w-quarterstaff', 'Bordão'), one('w-dagger', 'Adaga')] },
      { id: 'focus', label: 'Componentes', options: [one('g-componentpouch', 'Bolsa de componentes'), anyOf('arcane', 'Foco arcano', ARCANE_FOCI)] },
      { id: 'pack', label: 'Pacote', options: [pack('g-pack-scholar', 'Pacote de Estudioso'), pack('g-explorer', 'Pacote de Explorador')] },
    ],
    note: 'O grimório guarda as magias do mago; sem ele não dá para preparar.',
  },
};

const FALLBACK_KIT: ClassKit = {
  fixed: [['a-leather', 1], ['g-explorer', 1]],
  choices: [{ id: 'w1', label: 'Arma', options: [anyOf('simple', 'Qualquer arma simples', SIMPLE)] }],
  note: 'Kit simples para uma classe personalizada.',
};

export function kitForClass(classId: string): ClassKit {
  return KITS[classId] ?? FALLBACK_KIT;
}

/** A opção está liberada para este personagem (proficiência exigida)? */
export function optionAllowed(char: Character | null, opt: KitOption): boolean {
  if (!opt.requires || !char) return !opt.requires;
  const p = proficienciesOf(char);
  return opt.requires === 'martial' ? p.weaponTypes.has('martial') || p.weapons.has('w-warhammer') : p.armor.has('pesada');
}

/** Primeira opção liberada de cada grupo; nos "qualquer…", a primeira da lista. */
export function defaultSelection(classId: string, char: Character | null = null): KitSelection {
  const kit = kitForClass(classId);
  const sel: KitSelection = {};
  for (const c of kit.choices) {
    const opt = c.options.find((o) => optionAllowed(char, o)) ?? c.options[0];
    sel[c.id] = { option: opt.id, picks: opt.pick ? defaultPicks(opt.pick) : undefined };
  }
  return sel;
}

function defaultPicks(p: KitPick): string[] {
  const preferred = ['w-quarterstaff', 'w-longsword', 'w-mace', 'w-spear', 'g-inst-lyre', 'g-focus-crystal'];
  const first = p.from.find((id) => preferred.includes(id)) ?? p.from[0];
  return Array.from({ length: p.count ?? 1 }, () => first);
}

/** Todos os itens do kit escolhido (pacotes ainda fechados), na ordem: escolhas, depois fixos. */
export function kitItems(classId: string, sel: KitSelection, char: Character | null = null): KitItem[] {
  const kit = kitForClass(classId);
  const out: KitItem[] = [];
  for (const c of kit.choices) {
    const chosen = sel[c.id];
    const opt = c.options.find((o) => o.id === chosen?.option && optionAllowed(char, o)) ?? c.options.find((o) => optionAllowed(char, o)) ?? c.options[0];
    out.push(...(opt.items ?? []));
    if (opt.pick) {
      const picks = chosen?.option === opt.id && chosen.picks?.length ? chosen.picks : defaultPicks(opt.pick);
      for (let i = 0; i < (opt.pick.count ?? 1); i++) {
        const id = picks[i] ?? picks[0];
        if (opt.pick.from.includes(id)) out.push([id, 1]);
      }
    }
  }
  out.push(...kit.fixed);
  // arco/besta sem munição no kit: vem a munição de 20
  const ids = new Set(out.map(([id]) => id));
  for (const [id] of [...out]) {
    for (const ammo of AMMO[id] ?? []) if (!ids.has(ammo[0])) { out.push(ammo); ids.add(ammo[0]); }
  }
  return out;
}

/** Abre os pacotes e junta itens repetidos (10 tochas viram "Tocha ×10"). */
export function expandKit(items: KitItem[]): KitItem[] {
  const merged = new Map<string, number>();
  const add = (id: string, n: number) => merged.set(id, (merged.get(id) ?? 0) + n);
  for (const [id, n] of items) {
    const contents = PACK_CONTENTS[id];
    if (contents) for (const [cid, cn] of contents) add(cid, cn * n);
    else add(id, n);
  }
  return [...merged.entries()];
}

/**
 * Armas não empilham (duas adagas = duas, uma em cada mão); dardos e azagaias
 * de arremesso empilham, como munição e consumíveis.
 */
const STACKS = (id: string) => !id.startsWith('w-') || id === 'w-dart' || id === 'w-javelin';

/**
 * Monta a mochila e as mãos a partir do kit: veste a armadura, empunha a
 * primeira arma corpo a corpo (e o escudo, se a arma não for de duas mãos)
 * e deixa a primeira arma de disparo no slot à distância.
 */
export function buildLoadout(classId: string, sel: KitSelection, char: Character | null = null): { inventory: InventoryItem[]; equipped: EquippedSlots } {
  const inventory: InventoryItem[] = [];
  const equipped: EquippedSlots = { armor: null, shield: null, mainHand: null, offHand: null, ranged: null };
  for (const [id, n] of expandKit(kitItems(classId, sel, char))) {
    const item = getItem(id);
    if (!item) continue;
    if (STACKS(id)) inventory.push(itemToInventory(item, n));
    else for (let i = 0; i < n; i++) inventory.push(itemToInventory(item));
  }
  const firstOf = (test: (it: InventoryItem) => boolean) => inventory.find(test)?.uid ?? null;
  equipped.armor = firstOf((it) => it.category === 'armor');
  // ordem do kit: a arma escolhida no grupo de armas vem primeiro
  const order = kitItems(classId, sel, char).map(([id]) => id);
  const meleeIds = order.filter((id) => getItem(id)?.weapon?.range === 'melee');
  const main = meleeIds.length ? inventory.find((it) => it.itemId === meleeIds[0]) : undefined;
  equipped.mainHand = main?.uid ?? null;
  const shield = inventory.find((it) => it.category === 'shield');
  if (shield && !(main && isTwoHanded(main.weapon))) equipped.shield = shield.uid;
  // arco/besta na mão de disparo; sem eles, os dardos do monge
  equipped.ranged = firstOf((it) => it.weapon?.range === 'ranged' && it.itemId !== 'w-dart') ?? firstOf((it) => it.itemId === 'w-dart');
  return { inventory, equipped };
}

export function applySelection(char: Character, sel: KitSelection) {
  const { inventory, equipped } = buildLoadout(char.classId, sel, char);
  char.inventory = inventory;
  char.equipped = equipped;
  char.startingKit = sel;
}

/** O kit escolhido (ou o recomendado, em fichas antigas). */
export function selectionFromChar(char: Character): KitSelection {
  return char.startingKit ?? defaultSelection(char.classId, char);
}
