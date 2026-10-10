import type { Character } from '@/types/character';

/**
 * Quantos ataques a ação Atacar faz (PHB 2014). Ataques Extras de classes
 * diferentes não se somam: vale o maior.
 * - Guerreiro: 2 no 5º, 3 no 11º, 4 no 20º.
 * - Bárbaro, Monge, Paladino, Patrulheiro: 2 no 5º.
 * - Bardo do Colégio da Bravura: 2 no 6º.
 * - Bruxo com Lâmina Sedenta (Pacto da Lâmina): 2 com a arma de pacto.
 */
export function attacksPerAction(char: Character): { count: number; source: string } {
  const levels = char.classLevels?.length ? char.classLevels : [{ classId: char.classId, level: char.level }];
  let best = { count: 1, source: '' };
  const offer = (count: number, source: string) => {
    if (count > best.count) best = { count, source };
  };
  for (const { classId, level } of levels) {
    if (classId === 'fighter') offer(level >= 20 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1, 'Ataque Extra (Guerreiro)');
    if (['barbarian', 'monk', 'paladin', 'ranger'].includes(classId) && level >= 5) offer(2, 'Ataque Extra');
    if (classId === 'bard' && level >= 6 && char.subclassId === 'valor') offer(2, 'Ataque Extra (Colégio da Bravura)');
    if (classId === 'warlock' && level >= 5 && (char.choices?.['warlock.invocation'] ?? []).includes('thirstingBlade')) offer(2, 'Lâmina Sedenta (só com a arma de pacto)');
  }
  return best;
}
