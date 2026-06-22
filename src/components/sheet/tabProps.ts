import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';

/** Props comuns às abas da ficha. */
export interface TabProps {
  char: Character;
  derived: DerivedCharacter;
}
