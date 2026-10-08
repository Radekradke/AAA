import type { SessionEvent, StrikeLog } from '@/types/session';

/**
 * Crônica da sessão: o texto de cada acontecimento (usado no feed ao vivo)
 * e a exportação em Markdown agrupada por encontro e rodada — para o mestre
 * guardar, revisar o combate ou colar no grupo (Discord/WhatsApp).
 */

type P = Record<string, unknown>;
const s = (v: unknown, fallback = '') => (v === undefined || v === null || v === '' ? fallback : String(v));
const plural = (n: unknown, one: string, many: string) => (Number(n) === 1 ? one : many);

/** "Goblin #1 → Kael (CA 17) · Cimitarra 19: acertou — 6 cortante (PV 31→25)". */
export function strikeText(p: StrikeLog): string {
  const head = `${p.by} → ${p.target}${p.ac !== undefined ? ` (CA ${p.ac})` : ''}`;
  const how = [p.action, p.roll !== undefined ? String(p.roll) : null].filter(Boolean).join(' ');
  const result = p.hit ? (p.crit ? 'CRÍTICO!' : 'acertou') : 'errou';
  const dmg = p.hit && p.damage > 0 ? ` — ${p.damage}${p.type ? ` ${p.type}` : ''}` : p.hit ? ' — sem dano' : '';
  const hp = p.hit && p.hpBefore !== undefined && p.hpAfter !== undefined ? ` (PV ${p.hpBefore}→${p.hpAfter}${p.hpAfter === 0 ? ', caiu' : ''})` : '';
  const note = p.note ? ` [${p.note}]` : '';
  return `${head}${how ? ` · ${how}` : ''}: ${result}${dmg}${hp}${note}`;
}

/** Texto curto de um acontecimento (feed ao vivo e exportação). */
export function eventText(e: SessionEvent): string {
  const p = e.payload as P;
  switch (e.type) {
    case 'session_started': return `Sessão aberta — ${s(p.name)}`;
    case 'session_paused': return 'Sessão pausada';
    case 'session_active': return 'Sessão retomada';
    case 'session_finished': return 'Sessão encerrada';
    case 'encounter_created': return `Encontro preparado — ${s(p.name)}`;
    case 'initiative_rolled': return `${s(p.name, 'Alguém')} rolou iniciativa: ${s(p.value)}`;
    case 'initiative_batch': return `Mestre rolou ${s(p.count)} ${plural(p.count, 'iniciativa', 'iniciativas')}`;
    case 'combat_started': return `Combate! ${s(p.name)}`;
    case 'round_started': return `Rodada ${s(p.round)}`;
    case 'turn_changed': return `Vez de ${s(p.name, '—')}`;
    case 'encounter_paused': return 'Combate pausado';
    case 'encounter_active': return 'Combate retomado';
    case 'encounter_finished': return `Fim do encontro — ${s(p.round, '0')} ${plural(p.round, 'rodada', 'rodadas')}`;
    case 'roll': return `${s(p.who, '—')} · ${s(p.label, 'rolagem').replace(/^Rolagem /, '')}: ${s(p.total)}${p.crit ? ' (crítico!)' : p.fail ? ' (falha)' : ''}`;
    case 'hero_hp': return p.kind === 'heal' ? `${s(p.name)} recuperou ${s(p.amount)} PV` : `${s(p.name)} sofreu ${s(p.amount)} de dano${p.crit ? ' (crítico)' : ''}`;
    case 'hero_condition': return `${s(p.name)} ${p.on ? 'ficou' : 'não está mais'} ${s(p.condition).toLowerCase()}`;
    case 'attack': return strikeText(p as unknown as StrikeLog);
    case 'hero_item': return `${s(p.name)} recebeu ${Number(p.quantity) > 1 ? `${p.quantity}× ` : ''}${s(p.item, 'um item')}`;
    case 'hero_deed': return `${s(p.name, 'Um herói')} deu o golpe final em ${s(p.creature, 'uma criatura')}`;
    case 'hero_scar': return `${s(p.name, 'Um herói')} ganhou uma cicatriz: ${s(p.text)}`;
    case 'xp_award': return `+${s(p.amount)} XP para ${((p.names as string[] | undefined) ?? []).join(', ')}${p.note ? ` — ${p.note}` : ''}`;
    default: return e.type.replace(/_/g, ' ');
  }
}

export interface ChronicleOptions {
  title: string;
  /** Inclui o que só o mestre vê (emboscadas, rolagens secretas). */
  includeSecret?: boolean;
  /** Inclui as rolagens soltas (sem ser ataque). */
  includeRolls?: boolean;
}

interface Totals {
  dealt: Map<string, number>;
  taken: Map<string, number>;
  hits: Map<string, [number, number]>;
  crits: Map<string, number>;
}

const add = (m: Map<string, number>, k: string, n: number) => m.set(k, (m.get(k) ?? 0) + n);

/** Exporta a crônica em Markdown: encontros → rodadas → acontecimentos, e o placar do combate. */
export function buildChronicle(events: SessionEvent[], opts: ChronicleOptions): string {
  const list = [...events]
    .filter((e) => opts.includeSecret || e.visibility === 'public')
    .filter((e) => opts.includeRolls !== false || e.type !== 'roll')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const time = (e: SessionEvent) => new Date(e.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const day = list[0] ? new Date(list[0].createdAt).toLocaleDateString('pt-BR', { dateStyle: 'long' }) : '';

  const out: string[] = [`# ${opts.title}`, ''];
  if (day) out.push(`_${day}_`, '');

  let inCombat = false;
  let totals: Totals | null = null;
  // dano em herói gera dois eventos (o PV na ficha e o ataque): o placar conta uma vez só
  const heroHp = new Map<string, { amount: number; at: number }>();
  const flushTotals = () => {
    if (!totals) return;
    const names = [...new Set([...totals.dealt.keys(), ...totals.taken.keys(), ...totals.hits.keys()])];
    if (names.length) {
      out.push('', '**Placar do encontro**', '', '| Quem | Dano causado | Dano sofrido | Acertos | Críticos |', '|---|---:|---:|---:|---:|');
      for (const n of names.sort((a, b) => (totals!.dealt.get(b) ?? 0) - (totals!.dealt.get(a) ?? 0))) {
        const [hit, tries] = totals.hits.get(n) ?? [0, 0];
        out.push(`| ${n} | ${totals.dealt.get(n) ?? 0} | ${totals.taken.get(n) ?? 0} | ${tries ? `${hit}/${tries}` : '—'} | ${totals.crits.get(n) ?? 0} |`);
      }
    }
    totals = null;
  };

  for (const e of list) {
    const p = e.payload as P;
    if (e.type === 'combat_started') {
      flushTotals();
      inCombat = true;
      totals = { dealt: new Map(), taken: new Map(), hits: new Map(), crits: new Map() };
      out.push('', `## ⚔ ${s(p.name, 'Combate')}`, '');
      continue;
    }
    if (e.type === 'round_started' && inCombat) {
      out.push('', `### Rodada ${s(p.round)}`, '');
      continue;
    }
    if (e.type === 'encounter_finished') {
      out.push(`- ${time(e)} · ${eventText(e)}`);
      flushTotals();
      inCombat = false;
      out.push('');
      continue;
    }
    if (e.type === 'attack' && totals) {
      const a = p as unknown as StrikeLog;
      const [h, t] = totals.hits.get(a.by) ?? [0, 0];
      totals.hits.set(a.by, [h + (a.hit ? 1 : 0), t + 1]);
      if (a.hit) {
        add(totals.dealt, a.by, a.damage);
        const prev = heroHp.get(a.target);
        const counted = prev && prev.amount === a.damage && Math.abs(Date.parse(e.createdAt) - prev.at) < 5000;
        if (counted) heroHp.delete(a.target);
        else add(totals.taken, a.target, a.damage);
      }
      if (a.crit) add(totals.crits, a.by, 1);
    }
    if (e.type === 'hero_hp' && totals && p.kind !== 'heal') {
      add(totals.taken, s(p.name), Number(p.amount) || 0);
      heroHp.set(s(p.name), { amount: Number(p.amount) || 0, at: Date.parse(e.createdAt) });
    }
    const secret = e.visibility !== 'public' ? ' _(só o mestre)_' : '';
    out.push(`- ${time(e)} · ${eventText(e)}${secret}`);
  }
  flushTotals();
  out.push('', '---', '_Exportado do Ficha Viva_');
  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}
