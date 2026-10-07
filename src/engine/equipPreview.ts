import type { Character, InventoryItem } from '@/types/character';
import type { DerivedAttack, DerivedCharacter } from './dndRules';
import { deriveCharacter } from './dndRules';
import { canEquip, isEquipped, moveItemTo } from './inventory';
import { modStr } from './dice';
import { damageExpr } from './combat';
import { getItem } from '@/data/items';
import { ABILITY_SHORT } from '@/data/skills';
import type { AbilityKey } from '@/types/dnd';

/**
 * Comparação estilo BG3 antes de equipar/vestir: simula a ficha com o item
 * no lugar (usando a MESMA regra de equipar, com mãos, escudo e encaixes do
 * corpo) e compara com a atual usando a MESMA engine (deriveCharacter).
 * Assim "CA 16 → 18" nunca discorda do que a ficha mostra depois.
 */

export interface StatDelta {
  label: string;
  from: string;
  to: string;
  /** true = melhora, false = piora, null = neutro/novo. */
  better: boolean | null;
}

export interface EquipPreview {
  /** Item que sai (null se nada sai). */
  replaces: InventoryItem | null;
  deltas: StatDelta[];
  /** Avisos de regra: Força mínima, Furtividade, duas mãos, encaixe cheio, sintonia… */
  warnings: string[];
}

const KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** Dano médio de um ataque (para dizer se a troca melhora). */
function avgDamage(a: DerivedAttack): number {
  const extra = a.bonusDamage ? (a.bonusDamage.dice * (a.bonusDamage.die + 1)) / 2 : 0;
  return (a.damageDice * (a.damageDie + 1)) / 2 + a.damageBonus + extra;
}

function num(label: string, from: number, to: number, fmt: (n: number) => string = String): StatDelta | null {
  if (from === to) return null;
  return { label, from: fmt(from), to: fmt(to), better: to > from };
}

export function previewEquip(char: Character, uid: string, before: DerivedCharacter = deriveCharacter(char)): EquipPreview | null {
  const it = char.inventory.find((i) => i.uid === uid);
  if (!it || isEquipped(char, it) || !canEquip(it)) return null;

  const draft = structuredClone(char);
  const r = moveItemTo(draft, uid, 'equipado');
  if (!r.ok) return { replaces: null, deltas: [], warnings: [r.reason] };
  const after = deriveCharacter(draft);

  // o que estava equipado e saiu
  const wasOn = new Set(char.inventory.filter((i) => isEquipped(char, i)).map((i) => i.uid));
  const replaces = draft.inventory.find((i) => wasOn.has(i.uid) && !isEquipped(draft, i)) ?? null;

  const deltas: StatDelta[] = [];
  const push = (d: StatDelta | null) => d && deltas.push(d);
  push(num('CA', before.ac, after.ac));
  push(num('Desloc.', before.speed, after.speed, (n) => `${String(n).replace('.', ',')}m`));
  for (const k of KEYS) push(num(ABILITY_SHORT[k], before.abilities[k].total, after.abilities[k].total));
  // salvaguardas (Manto/Anel de Proteção, Pedra da Sorte): mede pela de SAB, que atributo fixo não mexe
  if (!deltas.some((d) => d.label === ABILITY_SHORT.wis)) push(num('Salvaguardas', before.abilities.wis.save, after.abilities.wis.save, modStr));
  if (before.spellDC != null && after.spellDC != null) push(num('CD de magia', before.spellDC, after.spellDC));

  // arma: compara com a que sai (ou mostra o ataque novo)
  const newAtk = after.attacks.find((a) => a.uid === it.uid);
  if (newAtk) {
    const oldAtk = replaces ? before.attacks.find((a) => a.uid === replaces.uid) : undefined;
    if (oldAtk) {
      push(num('Acerto', oldAtk.attackBonus, newAtk.attackBonus, modStr));
      const a0 = avgDamage(oldAtk);
      const a1 = avgDamage(newAtk);
      if (damageExpr(oldAtk) !== damageExpr(newAtk)) {
        deltas.push({ label: 'Dano', from: damageExpr(oldAtk), to: damageExpr(newAtk), better: a1 === a0 ? null : a1 > a0 });
      }
    } else {
      deltas.push({ label: 'Acerto', from: '—', to: modStr(newAtk.attackBonus), better: null });
      deltas.push({ label: 'Dano', from: '—', to: damageExpr(newAtk), better: null });
    }
  }

  const warnings: string[] = [];
  const armor = it.armor ?? getItem(it.itemId)?.armor;
  if (armor?.strReq && after.abilities.str.total < armor.strReq) {
    warnings.push(`Exige Força ${armor.strReq} (você tem ${after.abilities.str.total})`);
  }
  if (armor?.stealthDisadvantage) warnings.push('Desvantagem em Furtividade');
  if (r.note) warnings.push(r.note);

  return { replaces, deltas, warnings };
}
