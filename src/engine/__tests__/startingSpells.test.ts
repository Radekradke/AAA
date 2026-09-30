import { describe, it, expect } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { cantripsKnown } from '../spellcasting';
import { getSpell } from '@/data/spells';

const start = (classId: string) => {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'Teste', classId }));
  const spells = c.preparedSpells.map((id) => getSpell(id)!);
  return { cantrips: spells.filter((s) => s.level === 0).length, first: spells.filter((s) => s.level === 1).length };
};

describe('magias iniciais respeitam a tabela da classe', () => {
  it.each(['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'])('%s: truques no limite e ao menos uma de 1º círculo', (cls) => {
    const r = start(cls);
    expect(r.cantrips).toBe(cantripsKnown(cls, 1));
    expect(r.first).toBeGreaterThan(0);
  });

  it('bardo nível 1: 2 truques + 4 magias conhecidas', () => {
    expect(start('bard')).toEqual({ cantrips: 2, first: 4 });
  });

  it('classe marcial não recebe magias', () => {
    expect(start('fighter')).toEqual({ cantrips: 0, first: 0 });
  });
});
