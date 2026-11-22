import { useEffect } from 'react';
import { useCharacterStore, useCharactersHydrated } from '@/store/characterStore';
import { protectIfNeeded } from '@/lib/storagePersist';

/**
 * Pede armazenamento persistente assim que existe um herói a proteger — na
 * abertura (se já houver heróis) e quando o primeiro é criado, importado ou
 * restaurado. Espera a hidratação: antes dela a lista ainda está vazia.
 */
export function useStorageProtection(): void {
  const hydrated = useCharactersHydrated();
  const heroCount = useCharacterStore((s) => s.characters.reduce((n, c) => n + (c.draft ? 0 : 1), 0));
  const hasHeroes = heroCount > 0;
  useEffect(() => {
    if (hydrated && hasHeroes) void protectIfNeeded(1);
  }, [hydrated, hasHeroes]);
}
