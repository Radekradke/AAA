import { roll as rollEngine } from '@/engine/dice';
import type { RollResult } from '@/engine/dice';
import { withExtraDice } from '@/engine/damageExtras';
import type { CastRoll } from '@/engine/spellCast';
import { isFixedRoll } from '@/engine/spellCast';

/**
 * Rola uma rolagem de magia com todos os seus dados (Tempestade de Gelo:
 * 2d8 + 4d6 numa rolagem só). Rolagem fixa (Guardião da Fé: 20) não rola:
 * devolve null e quem chamou usa o valor.
 */
export function rollCastDice(r: CastRoll, opts: { suffix?: string; damage?: boolean; cantrip?: boolean } = {}): RollResult | null {
  if (isFixedRoll(r)) return null;
  const base = rollEngine(r.sides, { count: r.count, modifier: r.bonus, label: r.label + (opts.suffix ?? ''), damage: opts.damage ?? true, cantrip: opts.cantrip });
  if (!r.extra?.length) return base;
  return withExtraDice(base, r.extra.map((x) => ({ count: x.count, die: x.sides, type: '', source: '' })), false);
}

/** "2d8 + 4d6 + 3" para mostrar no botão. */
export function castDiceLabel(r: CastRoll): string {
  const parts = [r.count ? `${r.count}d${r.sides}` : '', ...(r.extra ?? []).map((x) => `${x.count}d${x.sides}`)].filter(Boolean);
  if (r.bonus) parts.push(String(r.bonus));
  return parts.join(' + ') || String(r.bonus);
}
