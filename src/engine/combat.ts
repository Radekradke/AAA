import { roll, modStr } from './dice';
import type { RollResult } from './dice';
import type { DerivedAttack } from './dndRules';

/** Rola o ataque (1d20 + bônus de ataque). */
export function rollAttack(atk: DerivedAttack, opts: { advantage?: boolean; disadvantage?: boolean } = {}): RollResult {
  return roll(20, {
    label: `Ataque · ${atk.name}`,
    modifier: atk.attackBonus,
    advantage: opts.advantage,
    disadvantage: opts.disadvantage,
  });
}

/** Rola o dano da arma (Xd Y + modificador), opcionalmente versátil e/ou crítico. */
export function rollDamage(atk: DerivedAttack, opts: { versatile?: boolean; crit?: boolean } = {}): RollResult {
  const die = opts.versatile && atk.versatileDie ? atk.versatileDie : atk.damageDie;
  const count = atk.damageDice * (opts.crit ? 2 : 1);
  const result = roll(die, {
    label: `Dano · ${atk.name}`,
    count,
    modifier: atk.damageBonus,
    damage: true,
  });
  return result;
}

/** Texto do dano para exibição (ex.: "1d8 +4"). */
export function damageExpr(atk: DerivedAttack, versatile = false): string {
  const die = versatile && atk.versatileDie ? atk.versatileDie : atk.damageDie;
  return `${atk.damageDice}d${die} ${modStr(atk.damageBonus)}`;
}
