import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStateStorage } from '@/lib/storage/zustandIdb';
import type { Character } from '@/types/character';
import type { CharacterState, Recipe, StoreCtx } from './character/types';
import { HEAVY_ACTIONS } from './character/heavyKeys';
import type { HeavyAction } from './character/heavyKeys';
import { newId } from './character/ids';

export type { CharacterState } from './character/types';

/**
 * As ações que usam as regras do jogo (./character/heavy) não entram no
 * pacote de entrada. Até carregarem, cada uma é um aviso: chamar antes é
 * erro de quem chamou (a rota tem de usar loadCharacterActions).
 */
const notLoaded = Object.fromEntries(
  HEAVY_ACTIONS.map((name) => [
    name,
    () => {
      throw new Error(`Ação "${name}" chamada antes de carregar as regras: use loadCharacterActions() antes.`);
    },
  ]),
) as unknown as Pick<CharacterState, HeavyAction>;

let storeCtx: StoreCtx | null = null;
let loading: Promise<void> | null = null;

/** Resolve quando as fichas já vieram do IndexedDB. */
function whenHydrated(): Promise<void> {
  if (useCharacterStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((done) => {
    const stop = useCharacterStore.persist.onFinishHydration(() => {
      stop();
      done();
    });
  });
}

/**
 * Carrega as ações com regras e as instala no store (uma vez só).
 * Espera a hidratação: instalar é um setState, e o persist grava a cada
 * setState. Antes de hidratar, gravaria a lista vazia por cima dos heróis.
 */
export function loadCharacterActions(): Promise<void> {
  loading ??= Promise.all([import('./character/heavy'), whenHydrated()]).then(([{ heavyCharacterActions }]) => {
    useCharacterStore.setState(heavyCharacterActions(storeCtx!));
  });
  return loading;
}

const CHARACTERS_VERSION = 4;
const jsonStorage = createJSONStorage<CharacterState>(() => idbStateStorage)!;

/**
 * Lê as fichas e, se vierem de um schema antigo, migra antes de entregar.
 * As regras (ensureCharacterV2) só baixam quando há o que migrar: quem já
 * está no schema atual abre o app sem elas.
 */
const migratingStorage: typeof jsonStorage = {
  ...jsonStorage,
  async getItem(name) {
    const stored = await jsonStorage.getItem(name);
    if (!stored || typeof stored.version !== 'number' || stored.version >= CHARACTERS_VERSION) return stored;
    const { ensureCharacterV2 } = await import('@/engine/levelUp');
    const state = stored.state as { characters?: Character[]; pendingDeletes?: string[] };
    return {
      version: CHARACTERS_VERSION,
      state: {
        ...stored.state,
        pendingDeletes: state.pendingDeletes ?? [],
        characters: (state.characters ?? []).map((c) => ensureCharacterV2(c)),
      },
    };
  },
};

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => {
      /** Helper imutável usando structuredClone para ergonomia segura. */
      const mutate = (id: string, recipe: Recipe) =>
        set((state) => ({
          characters: state.characters.map((c) => {
            if (c.id !== id) return c;
            const copy: Character = structuredClone(c);
            recipe(copy);
            copy.updatedAt = Math.max(Date.now(), c.updatedAt + 1, (copy.syncBase ?? 0) + 1);
            // qualquer edição marca a ficha como pendente de sincronização
            if (copy.syncStatus === 'synced') copy.syncStatus = 'pending';
            return copy;
          }),
        }));

      storeCtx = { set, get, mutate };
      return {
        characters: [],
        currentId: null,
        pendingDeletes: [],

        charactersFor(ownerId) {
          return get()
            .characters.filter((c) => c.ownerId === ownerId && !c.draft)
            .sort((a, b) => b.updatedAt - a.updatedAt);
        },
        getCharacter(id) {
          if (!id) return undefined;
          return get().characters.find((c) => c.id === id);
        },
        setCurrent(id) {
          set({ currentId: id });
        },

        saveDraft(recipe) {
          const id = get().currentId;
          if (id) mutate(id, recipe);
        },
        updateCharacter(id, recipe) {
          mutate(id, recipe);
        },
        deleteCharacter(id) {
          set((s) => ({
            characters: s.characters.filter((c) => c.id !== id),
            currentId: s.currentId === id ? null : s.currentId,
            // fila para a exclusão remota quando houver nuvem/conexão
            pendingDeletes: s.pendingDeletes.includes(id) ? s.pendingDeletes : [...s.pendingDeletes, id],
          }));
        },
        restoreCharacter(char) {
          set((s) => ({
            characters: s.characters.some((c) => c.id === char.id) ? s.characters : [...s.characters, char],
            pendingDeletes: s.pendingDeletes.filter((x) => x !== char.id),
          }));
        },
        duplicateCharacter(id) {
          const original = get().getCharacter(id);
          if (!original) return;
          const copy: Character = structuredClone(original);
          copy.id = newId('pc');
          copy.name = `${original.name} (cópia)`;
          copy.createdAt = Date.now();
          copy.updatedAt = Date.now();
          set((s) => ({ characters: [...s.characters, copy] }));
        },
        exportCharacter(id) {
          const char = get().getCharacter(id);
          if (!char) return null;
          return JSON.stringify(char, null, 2);
        },
        adoptCharacters(ids, ownerId) {
          const wanted = new Set(ids);
          if (!wanted.size) return;
          set((s) => ({
            characters: s.characters.map((c) =>
              wanted.has(c.id) && c.ownerId !== ownerId
                ? // novo dono: para a nuvem dele, é uma ficha que ainda não subiu
                  { ...c, ownerId, syncStatus: 'pending' as const, lastSyncedAt: undefined, syncBase: undefined }
                : c,
            ),
          }));
        },
        ...notLoaded,
      };
    },
    {
      name: 'fv-characters',
      version: CHARACTERS_VERSION,
      // persistência principal em IndexedDB (autosave com debounce);
      // migra o dado antigo do localStorage automaticamente
      storage: migratingStorage,
      // migração segura: fichas antigas ganham subclasses por classe no schema v4.
      // Quem migra é a leitura (migratingStorage): ela pode esperar as regras
      // baixarem, e o migrate do persist não espera promessas (zustand 4.5).
      migrate: (persisted) => {
        const state = persisted as { characters?: Character[]; currentId?: string | null; pendingDeletes?: string[] };
        return { ...state, pendingDeletes: state.pendingDeletes ?? [] } as CharacterState;
      },
    },
  ),
);

/**
 * As fichas vivem no IndexedDB (leitura assíncrona). Até a hidratação
 * terminar, o store está VAZIO — qualquer escrita nesse intervalo (criar
 * rascunho, sincronizar) gravaria a lista vazia por cima dos heróis.
 * Rotas e sync esperam por este sinal.
 */
export function useCharactersHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useCharacterStore.persist.hasHydrated());
  useEffect(() => {
    if (useCharacterStore.persist.hasHydrated()) setHydrated(true);
    return useCharacterStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
