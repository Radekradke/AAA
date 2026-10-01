import { toolLabel } from '@/data/tools';
import { warlockSlots } from '@/engine/progression';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { inspirationCount, setInspirationCount } from '@/engine/inspiration';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStateStorage } from '@/lib/storage/zustandIdb';
import type { ActiveSpellEffect, Character, CoinKey, InventoryItem, JournalEntry, ToolProf } from '@/types/character';
import type { Item, SkillKey } from '@/types/dnd';
import { createDraftCharacter, finalizeCharacter, emptyCombat } from '@/engine/characterBuilder';
import type { NewCharacterInput } from '@/engine/characterBuilder';
import { deriveCharacter } from '@/engine/dndRules';
import { toggleEquip as computeEquip, itemToInventory, MAX_ATTUNEMENT, moveItemTo } from '@/engine/inventory';
import type { ContainerId, MoveResult } from '@/engine/inventory';
import { spellSlotsFor, syncSpellSlots } from '@/engine/spellcasting';
import { gainsSpellSwap } from '@/engine/spellRules';
import { characterResources, syncResources } from '@/engine/classResources';
import { applyChoicePicks } from '@/engine/classChoices';
import { grantChoiceEffects } from '@/engine/choiceEffects';
import { getFeat } from '@/data/feats';
import { ensureCharacterV2, validateLevelUp, classLevelOf, featuresGained } from '@/engine/levelUp';
import type { LevelUpPlan } from '@/engine/levelUp';
import { ABILITY_KEYS } from '@/types/dnd';
import { getClass } from '@/data/classes';

/** Aplica uma transformação imutável a um personagem por id. */
type Recipe = (char: Character) => void;

interface CharacterState {
  characters: Character[];
  currentId: string | null;
  /** Fichas excluídas localmente aguardando exclusão na nuvem. */
  pendingDeletes: string[];

  // ---- seleção / ciclo de vida ----
  charactersFor: (ownerId: string) => Character[];
  getCharacter: (id: string | null) => Character | undefined;
  setCurrent: (id: string | null) => void;
  startDraft: (input: NewCharacterInput) => string;
  saveDraft: (recipe: Recipe) => void;
  updateCharacter: (id: string, recipe: Recipe) => void;
  finalizeDraft: (id: string) => void;
  deleteCharacter: (id: string) => void;
  /** Devolve uma ficha recém-excluída (botão Desfazer do aviso). */
  restoreCharacter: (char: Character) => void;
  duplicateCharacter: (id: string) => void;
  importCharacter: (json: string, ownerId: string) => { ok: boolean; error?: string };
  exportCharacter: (id: string) => string | null;

  // ---- gameplay (operam no personagem informado) ----
  /** Dano (PHB 2014): PV temporários primeiro; a 0 PV, falha no teste contra a morte; dano maciço mata. */
  applyDamage: (id: string, amount: number, opts?: { crit?: boolean }) => void;
  heal: (id: string, amount: number) => void;
  setTempHp: (id: string, amount: number) => void;
  addInventoryItem: (id: string, item: Item | InventoryItem) => void;
  updateInventoryItem: (id: string, uid: string, patch: Partial<InventoryItem>) => void;
  removeInventoryItem: (id: string, uid: string) => void;
  toggleEquip: (id: string, uid: string) => void;
  /** Move entre Equipado / Mochila / Baú (arrastar ou botões). */
  moveItem: (id: string, uid: string, target: ContainerId) => MoveResult;
  toggleFavorite: (id: string, uid: string) => void;
  toggleAttune: (id: string, uid: string) => void;
  adjustCoin: (id: string, coin: CoinKey, delta: number) => void;
  setCoin: (id: string, coin: CoinKey, value: number) => void;
  toggleSkillExpertise: (id: string, key: SkillKey) => void;
  addToolProf: (id: string, tool: ToolProf) => void;
  removeToolProf: (id: string, toolId: string) => void;
  toggleToolExpertise: (id: string, toolId: string) => void;
  setToolAbility: (id: string, toolId: string, ability: import('@/types/dnd').AbilityKey) => void;
  addLanguage: (id: string, lang: string) => void;
  removeLanguage: (id: string, lang: string) => void;
  toggleTurn: (id: string, key: 'action' | 'bonus' | 'reaction') => void;
  resetTurn: (id: string) => void;
  adjustMove: (id: string, delta: number) => void;
  toggleCondition: (id: string, cond: string) => void;
  setExhaustion: (id: string, level: number) => void;
  toggleConcentration: (id: string) => void;
  /** Gasta um uso de uma magia concedida por item (recarga por descanso). */
  useItemSpell: (id: string, key: string) => void;
  toggleSpellSlot: (id: string, level: number, index: number) => void;
  /** Conjurar: gasta um espaço do círculo (e liga a concentração, se a magia pedir). */
  castWithSlot: (id: string, level: number, concentration?: boolean) => void;
  /** Liga/desliga Bruxaria, Marca do Caçador ou Fúria (dano extra em todo acerto). */
  setMark: (id: string, mark: 'hex' | 'huntersMark' | 'rage', on: boolean) => void;
  /** Ataque Furtivo gasto neste turno. */
  useSneakAttack: (id: string) => void;
  /** Efeito de magia passa a valer em você (troca o da mesma magia). */
  applySpellEffect: (id: string, effect: ActiveSpellEffect) => void;
  removeSpellEffect: (id: string, spellId: string) => void;
  /** Acaba com os efeitos que dependem de concentração (nova concentração / romper). */
  endConcentrationEffects: (id: string) => void;
  /** PV temporários não acumulam: fica o maior. */
  gainTempHp: (id: string, amount: number) => void;
  /** Marca ação/bônus/reação como gasta (sem desmarcar). */
  useTurn: (id: string, key: 'action' | 'bonus' | 'reaction') => void;
  /** Registra a magia conjurada neste turno. */
  noteCast: (id: string, spellId: string) => void;
  /** Soma XP (recompensa do mestre ou manual). */
  addXp: (id: string, amount: number) => void;
  /** Marca uma ordem da mesa ao vivo como aplicada nesta ficha. */
  markEventApplied: (id: string, eventId: string) => void;
  /** Esquece uma magia; `useSwap` gasta a troca ganha ao subir de nível. */
  forgetSpell: (id: string, spellId: string, useSwap?: boolean) => void;
  /** Mago: copia uma magia para o grimório pagando ouro. */
  copySpell: (id: string, spellId: string, cost: number) => void;
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
  /** Evolução guiada (aba Evoluir): valida e aplica um plano de nível. */
  levelUp: (id: string, plan: LevelUpPlan) => { ok: boolean; errors: string[] };
  /** Preenche escolhas de classe pendentes (ex.: ficha antiga sem Estilo de Luta). */
  setClassChoices: (id: string, picks: Record<string, string[]>) => void;
  toggleInspiration: (id: string) => void;
  /** Pontos de Inspiração: ganhar (+1), gastar (−1) ou ajustar direto. */
  gainInspiration: (id: string) => void;
  spendInspiration: (id: string) => void;
  setInspiration: (id: string, points: number) => void;
  updateCampaign: (id: string, patch: Partial<Character['campaign']>) => void;
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
            // qualquer edição marca a ficha como pendente de sincronização
            if (copy.syncStatus === 'synced') copy.syncStatus = 'pending';
            return copy;
          }),
        }));

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

        // ---------------- gameplay ----------------
        applyDamage(id, amount, opts) {
          const char = get().getCharacter(id);
          if (!char || amount <= 0) return;
          const maxHp = deriveCharacter(char).maxHp;
          mutate(id, (c) => {
            let rem = amount;
            if (c.combat.hpTemp > 0) {
              const absorbed = Math.min(c.combat.hpTemp, rem);
              c.combat.hpTemp -= absorbed;
              rem -= absorbed;
            }
            if (rem <= 0) return;
            const ds = c.combat.deathSaves ?? { success: 0, fail: 0 };
            if (c.hpCurrent === 0) {
              // dano já a 0 PV: 1 falha (2 se crítico); dano ≥ PV máx. mata na hora
              ds.fail = rem >= maxHp ? 3 : Math.min(3, ds.fail + (opts?.crit ? 2 : 1));
            } else {
              const overflow = rem - c.hpCurrent;
              c.hpCurrent = Math.max(0, c.hpCurrent - rem);
              if (c.hpCurrent === 0) {
                // dano maciço: o que sobra depois de zerar ≥ PV máximo = morte instantânea
                if (overflow >= maxHp) ds.fail = 3;
                const conds = c.combat.conditions ?? [];
                if (!conds.includes('Inconsciente')) c.combat.conditions = [...conds, 'Inconsciente'];
              }
            }
            c.combat.deathSaves = ds;
            // cair a 0 PV rompe a concentração automaticamente (PHB)
            if (c.hpCurrent === 0) c.combat.concentration = false;
          });
        },
        heal(id, amount) {
          const char = get().getCharacter(id);
          if (!char) return;
          const max = deriveCharacter(char).maxHp;
          mutate(id, (c) => {
            // morto (3 falhas) não volta com cura comum
            if ((c.combat.deathSaves?.fail ?? 0) >= 3) return;
            const wasDown = c.hpCurrent === 0;
            c.hpCurrent = Math.min(max, c.hpCurrent + amount);
            if (c.hpCurrent > 0) {
              c.combat.deathSaves = { success: 0, fail: 0 };
              // recuperar PV acorda quem estava inconsciente por estar a 0 PV
              if (wasDown) c.combat.conditions = (c.combat.conditions ?? []).filter((x) => x !== 'Inconsciente');
            }
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
        moveItem(id, uid, target) {
          const char = get().getCharacter(id);
          if (!char) return { ok: false, reason: 'Ficha não encontrada.' };
          // valida num rascunho: movimento recusado não marca a ficha como editada
          const probe = moveItemTo(structuredClone(char), uid, target);
          if (!probe.ok) return probe;
          mutate(id, (c) => void moveItemTo(c, uid, target));
          return probe;
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
        setCoin(id, coin, value) {
          mutate(id, (c) => {
            c.coins[coin] = Math.max(0, Math.floor(value) || 0);
          });
        },
        toggleSkillExpertise(id, key) {
          mutate(id, (c) => {
            Object.assign(c, ensureCharacterV2(c));
            c.skillExpertise = c.skillExpertise.includes(key)
              ? c.skillExpertise.filter((k) => k !== key)
              : [...c.skillExpertise, key];
          });
        },
        addToolProf(id, tool) {
          mutate(id, (c) => {
            Object.assign(c, ensureCharacterV2(c));
            if (!c.toolProfs.some((t) => t.id === tool.id)) c.toolProfs.push(tool);
          });
        },
        removeToolProf(id, toolId) {
          mutate(id, (c) => {
            Object.assign(c, ensureCharacterV2(c));
            c.toolProfs = c.toolProfs.filter((t) => t.id !== toolId);
          });
        },
        toggleToolExpertise(id, toolId) {
          mutate(id, (c) => {
            Object.assign(c, ensureCharacterV2(c));
            const tool = c.toolProfs.find((t) => t.id === toolId);
            if (tool) tool.expertise = !tool.expertise;
          });
        },
        setToolAbility(id, toolId, ability) {
          mutate(id, (c) => {
            Object.assign(c, ensureCharacterV2(c));
            const tool = c.toolProfs.find((t) => t.id === toolId);
            if (tool) tool.ability = ability;
          });
        },
        addLanguage(id, lang) {
          const clean = lang.trim();
          if (!clean) return;
          mutate(id, (c) => {
            Object.assign(c, ensureCharacterV2(c));
            if (!c.extraLanguages.includes(clean)) c.extraLanguages.push(clean);
          });
        },
        removeLanguage(id, lang) {
          mutate(id, (c) => {
            Object.assign(c, ensureCharacterV2(c));
            c.extraLanguages = c.extraLanguages.filter((l) => l !== lang);
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
            c.combat.castThisTurn = [];
            // Escudo Arcano acaba no início do seu turno; Heroísmo renova os PV temporários
            const effects = (c.combat.spellEffects ?? []).filter((e) => e.until !== 'turn');
            c.combat.spellEffects = effects;
            const perTurn = Math.max(0, ...effects.map((e) => e.tempPerTurn ?? 0));
            if (perTurn > c.combat.hpTemp) c.combat.hpTemp = perTurn;
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
        setExhaustion(id, level) {
          mutate(id, (c) => {
            // clicar no nível atual recua um; senão define (0–6, PHB)
            const cur = c.combat.exhaustion ?? 0;
            c.combat.exhaustion = cur === level ? level - 1 : Math.max(0, Math.min(6, level));
          });
        },
        toggleConcentration(id) {
          mutate(id, (c) => {
            c.combat.concentration = !c.combat.concentration;
            // romper a concentração encerra Bruxaria, Marca do Caçador e os efeitos de concentração
            if (!c.combat.concentration) {
              c.combat.marks = (c.combat.marks ?? []).filter((m) => m === 'rage');
              c.combat.spellEffects = (c.combat.spellEffects ?? []).filter((e) => e.until !== 'concentration');
            }
          });
        },
        setMark(id, mark, on) {
          mutate(id, (c) => {
            const cur = (c.combat.marks ?? []).filter((m) => m !== mark);
            c.combat.marks = on ? [...cur, mark] : cur;
          });
        },
        applySpellEffect(id, effect) {
          mutate(id, (c) => {
            const list = c.combat.spellEffects ?? [];
            const had = list.find((e) => e.spellId === effect.spellId);
            // Auxílio: o PV atual sobe junto com o máximo (só na primeira vez)
            if (effect.maxHp && !had) c.hpCurrent += effect.maxHp;
            c.combat.spellEffects = [...list.filter((e) => e.spellId !== effect.spellId), effect];
          });
        },
        removeSpellEffect(id, spellId) {
          mutate(id, (c) => {
            const gone = (c.combat.spellEffects ?? []).find((e) => e.spellId === spellId);
            c.combat.spellEffects = (c.combat.spellEffects ?? []).filter((e) => e.spellId !== spellId);
            if (gone?.maxHp) c.hpCurrent = Math.min(c.hpCurrent, deriveCharacter(c).maxHp);
          });
        },
        endConcentrationEffects(id) {
          mutate(id, (c) => {
            c.combat.spellEffects = (c.combat.spellEffects ?? []).filter((e) => e.until !== 'concentration');
          });
        },
        gainTempHp(id, amount) {
          mutate(id, (c) => {
            c.combat.hpTemp = Math.max(c.combat.hpTemp, Math.max(0, amount));
          });
        },
        useTurn(id, key) {
          mutate(id, (c) => {
            c.combat.turn = { ...c.combat.turn, [key]: true };
          });
        },
        markEventApplied(id, eventId) {
          mutate(id, (c) => {
            c.appliedEvents = [...(c.appliedEvents ?? []).filter((x) => x !== eventId).slice(-150), eventId];
          });
        },
        addXp(id, amount) {
          mutate(id, (c) => {
            c.xp = Math.max(0, (c.xp ?? 0) + Math.round(amount));
          });
        },
        noteCast(id, spellId) {
          mutate(id, (c) => {
            c.combat.castThisTurn = [...(c.combat.castThisTurn ?? []).filter((x) => x !== spellId), spellId];
          });
        },
        useSneakAttack(id) {
          mutate(id, (c) => {
            c.combat.turn = { ...c.combat.turn, sneak: true };
          });
        },
        useItemSpell(id, key) {
          mutate(id, (c) => {
            const uses = { ...(c.combat.itemSpellUses ?? {}) };
            uses[key] = (uses[key] ?? 0) + 1;
            c.combat.itemSpellUses = uses;
          });
        },
        castWithSlot(id, level, concentration) {
          mutate(id, (c) => {
            if (!c.combat.spellSlots[level]) c.combat.spellSlots = syncSpellSlots(c);
            const slot = c.combat.spellSlots[level];
            if (!slot || slot.used >= slot.max) return;
            slot.used += 1;
            if (concentration) c.combat.concentration = true;
          });
        },
        forgetSpell(id, spellId, useSwap) {
          mutate(id, (c) => {
            c.preparedSpells = c.preparedSpells.filter((x) => x !== spellId);
            c.knownSpells = (c.knownSpells ?? []).filter((x) => x !== spellId);
            c.spellbookCopied = (c.spellbookCopied ?? []).filter((x) => x !== spellId);
            if (useSwap) c.spellSwaps = Math.max(0, (c.spellSwaps ?? 0) - 1);
          });
        },
        copySpell(id, spellId, cost) {
          mutate(id, (c) => {
            if (c.coins.gp < cost || (c.knownSpells ?? []).includes(spellId)) return;
            c.coins.gp -= cost;
            c.knownSpells = [...(c.knownSpells ?? []), spellId];
            c.spellbookCopied = [...(c.spellbookCopied ?? []), spellId];
          });
        },
        toggleSpellSlot(id, level, index) {
          mutate(id, (c) => {
            if (!c.combat.spellSlots[level]) c.combat.spellSlots = syncSpellSlots(c);
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
          mutate(id, (c) => {
            for (const r of characterResources(c)) {
              if (r.recharge === 'short' && !r.unlimited) c.combat.resources[r.id] = r.max;
            }
            // magias de item com recarga em descanso curto voltam
            const uses = { ...(c.combat.itemSpellUses ?? {}) };
            for (const it of c.inventory) {
              for (const g of it.grantsSpells ?? []) {
                if (g.recharge === 'short') delete uses[`${it.uid}:${g.spellId}`];
              }
            }
            // magias de talento com recarga curta (Teleporte Feérico)
            for (const featId of c.feats ?? []) {
              for (const g of getFeat(featId)?.grantsSpells ?? []) {
                if (g.recharge === 'short') delete uses[`feat:${featId}:${g.spellId}`];
              }
            }
            c.combat.itemSpellUses = uses;
            // Magia de Pacto (Bruxo): os espaços do pacto voltam no descanso curto
            const wl = (c.classLevels ?? []).find((l) => l.classId === 'warlock')?.level ?? (c.classId === 'warlock' ? c.level : 0);
            if (wl) {
              for (const [circle, n] of Object.entries(warlockSlots(wl))) {
                const slot = c.combat.spellSlots?.[Number(circle)];
                if (slot) slot.used = Math.max(0, slot.used - n);
              }
            }
            // a Fúria dura 1 minuto: não sobrevive a um descanso
            c.combat.marks = (c.combat.marks ?? []).filter((m) => m !== 'rage');
          });
        },
        longRest(id) {
          const char = get().getCharacter(id);
          if (!char) return;
          const derived = deriveCharacter(char);
          mutate(id, (c) => {
            c.hpCurrent = derived.maxHp;
            c.combat.hpTemp = 0;
            c.combat.deathSaves = { success: 0, fail: 0 };
            c.combat.conditions = [];
            c.combat.turn = { action: false, bonus: false, reaction: false };
            c.combat.moveUsed = 0;
            c.combat.concentration = false;
            c.combat.marks = [];
            c.combat.spellEffects = [];
            c.combat.castThisTurn = [];
            // descanso longo remove 1 nível de exaustão (PHB 2014)
            c.combat.exhaustion = Math.max(0, (c.combat.exhaustion ?? 0) - 1);
            // todas as magias de item recarregam no descanso longo
            c.combat.itemSpellUses = {};
            // recupera metade dos dados de vida
            c.combat.hitDiceRemaining = Math.min(
              derived.hitDiceMax,
              c.combat.hitDiceRemaining + Math.max(1, Math.floor(derived.hitDiceMax / 2)),
            );
            c.combat.resources = syncResources(c, c.combat.resources, true);
            c.combat.spellSlots = syncSpellSlots(c, true);
            // companheiro de patrulheiro volta com PV cheio
            if (c.companion) c.companion = { ...c.companion, hpCurrent: undefined };
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
            Object.assign(c, ensureCharacterV2(c));
            c.level = newLevel;
            // mantém a linha do tempo coerente (registros sintéticos pela média)
            if (leveledUp) {
              for (let lv = char.level + 1; lv <= newLevel; lv++) {
                const cls = getClass(c.classId);
                c.levelHistory.push({
                  level: lv,
                  classId: c.classId,
                  classLevel: lv,
                  hpMethod: 'media',
                  hpValue: Math.floor(cls.hitDie / 2) + 1,
                  features: featuresGained(c.classId, lv, c.subclassId),
                  synthetic: true,
                  at: Date.now(),
                });
              }
            } else {
              c.levelHistory = c.levelHistory.filter((r) => r.level <= newLevel);
            }
            const entry = c.classLevels.find((x) => x.classId === c.classId);
            if (entry) entry.level = newLevel;
            // ao subir, soma o PV ganho; ao descer, apenas mantém dentro do novo máximo
            c.hpCurrent = leveledUp ? c.hpCurrent + Math.max(0, after - before) : Math.min(c.hpCurrent, after);
            c.hpCurrent = Math.max(1, Math.min(after, c.hpCurrent));
            c.combat.hitDiceRemaining = leveledUp
              ? Math.min(newLevel, c.combat.hitDiceRemaining + (newLevel - char.level))
              : Math.min(newLevel, c.combat.hitDiceRemaining);
            // espaços de magia
            const slotMax = spellSlotsFor(c);
            const nextSlots: typeof c.combat.spellSlots = {};
            for (const [circle, max] of Object.entries(slotMax)) {
              const used = leveledUp ? 0 : c.combat.spellSlots[Number(circle)]?.used ?? 0;
              nextSlots[Number(circle)] = { used: Math.min(used, max), max };
            }
            c.combat.spellSlots = nextSlots;
            // recursos: ao subir restaura tudo; ao descer, mantém dentro do novo máximo
            c.combat.resources = syncResources(c, c.combat.resources, leveledUp);
          });
        },
        levelUp(id, plan) {
          const before = get().getCharacter(id);
          if (!before) return { ok: false, errors: ['Personagem não encontrado.'] };
          const char = ensureCharacterV2(before);
          const errors = validateLevelUp(char, plan);
          if (errors.length) return { ok: false, errors };

          const beforeMax = deriveCharacter(char).maxHp;
          const newClassLevel = classLevelOf(char, plan.classId) + 1;
          const newLevel = char.level + 1;

          mutate(id, (c) => {
            Object.assign(c, ensureCharacterV2(c));
            c.level = newLevel;
            const entry = c.classLevels.find((x) => x.classId === plan.classId);
            if (entry) entry.level += 1;
            else c.classLevels.push({ classId: plan.classId, level: 1 });

            if (plan.subclassId) c.subclassId = plan.subclassId;
            // magias conhecidas: ao subir de nível pode trocar uma (PHB 2014)
            if (plan.classId === c.classId && gainsSpellSwap(c)) c.spellSwaps = (c.spellSwaps ?? 0) + 1;
            if (plan.asi?.kind === 'asi') {
              for (const k of ABILITY_KEYS) {
                const inc = plan.asi.increases[k] ?? 0;
                if (inc) c.asiBonuses[k] = (c.asiBonuses[k] ?? 0) + inc;
              }
            }
            if (plan.asi?.kind === 'feat') {
              c.feats.push(plan.asi.featId);
              // talentos que dão proficiência com ferramenta (Chef, Envenenador)
              const featDef = getFeat(plan.asi.featId);
              for (const tid of featDef?.tools ?? []) {
                if (!c.toolProfs.some((t) => t.id === tid)) c.toolProfs.push({ id: tid, label: toolLabel(tid), source: featDef!.label });
              }
              if (plan.asi.ability) {
                c.asiBonuses[plan.asi.ability] = (c.asiBonuses[plan.asi.ability] ?? 0) + 1;
              }
            }

            // escolhas de classe (Metamagia, Estilo de Luta, Manobras…) e seus efeitos na ficha
            if (plan.choices || plan.replace) {
              applyChoicePicks(c, plan.choices ?? {}, plan.replace ?? {});
              grantChoiceEffects(c, plan.choices ?? {});
            }

            c.levelHistory.push({
              level: newLevel,
              classId: plan.classId,
              classLevel: newClassLevel,
              hpMethod: plan.hpMethod,
              hpValue: plan.hpValue,
              features: featuresGained(plan.classId, newClassLevel, plan.subclassId ?? c.subclassId),
              asi: plan.asi,
              subclassId: plan.subclassId,
              choices: plan.choices && Object.keys(plan.choices).length ? plan.choices : undefined,
              at: Date.now(),
            });

            // dados de vida, espaços de magia e recursos acompanham o novo nível
            c.combat.hitDiceRemaining = Math.min(newLevel, c.combat.hitDiceRemaining + 1);
            const slotMax = spellSlotsFor(c);
            const nextSlots: typeof c.combat.spellSlots = {};
            for (const [circle, max] of Object.entries(slotMax)) {
              const used = c.combat.spellSlots[Number(circle)]?.used ?? 0;
              nextSlots[Number(circle)] = { used: Math.min(used, max), max };
            }
            c.combat.spellSlots = nextSlots;
            c.combat.resources = syncResources(c, c.combat.resources, true);
          });

          // PV atual sobe junto com o novo máximo
          const after = get().getCharacter(id);
          if (after) {
            const afterMax = deriveCharacter(after).maxHp;
            const gain = Math.max(0, afterMax - beforeMax);
            if (gain) mutate(id, (c) => { c.hpCurrent = Math.min(afterMax, c.hpCurrent + gain); });
          }
          return { ok: true, errors: [] };
        },
        setClassChoices(id, picks) {
          mutate(id, (c) => {
            Object.assign(c, ensureCharacterV2(c));
            applyChoicePicks(c, picks);
            grantChoiceEffects(c, picks);
            c.combat.resources = syncResources(c, c.combat.resources, false);
          });
        },
        toggleInspiration(id) {
          mutate(id, (c) => setInspirationCount(c, inspirationCount(c) > 0 ? 0 : 1));
        },
        gainInspiration(id) {
          mutate(id, (c) => setInspirationCount(c, inspirationCount(c) + 1));
        },
        spendInspiration(id) {
          mutate(id, (c) => setInspirationCount(c, inspirationCount(c) - 1));
        },
        setInspiration(id, points) {
          mutate(id, (c) => setInspirationCount(c, points));
        },
        updateCampaign(id, patch) {
          mutate(id, (c) => {
            Object.assign(c, ensureCharacterV2(c));
            c.campaign = { ...c.campaign, ...patch };
          });
        },
        editCharacter(id, patch) {
          mutate(id, (c) => {
            Object.assign(c, patch);
            // subclasse conjuradora (Cavaleiro/Trapaceiro Arcano) muda os espaços e recursos
            if ('subclassId' in patch) {
              c.combat.spellSlots = syncSpellSlots(c);
              c.combat.resources = syncResources(c, c.combat.resources, false);
            }
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
