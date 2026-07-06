/**
 * Guia de conjuração (PHB 2014): quantos truques e magias cada classe
 * conhece/prepara por nível. Serve para orientar o jogador ao aprender
 * magias (não bloqueia — é recomendação, o mestre manda).
 */

/** Como a classe adquire magias. */
export type CasterKind = 'known' | 'prepared' | 'spellbook' | 'none';

export function casterKind(classId: string): CasterKind {
  switch (classId) {
    case 'bard':
    case 'sorcerer':
    case 'warlock':
    case 'ranger':
      return 'known'; // escolhe magias fixas ao subir de nível
    case 'cleric':
    case 'druid':
    case 'paladin':
      return 'prepared'; // conhece a lista toda; prepara por dia
    case 'wizard':
      return 'spellbook'; // grimório (aprende +2/nível e copia de pergaminhos)
    default:
      return 'none';
  }
}

/** Truques conhecidos por nível de classe. */
export function cantripsKnown(classId: string, level: number): number {
  const lv = Math.max(1, level);
  const tier = (a: number, b: number, c: number) => (lv >= 10 ? c : lv >= 4 ? b : a);
  switch (classId) {
    case 'bard':
    case 'warlock':
    case 'druid':
      return tier(2, 3, 4);
    case 'cleric':
    case 'wizard':
      return tier(3, 4, 5);
    case 'sorcerer':
      return tier(4, 5, 6);
    default:
      return 0; // patrulheiro e paladino não têm truques
  }
}

// Magias conhecidas por nível (índice = nível de classe) para conjuradores de escolha fixa.
const BARD_KNOWN = [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22];
const SORC_KNOWN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15];
const WARLOCK_KNOWN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];
const RANGER_KNOWN = [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11];

/**
 * Quantas magias (fora truques) a classe conhece/prepara no nível.
 * `count` = alvo recomendado; `label` = "conhecidas", "preparadas" ou "no grimório".
 */
export function spellsKnownOrPrepared(
  classId: string,
  level: number,
  castMod: number,
): { count: number; label: string } {
  const lv = Math.max(1, Math.min(20, level));
  const kind = casterKind(classId);
  switch (classId) {
    case 'bard':
      return { count: BARD_KNOWN[lv - 1], label: 'conhecidas' };
    case 'sorcerer':
      return { count: SORC_KNOWN[lv - 1], label: 'conhecidas' };
    case 'warlock':
      return { count: WARLOCK_KNOWN[lv - 1], label: 'conhecidas' };
    case 'ranger':
      return { count: RANGER_KNOWN[lv - 1], label: 'conhecidas' };
    case 'wizard':
      // grimório: 6 no nível 1 + 2 por nível subsequente
      return { count: 6 + (lv - 1) * 2, label: 'no grimório' };
    case 'cleric':
    case 'druid':
      return { count: Math.max(1, castMod + lv), label: 'preparadas' };
    case 'paladin':
      return { count: Math.max(1, castMod + Math.floor(lv / 2)), label: 'preparadas' };
    default:
      return { count: 0, label: kind === 'none' ? '—' : 'preparadas' };
  }
}
