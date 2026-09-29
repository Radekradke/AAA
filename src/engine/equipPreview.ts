import type { Character, InventoryItem } from '@/types/character';
import type { DerivedAttack, DerivedCharacter } from './dndRules';
import { deriveCharacter } from './dndRules';
import { slotForItem, isEquipped, toggleEquip } from './inventory';
import { modStr } from './dice';
import { damageExpr } from './combat';
import { getItem } from '@/data/items';

/**
 * Comparação estilo BG3 antes de equipar: simula a ficha com o item no
 * slot e compara com a atual usando a MESMA engine (deriveCharacter). Assim
 * "CA 16 → 18" nunca discorda do que a ficha mostra depois de equipar.
 */

export interface StatDelta {
  label: string;
  from: string;
  to: string;
  /** true = melhora, false = piora, null = neutro/novo. */
  better: boolean | null;
}

export interface EquipPreview {
  /** Item que sai do slot (null se o slot estava vazio). */
  replaces: InventoryItem | null;
  deltas: StatDelta[];
  /** Avisos de regra: Força mínima, desvantagem em Furtividade… */
  warnings: string[];
}

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
  if (!it || isEquipped(char, it)) return null;
  const slot = slotForItem(it);
  if (!slot) return null;

  const replacedUid = char.equipped[slot];
  const replaces = replacedUid ? char.inventory.find((i) => i.uid === replacedUid) ?? null : null;
  const after = deriveCharacter({ ...char, equipped: toggleEquip(char, it) });

  const deltas: StatDelta[] = [];
  const push = (d: StatDelta | null) => d && deltas.push(d);
  push(num('CA', before.ac, after.ac));
  push(num('Desloc.', before.speed, after.speed, (n) => `${String(n).replace('.', ',')}m`));

  // arma: compara com a que sai do slot (ou mostra o ataque novo)
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
  // PHB: arma de duas mãos não combina com escudo
  const weapon = it.weapon ?? getItem(it.itemId)?.weapon;
  if (slot === 'mainHand' && char.equipped.shield && weapon?.properties.some((p) => /duas m[ãa]os/i.test(p))) {
    warnings.push('Duas mãos: não dá para usar com o escudo equipado');
  }

  return { replaces, deltas, warnings };
}
