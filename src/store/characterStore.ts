import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStateStorage } from '@/lib/storage/zustandIdb';
import type { Character } from '@/types/character';
import { createDraftCharacter, finalizeCharacter, emptyCombat } from '@/engine/characterBuilder';
import { deriveCharacter } from '@/engine/dndRules';
import { ensureCharacterV2 } from '@/engine/levelUp';
import type { CharacterState, Recipe } from './character/types';
import { newId } from './character/ids';
import { combatActions } from './character/combat';
import { inventoryActions } from './character/inventory';
import { proficienciesActions } from './character/proficiencies';
import { spellsActions } from './character/spells';
import { progressionActions } from './character/progression';

export type { CharacterState } from './character/types';

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
            copy.updatedAt = Date.now();
            // qualquer edição marca a ficha como pendente de sincronização
            if (copy.syncStatus === 'synced') copy.syncStatus = 'pending';
            return copy;
          }),
        }));

      const ctx = { set, get, mutate };
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

        startDraft(input) {
          const draft = createDraftCharacter(input);
          set((s) => ({ characters: [...s.characters, draft], currentId: draft.id }));
          return draft.id;
        },
        saveDraft(recipe) {
          const id = get().currentId;
          if (id) mutate(id, recipe);
        },
        updateCharacter(id, recipe) {
          mutate(id, recipe);
        },
        finalizeDraft(id) {
          set((state) => ({
            characters: state.characters.map((c) => (c.id === id ? finalizeCharacter(c) : c)),
            currentId: id,
          }));
          // garante PV cheio ao despertar
          const char = get().getCharacter(id);
          if (char) {
            const d = deriveCharacter(char);
            mutate(id, (c) => {
              c.hpCurrent = d.maxHp;
            });
          }
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
        importCharacter(json, ownerId) {
          try {
            const parsed = JSON.parse(json) as Partial<Character>;
            if (!parsed || typeof parsed !== 'object' || !parsed.name) {
              return { ok: false, error: 'Arquivo inválido: estrutura de personagem não reconhecida.' };
            }
            const base = createDraftCharacter({ ownerId });
            const merged: Character = {
              ...base,
              ...parsed,
              id: newId('pc'),
              ownerId,
              draft: false,
              combat: { ...emptyCombat(), ...(parsed.combat ?? {}) },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            } as Character;
            const migrated = ensureCharacterV2(merged);
            set((s) => ({ characters: [...s.characters, migrated], currentId: migrated.id }));
            return { ok: true };
          } catch {
            return { ok: false, error: 'Não foi possível ler o arquivo JSON.' };
          }
        },
        exportCharacter(id) {
          const char = get().getCharacter(id);
          if (!char) return null;
          return JSON.stringify(char, null, 2);
        },
        ...combatActions(ctx),
        ...inventoryActions(ctx),
        ...proficienciesActions(ctx),
        ...spellsActions(ctx),
        ...progressionActions(ctx),
      };
    },
    {
      name: 'fv-characters',
      version: 3,
      // persistência principal em IndexedDB (autosave com debounce);
      // migra o dado antigo do localStorage automaticamente
      storage: createJSONStorage(() => idbStateStorage),
      // migração segura: personagens antigos ganham os campos dos schemas v2/v3
      migrate: (persisted) => {
        const state = persisted as { characters?: Character[]; currentId?: string | null; pendingDeletes?: string[] };
        return {
          ...state,
          pendingDeletes: state.pendingDeletes ?? [],
          characters: (state.characters ?? []).map((c) => ensureCharacterV2(c)),
        };
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
