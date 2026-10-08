import { describe, expect, it } from 'vitest';
import { FEATS, getFeat } from '@/data/feats';
import { ARTIFICER_CANTRIPS, ARTIFICER_FIRST } from '@/data/classChoices';
import { SPELL_BY_ID } from '@/data/spells';
import { catalogFor, pendingChoices } from '../classChoices';
import { characterResources } from '../classResources';
import { itemGrantedSpells } from '../spellcasting';
import { expertiseSlots, featPrereqIssue } from '../levelUp';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import type { Character } from '@/types/character';

const hero = (classId: string, patch: Partial<Character> = {}): Character => {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'T', classId }));
  return { ...c, raceId: 'human', ...patch, classLevels: [{ classId, level: patch.level ?? 1 }] };
};

describe('talentos do Caldeirão de Tasha', () => {
  it('são 15, todos marcados como TCE', () => {
    expect(FEATS.filter((f) => f.source === 'TCE')).toHaveLength(15);
  });

  it('listas do artífice acham as magias da biblioteca', () => {
    expect(ARTIFICER_CANTRIPS.length).toBe(15);
    expect(ARTIFICER_FIRST.length).toBe(13);
  });

  it('Tocado pelas Fadas: só adivinhação/encantamento de 1º; Passo Enevoado + a escolhida', () => {
    const c = hero('fighter', { feats: ['fey-touched'] });
    const spec = pendingChoices(c).find((p) => p.spec.storeKey === 'feat.feyTouchedSpell')!.spec;
    const opts = catalogFor(spec, c);
    expect(opts.length).toBeGreaterThan(3);
    expect(opts.every((o) => ['Adivinhação', 'Encantamento'].includes(SPELL_BY_ID[o.id].school) && SPELL_BY_ID[o.id].level === 1)).toBe(true);
    const done = { ...c, choices: { 'feat.feyTouchedSpell': [opts[0].id] } };
    expect(itemGrantedSpells(done).map((s) => s.spell.id)).toEqual(['sp-passos', opts[0].id]);
  });

  it('Adepto Metamágico: 2 pontos e exige conjuração de classe', () => {
    expect(characterResources(hero('wizard', { feats: ['metamagic-adept'] })).find((r) => r.id === 'featMetamagic')!.max).toBe(2);
    expect(featPrereqIssue(hero('fighter'), getFeat('metamagic-adept')!)).toMatch(/Conjuração/);
    expect(featPrereqIssue(hero('wizard'), getFeat('metamagic-adept')!)).toBeNull();
  });

  it('Iniciado em Combate exige arma marcial (Mago não, Guerreiro sim)', () => {
    expect(featPrereqIssue(hero('wizard'), getFeat('fighting-initiate')!)).toMatch(/marcial/);
    expect(featPrereqIssue(hero('fighter'), getFeat('fighting-initiate')!)).toBeNull();
  });

  it('Especialista em Perícia dá uma vaga de especialização', () => {
    expect(expertiseSlots(hero('fighter', { feats: ['skill-expert'] }))).toBe(1);
  });
});
