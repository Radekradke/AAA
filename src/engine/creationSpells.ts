import type { Character } from '@/types/character';
import type { Spell } from '@/types/dnd';
import { SPELLS, defaultPreparedForClass, getSpell, spellVisible } from '@/data/spells';
import { abilityModifier } from './modifiers';
import { effectiveAbilities } from './levelUp';
import { casterOf, grantedSpells, racialSpells } from './spellcasting';
import { spellLearnState } from './spellRules';
import { bonusSpellIds } from './classChoices';

/**
 * Magias do 1º nível escolhidas na criação (PHB 2014):
 * · Bardo, Feiticeiro, Bruxo: truques + magias conhecidas da tabela.
 * · Clérigo, Druida: truques + preparadas (mod. + nível) da lista inteira.
 * · Mago: truques + 6 magias no grimório, e prepara INT + nível delas.
 * Magias de domínio e escolhas bônus (truque do Acólito da Natureza) não
 * contam nos limites. Paladino e Patrulheiro só conjuram a partir do 2º.
 */

/** Modificador do atributo de conjuração com os atributos da criação. */
export function castModAtCreation(char: Character): number {
  const c = casterOf(char);
  return c ? abilityModifier(effectiveAbilities(char)[c.ability]) : 0;
}

/** Conjura já no 1º nível (tem truques ou espaços de magia)? */
export function castsAtCreation(char: Character): boolean {
  const c = casterOf(char);
  return !!c && (c.cantrips > 0 || Object.keys(c.slots).length > 0);
}

export interface SpellPick {
  pool: Spell[];
  chosen: string[];
  max: number;
}

export interface CreationSpellPlan {
  kind: 'known' | 'prepared' | 'spellbook';
  /** Atributo e modificador de conjuração. */
  ability: string;
  mod: number;
  cantrips: SpellPick;
  /** Conhecidas (Bardo, Feiticeiro, Bruxo), preparadas (Clérigo, Druida) ou grimório (Mago). */
  spells: SpellPick;
  /** Só Mago: preparadas a partir do grimório. */
  prepared?: SpellPick;
  /** Já vêm sem contar no limite (domínio, Acólito da Natureza…). */
  free: { id: string; source: string }[];
}

const byName = (a: Spell, b: Spell) => a.name.localeCompare(b.name);
const BONUS_SOURCE: Record<string, string> = { natureCantrip: 'Acólito da Natureza', tomeCantrips: 'Livro das Sombras' };

export function creationSpellPlan(char: Character): CreationSpellPlan | null {
  if (!castsAtCreation(char)) return null;
  const mod = castModAtCreation(char);
  const st = spellLearnState(char, mod);
  if (!st || st.caster.kind === 'none') return null;
  // truques da linhagem (Taumaturgia, Globos de Luz, Ilusão Menor, truque do Alto Elfo): já vêm prontos
  const racial = racialSpells(char).filter((r) => r.recharge === 'atwill');
  const free = new Set([...st.freeIds, ...racial.map((r) => r.spellId)]);
  const pool = SPELLS.filter((s) => spellVisible(s) && st.listIds.has(s.id) && s.level <= Math.max(0, st.maxCircle) && !free.has(s.id)).sort(byName);
  const level = (id: string) => getSpell(id)?.level ?? -1;
  const mine = char.preparedSpells.filter((id) => !free.has(id) && level(id) >= 0);
  const cantrips: SpellPick = { pool: pool.filter((s) => s.level === 0), chosen: mine.filter((id) => level(id) === 0), max: st.cantrips.max };
  const leveled = pool.filter((s) => s.level >= 1);
  const bonus = bonusSpellIds(char);
  const freeList = [
    ...grantedSpells(char).map((g) => ({ id: g.id, source: g.source })),
    ...racial.map((r) => ({ id: r.spellId, source: r.source })),
    ...Object.entries(char.choices ?? {}).flatMap(([k, ids]) => ids.filter((id) => bonus.has(id)).map((id) => ({ id, source: BONUS_SOURCE[k.split('.').slice(1).join('.')] ?? 'Escolha de classe' }))),
  ].filter((f, i, all) => getSpell(f.id) && all.findIndex((x) => x.id === f.id) === i);

  if (st.caster.kind === 'spellbook') {
    const book = (char.knownSpells ?? []).filter((id) => !free.has(id) && level(id) >= 1);
    return {
      kind: 'spellbook',
      ability: st.caster.ability,
      mod,
      cantrips,
      spells: { pool: leveled, chosen: book, max: st.known?.max ?? 6 },
      prepared: {
        pool: leveled.filter((s) => book.includes(s.id)),
        chosen: mine.filter((id) => level(id) >= 1 && book.includes(id)),
        max: st.prepared?.max ?? 1,
      },
      free: freeList,
    };
  }
  const kind = st.caster.kind === 'known' ? 'known' : 'prepared';
  const max = kind === 'known' ? st.known?.max ?? 0 : st.prepared?.max ?? 0;
  return { kind, ability: st.caster.ability, mod, cantrips, spells: { pool: leveled, chosen: mine.filter((id) => level(id) >= 1), max }, free: freeList };
}

/** O que ainda falta (ou sobra) nas magias da criação. */
export function creationSpellPending(char: Character): string[] {
  const plan = creationSpellPlan(char);
  if (!plan) return [];
  const out: string[] = [];
  const diff = (p: SpellPick, what: [string, string], exact: boolean) => {
    const n = p.chosen.length;
    if (n < p.max && (exact || n === 0)) out.push(`Escolha ${p.max - n} ${p.max - n > 1 ? what[1] : what[0]}`);
    if (n > p.max) out.push(`Tire ${n - p.max} ${n - p.max > 1 ? what[1] : what[0]} (limite ${p.max})`);
  };
  diff(plan.cantrips, ['truque', 'truques'], true);
  if (plan.kind === 'known') diff(plan.spells, ['magia conhecida', 'magias conhecidas'], true);
  if (plan.kind === 'prepared') diff(plan.spells, ['magia preparada', 'magias preparadas'], false);
  if (plan.kind === 'spellbook') {
    diff(plan.spells, ['magia do grimório', 'magias do grimório'], true);
    diff(plan.prepared!, ['magia preparada', 'magias preparadas'], false);
  }
  return out;
}

/**
 * Sugestão inicial (os clássicos de cada classe), já no limite certo e sem
 * repetir magias que vêm de graça. O jogador troca na própria etapa.
 */
export function suggestCreationSpells(c: Character): void {
  const plan = creationSpellPlan(c);
  if (!plan) return;
  const free = new Set(plan.free.map((f) => f.id));
  const extra = free.size + 2;
  const ids = defaultPreparedForClass(c.classId, 1, plan.cantrips.max + extra, plan.spells.max + extra).filter((id) => !free.has(id));
  const inPool = (p: SpellPick) => (id: string) => p.pool.some((s) => s.id === id);
  const cantrips = ids.filter(inPool(plan.cantrips)).slice(0, plan.cantrips.max);
  const spells = ids.filter(inPool(plan.spells)).slice(0, plan.spells.max);
  if (plan.kind === 'spellbook') {
    c.knownSpells = spells;
    c.preparedSpells = [...cantrips, ...spells.slice(0, plan.prepared!.max)];
  } else {
    c.preparedSpells = [...cantrips, ...spells];
  }
}

/** Troca de classe: as magias escolhidas eram da lista antiga. */
export function resetCreationSpells(c: Character): void {
  c.preparedSpells = [];
  c.knownSpells = [];
}
