import type { Character } from '@/types/character';

/** O herói para "Continuar": o aberto por último (ou o mais recente) entre os do jogador. */
export function lastHeroOf(characters: Character[], userId: string, currentId: string | null): Character | null {
  const mine = characters.filter((c) => c.ownerId === userId && !c.draft);
  return mine.find((c) => c.id === currentId) ?? [...mine].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}
