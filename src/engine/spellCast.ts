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
  /** Outros dados de tipos diferentes na mesma rolagem (Tempestade de Gelo: 2d8 + 4d6). */
  extra?: { count: number; sides: number }[];
}

/** Rolagem sem dados (dano/cura fixos: Guardião da Fé 20, Cura Completa 70). */
export const isFixedRoll = (r: CastRoll) => r.count === 0 && !r.extra?.length;

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

/**
 * Grupos de dados de um texto ("2d8 + 4d6", "1d8 + mod.", "20"): cada tipo de
 * dado, o fixo somado e se leva o modificador de conjuração.
 */
export function parseDiceGroups(expr: string | undefined): { groups: { n: number; d: number }[]; flat: number; mod: boolean } | null {
  if (!expr) return null;
  const groups: { n: number; d: number }[] = [];
  for (const m of expr.matchAll(/(\d+)d(\d+)/g)) {
    const g = groups.find((x) => x.d === Number(m[2]));
    if (g) g.n += Number(m[1]);
    else groups.push({ n: Number(m[1]), d: Number(m[2]) });
  }
  const rest = expr.replace(/\d+d\d+/g, '');
  const flat = [...rest.matchAll(/(?:^|\+)\s*(\d+)(?!\s*(?:m\b|ft|×))/g)].reduce((s, m) => s + Number(m[1]), 0);
  const mod = /\bmod/i.test(expr);
  if (!groups.length && !flat) return null;
  return { groups, flat, mod };
}

/**
 * Dados extras por círculo acima do base, lidos do texto: "+1d6 por círculo
 * acima do 3º" (a cada círculo), "+1d8 a cada dois círculos acima do 2º"
 * (a cada 2) ou "+1d8 por círculo" (sem "acima": conta a partir do base).
 */
export function upcastDice(sp: Spell): { n: number; d: number; every: number } | null {
  const h = sp.higher ?? '';
  const two = h.match(/\+(\d+)d(\d+)[^.]*?a cada (?:dois|2) círculos/);
  if (two) return { n: Number(two[1]), d: Number(two[2]), every: 2 };
  const one = h.match(/\+(\d+)d(\d+)[^.]*?por círculo/);
  return one ? { n: Number(one[1]), d: Number(one[2]), every: 1 } : null;
}

/** Quantas vezes o aumento por círculo se aplica neste espaço. */
const upSteps = (sp: Spell, up: { every: number }, slotLevel: number) => Math.floor(Math.max(0, slotLevel - sp.level) / up.every);

/**
 * Quando o dano da magia acontece:
 * - `now`: ao conjurar (acerto automático, ataque, salvaguarda);
 * - `rider`: no próximo acerto com arma ou quando acertam você (Destruições, Escudo de Fogo);
 * - `trigger`: quando alguém entra, começa ou termina o turno na área (Raio Lunar);
 * - `mark`: dano extra que a ficha já soma nos seus ataques (Bruxaria, Marca do Caçador).
 * Nos três últimos, conjurar NÃO rola dano: a ficha deixa um botão para a hora certa.
 */
export type DamageTiming = 'now' | 'rider' | 'trigger' | 'mark';
const MARK_SPELLS = new Set(['phb-hex', 'phb-hunters-mark']);
const RIDER_SPELLS = new Set(['xge-shadow-blade', 'phb-fire-shield', 'xge-shadow-of-moil', 'xge-holy-weapon', 'tce-spirit-shroud', 'tce-booming-blade', 'tce-green-flame-blade']);
const TRIGGER_SPELLS = new Set(['phb-faithful-hound', 'phb-forbiddance', 'phb-storm-vengeance', 'xge-wrath-of-nature', 'phb-guardian-faith', 'phb-dream']);
/** Magias que causam dano assim que aparecem (mesmo tendo dano por turno depois). */
const NOW_SPELLS = new Set(['sp-muralha']);
const RIDER_RE = /pr[óo]ximo acerto|seus acertos|a cada acerto|seus ataques|quem o acert|que o acert/i;
const TRIGGER_RE = /entr(?:ar|a) (?:na|no|pela primeira)|come[çc]ar? o turno|termina(?:r)? o turno|a cada 1,5 ?m|que se aproxim|se aproximam/i;

export function damageTiming(sp: Spell): DamageTiming {
  if (!sp.damage) return 'now';
  if (MARK_SPELLS.has(sp.id)) return 'mark';
  if (NOW_SPELLS.has(sp.id) || sp.attack) return 'now';
  if (RIDER_SPELLS.has(sp.id) || RIDER_RE.test(sp.desc ?? '')) return 'rider';
  if (TRIGGER_SPELLS.has(sp.id) || TRIGGER_RE.test(sp.desc ?? '')) return 'trigger';
  return 'now';
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

export function damageRoll(sp: Spell, slotLevel: number, charLevel: number, chosenType?: string | null, castMod = 0): CastRoll | null {
  // projéteis múltiplos: "3× (1d4+1)" (Mísseis Mágicos: +1 dardo por círculo acima)
  const multi = sp.damage?.dice.match(/^(\d+)×\s*\((\d+)d(\d+)\s*\+\s*(\d+)\)/);
  if (multi) {
    const darts = Number(multi[1]) + (/dardo/.test(sp.higher ?? '') ? Math.max(0, slotLevel - sp.level) : 0);
    return { count: darts * Number(multi[2]), sides: Number(multi[3]), bonus: darts * Number(multi[4]), label: `${sp.name} · ${darts} dardos · ${sp.damage!.type}` };
  }
  const parsed = parseDiceGroups(sp.damage?.dice);
  if (!parsed) return null;
  const groups = parsed.groups.map((g) => ({ ...g }));
  if (sp.level === 0) {
    // truques: +1 dado (de cada tipo) nos níveis 5, 11 e 17
    const tier = 1 + [5, 11, 17].filter((l) => charLevel >= l).length;
    for (const g of groups) g.n *= tier;
  } else {
    const up = upcastDice(sp);
    const g = up && groups.find((x) => x.d === up.d);
    if (up && g) g.n += up.n * upSteps(sp, up, slotLevel);
  }
  const bonus = parsed.flat + (parsed.mod ? castMod : 0);
  const label = `${sp.name} · ${damageTypeLabel(sp, chosenType)}`;
  if (!groups.length) return { count: 0, sides: 1, bonus, label };
  const [first, ...rest] = groups;
  return { count: first.n, sides: first.d, bonus, label, ...(rest.length ? { extra: rest.map((g) => ({ count: g.n, sides: g.d })) } : {}) };
}

/**
 * Ataque de magia: quantas jogadas de ataque (raios/feixes) e o dano de
 * CADA acerto. Rajada Mística: 1 feixe (+1 nos níveis 5, 11 e 17), 1d10 cada.
 * Raio Ardente: 3 raios (+1 por círculo acima do 2º), 2d6 cada.
 */
export interface SpellAttackPlan {
  /** Parte que sai acertando ou não (Faca de Gelo: a explosão de frio, com salvaguarda). */
  area?: CastRoll;
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
  opts: { agonizing?: number; castMod?: number; invocations?: string[] } = {},
): SpellAttackPlan | null {
  const base = baseAttackPlan(sp, slotLevel, charLevel, chosenType, opts.castMod ?? 0);
  // Explosão Repulsiva / Lança Mística: lembretes no "acertou?" da Rajada Mística
  const inv = sp.id === 'sp-eldritch' ? opts.invocations ?? [] : [];
  const notes = [
    inv.includes('repellingBlast') && 'Explosão Repulsiva: cada feixe que acertou empurra o alvo até 3 m para longe de você.',
    inv.includes('eldritchSpear') && 'Lança Mística: alcance de 90 m.',
  ].filter(Boolean);
  const plan = base && notes.length ? { ...base, note: [base.note, ...notes].filter(Boolean).join(' ') } : base;
  // Explosão Agonizante: +CAR em CADA feixe da Rajada Mística
  if (plan && opts.agonizing && sp.id === 'sp-eldritch') {
    return { ...plan, perHit: { ...plan.perHit, bonus: plan.perHit.bonus + opts.agonizing, label: `${plan.perHit.label} · Explosão Agonizante` } };
  }
  return plan;
}

function baseAttackPlan(sp: Spell, slotLevel: number, charLevel: number, chosenType: string | null | undefined, castMod: number): SpellAttackPlan | null {
  if (!sp.attack || !sp.damage) return null;
  const type = damageTypeLabel(sp, chosenType);
  // Faca de Gelo: 1d10 perfurante no acerto; a explosão de frio (2d6, +1d6 por círculo) sai sempre
  if (sp.id === 'xge-ice-knife') {
    const cold = 2 + Math.max(0, slotLevel - sp.level);
    return {
      beams: 1,
      missHalf: false,
      perHit: { count: 1, sides: 10, bonus: 0, label: `${sp.name} · perfurante` },
      area: { count: cold, sides: 6, bonus: 0, label: `${sp.name} · explosão de frio (salvaguarda DES, CD sua)` },
      note: 'Acertando ou não, o gelo explode: quem está a 1,5 m do alvo faz salvaguarda de DES contra o frio.',
    };
  }
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
  const one = damageRoll(sp, slotLevel, charLevel, chosenType, castMod);
  if (!one || isFixedRoll(one)) return null;
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
  // cada acerto rola os dados (todos os tipos); o crítico dobra os dados, não o fixo
  const times = hits.reduce((n, o) => n + (o === 'crit' ? 2 : 1), 0);
  const count = plan.perHit.count * times;
  const extra = plan.perHit.extra?.map((x) => ({ count: x.count * times, sides: x.sides }));
  const tag = [
    plan.beams > 1 ? `${hits.length}/${plan.beams} acerto${hits.length > 1 ? 's' : ''}` : '',
    crits ? (crits > 1 ? `${crits} críticos` : 'crítico') : '',
  ].filter(Boolean).join(' · ');
  return { count, sides: plan.perHit.sides, bonus: plan.perHit.bonus * hits.length, label: plan.perHit.label + (tag ? ` · ${tag}` : ''), ...(extra ? { extra } : {}) };
}

export function healRoll(sp: Spell, slotLevel: number, castMod: number): CastRoll | null {
  // cura fixa: "70 PV" (Cura Completa)
  const fixed = sp.heal?.match(/^\s*(\d+)\s*PV\s*$/);
  if (fixed) return { count: 0, sides: 1, bonus: Number(fixed[1]), label: `${sp.name} · cura` };
  const base = parseDice(sp.heal);
  if (!base) return null;
  let count = base.count;
  const up = upcastDice(sp);
  if (up && up.d === base.sides) count += up.n * upSteps(sp, up, slotLevel);
  const bonus = base.bonus + (/mod/i.test(sp.heal ?? '') ? castMod : 0);
  return { count, sides: base.sides, bonus, label: `${sp.name} · cura` };
}

/** Classes que conjuram rituais (PHB 2014): mago (do grimório), clérigo, druida e bardo. */
export function canRitual(classId: string, sp: Spell): boolean {
  return !!sp.ritual && ['wizard', 'cleric', 'druid', 'bard'].includes(classId);
}

/**
 * Magias que rolam um "orçamento" de PV em vez de dano (PHB 2014):
 * Sono (5d8, +2d8 por círculo) e Leque Cromático (6d10, +2d10). As criaturas
 * da área são afetadas da que tem MENOS PV atuais para a que tem mais,
 * enquanto o total cobrir os PV dela (e o que ela gastou sai do total).
 */
const HP_POOLS: Record<string, { dice: string; per: string; effect: string; immune: string }> = {
  'sp-sono': {
    dice: '5d8', per: '2d8',
    effect: 'caem inconscientes por 1 minuto (acordam se sofrerem dano ou alguém usar uma ação para acordá-las)',
    immune: 'Mortos-vivos e criaturas imunes a enfeitiçar não são afetados — pule-os.',
  },
  'phb-color-spray': {
    dice: '6d10', per: '2d10',
    effect: 'ficam cegas até o fim do seu próximo turno',
    immune: 'Criaturas inconscientes ou que não enxergam não são afetadas — pule-as.',
  },
};

export interface HpPool extends CastRoll {
  effect: string;
  immune: string;
}

export function hpPool(sp: Spell, slotLevel: number): HpPool | null {
  const def = HP_POOLS[sp.id];
  const base = def ? parseDice(def.dice) : null;
  const per = def ? parseDice(def.per) : null;
  if (!def || !base || !per) return null;
  const count = base.count + per.count * Math.max(0, slotLevel - sp.level);
  return { count, sides: base.sides, bonus: 0, label: `${sp.name} · PV afetados`, effect: def.effect, immune: def.immune };
}

/** Quem é afetado: do menor PV ao maior, enquanto o total cobrir. */
export function poolAffected(total: number, hps: number[]): { affected: number[]; spared: number[]; left: number } {
  const sorted = hps.filter((h) => Number.isFinite(h) && h > 0).sort((a, b) => a - b);
  const affected: number[] = [];
  let left = total;
  let i = 0;
  for (; i < sorted.length && sorted[i] <= left; i++) {
    affected.push(sorted[i]);
    left -= sorted[i];
  }
  return { affected, spared: sorted.slice(i), left };
}

/** Dano do truque no nível do personagem, para o cartão ("2d8 radiante", "2× 1d10 energia"). */
export function spellDamageLabel(sp: Spell, charLevel: number): string | null {
  if (!sp.damage) return null;
  if (sp.level !== 0) return `${sp.damage.dice} ${sp.damage.type}`;
  const tier = 1 + [5, 11, 17].filter((l) => charLevel >= l).length;
  const base = parseDice(sp.damage.dice);
  if (!base || tier === 1) return `${sp.damage.dice} ${sp.damage.type}`;
  // Rajada Mística: mais feixes, não mais dados
  if (/feixes?/i.test(sp.higher ?? '')) return `${tier}× ${sp.damage.dice} ${sp.damage.type}`;
  return `${base.count * tier}d${base.sides}${base.bonus ? `+${base.bonus}` : ''} ${sp.damage.type}`;
}
