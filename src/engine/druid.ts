import type { Character } from '@/types/character';
import type { Beast } from '@/data/beasts';
import { ELEMENTAL_SHAPES, WILD_SHAPES, getWildShape } from '@/data/wildShapes';
import { characterResources } from './classResources';
import { levelIn } from './damageExtras';
import { breakdown, mod } from './effects';
import type { DerivedAttack } from './dndRules';

/**
 * Druida (PHB 2014) na mesa: Forma Selvagem de verdade — escolhe a fera pelo
 * ND e deslocamento permitidos, troca PV/CA/ataques pelos da forma, o dano cai
 * na fera primeiro —, Recuperação Natural (Terra) e o que o Círculo da Lua
 * muda (ação bônus, ND maior, cura gastando espaço, elementais).
 */
export interface DruidState {
  level: number;
  /** CD das magias: 8 + prof + SAB. */
  dc: number;
  circle: 'land' | 'moon' | null;
  usesLeft: number;
  usesMax: number;
  unlimited: boolean;
  /** ND máximo da forma e restrições de deslocamento. */
  maxCr: number;
  canFly: boolean;
  canSwim: boolean;
  /** Horas que a forma dura (metade do nível). */
  hours: number;
  /** Transformar-se: ação (Lua: ação bônus). */
  bonusAction: boolean;
  /** Forma atual (se transformado). */
  form: { beast: Beast; hp: number; elemental: boolean } | null;
  /** Feras permitidas agora (maior ND primeiro) e elementais (Lua 10º, 2 usos). */
  options: Beast[];
  elementals: Beast[];
  /** Recuperação Natural (Terra 2º): níveis de espaço e se ainda há uso hoje. */
  naturalRecovery: { budget: number; left: number } | null;
}

/** "1/8" → 0,125; "2" → 2. */
export function crValue(cr: string): number {
  if (cr.includes('/')) {
    const [a, b] = cr.split('/').map(Number);
    return a / b;
  }
  return Number(cr) || 0;
}

/** ND máximo da Forma Selvagem: 1/4 → 1/2 (4º) → 1 (8º); Lua: 1 no 2º e nível ÷ 3 a partir do 6º. */
export function wildShapeMaxCr(level: number, moon: boolean): number {
  if (moon) return level >= 6 ? Math.floor(level / 3) : 1;
  return level >= 8 ? 1 : level >= 4 ? 0.5 : 0.25;
}

const flies = (b: Beast) => /voo/i.test(b.speed);
const swims = (b: Beast) => /nadar/i.test(b.speed);

/** A fera pode ser escolhida agora? (ND e deslocamento: voo só no 8º, natação só no 4º). */
export function canTakeShape(char: Character, beast: Beast): boolean {
  const lv = levelIn(char, 'druid');
  if (lv < 2) return false;
  if (crValue(beast.cr) > wildShapeMaxCr(lv, char.subclassId === 'moon')) return false;
  if (flies(beast) && lv < 8) return false;
  if (swims(beast) && lv < 4) return false;
  return true;
}

export function druidState(char: Character, prof: number, wisMod: number): DruidState | null {
  const level = levelIn(char, 'druid');
  if (!level) return null;
  const res = Object.fromEntries(characterResources(char).map((r) => [r.id, r]));
  const left = (id: string) => (res[id] ? Math.min(res[id].max, char.combat?.resources?.[id] ?? res[id].max) : 0);
  const circle = char.subclassId === 'land' || char.subclassId === 'moon' ? char.subclassId : null;
  const moon = circle === 'moon';
  const ws = char.combat?.wildShape;
  const beast = ws ? getWildShape(ws.beastId) : undefined;
  const unlimited = !!res.wildshape?.unlimited;
  return {
    level,
    dc: 8 + prof + wisMod,
    circle,
    usesLeft: unlimited ? Infinity : left('wildshape'),
    usesMax: res.wildshape?.max ?? 0,
    unlimited,
    maxCr: wildShapeMaxCr(level, moon),
    canFly: level >= 8,
    canSwim: level >= 4,
    hours: Math.floor(level / 2),
    bonusAction: moon,
    form: beast && ws ? { beast, hp: Math.max(0, Math.min(beast.hp, ws.hp)), elemental: ELEMENTAL_SHAPES.some((e) => e.id === beast.id) } : null,
    options: level >= 2 ? WILD_SHAPES.filter((b) => canTakeShape(char, b)).sort((a, b) => crValue(b.cr) - crValue(a.cr) || a.label.localeCompare(b.label)) : [],
    elementals: moon && level >= 10 ? ELEMENTAL_SHAPES : [],
    naturalRecovery: circle === 'land' && level >= 2 ? { budget: Math.ceil(level / 2), left: left('naturalRecovery') } : null,
  };
}

/** Ataques da forma (números da fera; Golpes Primais da Lua 6º contam como mágicos). */
export function wildShapeAttacks(char: Character, beast: Beast): DerivedAttack[] {
  const primal = char.subclassId === 'moon' && levelIn(char, 'druid') >= 6;
  return beast.attacks.filter((a) => a.dice > 0).map((a, i) => {
    const hitBd = breakdown([mod('attack', a.toHit, beast.label, 'base')]);
    const dmgBd = breakdown([mod('damage', a.bonus, beast.label, 'base')], a.note);
    return {
      uid: `wildshape-${i}`,
      name: `${beast.label} · ${a.name}`,
      note: [a.note, primal ? 'mágico (Golpes Primais)' : ''].filter(Boolean).join(' · '),
      attackBonus: hitBd.total,
      damageDice: a.dice,
      damageDie: a.die,
      damageBonus: dmgBd.total,
      damageType: a.type,
      critMin: 20,
      range: /Pedra/.test(a.name) ? 'ranged' : 'melee',
      hitBreakdown: hitBd,
      damageBreakdown: dmgBd,
    };
  });
}

/** Recuperação Natural válida? soma ≤ metade do nível de druida (para cima), só até o 5º, só espaços gastos. */
export function validNaturalRecovery(char: Character, picks: Record<number, number>, slots: Record<number, { max: number; used: number }>): boolean {
  const budget = Math.ceil(levelIn(char, 'druid') / 2);
  let total = 0;
  for (const [lv, n] of Object.entries(picks)) {
    const l = Number(lv);
    if (!n) continue;
    if (l >= 6 || n < 0 || n > (slots[l]?.used ?? 0)) return false;
    total += l * n;
  }
  return total > 0 && total <= budget;
}
