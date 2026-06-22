import type { Character } from '@/types/character';

/** Props comuns a todos os passos da criação. */
export interface StepProps {
  char: Character;
  update: (recipe: (c: Character) => void) => void;
}

/** Cabeçalho de capítulo reutilizado em cada passo. */
export interface ChapterHeader {
  chapter: string;
  title: string;
  subtitle: string;
}
