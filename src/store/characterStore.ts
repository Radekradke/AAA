import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Character, CoinKey, InventoryItem, JournalEntry } from '@/types/character';
import type { Item } from '@/types/dnd';
import { createDraftCharacter, finalizeCharacter, emptyCombat } from '@/engine/characterBuilder';
import type { NewCharacterInput } from '@/engine/characterBuilder';
import { deriveCharacter } from '@/engine/dndRules';
import { toggleEquip as computeEquip, itemToInventory, MAX_ATTUNEMENT } from '@/engine/inventory';
import { spellSlotsForClass, buildResources } from '@/engine/progression';
import { getClass } from '@/data/classes';

/** Aplica uma transformação imutável a um personagem por id. */
type Recipe = (char: Character) => void;

interface CharacterState {
  characters: Character[];
  currentId: string | null;

  // ---- seleção / ciclo de vida ----
  charactersFor: (ownerId: string) => Character[];
  getCharacter: (id: string | null) => Character | undefined;
  setCurrent: (id: string | null) => void;
  startDraft: (input: NewCharacterInput) => string;
  saveDraft: (recipe: Recipe) => void;
  updateCharacter: (id: string, recipe: Recipe) => void;
  finalizeDraft: (id: string) => void;
  deleteCharacter: (id: string) => void;
  duplicateCharacter: (id: string) => void;
  importCharacter: (json: string, ownerId: string) => { ok: boolean; error?: string };
  exportCharacter: (id: string) => string | null;

  // ---- gameplay (operam no personagem informado) ----
  applyDamage: (id: string, amount: number) => void;
  heal: (id: string, amount: number) => void;
  setTempHp: (id: string, amount: number) => void;
  addInventoryItem: (id: string, item: Item | InventoryItem) => void;
  updateInventoryItem: (id: string, uid: string, patch: Partial<InventoryItem>) => void;
  removeInventoryItem: (id: string, uid: string) => void;
  toggleEquip: (id: string, uid: string) => void;
  toggleFavorite: (id: string, uid: string) => void;
  toggleAttune: (id: string, uid: string) => void;
  adjustCoin: (id: string, coin: CoinKey, delta: number) => void;
  toggleTurn: (id: string, key: 'action' | 'bonus' | 'reaction') => void;
  resetTurn: (id: string) => void;
  adjustMove: (id: string, delta: number) => void;
  toggleCondition: (id: string, cond: string) => void;
  toggleSpellSlot: (id: string, level: number, index: number) => void;
  setResource: (id: string, resId: string, value: number) => void;
  spendHitDie: (id: string) => void;
  setDeathSave: (id: string, type: 'success' | 'fail', n: number) => void;
  shortRest: (id: string) => void;
  longRest: (id: string) => void;
  addJournalEntry: (id: string) => void;
  updateJournalEntry: (id: string, entryId: string, patch: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string, entryId: string) => void;
  setNotes: (id: string, notes: string) => void;
  setLevel: (id: string, level: number) => void;
  editCharacter: (id: string, patch: Partial<Character>) => void;
}

let _seq = 0;
function newId(prefix: string): string {
  _seq += 1;
  return `${prefix}${Date.now().toString(36)}${_seq}`;
}

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
            return copy;
          }),
        }));

      return {
        characters: [],
        currentId: null,

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
            set((s) => ({ characters: [...s.characters, merged], currentId: merged.id }));
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

        // ---------------- gameplay ----------------
        applyDamage(id, amount) {
          mutate(id, (c) => {
            let rem = amount;
            if (c.combat.hpTemp > 0) {
              const absorbed = Math.min(c.combat.hpTemp, rem);
              c.combat.hpTemp -= absorbed;
              rem -= absorbed;
            }
            c.hpCurrent = Math.max(0, c.hpCurrent - rem);
          });
        },
        heal(id, amount) {
          const char = get().getCharacter(id);
          if (!char) return;
          const max = deriveCharacter(char).maxHp;
          mutate(id, (c) => {
            c.hpCurrent = Math.min(max, c.hpCurrent + amount);
            if (c.hpCurrent > 0) c.combat.deathSaves = { success: 0, fail: 0 };
          });
        },
        setTempHp(id, amount) {
          mutate(id, (c) => {
            c.combat.hpTemp = Math.max(0, amount);
          });
        },
        addInventoryItem(id, item) {
          mutate(id, (c) => {
            const inst = 'uid' in item ? (item as InventoryItem) : itemToInventory(item as Item);
            c.inventory.push(inst);
          });
        },
        updateInventoryItem(id, uid, patch) {
          mutate(id, (c) => {
            const idx = c.inventory.findIndex((i) => i.uid === uid);
            if (idx === -1) return;
            // item editado deixa de referenciar o catálogo: os dados passam a viver na instância
            c.inventory[idx] = { ...c.inventory[idx], ...patch, uid, itemId: undefined };
          });
        },
        removeInventoryItem(id, uid) {
          mutate(id, (c) => {
            c.inventory = c.inventory.filter((i) => i.uid !== uid);
            for (const slot of Object.keys(c.equipped) as Array<keyof typeof c.equipped>) {
              if (c.equipped[slot] === uid) c.equipped[slot] = null;
            }
          });
        },
        toggleEquip(id, uid) {
          const char = get().getCharacter(id);
          if (!char) return;
          const it = char.inventory.find((i) => i.uid === uid);
          if (!it) return;
          const equipped = computeEquip(char, it);
          mutate(id, (c) => {
            c.equipped = equipped;
          });
        },
        toggleFavorite(id, uid) {
          mutate(id, (c) => {
            const it = c.inventory.find((i) => i.uid === uid);
            if (it) it.favorite = !it.favorite;
          });
        },
        toggleAttune(id, uid) {
          mutate(id, (c) => {
            const it = c.inventory.find((i) => i.uid === uid);
            if (!it) return;
            if (it.attuned) {
              it.attuned = false;
            } else if (c.inventory.filter((i) => i.attuned).length < MAX_ATTUNEMENT) {
              it.attuned = true;
            }
          });
        },
        adjustCoin(id, coin, delta) {
          mutate(id, (c) => {
            c.coins[coin] = Math.max(0, c.coins[coin] + delta);
          });
        },
        toggleTurn(id, key) {
          mutate(id, (c) => {
            c.combat.turn[key] = !c.combat.turn[key];
          });
        },
        resetTurn(id) {
          mutate(id, (c) => {
            c.combat.turn = { action: false, bonus: false, reaction: false };
            c.combat.moveUsed = 0;
          });
        },
        adjustMove(id, delta) {
          const char = get().getCharacter(id);
          if (!char) return;
          const speed = deriveCharacter(char).speed;
          mutate(id, (c) => {
            c.combat.moveUsed = Math.max(0, Math.min(speed, c.combat.moveUsed + delta));
          });
        },
        toggleCondition(id, cond) {
          mutate(id, (c) => {
            c.combat.conditions = c.combat.conditions.includes(cond)
              ? c.combat.conditions.filter((x) => x !== cond)
              : [...c.combat.conditions, cond];
          });
        },
        toggleSpellSlot(id, level, index) {
          mutate(id, (c) => {
            const slot = c.combat.spellSlots[level];
            if (!slot) return;
            // clicar no pip n alterna: se já gasto até n, devolve; senão gasta até n
            slot.used = slot.used >= index ? index - 1 : index;
          });
        },
        setResource(id, resId, value) {
          mutate(id, (c) => {
            c.combat.resources[resId] = Math.max(0, value);
          });
        },
        spendHitDie(id) {
          mutate(id, (c) => {
            c.combat.hitDiceRemaining = Math.max(0, c.combat.hitDiceRemaining - 1);
          });
        },
        setDeathSave(id, type, n) {
          mutate(id, (c) => {
            const ds = c.combat.deathSaves;
            const cur = ds[type];
            ds[type] = cur === n ? n - 1 : n;
          });
        },
        shortRest(id) {
          const char = get().getCharacter(id);
          if (!char) return;
          const cls = getClass(char.classId);
          mutate(id, (c) => {
            for (const r of cls.resources ?? []) {
              if (r.recharge === 'short') c.combat.resources[r.id] = r.max;
            }
          });
        },
        longRest(id) {
          const char = get().getCharacter(id);
          if (!char) return;
          const derived = deriveCharacter(char);
          const cls = getClass(char.classId);
          mutate(id, (c) => {
            c.hpCurrent = derived.maxHp;
            c.combat.hpTemp = 0;
            c.combat.deathSaves = { success: 0, fail: 0 };
            c.combat.conditions = [];
            c.combat.turn = { action: false, bonus: false, reaction: false };
            c.combat.moveUsed = 0;
            // recupera metade dos dados de vida
            c.combat.hitDiceRemaining = Math.min(
              derived.hitDiceMax,
              c.combat.hitDiceRemaining + Math.max(1, Math.floor(derived.hitDiceMax / 2)),
            );
            for (const r of cls.resources ?? []) c.combat.resources[r.id] = r.max;
            for (const lv of Object.keys(c.combat.spellSlots)) {
              c.combat.spellSlots[Number(lv)].used = 0;
            }
          });
        },
        addJournalEntry(id) {
          mutate(id, (c) => {
            const entry: JournalEntry = {
              id: newId('j'),
              title: 'Nova sessão',
              date: `Sessão ${c.journal.length + 1}`,
              summary: '',
              npcs: '',
              locations: '',
              quests: '',
              treasure: '',
              notes: '',
            };
            c.journal = [entry, ...c.journal];
          });
        },
        updateJournalEntry(id, entryId, patch) {
          mutate(id, (c) => {
            c.journal = c.journal.map((j) => (j.id === entryId ? { ...j, ...patch } : j));
          });
        },
        deleteJournalEntry(id, entryId) {
          mutate(id, (c) => {
            c.journal = c.journal.filter((j) => j.id !== entryId);
          });
        },
        setNotes(id, notes) {
          mutate(id, (c) => {
            c.notes = notes;
          });
        },
        setLevel(id, level) {
          const char = get().getCharacter(id);
          if (!char) return;
          const newLevel = Math.max(1, Math.min(20, level));
          if (newLevel === char.level) return;
          const leveledUp = newLevel > char.level;
          const before = deriveCharacter(char).maxHp;
          const after = deriveCharacter({ ...char, level: newLevel }).maxHp;
          mutate(id, (c) => {
            c.level = newLevel;
            // ao subir, soma o PV ganho; ao descer, apenas mantém dentro do novo máximo
            c.hpCurrent = leveledUp ? c.hpCurrent + Math.max(0, after - before) : Math.min(c.hpCurrent, after);
            c.hpCurrent = Math.max(1, Math.min(after, c.hpCurrent));
            c.combat.hitDiceRemaining = leveledUp
              ? Math.min(newLevel, c.combat.hitDiceRemaining + (newLevel - char.level))
              : Math.min(newLevel, c.combat.hitDiceRemaining);
            // espaços de magia
            const slotMax = spellSlotsForClass(c.classId, newLevel);
            const nextSlots: typeof c.combat.spellSlots = {};
            for (const [circle, max] of Object.entries(slotMax)) {
              const used = leveledUp ? 0 : c.combat.spellSlots[Number(circle)]?.used ?? 0;
              nextSlots[Number(circle)] = { used: Math.min(used, max), max };
            }
            c.combat.spellSlots = nextSlots;
            // recursos: ao subir restaura tudo; ao descer, mantém dentro do novo máximo
            const resMax = buildResources(c.classId, newLevel);
            const nextRes: Record<string, number> = {};
            for (const [rid, max] of Object.entries(resMax)) {
              nextRes[rid] = leveledUp ? max : Math.min(c.combat.resources[rid] ?? max, max);
            }
            c.combat.resources = nextRes;
          });
        },
        editCharacter(id, patch) {
          mutate(id, (c) => {
            Object.assign(c, patch);
          });
          // garante PV dentro do novo máximo após editar atributos/nível
          const updated = get().getCharacter(id);
          if (updated) {
            const max = deriveCharacter(updated).maxHp;
            if (updated.hpCurrent > max) mutate(id, (c) => { c.hpCurrent = max; });
          }
        },
      };
    },
    { name: 'fv-characters' },
  ),
);
