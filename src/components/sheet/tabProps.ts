import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';

/** Props comuns às abas da ficha. */
export interface TabProps {
  char: Character;
  derived: DerivedCharacter;
  /** Troca de aba (atalhos "ver em detalhe" entre as telas). */
  goTab?: (id: string) => void;
}
