import type { Character } from '@/types/character';
import { RACE_BY_ID } from '@/data/races';
import { FEAT_BY_ID } from '@/data/feats';
import { stacksInspiration } from './inspiration';

/**
 * Regras desta ficha, separadas pelo que são. A ficha é D&D 5e 2014; o
 * que foge do livro precisa aparecer como tal, e não como comportamento
 * padrão:
 *
 * - `oficial`: o Livro do Jogador 2014 sem opções.
 * - `opcional`: regra opcional do próprio livro (Talentos, Multiclasse).
 * - `livro`: conteúdo de outro livro oficial (Xanathar, Tasha).
 * - `mesa`: adaptação da mesa, fora do 2014 (Inspiração acumulável).
 * - `homebrew`: criado pela mesa ou pelo jogador (raça, itens da Forja).
 * - `ajuste`: valor digitado à mão no lugar do que o livro calcula.
 */
export type RuleKind = 'oficial' | 'opcional' | 'livro' | 'mesa' | 'homebrew' | 'ajuste';

export const RULE_KIND_LABEL: Record<RuleKind, string> = {
  oficial: 'Oficial 2014',
  opcional: 'Opcional do PHB',
  livro: 'Outro livro',
  mesa: 'Regra da mesa',
  homebrew: 'Homebrew',
  ajuste: 'Ajuste manual',
};

export interface RuleNote {
  kind: RuleKind;
  text: string;
}

/**
 * O que esta ficha tem fora do 2014 puro. As regras opcionais do PHB
 * (Talentos, Multiclasse) entram só quando são de fato usadas.
 */
export function sheetRuleNotes(c: Character): RuleNote[] {
  const notes: RuleNote[] = [];
  const homebrewRace = !!c.customRace && c.customRace.id === c.raceId ? c.customRace : !RACE_BY_ID[c.raceId] ? { label: c.raceId } : null;
  if (homebrewRace) notes.push({ kind: 'homebrew', text: `Raça criada: ${homebrewRace.label}` });
  if (c.customOrigin) notes.push({ kind: 'livro', text: 'Origem personalizada (Caldeirão de Tasha)' });

  const otherBookFeats = c.feats.filter((id) => FEAT_BY_ID[id]?.source && FEAT_BY_ID[id].source !== 'PHB 2014');
  if (c.feats.length) notes.push({ kind: 'opcional', text: `Talentos: ${c.feats.length}${otherBookFeats.length ? ` (${otherBookFeats.length} de outro livro)` : ''}` });
  if ((c.classLevels?.length ?? 0) > 1) notes.push({ kind: 'opcional', text: 'Multiclasse' });

  if (stacksInspiration(c)) notes.push({ kind: 'mesa', text: 'Inspiração acumulável (até 10)' });

  const forged = c.inventory.filter((i) => i.homebrew).length;
  if (forged) notes.push({ kind: 'homebrew', text: `${forged} ${forged === 1 ? 'item criado' : 'itens criados'} na Forja` });
  const freeAllies = (c.allies ?? []).filter((a) => !a.beastId).length;
  if (freeAllies) notes.push({ kind: 'homebrew', text: `${freeAllies} ${freeAllies === 1 ? 'aliado livre' : 'aliados livres'} (sem ficha do livro)` });

  const manualHp = (c.levelHistory ?? []).filter((r) => r.hpMethod === 'manual' && !r.synthetic).length;
  if (manualHp) notes.push({ kind: 'ajuste', text: `PV digitado à mão em ${manualHp} ${manualHp === 1 ? 'nível' : 'níveis'}` });
  if (c.abilityMethod === 'manual') notes.push({ kind: 'ajuste', text: 'Atributos digitados à mão (sem método do livro)' });
  return notes;
}

/** Resumo para o cabeçalho: "D&D 5e 2014" ou "2014 · 2 fora do padrão". */
export function rulesSummary(c: Character): { label: string; notes: RuleNote[]; pure: boolean } {
  const notes = sheetRuleNotes(c);
  // regra opcional do próprio PHB não é "fora do 2014"
  const off = notes.filter((n) => n.kind !== 'opcional');
  if (!off.length) return { label: 'D&D 5e 2014', notes, pure: true };
  return { label: `2014 · ${off.length} fora do padrão`, notes, pure: false };
}
