import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { castsAtCreation, creationSpellPending, creationSpellPlan, suggestCreationSpells } from '../creationSpells';
import { creationPending, STEP_SPELLS, visibleSteps } from '../creationSummary';
import { spellLearnState } from '../spellRules';
import { getSpell } from '@/data/spells';
import { CLASSES } from '@/data/classes';
import type { Character } from '@/types/character';

const draft = (classId: string, patch: Partial<Character> = {}): Character => ({
  ...createDraftCharacter({ ownerId: 'u', name: 'Teste', classId }),
  ...patch,
  classLevels: [{ classId, level: 1 }],
});
const suggested = (classId: string, patch: Partial<Character> = {}) => {
  const c = draft(classId, patch);
  suggestCreationSpells(c);
  return c;
};
const lv = (id: string) => getSpell(id)!.level;

describe('etapa Magias da criação', () => {
  it('só aparece para quem conjura no 1º nível', () => {
    const casters = CLASSES.filter((c) => castsAtCreation(draft(c.id))).map((c) => c.id).sort();
    expect(casters).toEqual(['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard']);
    expect(visibleSteps(draft('fighter'))).not.toContain(STEP_SPELLS);
    expect(visibleSteps(draft('paladin'))).not.toContain(STEP_SPELLS);
    expect(visibleSteps(draft('wizard'))).toContain(STEP_SPELLS);
  });

  it('a sugestão cabe certinho nos limites de cada classe (PHB 2014)', () => {
    const counts = (c: Character) => ({
      cantrips: c.preparedSpells.filter((id) => lv(id) === 0).length,
      spells: c.preparedSpells.filter((id) => lv(id) === 1).length,
      book: (c.knownSpells ?? []).length,
    });
    expect(counts(suggested('bard'))).toEqual({ cantrips: 2, spells: 4, book: 0 });
    expect(counts(suggested('sorcerer', { subclassId: 'wild' }))).toEqual({ cantrips: 4, spells: 2, book: 0 });
    expect(counts(suggested('warlock', { subclassId: 'fiend' }))).toEqual({ cantrips: 2, spells: 2, book: 0 });
    // Mago com INT 16 (+3): 3 truques, 6 no grimório, prepara 4
    const wiz = suggested('wizard');
    const st = spellLearnState(wiz, 3)!;
    expect(counts(wiz)).toEqual({ cantrips: 3, spells: st.prepared!.max, book: 6 });
    for (const cls of ['bard', 'druid', 'sorcerer', 'warlock', 'wizard']) {
      const c = suggested(cls, cls === 'sorcerer' ? { subclassId: 'wild' } : cls === 'warlock' ? { subclassId: 'fiend' } : {});
      expect(creationSpellPending(c), cls).toEqual([]);
    }
  });

  it('Clérigo: magias de domínio vêm de graça e não ocupam as preparadas', () => {
    const c = suggested('cleric', { subclassId: 'life' });
    const plan = creationSpellPlan(c)!;
    expect(plan.kind).toBe('prepared');
    expect(plan.free.map((f) => f.source)).toContain('Domínio da Vida');
    const free = new Set(plan.free.map((f) => f.id));
    expect(c.preparedSpells.some((id) => free.has(id))).toBe(false);
    expect(plan.spells.chosen).toHaveLength(plan.spells.max);
    expect(creationSpellPending(c)).toEqual([]);
  });

  it('pendências: falta truque, sobra magia, grimório incompleto', () => {
    const bard = suggested('bard');
    bard.preparedSpells = bard.preparedSpells.slice(1);
    expect(creationSpellPending(bard)).toEqual(['Escolha 1 truque']);
    expect(creationPending(bard).find((p) => p.label === 'Escolha 1 truque')?.step).toBe(STEP_SPELLS);
    const wiz = suggested('wizard');
    wiz.knownSpells = wiz.knownSpells!.slice(0, 4);
    expect(creationSpellPending(wiz)).toContain('Escolha 2 magias do grimório');
    const cleric = suggested('cleric', { subclassId: 'life' });
    const extra = creationSpellPlan(cleric)!.spells.pool.find((s) => !cleric.preparedSpells.includes(s.id))!;
    cleric.preparedSpells.push(extra.id);
    expect(creationSpellPending(cleric)[0]).toMatch(/^Tire 1 magia preparada/);
    // sem escolher nada: a criação aponta a etapa Magias
    expect(creationPending(draft('druid')).some((p) => p.step === STEP_SPELLS)).toBe(true);
    expect(creationPending(draft('fighter')).some((p) => p.step === STEP_SPELLS)).toBe(false);
  });

  it('o que foi escolhido na criação é o que chega à ficha', () => {
    const c = suggested('wizard');
    c.preparedSpells = c.preparedSpells.filter((id) => lv(id) === 0).concat(c.knownSpells![5]);
    const f = finalizeCharacter(c);
    expect(f.knownSpells).toEqual(c.knownSpells);
    expect(f.preparedSpells).toEqual(c.preparedSpells);
  });
});
