import { describe, it, expect } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { useCharacterStore } from '@/store/characterStore';
import { RACES } from '@/data/races';
import { synthesizeHistory } from '../levelUp';

describe('importação antes da persistência', () => {
  it.each([{ name: 123 }, { name: 'Inválida', inventory: null }, { name: 'Inválida', level: 999 }, { name: 'Inválida', combat: { turn: null } }, { name: 'Inválida', preparedSpells: [42] }])('recusa estrutura malformada %j sem persistir', (payload) => {
    const count = useCharacterStore.getState().characters.length;
    expect(useCharacterStore.getState().importCharacter(JSON.stringify(payload), 'teste').ok).toBe(false);
    expect(useCharacterStore.getState().characters).toHaveLength(count);
  });
  it('aceita exportação completa e formato antigo mínimo', () => {
    const c = finalizeCharacter(createDraftCharacter({ ownerId: 'antigo', name: 'Controle' }));
    expect(useCharacterStore.getState().importCharacter(JSON.stringify(c), 'novo').ok).toBe(true);
    expect(useCharacterStore.getState().importCharacter(JSON.stringify({ name: 'Legado', level: 2, classId: 'fighter' }), 'novo').ok).toBe(true);
  });
  it('preserva uma raça personalizada incluída na exportação', () => {
    const c = finalizeCharacter(createDraftCharacter({ ownerId: 'antigo', name: 'Homebrew' }));
    c.raceId = 'personalizada';
    c.customRace = { ...RACES[0], id: c.raceId, abilityBonus: { str: 1 }, updatedAt: 1 };
    const result = useCharacterStore.getState().importCharacter(JSON.stringify(c), 'novo');
    expect(result.ok).toBe(true);
    expect(useCharacterStore.getState().getCharacter(result.id!)?.customRace?.id).toBe(c.raceId);
  });
  it('migra o campo global de subclasse sobrescrito pela classe secundária em schema antigo', () => {
    const c = finalizeCharacter(createDraftCharacter({ ownerId: 'antigo', name: 'Multiclasse' }));
    c.schema = 3;
    c.level = 4;
    c.classLevels = [{ classId: 'fighter', level: 3 }, { classId: 'cleric', level: 1 }];
    c.subclassId = 'life';
    c.levelHistory = [...synthesizeHistory({ classId: 'fighter', level: 3, subclassId: 'champion' }), { ...synthesizeHistory({ classId: 'cleric', level: 1, subclassId: 'life' })[0], level: 4 }];
    const result = useCharacterStore.getState().importCharacter(JSON.stringify(c), 'novo');
    expect(result.ok).toBe(true);
    const imported = useCharacterStore.getState().getCharacter(result.id!)!;
    expect(imported.subclassId).toBe('champion');
    expect(imported.classLevels.find((cl) => cl.classId === 'cleric')?.subclassId).toBe('life');
  });
});
