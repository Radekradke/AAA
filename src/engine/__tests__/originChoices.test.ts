import { describe, expect, it } from 'vitest';
import { languagePicks, skillBudget } from '../originChoices';
import { deriveCharacter } from '../dndRules';
import { creationPending } from '../creationSummary';
import { createDraftCharacter } from '../characterBuilder';
import { finalizeRace } from '../homebrew';
import { RACE_PRESETS } from '@/data/racePresets';
import type { Character } from '@/types/character';

const make = (patch: Partial<Character>): Character => ({ ...createDraftCharacter({ ownerId: 'u', name: 'Teste', classId: 'fighter' }), skillProfs: [], extraLanguages: [], ...patch });

describe('perícias de origem (PHB 2014)', () => {
  it('Bardo escolhe quaisquer três perícias', () => {
    const c = make({ classId: 'bard', raceId: 'human', backgroundId: 'soldier', skillProfs: ['arcana', 'stealth', 'medicine'] });
    const b = skillBudget(c);
    expect(b.classTotal).toBe(3);
    expect(b.classLeft).toBe(0);
    expect(b.canPick('nature')).toBe(false);
  });

  it('Guerreiro continua preso à lista da classe', () => {
    const c = make({ classId: 'fighter', raceId: 'human', backgroundId: 'sage' });
    const b = skillBudget(c);
    expect(b.canPick('athletics')).toBe(true);
    expect(b.canPick('arcana')).toBe(false); // Arcanismo já vem do Sábio
    expect(b.canPick('stealth')).toBe(false); // fora da lista do Guerreiro
  });

  it('perícia repetida entre raça e antecedente vira uma livre', () => {
    const tabaxi = finalizeRace({ ...RACE_PRESETS.find((r) => r.label === 'Tabaxi')!, id: '' });
    const c = make({ classId: 'fighter', raceId: tabaxi.id, customRace: tabaxi, backgroundId: 'criminal' });
    const b = skillBudget(c);
    expect(b.overlap).toEqual(['stealth']);
    expect(b.freeTotal).toBe(1);
    expect(b.canPick('arcana')).toBe(true); // qualquer perícia
    const done = { ...c, skillProfs: ['arcana', 'athletics', 'survival'] as Character['skillProfs'] };
    expect(skillBudget(done).freeLeft).toBe(0);
    expect(creationPending(done).some((p) => /perícia/.test(p.label))).toBe(false);
  });

  it('Meio-Elfo Bardo: 3 da classe + 2 livres, todas da lista inteira', () => {
    const c = make({ classId: 'bard', raceId: 'half-elf', backgroundId: 'entertainer', skillProfs: ['arcana', 'history', 'nature', 'religion', 'medicine'] });
    const b = skillBudget(c);
    expect(b.classLeft).toBe(0);
    expect(b.freeTotal).toBe(2);
    expect(b.freeLeft).toBe(0);
  });
});

describe('idiomas à escolha', () => {
  it('Humano Acólito: 1 da raça + 2 do antecedente', () => {
    const c = make({ raceId: 'human', backgroundId: 'acolyte' });
    const l = languagePicks(c);
    expect(l.fixed).toEqual(['Comum']);
    expect(l.total).toBe(3);
    expect(deriveCharacter(c).languages).toContain('3 idiomas à escolha');
    expect(creationPending(c).some((p) => p.label === 'Escolha 3 idiomas')).toBe(true);
  });

  it('Alto Elfo ganha o idioma extra da sub-raça', () => {
    const c = make({ raceId: 'elf', subraceId: 'high-elf', backgroundId: 'soldier' });
    expect(languagePicks(c).total).toBe(1);
    const chosen = { ...c, extraLanguages: ['Dracônico'] };
    const langs = deriveCharacter(chosen).languages;
    expect(langs).toEqual(expect.arrayContaining(['Comum', 'Élfico', 'Dracônico']));
    expect(langs.some((l) => /à escolha/.test(l))).toBe(false);
  });

  it('Anão Soldado não escolhe idioma', () => {
    const c = make({ raceId: 'dwarf', subraceId: null, backgroundId: 'soldier' });
    expect(languagePicks(c).total).toBe(0);
    expect(deriveCharacter(c).languages).toEqual(['Comum', 'Anão']);
  });
});
