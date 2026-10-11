import { roll, modStr, rollDie } from './dice';
import type { RollResult } from './dice';
import type { DerivedAttack } from './dndRules';

/** Rola o ataque (1d20 + bônus de ataque). */
export function rollAttack(atk: DerivedAttack, opts: { advantage?: boolean; disadvantage?: boolean } = {}): RollResult {
  return roll(20, {
    label: `Ataque · ${atk.name}`,
    modifier: atk.attackBonus,
    advantage: opts.advantage,
    disadvantage: opts.disadvantage,
    critMin: atk.critMin,
  });
}

/** Rola o dano da arma (Xd Y + modificador), opcionalmente versátil e/ou crítico. */
export function rollDamage(atk: DerivedAttack, opts: { versatile?: boolean; crit?: boolean } = {}): RollResult {
  const die = opts.versatile && atk.versatileDie ? atk.versatileDie : atk.damageDie;
  // crítico dobra os dados; Crítico Brutal (Bárbaro) soma dados extras da arma
  const count = atk.damageDice * (opts.crit ? 2 : 1) + (opts.crit ? atk.critExtraDice ?? 0 : 0);
  let main = roll(die, {
    label: `Dano · ${atk.name}`,
    count,
    modifier: atk.damageBonus,
    damage: true,
  });
  // Combate com Armas Grandes: 1 ou 2 no dado de dano rola de novo (fica com o novo)
  if (atk.greatWeapon === 'always' || (atk.greatWeapon === 'versatile' && opts.versatile)) {
    if (main.rolls.some((r) => r <= 2)) {
      const rerolled = main.rolls.map((r) => (r <= 2 ? rollDie(die) : r));
      const delta = rerolled.reduce((a, b) => a + b, 0) - main.rolls.reduce((a, b) => a + b, 0);
      main = { ...main, rolls: rerolled, total: main.total + delta, label: `${main.label} · Armas Grandes (rolou de novo 1–2)` };
    }
  }
  // sem dano extra: resultado direto
  if (!atk.bonusDamage || atk.bonusDamage.dice <= 0) return main;
  // dano extra de outro tipo (ex.: +2d6 fogo) — dobra os dados no crítico
  const bonusCount = atk.bonusDamage.dice * (opts.crit ? 2 : 1);
  const extra = roll(atk.bonusDamage.die, { count: bonusCount });
  return {
    ...main,
    rolls: [...main.rolls, ...extra.rolls],
    total: main.total + extra.total,
    expr: `${main.expr} + ${bonusCount}d${atk.bonusDamage.die} ${atk.bonusDamage.type}`,
  };
}

/** Texto do dano para exibição (ex.: "1d8 +4" ou "1d8 +4 +2d6 fogo"). */
export function damageExpr(atk: DerivedAttack, versatile = false): string {
  const die = versatile && atk.versatileDie ? atk.versatileDie : atk.damageDie;
  const base = `${atk.damageDice}d${die} ${modStr(atk.damageBonus)}`;
  return atk.bonusDamage && atk.bonusDamage.dice > 0
    ? `${base} +${atk.bonusDamage.dice}d${atk.bonusDamage.die} ${atk.bonusDamage.type}`
    : base;
}
