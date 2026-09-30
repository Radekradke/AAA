import type { Spell } from '@/types/dnd';

/**
 * Conjurar: transforma o texto de dano/cura da magia em dados roláveis,
 * já com o círculo usado (conjuração em círculo superior) e com a escala
 * dos truques por nível de personagem (5º, 11º, 17º).
 */
export interface CastRoll {
  count: number;
  sides: number;
  bonus: number;
  label: string;
}

/** "8d6", "4d6 + 4d6", "7d8 + 30", "3d8" → soma de dados iguais + fixo (ou null se não der para rolar). */
export function parseDice(expr: string | undefined): { count: number; sides: number; bonus: number } | null {
  if (!expr) return null;
  const dice = [...expr.matchAll(/(\d+)d(\d+)/g)].map((m) => ({ n: Number(m[1]), d: Number(m[2]) }));
  if (!dice.length) return null;
  const sides = dice[0].d;
  if (dice.some((x) => x.d !== sides)) return null;
  const flat = [...expr.replace(/\d+d\d+/g, '').matchAll(/\+\s*(\d+)/g)].reduce((s, m) => s + Number(m[1]), 0);
  return { count: dice.reduce((s, x) => s + x.n, 0), sides, bonus: flat };
}

/** Dados extras por círculo acima do base, lidos do texto "+1d6 por círculo acima do 3º". */
export function upcastDice(sp: Spell): { n: number; d: number } | null {
  const m = sp.higher?.match(/\+(\d+)d(\d+)[^.]*?por círculo acima/);
  return m ? { n: Number(m[1]), d: Number(m[2]) } : null;
}

export function damageRoll(sp: Spell, slotLevel: number, charLevel: number): CastRoll | null {
  // projéteis múltiplos: "3× (1d4+1)" (Mísseis Mágicos: +1 dardo por círculo acima)
  const multi = sp.damage?.dice.match(/^(\d+)×\s*\((\d+)d(\d+)\s*\+\s*(\d+)\)/);
  if (multi) {
    const darts = Number(multi[1]) + (/dardo/.test(sp.higher ?? '') ? Math.max(0, slotLevel - sp.level) : 0);
    return { count: darts * Number(multi[2]), sides: Number(multi[3]), bonus: darts * Number(multi[4]), label: `${sp.name} · ${darts} dardos · ${sp.damage!.type}` };
  }
  const base = parseDice(sp.damage?.dice);
  if (!base) return null;
  let count = base.count;
  if (sp.level === 0) {
    // truques: +1 dado nos níveis 5, 11 e 17
    count *= 1 + [5, 11, 17].filter((l) => charLevel >= l).length;
  } else {
    const up = upcastDice(sp);
    if (up && up.d === base.sides) count += up.n * Math.max(0, slotLevel - sp.level);
  }
  return { count, sides: base.sides, bonus: base.bonus, label: `${sp.name} · ${sp.damage!.type}` };
}

export function healRoll(sp: Spell, slotLevel: number, castMod: number): CastRoll | null {
  const base = parseDice(sp.heal);
  if (!base) return null;
  let count = base.count;
  const up = upcastDice(sp);
  if (up && up.d === base.sides) count += up.n * Math.max(0, slotLevel - sp.level);
  const bonus = base.bonus + (/mod/i.test(sp.heal ?? '') ? castMod : 0);
  return { count, sides: base.sides, bonus, label: `${sp.name} · cura` };
}

/** Classes que conjuram rituais (PHB 2014): mago (do grimório), clérigo, druida e bardo. */
export function canRitual(classId: string, sp: Spell): boolean {
  return !!sp.ritual && ['wizard', 'cleric', 'druid', 'bard'].includes(classId);
}
