import { describe, expect, it } from 'vitest';
import { multiclassSlots } from '../progression';
import { casterOf } from '../spellcasting';
import { validateLevelUp } from '../levelUp';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import type { Character } from '@/types/character';

const hero = (classId: string, abilities: Partial<Character['baseAbilities']> = {}): Character => {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'Teste', classId }));
  return { ...c, raceId: 'dwarf', subraceId: 'hill-dwarf', baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...abilities }, campaign: { ...(c.campaign ?? {}), allowMulticlass: true } as Character['campaign'] };
};

describe('multiclasse (PHB 2014)', () => {
  it('soma o nível de conjurador: Mago 3 + Clérigo 2 = espaços de conjurador 5', () => {
    expect(multiclassSlots([{ classId: 'wizard', level: 3 }, { classId: 'cleric', level: 2 }], null)).toEqual({ 1: 4, 2: 3, 3: 2 });
  });

  it('paladino conta metade (para baixo) e o pacto do bruxo soma à parte', () => {
    expect(multiclassSlots([{ classId: 'paladin', level: 3 }, { classId: 'sorcerer', level: 1 }], null)).toEqual({ 1: 3 });
    expect(multiclassSlots([{ classId: 'sorcerer', level: 3 }, { classId: 'warlock', level: 2 }], null)).toEqual({ 1: 6, 2: 2 });
  });

  it('Guerreiro 5 / Mago 2 conjura pela lista de mago', () => {
    const c = { ...hero('fighter'), level: 7, classLevels: [{ classId: 'fighter', level: 5 }, { classId: 'wizard', level: 2 }] };
    const caster = casterOf(c)!;
    expect(caster.listClass).toBe('wizard');
    expect(caster.slots).toEqual({ 1: 3 });
  });

  it('exige 13 nos atributos-chave para multiclassear', () => {
    const weak = hero('fighter', { str: 15, int: 10 });
    expect(validateLevelUp(weak, { classId: 'wizard', hpValue: 4 }).join(' ')).toMatch(/INT 13/);
    const ok = hero('fighter', { str: 15, int: 13 });
    expect(validateLevelUp(ok, { classId: 'wizard', hpValue: 4 }).join(' ')).not.toMatch(/exige/);
  });
});
