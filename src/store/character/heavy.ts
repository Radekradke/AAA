import { finalizeWithTrail } from '@/engine/levelTrail';
import { createDraftCharacter, emptyCombat } from '@/engine/characterBuilder';
import { deriveCharacter } from '@/engine/dndRules';
import { ensureCharacterV2 } from '@/engine/levelUp';
import { characterImportError } from '@/engine/characterImport';
import type { Character } from '@/types/character';
import type { CharacterState, StoreCtx } from './types';
import type { HeavyAction } from './heavyKeys';
import { deedActions } from './deeds';
import { newId } from './ids';
import { combatActions } from './combat';
import { inventoryActions } from './inventory';
import { proficienciesActions } from './proficiencies';
import { spellsActions } from './spells';
import { progressionActions } from './progression';
// o homebrew do jogador entra nas listas de raças, magias e talentos junto com as regras
import '../homebrewStore';

/**
 * Ações que dependem das regras e dos dados do jogo (criar, importar,
 * combate, inventário, magias, progressão). Ficam fora do pacote de entrada:
 * a tela inicial só lê a lista de fichas. As rotas que usam estas ações
 * carregam este módulo antes de abrir (loadCharacterActions em characterStore).
 */
export function heavyCharacterActions(ctx: StoreCtx): Pick<CharacterState, HeavyAction> {
  const { set, get, mutate } = ctx;
  return {
    startDraft(input) {
      const draft = createDraftCharacter(input);
      set((s) => ({ characters: [...s.characters, draft], currentId: draft.id }));
      return draft.id;
    },
    finalizeDraft(id) {
      set((state) => ({
        characters: state.characters.map((c) => (c.id === id ? finalizeWithTrail(c) : c)),
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
    importCharacter(json, ownerId) {
      try {
        const base = createDraftCharacter({ ownerId });
        const input: unknown = JSON.parse(json);
        const error = characterImportError(input, base);
        if (error) return { ok: false, error };
        const parsed = input as Partial<Character>;
        const merged: Character = {
          ...base,
          ...parsed,
          id: newId('pc'),
          ownerId,
          draft: false,
          combat: { ...emptyCombat(), ...(parsed.combat ?? {}) },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncStatus: 'pending',
          syncBase: undefined,
          lastSyncedAt: undefined,
        } as Character;
        const migrated = ensureCharacterV2(merged);
        const calculated = deriveCharacter(migrated); // valida também a composição antes de persistir
        if (![calculated.maxHp, calculated.ac, ...Object.values(calculated.abilities).map((a) => a.total)].every(Number.isFinite)) {
          return { ok: false, error: 'A ficha contém atributos ou modificadores inválidos.' };
        }
        set((s) => ({ characters: [...s.characters, migrated], currentId: migrated.id }));
        return { ok: true, id: migrated.id };
      } catch {
        return { ok: false, error: 'Não consegui ler: confira se é o JSON da ficha (o texto entre { e }).' };
      }
    },
    restoreBackupCharacters(chars, ownerId, replaceIds) {
      const replace = new Set(replaceIds);
      let added = 0;
      let replaced = 0;
      set((s) => {
        const next = [...s.characters];
        const indexById = new Map(next.map((c, i) => [c.id, i]));
        for (const raw of chars) {
          const sameOwner = raw.ownerId === ownerId;
          const incoming: Character = {
            ...ensureCharacterV2(structuredClone(raw)),
            ownerId,
            syncStatus: 'pending',
            // mesma conta: a versão da nuvem que o backup conhecia continua valendo;
            // outro dono: para ele, a ficha é nova
            syncBase: sameOwner ? raw.syncBase : undefined,
            lastSyncedAt: sameOwner ? raw.lastSyncedAt : undefined,
          };
          const at = indexById.get(incoming.id);
          if (at === undefined) {
            indexById.set(incoming.id, next.length);
            next.push(incoming);
            added++;
          } else if (replace.has(incoming.id)) {
            const existing = next[at];
            // substituir conta como edição deste aparelho: guarda o que ele sabe da nuvem
            next[at] = {
              ...incoming,
              syncBase: existing.syncBase,
              lastSyncedAt: existing.lastSyncedAt,
              updatedAt: Math.max(Date.now(), existing.updatedAt + 1, (existing.syncBase ?? 0) + 1),
            };
            replaced++;
          }
        }
        const restored = new Set(chars.map((c) => c.id));
        return { characters: next, pendingDeletes: s.pendingDeletes.filter((id) => !restored.has(id)) };
      });
      return { added, replaced };
    },
    ...combatActions(ctx),
    ...deedActions(ctx),
    ...inventoryActions(ctx),
    ...proficienciesActions(ctx),
    ...spellsActions(ctx),
    ...progressionActions(ctx),
  };
}
