import type { Character, InventoryItem } from '@/types/character';
import { getItem } from '@/data/items';
import { itemToInventory } from './inventory';

/**
 * Munição (PHB 2014): cada ataque com arma de disparo gasta uma peça — arco
 * gasta flecha, besta gasta virote, funda gasta bala, zarabatana gasta
 * agulha. Depois da luta, um minuto de busca recupera metade do que foi
 * disparado.
 *
 * Na mochila a munição fica como no catálogo ("Flechas (20)" × quantidade);
 * o pacote aberto guarda quantas peças sobraram em `ammoLeft`.
 */
export interface AmmoKind {
  /** Item de munição do catálogo. */
  itemId: string;
  /** Nome da peça (singular/plural), para avisos: "−1 flecha · sobram 19". */
  one: string;
  many: string;
  /** Reconhece munição editada ou criada à mão pelo nome. */
  match: RegExp;
}

const ARROWS: AmmoKind = { itemId: 'g-arrows', one: 'flecha', many: 'flechas', match: /\bflechas?\b/i };
const BOLTS: AmmoKind = { itemId: 'g-bolts', one: 'virote', many: 'virotes', match: /\bvirotes?\b/i };
const BULLETS: AmmoKind = { itemId: 'g-bullets', one: 'bala', many: 'balas', match: /\bbalas?\b/i };
const NEEDLES: AmmoKind = { itemId: 'g-needles', one: 'agulha', many: 'agulhas', match: /\bagulhas?\b/i };

const BY_WEAPON: Record<string, AmmoKind> = {
  'w-shortbow': ARROWS,
  'w-longbow': ARROWS,
  'w-lightcrossbow': BOLTS,
  'w-handcrossbow': BOLTS,
  'w-heavycrossbow': BOLTS,
  'w-sling': BULLETS,
  'w-blowgun': NEEDLES,
};

/** Arma do catálogo por trás da instância (encantada, mágica ou cópia antiga). */
function baseWeaponId(it: InventoryItem): string | undefined {
  const own = it.itemId?.replace(/-plus[123]$/, '');
  if (own && BY_WEAPON[own]) return own;
  return (it.weapon ?? getItem(it.itemId)?.weapon)?.baseId;
}

/** Que munição esta arma dispara (nenhuma para armas corpo a corpo ou arremessadas). */
export function ammoKindFor(it: InventoryItem | undefined): AmmoKind | undefined {
  if (!it) return undefined;
  const base = baseWeaponId(it);
  if (base) return BY_WEAPON[base];
  // arma feita na Forja: só se tiver a propriedade Munição, e pelo nome
  const w = it.weapon ?? getItem(it.itemId)?.weapon;
  if (!w?.properties.includes('Munição')) return undefined;
  if (/besta/i.test(it.name)) return BOLTS;
  if (/arco/i.test(it.name)) return ARROWS;
  if (/funda/i.test(it.name)) return BULLETS;
  if (/zarabatana/i.test(it.name)) return NEEDLES;
  return undefined;
}

/** Que munição é este item da mochila (para mostrar "33 flechas" no lugar de "x2"). */
export function ammoKindOfItem(it: InventoryItem): AmmoKind | undefined {
  const kinds = [ARROWS, BOLTS, BULLETS, NEEDLES];
  if (it.itemId) return kinds.find((k) => k.itemId === it.itemId);
  if (it.category === 'weapon' || it.category === 'magic') return undefined;
  return kinds.find((k) => k.match.test(it.name));
}

/** Peças por pacote: "Flechas (20)" → 20; munição avulsa → 1. */
export function perBundle(it: Pick<InventoryItem, 'name'>): number {
  const m = it.name.match(/\((\d+)\)/);
  return m ? Math.max(1, Number(m[1])) : 1;
}

/** Quantas peças há neste item da mochila. */
export function ammoCount(it: InventoryItem): number {
  const per = perBundle(it);
  if (it.quantity <= 0) return 0;
  return (it.quantity - 1) * per + Math.min(per, it.ammoLeft ?? per);
}

/** Grava um total de peças no item (pacotes cheios + o aberto). */
function setCount(it: InventoryItem, total: number): void {
  const per = perBundle(it);
  it.quantity = Math.ceil(total / per);
  const left = total - (it.quantity - 1) * per;
  if (left >= per || per === 1) delete it.ammoLeft;
  else it.ammoLeft = left;
}

/** Munição comum do tipo, à mão (fora do Baú). Mágicas (+1, de Abate…) não são gastas sozinhas. */
function stacksOf(char: Character, kind: AmmoKind): InventoryItem[] {
  return char.inventory.filter((it) => {
    if (it.location === 'bau' || it.quantity <= 0) return false;
    if (it.itemId) return it.itemId === kind.itemId;
    return it.category !== 'magic' && it.category !== 'weapon' && kind.match.test(it.name) && !/\+\d/.test(it.name);
  });
}

export interface AmmoStatus {
  kind: AmmoKind;
  /** Peças à mão (Mochila ou equipado). */
  count: number;
  /** Peças só no Baú — não dá para atirar com elas. */
  stored: number;
  /** Disparadas desde o último "Recolher" (metade volta). */
  spent: number;
}

/** Situação da munição de uma arma: o que tem à mão, no Baú e o que dá para recolher. */
export function ammoStatus(char: Character, weaponUid: string): AmmoStatus | undefined {
  const kind = ammoKindFor(char.inventory.find((i) => i.uid === weaponUid));
  if (!kind) return undefined;
  const count = stacksOf(char, kind).reduce((n, it) => n + ammoCount(it), 0);
  const stored = char.inventory
    .filter((it) => it.location === 'bau' && (it.itemId === kind.itemId || (!it.itemId && kind.match.test(it.name))))
    .reduce((n, it) => n + ammoCount(it), 0);
  return { kind, count, stored, spent: char.combat.ammoSpent?.[kind.itemId] ?? 0 };
}

export type SpendResult =
  | { ok: true; kind: AmmoKind; left: number; uid: string }
  | { ok: false; kind: AmmoKind; reason: 'empty' | 'stored' }
  | null;

/**
 * Gasta uma peça para um disparo (muta a ficha). Começa pelo pacote já
 * aberto; pacote que zera some da mochila. `null` = arma não usa munição.
 */
export function spendAmmo(char: Character, weaponUid: string): SpendResult {
  const st = ammoStatus(char, weaponUid);
  if (!st) return null;
  const stacks = stacksOf(char, st.kind);
  if (!stacks.length) return { ok: false, kind: st.kind, reason: st.stored ? 'stored' : 'empty' };
  const it = stacks.find((s) => s.ammoLeft !== undefined) ?? stacks.reduce((a, b) => (ammoCount(b) < ammoCount(a) ? b : a));
  const next = ammoCount(it) - 1;
  if (next <= 0) {
    char.inventory = char.inventory.filter((i) => i.uid !== it.uid);
    for (const k of Object.keys(char.equipped) as (keyof Character['equipped'])[]) if (char.equipped[k] === it.uid) char.equipped[k] = null;
  } else setCount(it, next);
  char.combat.ammoSpent = { ...char.combat.ammoSpent, [st.kind.itemId]: st.spent + 1 };
  return { ok: true, kind: st.kind, left: st.count - 1, uid: it.uid };
}

/** Desfaz um disparo: a peça volta para a mochila e sai da conta do "Recolher". */
export function refundAmmo(char: Character, kind: AmmoKind, n = 1): void {
  addAmmo(char, kind, n);
  const spent = char.combat.ammoSpent?.[kind.itemId] ?? 0;
  char.combat.ammoSpent = { ...char.combat.ammoSpent, [kind.itemId]: Math.max(0, spent - n) };
}

/** Depois da luta: metade do disparado (arredondada para baixo) volta. Devolve quantas voltaram. */
export function recoverAmmo(char: Character, kind: AmmoKind): number {
  const spent = char.combat.ammoSpent?.[kind.itemId] ?? 0;
  const back = Math.floor(spent / 2);
  if (back > 0) addAmmo(char, kind, back);
  char.combat.ammoSpent = { ...char.combat.ammoSpent, [kind.itemId]: 0 };
  return back;
}

/** Soma peças ao pacote aberto (ou ao primeiro à mão); sem nenhum, cria um da peça do catálogo. */
function addAmmo(char: Character, kind: AmmoKind, n: number): void {
  const stacks = stacksOf(char, kind);
  const it = stacks.find((s) => s.ammoLeft !== undefined) ?? stacks[0];
  if (it) return setCount(it, ammoCount(it) + n);
  const base = getItem(kind.itemId);
  if (!base) return;
  const fresh = itemToInventory(base);
  setCount(fresh, n);
  char.inventory.push(fresh);
}
