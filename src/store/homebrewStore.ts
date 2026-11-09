import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { registerRace, unregisterRace } from '@/data/races';
import { registerSpell, unregisterSpell } from '@/data/spells';
import { registerFeat, unregisterFeat } from '@/data/feats';
import { embedsInSync, homebrewEmbeds } from '@/engine/homebrewContent';
import { useCharacterStore } from './characterStore';
import type { Feat, Race, Spell } from '@/types/dnd';

/**
 * Biblioteca de HOMEBREW do jogador: raças, magias e talentos. Fica no
 * aparelho e também viaja dentro de cada ficha que usa o conteúdo
 * (customRace / customSpells / customFeats) — assim a ficha funciona
 * offline, em outro aparelho, no link compartilhado e na tela do mestre.
 */
interface HomebrewStore {
  races: Race[];
  spells: Spell[];
  feats: Feat[];
  /** Cria ou atualiza; as fichas que usam a raça recebem a versão nova. */
  saveRace: (race: Race) => void;
  removeRace: (id: string) => void;
  saveSpell: (spell: Spell) => void;
  removeSpell: (id: string) => void;
  saveFeat: (feat: Feat) => void;
  removeFeat: (id: string) => void;
}

const byName = <T,>(key: (x: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b));
const upsert = <T extends { id: string }>(list: T[], item: T, key: (x: T) => string) =>
  [...list.filter((x) => x.id !== item.id), item].sort(byName(key));

export const useHomebrewStore = create<HomebrewStore>()(
  persist(
    (set, get) => ({
      races: [],
      spells: [],
      feats: [],
      saveRace(race) {
        registerRace(race);
        set({ races: upsert(get().races, race, (r) => r.label) });
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
      saveSpell(spell) {
        registerSpell(spell);
        set({ spells: upsert(get().spells, spell, (s) => s.name) });
        syncEmbeds();
      },
      removeSpell(id) {
        set({ spells: get().spells.filter((s) => s.id !== id) });
        if (!useCharacterStore.getState().characters.some((c) => c.customSpells?.some((s) => s.id === id))) unregisterSpell(id);
      },
      saveFeat(feat) {
        registerFeat(feat);
        set({ feats: upsert(get().feats, feat, (f) => f.label) });
        syncEmbeds();
      },
      removeFeat(id) {
        set({ feats: get().feats.filter((f) => f.id !== id) });
        if (!useCharacterStore.getState().characters.some((c) => c.feats.includes(id))) unregisterFeat(id);
      },
    }),
    {
      name: 'fv-homebrew',
      version: 2,
      migrate: (state) => ({ spells: [], feats: [], ...(state as object) }) as unknown as HomebrewStore,
      onRehydrateStorage: () => (state) => {
        state?.races.forEach(registerRace);
        state?.spells?.forEach(registerSpell);
        state?.feats?.forEach(registerFeat);
      },
    },
  ),
);

/** Conteúdo das minhas fichas entra na biblioteca (ficha importada / outro aparelho). */
function adoptFromCharacters() {
  const { characters } = useCharacterStore.getState();
  const lib = useHomebrewStore.getState();
  const merge = <T extends { id: string; updatedAt?: number }>(current: T[], incoming: T[], register: (x: T) => void, key: (x: T) => string) => {
    const known = new Map(current.map((x) => [x.id, x]));
    let changed = false;
    for (const x of incoming) {
      register(x);
      const cur = known.get(x.id);
      if (!cur || (x.updatedAt ?? 0) > (cur.updatedAt ?? 0)) {
        known.set(x.id, x);
        changed = true;
      }
    }
    return changed ? [...known.values()].sort(byName(key)) : null;
  };
  const races = merge(lib.races, characters.flatMap((c) => (c.customRace && c.customRace.id === c.raceId ? [c.customRace] : [])), registerRace, (r) => r.label);
  const spells = merge(lib.spells, characters.flatMap((c) => c.customSpells ?? []), registerSpell, (s) => s.name);
  const feats = merge(lib.feats, characters.flatMap((c) => c.customFeats ?? []), registerFeat, (f) => f.label);
  if (races || spells || feats) {
    useHomebrewStore.setState({ ...(races && { races }), ...(spells && { spells }), ...(feats && { feats }) });
  }
}

/** Cada ficha leva consigo as magias e talentos homebrew que usa, na versão mais nova. */
function syncEmbeds() {
  const store = useCharacterStore.getState();
  for (const c of store.characters) {
    const next = homebrewEmbeds(c);
    if (embedsInSync(c, next)) continue;
    store.updateCharacter(c.id, (d) => {
      if (next.customSpells.length) d.customSpells = next.customSpells;
      else delete d.customSpells;
      if (next.customFeats.length) d.customFeats = next.customFeats;
      else delete d.customFeats;
    });
  }
}

adoptFromCharacters();
syncEmbeds();
useCharacterStore.subscribe((s, prev) => {
  if (s.characters === prev.characters) return;
  adoptFromCharacters();
  syncEmbeds();
});
