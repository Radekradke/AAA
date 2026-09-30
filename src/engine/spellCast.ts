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

/**
 * Magias em que VOCÊ escolhe o tipo de dano (PHB 2014). `part` é o trecho do
 * tipo original que a escolha substitui (Onda Destrutiva: só a metade
 * radiante/necrótica muda; a trovejante fica).
 */
const CHROMATIC = ['ácido', 'frio', 'fogo', 'elétrico', 'veneno', 'trovejante'];
const DAMAGE_TYPE_CHOICES: Record<string, { options: string[]; part?: string }> = {
  'phb-chromatic-orb': { options: CHROMATIC },
  'phb-glyph-warding': { options: ['ácido', 'frio', 'fogo', 'elétrico', 'trovejante'] },
  'phb-spirit-guardians': { options: ['radiante', 'necrótico'] },
  'phb-forbiddance': { options: ['radiante', 'necrótico'] },
  'phb-fire-shield': { options: ['fogo', 'frio'] },
  'phb-destructive-wave': { options: ['radiante', 'necrótico'], part: 'radiante' },
};

/** Tipos de dano que dá para escolher nesta magia (ou null se o tipo é fixo). */
export function damageTypeOptions(sp: Spell): string[] | null {
  const def = DAMAGE_TYPE_CHOICES[sp.id];
  if (def) return def.options;
  return sp.damage?.type === 'à escolha' ? CHROMATIC : null;
}

/** Rótulo do tipo de dano com a escolha aplicada ("trovejante + necrótico"). */
export function damageTypeLabel(sp: Spell, chosen?: string | null): string {
  const type = sp.damage?.type ?? '';
  const opts = damageTypeOptions(sp);
  if (!opts || !chosen || !opts.includes(chosen)) return type;
  const part = DAMAGE_TYPE_CHOICES[sp.id]?.part;
  if (part) return [...type.split('/').filter((t) => t !== part), chosen].join(' + ');
  return chosen;
}

export function damageRoll(sp: Spell, slotLevel: number, charLevel: number, chosenType?: string | null): CastRoll | null {
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
  return { count, sides: base.sides, bonus: base.bonus, label: `${sp.name} · ${damageTypeLabel(sp, chosenType)}` };
}

/**
 * Ataque de magia: quantas jogadas de ataque (raios/feixes) e o dano de
 * CADA acerto. Rajada Mística: 1 feixe (+1 nos níveis 5, 11 e 17), 1d10 cada.
 * Raio Ardente: 3 raios (+1 por círculo acima do 2º), 2d6 cada.
 */
export interface SpellAttackPlan {
  beams: number;
  perHit: CastRoll;
  /** Errar ainda causa metade (Flecha Ácida de Melf). */
  missHalf: boolean;
  /** Lembrete depois do dano (ex.: dano residual). */
  note?: string;
}

/** Invocação Explosão Agonizante escolhida (soma CAR em cada feixe da Rajada Mística). */
export function hasAgonizingBlast(choices: Record<string, string[]> | undefined): boolean {
  return Object.entries(choices ?? {}).some(([k, ids]) => k.endsWith('.invocation') && ids.includes('agonizingBlast'));
}

export function spellAttackPlan(
  sp: Spell,
  slotLevel: number,
  charLevel: number,
  chosenType?: string | null,
  opts: { agonizing?: number } = {},
): SpellAttackPlan | null {
  const plan = baseAttackPlan(sp, slotLevel, charLevel, chosenType);
  // Explosão Agonizante: +CAR em CADA feixe da Rajada Mística
  if (plan && opts.agonizing && sp.id === 'sp-eldritch') {
    return { ...plan, perHit: { ...plan.perHit, bonus: plan.perHit.bonus + opts.agonizing, label: `${plan.perHit.label} · Explosão Agonizante` } };
  }
  return plan;
}

function baseAttackPlan(sp: Spell, slotLevel: number, charLevel: number, chosenType?: string | null): SpellAttackPlan | null {
  if (!sp.attack || !sp.damage) return null;
  const type = damageTypeLabel(sp, chosenType);
  // feixes que escalam com o nível do personagem (Rajada Mística)
  if (sp.level === 0 && /feixes?/i.test(sp.higher ?? '')) {
    const base = parseDice(sp.damage.dice);
    if (!base) return null;
    const beams = 1 + [5, 11, 17].filter((l) => charLevel >= l).length;
    return { beams, missHalf: false, perHit: { ...base, label: `${sp.name} · ${type}` } };
  }
  // "3× 2d6": vários raios, cada um com sua jogada de ataque (Raio Ardente)
  const rays = sp.damage.dice.match(/^(\d+)×\s*(\d+)d(\d+)$/);
  if (rays) {
    const extra = /raio/i.test(sp.higher ?? '') ? Math.max(0, slotLevel - sp.level) : 0;
    return {
      beams: Number(rays[1]) + extra,
      missHalf: false,
      perHit: { count: Number(rays[2]), sides: Number(rays[3]), bonus: 0, label: `${sp.name} · ${type}` },
    };
  }
  const one = damageRoll(sp, slotLevel, charLevel, chosenType);
  if (!one) return null;
  const acid = sp.id === 'sp-flechacidamelf'; // Flecha Ácida de Melf
  const residual = acid ? 2 + Math.max(0, slotLevel - sp.level) : 0;
  return {
    beams: 1,
    perHit: one,
    missHalf: acid,
    note: acid ? `No fim do próximo turno do alvo: +${residual}d4 de ácido (só se acertou).` : undefined,
  };
}

export type AttackOutcome = 'hit' | 'crit' | 'miss';

/**
 * Dano só dos acertos: crítico dobra os DADOS (não o bônus fixo).
 * Sem acertos: null — ou metade do dano, se a magia faz isso ao errar.
 */
export function spellHitDamage(plan: SpellAttackPlan, outcomes: AttackOutcome[]): (CastRoll & { half?: boolean }) | null {
  const hits = outcomes.filter((o) => o !== 'miss');
  const crits = outcomes.filter((o) => o === 'crit').length;
  if (!hits.length) {
    return plan.missHalf ? { ...plan.perHit, label: `${plan.perHit.label} · errou (metade)`, half: true } : null;
  }
  const count = hits.reduce((n, o) => n + plan.perHit.count * (o === 'crit' ? 2 : 1), 0);
  const tag = [
    plan.beams > 1 ? `${hits.length}/${plan.beams} acerto${hits.length > 1 ? 's' : ''}` : '',
    crits ? (crits > 1 ? `${crits} críticos` : 'crítico') : '',
  ].filter(Boolean).join(' · ');
  return { count, sides: plan.perHit.sides, bonus: plan.perHit.bonus * hits.length, label: plan.perHit.label + (tag ? ` · ${tag}` : '') };
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
