import { diaryOf, entrySession } from '@/engine/diary';
import { toolLabel } from '@/data/tools';
import { inspirationCount, setInspirationCount } from '@/engine/inspiration';
import type { JournalEntry } from '@/types/character';
import { deriveCharacter } from '@/engine/dndRules';
import { spellSlotsFor, syncSpellSlots } from '@/engine/spellcasting';
import { gainsSpellSwap } from '@/engine/spellRules';
import { syncResources } from '@/engine/classResources';
import { applyChoicePicks } from '@/engine/classChoices';
import { grantChoiceEffects, withSubclassTools } from '@/engine/choiceEffects';
import { getFeat } from '@/data/feats';
import { ensureCharacterV2, validateLevelUp, classLevelOf, featuresGained } from '@/engine/levelUp';
import { ABILITY_KEYS } from '@/types/dnd';
import { getClass } from '@/data/classes';
import type { CharacterState, StoreCtx } from './types';
import { newId } from './ids';

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
        // ferramentas da subclasse (Assassino) entram ao chegar no nível dela
        c.toolProfs = withSubclassTools(c).toolProfs ?? c.toolProfs;
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
        // voltou à regra 2014: quem tinha vários pontos fica com 1 (tem inspiração)
        if (patch.stackingInspiration === false) setInspirationCount(c, inspirationCount(c));
      });
    },
    editCharacter(id, patch) {
      mutate(id, (c) => {
        Object.assign(c, patch);
        // subclasse conjuradora (Cavaleiro/Trapaceiro Arcano) muda os espaços e recursos
        if ('subclassId' in patch) {
          c.toolProfs = withSubclassTools(c).toolProfs ?? c.toolProfs;
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
}
