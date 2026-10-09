import { useEffect } from 'react';
import { useCharacterStore, useCharactersHydrated } from '@/store/characterStore';
import { saveClueImage } from '@/lib/clueImageStore';
import type { Character } from '@/types/character';

const hasInline = (c: Character) => !!c.diary?.clues.some((x) => x.image);

/**
 * Pistas no formato antigo (imagem como data URL DENTRO da ficha) passam a
 * guardar a imagem à parte (aparelho + nuvem privada): a ficha fica leve
 * para salvar, sincronizar e ir ao histórico. Roda ao abrir o app e quando
 * uma ficha chega da nuvem nesse formato. Montar uma vez, no App.
 */
export function useClueImageMigration(): void {
  const hydrated = useCharactersHydrated();
  useEffect(() => {
    if (!hydrated) return;
    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
        for (const c of useCharacterStore.getState().characters.filter(hasInline)) {
          const ids = new Map<string, string>();
          for (const x of c.diary!.clues) if (x.image) ids.set(x.id, await saveClueImage(x.image));
          useCharacterStore.getState().updateDiary(c.id, (d) => {
            d.clues = d.clues.map((x) => {
              const id = ids.get(x.id);
              if (!id || !x.image) return x;
              const { image: _inline, ...rest } = x;
              return { ...rest, imageId: id };
            });
          });
        }
      } finally {
        running = false;
      }
    };
    void run();
    return useCharacterStore.subscribe((s, prev) => {
      if (s.characters !== prev.characters && s.characters.some(hasInline)) void run();
    });
  }, [hydrated]);
}
