import type { Character, InventoryItem, ItemCharges, ItemSpellGrant } from '@/types/character';
import type { Spell } from '@/types/dnd';
import { getItem } from '@/data/items';
import { roll } from './dice';

/**
 * Cargas de cajados, varinhas e anéis (Guia do Mestre 2014): cada item tem
 * um total de cargas compartilhado entre as magias que concede, cada magia
 * gasta a sua quantidade e o item recupera parte das cargas ao amanhecer
 * (no app: no descanso longo).
 */

/** Item do catálogo: vale a definição atual (cópias antigas na mochila ganham as cargas novas). */
export function chargesOf(it: InventoryItem): ItemCharges | undefined {
  if (it.homebrew) return it.charges;
  return getItem(it.itemId)?.charges ?? it.charges;
}

/** Magias do item, com a mesma regra (catálogo primeiro, homebrew como foi forjado). */
export function grantsOf(it: InventoryItem): ItemSpellGrant[] | undefined {
  if (it.homebrew) return it.grantsSpells;
  return getItem(it.itemId)?.grantsSpells ?? it.grantsSpells;
}

/** Cargas restantes do item. */
export function chargesLeft(char: Character, it: InventoryItem): number {
  const c = chargesOf(it);
  if (!c) return 0;
  const used = char.combat?.itemCharges?.[it.uid] ?? 0;
  return Math.max(0, c.max - used);
}

export interface ChargeOption {
  /** Círculo em que a magia sai. */
  level: number;
  /** Cargas gastas. */
  cost: number;
}

/**
 * Jeitos de usar a magia com as cargas que sobram: um só (custo fixo),
 * um por círculo (Curar Ferimentos do Cajado da Cura) ou subindo um
 * círculo por carga extra (Varinha de Bolas de Fogo).
 */
export function chargeOptions(grant: ItemSpellGrant, spell: Spell, left: number): ChargeOption[] {
  const cost = grant.cost ?? 1;
  const base = grant.castLevel ?? spell.level;
  const out: ChargeOption[] = [];
  if (grant.perLevel) {
    for (let lv = Math.max(1, spell.level); lv <= (grant.maxLevel ?? 9); lv++) out.push({ level: lv, cost: cost * lv });
  } else if (grant.upcast) {
    for (let extra = 0; base + extra <= 9; extra++) out.push({ level: base + extra, cost: cost + extra });
  } else {
    out.push({ level: base, cost });
  }
  return out.filter((o) => o.cost <= left);
}

/** Menor custo da magia (para mostrar "3 cargas" mesmo sem cargas sobrando). */
export function minCost(grant: ItemSpellGrant, spell: Spell): number {
  const cost = grant.cost ?? 1;
  return grant.perLevel ? cost * Math.max(1, spell.level) : cost;
}

/** Rola quanto o item recupera ("1d6+4", "2d8+4", "1d3" ou "all"). */
export function rollRegain(regain: string, max: number): number {
  if (regain === 'all') return max;
  const m = regain.replace(/\s+/g, '').match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) return Number(regain) || 0;
  return roll(Number(m[2]), { count: Number(m[1]), modifier: Number(m[3] ?? 0) }).total;
}

export interface RechargeReport {
  name: string;
  regained: number;
  left: number;
  max: number;
}

/**
 * Amanhecer: cada item com cargas gastas recupera as suas (sem passar do
 * máximo). Devolve o mapa novo de cargas gastas e o que cada item ganhou.
 */
export function rechargeAll(char: Character, rollFn: (regain: string, max: number) => number = rollRegain): { used: Record<string, number>; report: RechargeReport[] } {
  const used = { ...(char.combat?.itemCharges ?? {}) };
  const report: RechargeReport[] = [];
  for (const it of char.inventory ?? []) {
    const c = chargesOf(it);
    const spent = used[it.uid] ?? 0;
    if (!c || spent <= 0) continue;
    const got = Math.min(spent, Math.max(0, rollFn(c.regain, c.max)));
    used[it.uid] = spent - got;
    if (used[it.uid] === 0) delete used[it.uid];
    report.push({ name: it.name, regained: got, left: c.max - (used[it.uid] ?? 0), max: c.max });
  }
  // itens que saíram da mochila não guardam cargas
  for (const uid of Object.keys(used)) if (!char.inventory.some((i) => i.uid === uid)) delete used[uid];
  return { used, report };
}
