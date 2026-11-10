import { diaryOf, entrySession } from '@/engine/diary';
import { inspirationCount, setInspirationCount } from '@/engine/inspiration';
import type { JournalEntry } from '@/types/character';
import { deriveCharacter } from '@/engine/dndRules';
import { saveSlotPools, syncSlotPools } from '@/engine/spellcasting';
import { saveHitDicePools } from '@/engine/hitDice';
import { syncResources } from '@/engine/classResources';
import { applyChoicePicks } from '@/engine/classChoices';
import { grantChoiceEffects, withSubclassTools } from '@/engine/choiceEffects';
import { ensureCharacterV2, validateLevelUp, classLevelOf, featuresGained } from '@/engine/levelUp';
import { getClass } from '@/data/classes';
import type { CharacterState, StoreCtx } from './types';
import { newId } from './ids';
import { applyLevelUp } from '@/engine/levelUpApply';

/** Evolução e registro: nível, subir de nível guiado, escolhas de classe, XP, Inspiração, diário, notas, campanha e edição. */
export function progressionActions({ get, mutate }: StoreCtx): Pick<CharacterState, 'addXp' | 'addJournalEntry' | 'updateDiary' | 'updateJournalEntry' | 'deleteJournalEntry' | 'setNotes' | 'setLevel' | 'levelUp' | 'setClassChoices' | 'toggleInspiration' | 'gainInspiration' | 'spendInspiration' | 'setInspiration' | 'updateCampaign' | 'editCharacter'> {
  return {
    addXp(id, amount) {
      mutate(id, (c) => {
        c.xp = Math.max(0, (c.xp ?? 0) + Math.round(amount));
      });
    },
    addJournalEntry(id) {
      let created = '';
      mutate(id, (c) => {
        const next = Math.max(0, ...c.journal.map((e, i) => entrySession(e, c.journal.length - i))) + 1;
        const entry: JournalEntry = {
          id: newId('j'),
          title: '',
          date: new Date().toLocaleDateString('pt-BR'),
          summary: '',
          npcs: '',
          locations: '',
          quests: '',
          treasure: '',
          notes: '',
          session: next,
          body: '',
          at: Date.now(),
        };
        created = entry.id;
        c.journal = [entry, ...c.journal];
      });
      return created;
    },
    updateDiary(id, recipe) {
      mutate(id, (c) => {
        const d = structuredClone(diaryOf(c));
        recipe(d);
        c.diary = d;
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
      const oldLevel = char.level;
      const oldClassLevel = classLevelOf(char, char.classId);
      mutate(id, (c) => {
        Object.assign(c, ensureCharacterV2(c));
        saveHitDicePools(c);
        saveSlotPools(c);
        c.level = newLevel;
        // mantém a linha do tempo coerente (registros sintéticos pela média)
        if (leveledUp) {
          for (let lv = oldLevel + 1; lv <= newLevel; lv++) {
            const cls = getClass(c.classId);
            c.levelHistory.push({
              level: lv,
              classId: c.classId,
              classLevel: oldClassLevel + lv - oldLevel,
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
        if (entry) entry.level = Math.max(1, entry.level + newLevel - oldLevel);
        if (!leveledUp) {
          const counts: Record<string, number> = {};
          for (const record of c.levelHistory) counts[record.classId] = (counts[record.classId] ?? 0) + 1;
          if (Object.values(counts).reduce((n, value) => n + value, 0) === newLevel) {
            c.classLevels = c.classLevels.flatMap((cl) => counts[cl.classId] ? [{ ...cl, level: counts[cl.classId] }] : []);
          }
        }
        const after = deriveCharacter(c).maxHp;
        // ao subir, soma o PV ganho; ao descer, apenas mantém dentro do novo máximo
        c.hpCurrent = leveledUp ? c.hpCurrent + Math.max(0, after - before) : Math.min(c.hpCurrent, after);
        c.hpCurrent = Math.max(1, Math.min(after, c.hpCurrent));
        saveHitDicePools(c);
        saveSlotPools(c, syncSlotPools(c, leveledUp));
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

      mutate(id, (c) => applyLevelUp(c, plan));

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
        // voltou à regra 2014: quem tinha vários pontos fica com 1 (tem inspiração)
        if (patch.stackingInspiration === false) setInspirationCount(c, inspirationCount(c));
      });
    },
    editCharacter(id, patch) {
      mutate(id, (c) => {
        Object.assign(c, patch);
        // subclasse conjuradora (Cavaleiro/Trapaceiro Arcano) muda os espaços e recursos
        if ('subclassId' in patch) {
          const primary = c.classLevels.find((cl) => cl.classId === c.classId);
          if (primary) primary.subclassId = c.subclassId;
          c.toolProfs = withSubclassTools(c).toolProfs ?? c.toolProfs;
          saveSlotPools(c);
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
}
