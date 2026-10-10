import { describe, it, expect } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { rulesSummary, sheetRuleNotes } from '../tableRules';

const makeChar = () => finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'Teste', classId: 'fighter', raceId: 'human' }));

describe('regras desta ficha: oficial × opcional × mesa × homebrew × ajuste', () => {
  it('ficha nova é 2014 puro', () => {
    const s = rulesSummary(makeChar());
    expect(s.pure).toBe(true);
    expect(s.label).toBe('D&D 5e 2014');
  });

  it('talento é opcional do próprio livro: aparece, mas não tira do 2014', () => {
    const c = makeChar();
    c.feats = ['alert'];
    expect(sheetRuleNotes(c).map((n) => n.kind)).toEqual(['opcional']);
    expect(rulesSummary(c).pure).toBe(true);
  });

  it('inspiração acumulável, item da Forja e PV à mão ficam marcados pelo que são', () => {
    const c = makeChar();
    c.campaign = { ...c.campaign, stackingInspiration: true };
    c.inventory = [...c.inventory, { uid: 'x', name: 'Olho de vidro', category: 'other', note: '', rarity: 'comum', weight: 0, quantity: 1, favorite: false, attuned: false, homebrew: true }];
    c.abilityMethod = 'manual';
    const kinds = sheetRuleNotes(c).map((n) => n.kind);
    expect(kinds).toEqual(expect.arrayContaining(['mesa', 'homebrew', 'ajuste']));
    const s = rulesSummary(c);
    expect(s.pure).toBe(false);
    expect(s.label).toBe('2014 · 3 fora do padrão');
  });
});
