import type { Character } from '@/types/character';

/**
 * Fichas compartilhadas da mesa ao vivo (snapshot de cada herói), para
 * telas globais — ex.: o crítico cinematográfico de outro jogador mostra a
 * arte dele. Preenchido pela página da mesa quando carrega as fichas.
 */
const heroes = new Map<string, Character>();

export function setTableHeroes(list: { share: { sheetId: string }; snapshot: Character | null }[]): void {
  heroes.clear();
  for (const h of list) if (h.snapshot) heroes.set(h.share.sheetId, h.snapshot);
}

export function tableHero(sheetId: string | null | undefined): Character | undefined {
  return sheetId ? heroes.get(sheetId) : undefined;
}
