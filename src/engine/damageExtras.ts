import type { Character } from '@/types/character';
import type { DerivedAttack } from './dndRules';
import { roll } from './dice';
import type { RollResult } from './dice';
import { rollDamage } from './combat';
import { grantedSpells, syncSpellSlots } from './spellcasting';
import { bonusSpellIds } from './classChoices';

/**
 * Dano extra somado no acerto — PHB 2014:
 * · Ataque Furtivo (Ladino): ⌈nível/2⌉d6, 1× por turno, arma de acuidade ou à distância.
 * · Destruição Divina (Paladino 2º): gasta um espaço — 2d8 +1d8 por círculo acima
 *   do 1º (máx. 5d8), +1d8 contra morto-vivo/corruptor. Só corpo a corpo com arma.
 * · Destruição Divina Aprimorada (Paladino 11º): +1d8 radiante em todo acerto corpo a corpo com arma.
 * · Bruxaria: +1d6 necrótico em todo acerto (qualquer ataque, inclusive magia).
 * · Marca do Caçador: +1d6 em todo acerto com arma.
 * · Fúria (Bárbaro): +2/+3/+4 no dano corpo a corpo com FOR.
 * No crítico, TODOS os dados dobram (os bônus fixos não).
 */
export type MarkId = 'hex' | 'huntersMark' | 'rage';

export interface ExtraDice {
  count: number;
  die: number;
  type: string;
  source: string;
}

export function levelIn(char: Character, classId: string): number {
  return char.classLevels?.find((c) => c.classId === classId)?.level ?? (char.classId === classId ? char.level : 0);
}

export const sneakDice = (rogueLevel: number) => Math.ceil(rogueLevel / 2);
export const rageBonus = (barbLevel: number) => (barbLevel >= 16 ? 4 : barbLevel >= 9 ? 3 : 2);
/** Dados de Destruição Divina: 2d8 no 1º círculo, +1d8 por círculo, teto 5d8; +1d8 vs morto-vivo/corruptor. */
export const smiteDice = (slotLevel: number, undead = false) => Math.min(5, 1 + slotLevel) + (undead ? 1 : 0);

export function knowsSpell(char: Character, spellId: string): boolean {
  return (
    char.preparedSpells.includes(spellId) ||
    (char.knownSpells ?? []).includes(spellId) ||
    grantedSpells(char).some((g) => g.id === spellId) ||
    bonusSpellIds(char).has(spellId)
  );
}

export function hasMark(char: Character, mark: MarkId): boolean {
  return (char.combat.marks ?? []).includes(mark);
}

/** O que esta ficha PODE somar neste ataque (o jogador liga/desliga na hora). */
export interface ExtrasAvailable {
  sneak: { dice: number; used: boolean } | null;
  smite: { slots: { lv: number; left: number }[] } | null;
  improvedSmite: boolean;
  hex: boolean;
  huntersMark: boolean;
  rage: { bonus: number } | null;
}

export function weaponExtras(char: Character, atk: DerivedAttack): ExtrasAvailable {
  const rogue = levelIn(char, 'rogue');
  const paladin = levelIn(char, 'paladin');
  const barb = levelIn(char, 'barbarian');
  const melee = (atk.range ?? 'melee') === 'melee';
  const slots = syncSpellSlots(char);
  const openSlots = Object.entries(slots)
    .map(([lv, s]) => ({ lv: Number(lv), left: s.max - s.used }))
    .filter((s) => s.left > 0)
    .sort((a, b) => a.lv - b.lv);
  return {
    sneak: rogue >= 1 && atk.weapon && (atk.finesse || atk.range === 'ranged')
      ? { dice: sneakDice(rogue), used: !!char.combat.turn.sneak }
      : null,
    smite: paladin >= 2 && atk.weapon && melee ? { slots: openSlots } : null,
    improvedSmite: paladin >= 11 && !!atk.weapon && melee,
    hex: knowsSpell(char, 'phb-hex') || hasMark(char, 'hex'),
    huntersMark: !!atk.weapon && (knowsSpell(char, 'phb-hunters-mark') || hasMark(char, 'huntersMark')),
    rage: barb >= 1 && melee && atk.ability === 'str' ? { bonus: rageBonus(barb) } : null,
  };
}

export interface ExtrasChoice {
  crit?: boolean;
  versatile?: boolean;
  sneak?: boolean;
  /** Círculo gasto na Destruição Divina (0/undefined = não usar). */
  smiteLevel?: number;
  smiteUndead?: boolean;
}

/** Dados extras e bônus fixo que valem para este acerto. */
export function resolveExtras(char: Character, atk: DerivedAttack, avail: ExtrasAvailable, choice: ExtrasChoice): { dice: ExtraDice[]; flat: number; flatSource: string | null } {
  const dice: ExtraDice[] = [];
  if (avail.sneak && choice.sneak && !avail.sneak.used) dice.push({ count: avail.sneak.dice, die: 6, type: atk.damageType, source: 'Ataque Furtivo' });
  if (avail.smite && choice.smiteLevel) dice.push({ count: smiteDice(choice.smiteLevel, choice.smiteUndead), die: 8, type: 'radiante', source: 'Destruição Divina' });
  if (avail.improvedSmite) dice.push({ count: 1, die: 8, type: 'radiante', source: 'Destruição Divina Aprimorada' });
  if (avail.hex && hasMark(char, 'hex')) dice.push({ count: 1, die: 6, type: 'necrótico', source: 'Bruxaria' });
  if (avail.huntersMark && hasMark(char, 'huntersMark')) dice.push({ count: 1, die: 6, type: atk.damageType, source: 'Marca do Caçador' });
  const rage = avail.rage && hasMark(char, 'rage') ? avail.rage.bonus : 0;
  return { dice, flat: rage, flatSource: rage ? 'Fúria' : null };
}

/** Rola dados extras e junta numa rolagem só (crítico dobra os dados extras). */
export function withExtraDice(base: RollResult, extras: ExtraDice[], crit: boolean, flat = 0, label?: string): RollResult {
  let out: RollResult = { ...base, label: label ?? base.label };
  for (const x of extras) {
    const n = x.count * (crit ? 2 : 1);
    const r = roll(x.die, { count: n });
    out = { ...out, rolls: [...out.rolls, ...r.rolls], total: out.total + r.total, expr: `${out.expr} + ${n}d${x.die} ${x.type}` };
  }
  if (flat) out = { ...out, total: out.total + flat, modifier: out.modifier + flat, expr: `${out.expr} +${flat}` };
  return out;
}

/** Dano de arma com tudo que foi ligado. */
export function rollWeaponDamage(char: Character, atk: DerivedAttack, avail: ExtrasAvailable, choice: ExtrasChoice): RollResult {
  const crit = !!choice.crit;
  const base = rollDamage(atk, { versatile: choice.versatile, crit });
  const { dice, flat, flatSource } = resolveExtras(char, atk, avail, choice);
  const tags = [crit ? 'crítico' : '', ...dice.map((d) => d.source), flatSource ?? ''].filter(Boolean);
  return withExtraDice(base, dice, crit, flat, `Dano · ${atk.name}${tags.length ? ' · ' + tags.join(' · ') : ''}`);
}
