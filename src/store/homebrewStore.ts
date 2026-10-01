import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { registerRace, unregisterRace } from '@/data/races';
import { useCharacterStore } from './characterStore';
import type { Race } from '@/types/dnd';

/**
 * Biblioteca de HOMEBREW do jogador (por enquanto: raças). Fica no aparelho
 * e também viaja dentro de cada ficha que usa a raça (customRace) — assim a
 * ficha funciona offline, em outro aparelho e na tela do mestre.
 */
interface HomebrewStore {
  races: Race[];
  /** Cria ou atualiza; as fichas que usam a raça recebem a versão nova. */
  saveRace: (race: Race) => void;
  removeRace: (id: string) => void;
}

export const useHomebrewStore = create<HomebrewStore>()(
  persist(
    (set, get) => ({
      races: [],
      saveRace(race) {
        registerRace(race);
        set({ races: [...get().races.filter((r) => r.id !== race.id), race].sort((a, b) => a.label.localeCompare(b.label)) });
        const chars = useCharacterStore.getState();
        for (const c of chars.characters) {
          if (c.raceId === race.id) chars.updateCharacter(c.id, (d) => void (d.customRace = race));
        }
      },
      removeRace(id) {
        set({ races: get().races.filter((r) => r.id !== id) });
        // fichas que já usam continuam com a cópia embutida
        if (!useCharacterStore.getState().characters.some((c) => c.raceId === id)) unregisterRace(id);
      },
    }),
    {
      name: 'fv-homebrew',
      version: 1,
      onRehydrateStorage: () => (state) => state?.races.forEach(registerRace),
    },
  ),
);

/** Raças das minhas fichas entram na biblioteca (ficha importada / outro aparelho). */
function adoptFromCharacters() {
  const { characters } = useCharacterStore.getState();
  const lib = useHomebrewStore.getState();
  const known = new Map(lib.races.map((r) => [r.id, r]));
  let changed = false;
  for (const c of characters) {
    const r = c.customRace;
    if (!r || r.id !== c.raceId) continue;
    registerRace(r);
    const cur = known.get(r.id);
    if (!cur || (r.updatedAt ?? 0) > (cur.updatedAt ?? 0)) {
      known.set(r.id, r);
      changed = true;
    }
  }
  if (changed) useHomebrewStore.setState({ races: [...known.values()].sort((a, b) => a.label.localeCompare(b.label)) });
}

adoptFromCharacters();
useCharacterStore.subscribe((s, prev) => {
  if (s.characters !== prev.characters) adoptFromCharacters();
});
