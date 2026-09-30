import type { Character } from '@/types/character';
import type { Spell } from '@/types/dnd';
import { SPELL_BY_ID } from '@/data/spells';
import { casterOf, expandedSpellIds, grantedSpells, spellSlotsFor } from './spellcasting';
import type { CasterInfo } from './spellcasting';
import { bonusSpellIds } from './classChoices';

/**
 * Regras de aprendizado de magias — PHB 2014.
 *
 * · Conhecidas (Bardo, Feiticeiro, Bruxo, Patrulheiro, Cavaleiro/Trapaceiro
 *   Arcano): só aprende até o limite da tabela; trocar uma magia exige uma
 *   troca, ganha a cada nível na classe.
 * · Preparadas (Clérigo, Druida, Paladino): prepara da lista inteira da
 *   classe até o limite (mod. + nível).
 * · Grimório (Mago): 6 magias no 1º nível e 2 grátis por nível; outras são
 *   COPIADAS (50 po e 2 horas por círculo). Prepara até INT + nível.
 * · Em todos: só magias da lista da classe e de um círculo que você já tem
 *   espaço para conjurar. Truques não se trocam.
 * Magias de Domínio/Juramento/Terra, talentos e escolhas bônus ficam de fora
 * dos limites.
 */
export interface SpellLearnState {
  caster: CasterInfo;
  /** Maior círculo que dá para aprender/preparar. */
  maxCircle: number;
  /** Ids que não contam em limite nenhum. */
  freeIds: Set<string>;
  cantrips: { have: number; max: number };
  /** Conhecidas (casters "known") ou grimório grátis (mago). */
  known: { have: number; max: number } | null;
  /** Preparadas (clérigo/druida/paladino/mago). */
  prepared: { have: number; max: number } | null;
  /** Trocas de magia conhecida disponíveis (ganhas ao subir de nível). */
  swaps: number;
  /** Mago: magias copiadas pagando ouro (não gastam as grátis). */
  copied: Set<string>;
  /** Magias fora das escolas (Cavaleiro/Trapaceiro Arcano). */
  offSchool: number;
  /** Lista de onde pode aprender (classe + patrono). */
  listIds: Set<string>;
}

function levelIn(char: Character, classId: string): number {
  return char.classLevels?.find((c) => c.classId === classId)?.level ?? (char.classId === classId ? char.level : 0);
}

export function spellLearnState(char: Character, castMod: number): SpellLearnState | null {
  const caster = casterOf(char, castMod);
  if (!caster) return null;
  const slots = spellSlotsFor(char);
  const maxCircle = Math.max(0, ...Object.keys(slots).map(Number));
  const freeIds = new Set([...bonusSpellIds(char), ...grantedSpells(char).map((g) => g.id)]);
  const spell = (id: string) => SPELL_BY_ID[id];
  const counted = (ids: string[]) => ids.filter((id) => spell(id) && !freeIds.has(id));
  const copied = new Set(char.spellbookCopied ?? []);

  const isWizard = caster.kind === 'spellbook';
  const pool = isWizard ? counted([...char.preparedSpells, ...(char.knownSpells ?? [])]) : counted(char.preparedSpells);
  const unique = [...new Set(pool)];
  const cantripsHave = unique.filter((id) => spell(id).level === 0).length;
  const leveled = unique.filter((id) => spell(id).level >= 1);

  let known: SpellLearnState['known'] = null;
  let prepared: SpellLearnState['prepared'] = null;
  if (caster.kind === 'known') {
    known = { have: leveled.length, max: caster.guide.count };
  } else if (isWizard) {
    const book = counted(char.knownSpells ?? []).filter((id) => spell(id).level >= 1);
    known = { have: book.filter((id) => !copied.has(id)).length, max: caster.guide.count };
    prepared = {
      have: counted(char.preparedSpells).filter((id) => spell(id).level >= 1).length,
      max: Math.max(1, castMod + caster.level),
    };
  } else if (caster.kind === 'prepared') {
    prepared = { have: leveled.length, max: caster.guide.count };
  }

  const offSchool = caster.schools ? leveled.filter((id) => !caster.schools!.allowed.includes(spell(id).school)).length : 0;
  const listIds = new Set<string>([
    ...Object.values(SPELL_BY_ID).filter((s) => (s.classes ?? []).includes(caster.listClass as never)).map((s) => s.id),
    ...expandedSpellIds(char),
  ]);

  return {
    caster,
    maxCircle,
    freeIds,
    cantrips: { have: cantripsHave, max: caster.cantrips },
    known,
    prepared,
    swaps: char.spellSwaps ?? 0,
    copied,
    offSchool,
    listIds,
  };
}

/**
 * Por que o personagem NÃO pode aprender/preparar esta magia agora (ou null
 * se pode). `mode: 'copy'` = Mago copiando para o grimório pagando ouro.
 */
export function learnBlock(char: Character, st: SpellLearnState, sp: Spell, mode: 'class' | 'copy' = 'class'): string | null {
  const isWizard = st.caster.kind === 'spellbook';
  if (!st.listIds.has(sp.id)) return `Fora da lista de ${st.caster.via ?? 'magias da sua classe'}.`;
  if (sp.level > st.maxCircle) {
    return st.maxCircle === 0 ? 'Você ainda não tem espaços de magia.' : `${sp.level}º círculo — você conjura até o ${st.maxCircle}º.`;
  }
  if (sp.level === 0) {
    if (mode === 'copy') return 'Truques não vão para o grimório.';
    if (st.cantrips.have >= st.cantrips.max) return `Limite de truques (${st.cantrips.max}). Truques não se trocam.`;
    return null;
  }
  if (st.caster.schools) {
    const allowed = st.caster.schools.allowed.includes(sp.school);
    if (!allowed && st.offSchool >= st.caster.schools.free) {
      return `Precisa ser de ${st.caster.schools.allowed.join(' ou ')} (livres: ${st.caster.schools.free}).`;
    }
  }
  if (mode === 'copy') {
    if (!isWizard) return 'Só o Mago copia magias para o grimório.';
    const cost = sp.level * 50;
    if (char.coins.gp < cost) return `Precisa de ${cost} po para copiar.`;
    return null;
  }
  if (st.known && st.known.have >= st.known.max) {
    return isWizard
      ? `As ${st.known.max} magias grátis do grimório já foram escolhidas — copie de um pergaminho (ouro).`
      : st.swaps > 0
        ? `Limite de ${st.known.max} conhecidas — use sua troca: esqueça uma e aprenda esta.`
        : `Limite de ${st.known.max} magias conhecidas. Troca só ao subir de nível.`;
  }
  if (!st.known && st.prepared && st.prepared.have >= st.prepared.max) {
    return `Limite de ${st.prepared.max} preparadas. Despreparar uma libera espaço.`;
  }
  return null;
}

/** Pode preparar (Mago) esta magia do grimório? */
export function prepareBlock(st: SpellLearnState, isPrepared: boolean): string | null {
  if (isPrepared || !st.prepared) return null;
  if (st.prepared.have >= st.prepared.max) return `Limite de ${st.prepared.max} preparadas (INT + nível).`;
  return null;
}

/** Pode esquecer/remover esta magia? Devolve o motivo do bloqueio, ou null. */
export function forgetBlock(st: SpellLearnState, sp: Spell): { block: string | null; usesSwap: boolean } {
  if (st.freeIds.has(sp.id)) return { block: 'Concedida pela subclasse/talento.', usesSwap: false };
  // ajustar ficha com magias a mais é sempre permitido
  if (sp.level === 0) {
    return st.cantrips.have > st.cantrips.max ? { block: null, usesSwap: false } : { block: 'Truques não se trocam (PHB 2014).', usesSwap: false };
  }
  if (st.caster.kind === 'prepared') return { block: null, usesSwap: false };
  if (st.caster.kind === 'spellbook') {
    return st.known && st.known.have > st.known.max
      ? { block: null, usesSwap: false }
      : { block: 'Magias ficam no grimório — desprepare em vez de apagar.', usesSwap: false };
  }
  if (st.known && st.known.have > st.known.max) return { block: null, usesSwap: false };
  if (st.swaps > 0) return { block: null, usesSwap: true };
  return { block: 'Você só troca uma magia conhecida ao subir de nível.', usesSwap: false };
}

/** Classes que ganham uma troca de magia conhecida a cada nível. */
export function gainsSpellSwap(char: Character): boolean {
  const c = casterOf(char);
  return !!c && c.kind === 'known' && levelIn(char, char.classId) >= 2;
}
