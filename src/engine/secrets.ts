import { CELL_METERS } from '@/types/stage';
import type { SceneSecret, SecretKind, SecretRules, SecretSkill } from '@/types/stage';
import { pointInPolygon } from './vision';
import type { Pt } from './vision';

/**
 * Segredos do mapa (puro, testável): quem da mesa cumpre as condições de um
 * baú, armadilha, porta secreta ou pista escondida — e por quê.
 */

/** Alcance para notar algo com Percepção passiva ou um teste, se o mestre não disser outro (PHB: "à vista, por perto"). */
export const DEFAULT_REACH_M = 9;
/** Um teste rolado vale por alguns minutos (o tempo de vasculhar a sala). */
export const CHECK_WINDOW_MS = 3 * 60_000;

/** Herói no mapa, do jeito que o vigia do mestre enxerga. */
export interface Seeker {
  tokenId: string;
  name: string;
  ownerId: string | null;
  sheetId: string | null;
  /** Centro do peão, em casas. */
  at: Pt;
  /** O que ele vê agora (vazio = sem paredes: vê tudo). */
  sight: Pt[];
  passive: Record<SecretSkill, number>;
  /** Nomes dos itens na mochila. */
  items: string[];
}

/** Teste rolado na mesa (da crônica de rolagens). */
export interface CheckRoll {
  sheetId: string;
  skill: SecretSkill;
  total: number;
  at: number;
}

export interface SecretHit {
  /** Quem achou (null = gatilho do mestre, sem herói). */
  by: Seeker | null;
  /** Motivos, na língua da mesa ("Percepção passiva 15 ≥ CD 14"). */
  why: string[];
}

export const SKILL_NAME: Record<SecretSkill, string> = { perception: 'Percepção', investigation: 'Investigação' };
export const KIND_NAME: Record<SecretKind, string> = { chest: 'Baú', trap: 'Armadilha', door: 'Passagem secreta', clue: 'Pista', item: 'Objeto' };

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Rolagem da crônica → teste de Percepção/Investigação (pelo rótulo do teste). */
export function skillOfRoll(label: string): SecretSkill | null {
  const l = fold(label);
  if (/percep/.test(l)) return 'perception';
  if (/investiga/.test(l)) return 'investigation';
  return null;
}

/** Alguma condição foi marcada? (sem nenhuma, o segredo só sai pela mão do mestre) */
export function hasRules(r: SecretRules): boolean {
  return !!(r.near || r.passive || r.check || r.item || r.flag);
}

const fmtM = (m: number) => `${m.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m`;

/**
 * As condições batem? Em "todas", tudo precisa valer para o MESMO herói (o
 * gatilho do mestre vale para todos); em "qualquer uma", basta uma.
 */
export function evaluateSecret(secret: Pick<SceneSecret, 'rules'>, spot: Pt, seekers: Seeker[], rolls: CheckRoll[], now = Date.now()): SecretHit | null {
  const r = secret.rules;
  if (!hasRules(r)) return null;
  const reachCells = (r.near ?? DEFAULT_REACH_M) / CELL_METERS;

  // o gatilho do mestre não depende de herói
  if (r.flag && !r.flag.on && r.mode === 'all') return null;
  const onlyFlag = !r.near && !r.passive && !r.check && !r.item;
  if (r.flag?.on && (r.mode === 'any' || onlyFlag)) return { by: null, why: [r.flag.label] };

  let best: SecretHit | null = null;
  for (const s of seekers) {
    const dist = Math.hypot(s.at.x - spot.x, s.at.y - spot.y);
    const sees = !s.sight.length || pointInPolygon(spot, s.sight);
    const inReach = sees && dist <= reachCells + 0.5;
    const meters = Math.max(0, Math.round(dist * CELL_METERS * 2) / 2);
    const parts: { ok: boolean; why: string }[] = [];
    if (r.near) parts.push({ ok: sees && dist <= r.near / CELL_METERS + 0.5, why: `a ${fmtM(meters)}` });
    if (r.passive) {
      const v = s.passive[r.passive.skill];
      parts.push({ ok: inReach && v >= r.passive.dc, why: `${SKILL_NAME[r.passive.skill]} passiva ${v} ≥ CD ${r.passive.dc}` });
    }
    if (r.check) {
      const roll = rolls
        .filter((x) => x.sheetId === s.sheetId && x.skill === r.check!.skill && now - x.at <= CHECK_WINDOW_MS)
        .sort((a, b) => b.total - a.total)[0];
      parts.push({ ok: inReach && !!roll && roll.total >= r.check.dc, why: roll ? `${SKILL_NAME[r.check.skill]} ${roll.total} ≥ CD ${r.check.dc}` : '' });
    }
    if (r.item) {
      const want = fold(r.item);
      const has = s.items.find((n) => fold(n).includes(want));
      parts.push({ ok: !!has, why: has ? `carrega ${has}` : '' });
    }
    if (r.flag) parts.push({ ok: r.flag.on, why: r.flag.label });
    const hit = r.mode === 'all' ? parts.every((p) => p.ok) : parts.some((p) => p.ok);
    if (!hit) continue;
    const why = parts.filter((p) => p.ok && p.why).map((p) => p.why);
    // o mais perto e com mais motivos leva o achado
    if (!best || why.length > best.why.length) best = { by: s, why };
  }
  return best;
}

/** Resumo das condições numa linha (lista do mestre). */
export function rulesSummary(r: SecretRules): string {
  const bits: string[] = [];
  if (r.near) bits.push(`a ${fmtM(r.near)}`);
  if (r.passive) bits.push(`${SKILL_NAME[r.passive.skill]} passiva ${r.passive.dc}`);
  if (r.check) bits.push(`teste de ${SKILL_NAME[r.check.skill]} ${r.check.dc}`);
  if (r.item) bits.push(`com ${r.item}`);
  if (r.flag) bits.push(r.flag.on ? `${r.flag.label} (acionado)` : r.flag.label);
  if (!bits.length) return 'Só pela sua mão';
  return bits.join(r.mode === 'all' ? ' + ' : ' ou ');
}
