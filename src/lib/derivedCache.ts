import { deriveCharacter } from '@/engine/dndRules';
import type { DerivedCharacter } from '@/engine/dndRules';
import type { Character } from '@/types/character';

/**
 * deriveCharacter com cache por objeto de ficha. Toda edição gera um objeto
 * novo (mutate faz structuredClone), então o cache nunca devolve um valor
 * velho — e o WeakMap solta a entrada quando a ficha antiga sai da memória.
 * Para listas e cartões (heróis, guilda, sala, mestre) que recalculavam
 * todas as fichas a cada renderização.
 */
const cache = new WeakMap<Character, DerivedCharacter>();

export function derivedOf(char: Character): DerivedCharacter {
  let d = cache.get(char);
  if (!d) {
    d = deriveCharacter(char);
    cache.set(char, d);
  }
  return d;
}
