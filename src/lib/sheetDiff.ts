import { deriveCharacter } from '@/engine/dndRules';
import type { Character, CoinKey } from '@/types/character';

/**
 * Resumo e diferença entre duas versões de uma ficha, em português, para o
 * histórico e para o conflito de sincronização ("o que muda se eu escolher
 * esta?"). Olha o que um jogador nota: nível, PV, XP, dinheiro, itens,
 * magias preparadas, espaços gastos, condições, diário e notas.
 */

/** Valor em PO: platina, ouro, electro, prata, cobre. */
const COIN_VALUE: Record<CoinKey, number> = { pp: 10, gp: 1, ep: 0.5, sp: 0.1, cp: 0.01 };

function gold(c: Character): number {
  let total = 0;
  for (const k of Object.keys(COIN_VALUE) as CoinKey[]) total += (c.coins?.[k] ?? 0) * COIN_VALUE[k];
  return Math.round(total * 100) / 100;
}

function itemNames(c: Character): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of c.inventory ?? []) {
    const name = it.name || it.itemId || '?';
    m.set(name, (m.get(name) ?? 0) + (it.quantity ?? 1));
  }
  return m;
}

const hp = (c: Character) => c.hpCurrent ?? 0;
const maxCache = new WeakMap<Character, number>();
function hpMax(c: Character): number {
  let v = maxCache.get(c);
  if (v === undefined) {
    try {
      v = deriveCharacter(c).maxHp;
    } catch {
      v = 0; // ficha antiga/incompleta: o resumo não pode quebrar a tela
    }
    maxCache.set(c, v);
  }
  return v;
}
const slotsUsed = (c: Character) => Object.values(c.combat?.spellSlots ?? {}).reduce((a, s) => a + (s?.used ?? 0), 0);
const journal = (c: Character) => (c.journal ?? []).length;

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Uma linha curta: "Nv 5 · PV 31/38 · 12 itens · 340 PO". */
export function summarize(c: Character): string {
  const items = [...itemNames(c).values()].reduce((a, b) => a + b, 0);
  return [`Nv ${c.level}`, `PV ${hp(c)}/${hpMax(c)}`, `${items} ${items === 1 ? 'item' : 'itens'}`, `${fmt(gold(c))} PO`].join(' · ');
}

/** O que muda de `from` para `to` (lista curta, as mudanças mais visíveis primeiro). */
export function diff(from: Character, to: Character, max = 6): string[] {
  const out: string[] = [];
  if (from.name !== to.name) out.push(`nome: ${from.name || '—'} → ${to.name || '—'}`);
  if (from.level !== to.level) out.push(`nível ${from.level} → ${to.level}`);
  if (hp(from) !== hp(to) || hpMax(from) !== hpMax(to)) out.push(`PV ${hp(from)}/${hpMax(from)} → ${hp(to)}/${hpMax(to)}`);
  if ((from.xp ?? 0) !== (to.xp ?? 0)) out.push(`XP ${fmt(from.xp ?? 0)} → ${fmt(to.xp ?? 0)}`);
  if (gold(from) !== gold(to)) out.push(`dinheiro ${fmt(gold(from))} → ${fmt(gold(to))} PO`);

  const a = itemNames(from);
  const b = itemNames(to);
  const added: string[] = [];
  const removed: string[] = [];
  for (const [name, q] of b) if ((a.get(name) ?? 0) < q) added.push(name);
  for (const [name, q] of a) if ((b.get(name) ?? 0) < q) removed.push(name);
  if (added.length) out.push(`+ ${list(added)}`);
  if (removed.length) out.push(`− ${list(removed)}`);

  const pa = new Set(from.preparedSpells ?? []);
  const pb = new Set(to.preparedSpells ?? []);
  const spellsChanged = pa.size !== pb.size || [...pa].some((s) => !pb.has(s));
  if (spellsChanged) out.push('magias preparadas mudaram');
  if (slotsUsed(from) !== slotsUsed(to)) out.push(`espaços de magia gastos ${slotsUsed(from)} → ${slotsUsed(to)}`);

  const ca = (from.combat?.conditions ?? []).join(',');
  const cb = (to.combat?.conditions ?? []).join(',');
  if (ca !== cb) out.push('condições mudaram');
  if (journal(from) !== journal(to)) out.push(`diário ${journal(from)} → ${journal(to)} entradas`);
  if ((from.notes ?? '') !== (to.notes ?? '')) out.push('notas mudaram');

  if (out.length > max) return [...out.slice(0, max - 1), `e mais ${out.length - max + 1} mudanças`];
  return out;
}

function list(names: string[]): string {
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} e mais ${names.length - 3}` : names.join(', ');
}
