import { ensureCharacterV2 } from '@/engine/levelUp';
import type { CharacterState, StoreCtx } from './types';

/** Perícias (especialização), ferramentas e idiomas. */
export function proficienciesActions({ mutate }: StoreCtx): Pick<CharacterState, 'toggleSkillExpertise' | 'addToolProf' | 'removeToolProf' | 'toggleToolExpertise' | 'setToolAbility' | 'addLanguage' | 'removeLanguage'> {
  return {
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
  };
}
