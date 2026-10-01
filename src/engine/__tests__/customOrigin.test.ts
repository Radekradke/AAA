import { describe, expect, it } from 'vitest';
import { deriveCharacter } from '../dndRules';
import { createDraftCharacter } from '../characterBuilder';
import { racialIncreases } from '../modifiers';
import { languagePicks, skillBudget } from '../originChoices';
import type { Character } from '@/types/character';

const flat = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
const make = (patch: Partial<Character>): Character => {
  const c = { ...createDraftCharacter({ ownerId: 'u', name: 'T', classId: 'wizard' }), skillProfs: [], extraLanguages: [], baseAbilities: flat, ...patch };
  return { ...c, classLevels: [{ classId: c.classId, level: 1 }] };
};

describe('origem personalizada (Tasha)', () => {
  it('Meio-Orc Mago: +2 vai para INT e +1 para CON', () => {
    const c = make({ raceId: 'half-orc', customOrigin: { asi: { int: 2, con: 1 } } });
    expect(racialIncreases('half-orc', null)).toEqual([{ ability: 'str', amount: 2 }, { ability: 'con', amount: 1 }]);
    const d = deriveCharacter(c);
    expect([d.abilities.str.total, d.abilities.int.total, d.abilities.con.total]).toEqual([10, 12, 11]);
  });

  it('troca a perícia da raça (Meio-Orc: Intimidação → Arcanismo)', () => {
    const c = make({ raceId: 'half-orc', backgroundId: 'acolyte', customOrigin: { skillSwap: { intimidation: 'arcana' } } });
    expect(skillBudget(c).granted.has('arcana')).toBe(true);
    expect(skillBudget(c).granted.has('intimidation')).toBe(false);
    expect(deriveCharacter(c).skills.find((s) => s.key === 'arcana')!.proficient).toBe(true);
  });

  it('troca o idioma da raça (Anão → Élfico)', () => {
    const c = make({ raceId: 'dwarf', customOrigin: { langSwap: { 'Anão': 'Élfico' } } });
    expect(languagePicks(c).fixed).toEqual(['Comum', 'Élfico']);
  });

  it('sem origem personalizada, tudo como antes', () => {
    const d = deriveCharacter(make({ raceId: 'half-orc' }));
    expect([d.abilities.str.total, d.abilities.con.total]).toEqual([12, 11]);
  });
});
