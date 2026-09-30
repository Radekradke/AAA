import { describe, it, expect } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { applyChoicePicks, catalogFor, pendingChoices, specsAt, validateChoicePicks } from '../classChoices';
import { validateLevelUp } from '../levelUp';
import { casterOf } from '../spellcasting';
import { deriveCharacter } from '../dndRules';
import type { Character } from '@/types/character';

function at(classId: string, level: number, patch: Partial<Character> = {}): Character {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'T', classId }));
  return { ...c, ...patch, level, classLevels: [{ classId, level }] };
}

describe('escolhas de classe (PHB 2014)', () => {
  it('Feiticeiro: Metamagia 2 no 3º, +1 no 10º e no 17º', () => {
    expect(specsAt('sorcerer', 3, null).map((s) => [s.key, s.count])).toEqual([['metamagic', 2]]);
    expect(specsAt('sorcerer', 10, null)[0].count).toBe(1);
    expect(specsAt('sorcerer', 17, null)[0].count).toBe(1);
    expect(specsAt('sorcerer', 4, null)).toEqual([]);
    const c = at('sorcerer', 10);
    expect(pendingChoices(c).find((p) => p.spec.storeKey === 'sorcerer.metamagic')?.missing).toBe(3);
  });

  it('Linhagem Dracônica pede o Ancestral Dragão no 1º nível', () => {
    expect(specsAt('sorcerer', 1, 'draconic').map((s) => s.key)).toContain('dragonAncestor');
    expect(specsAt('sorcerer', 1, 'wild')).toEqual([]);
  });

  it('valida quantidade, repetição e o que já tem', () => {
    const c = at('sorcerer', 2, { choices: { 'sorcerer.metamagic': [] } });
    const specs = specsAt('sorcerer', 3, null);
    expect(validateChoicePicks(c, specs, { 'sorcerer.metamagic': ['quickened'] })).not.toEqual([]);
    expect(validateChoicePicks(c, specs, { 'sorcerer.metamagic': ['quickened', 'quickened'] })).not.toEqual([]);
    expect(validateChoicePicks(c, specs, { 'sorcerer.metamagic': ['quickened', 'twinned'] })).toEqual([]);
    const c10 = at('sorcerer', 9, { choices: { 'sorcerer.metamagic': ['quickened', 'twinned'] } });
    expect(validateChoicePicks(c10, specsAt('sorcerer', 10, null), { 'sorcerer.metamagic': ['twinned'] })).not.toEqual([]);
  });

  it('subir de nível exige a escolha do nível', () => {
    const c = at('fighter', 2, { subclassId: null });
    const base = { classId: 'fighter', hpMethod: 'media' as const, hpValue: 6, subclassId: 'battlemaster' };
    expect(validateLevelUp(c, base).some((e) => e.includes('Manobras'))).toBe(true);
    const ok = validateLevelUp(c, {
      ...base,
      choices: { 'fighter.maneuver': ['riposte', 'parry', 'trip'], 'fighter.artisanTool': [catalogFor(specsAt('fighter', 3, 'battlemaster')[1])[0].id] },
    });
    expect(ok.filter((e) => e.includes('Manobras') || e.includes('ferramenta'))).toEqual([]);
  });

  it('Manobras: troca uma antiga por uma nova ao ganhar mais', () => {
    const c = at('fighter', 6, { subclassId: 'battlemaster', choices: { 'fighter.maneuver': ['riposte', 'parry', 'trip'] } });
    const specs = specsAt('fighter', 7, 'battlemaster');
    const picks = { 'fighter.maneuver': ['feinting', 'goading'] };
    const replace = { 'fighter.maneuver': { from: 'parry', to: 'rally' } };
    expect(validateChoicePicks(c, specs, picks, replace)).toEqual([]);
    applyChoicePicks(c, picks, replace);
    expect(c.choices!['fighter.maneuver']).toEqual(['riposte', 'rally', 'trip', 'feinting', 'goading']);
  });

  it('Estilo de Luta: Defesa dá +1 de CA com armadura', () => {
    const c = at('fighter', 1);
    const plain = deriveCharacter(c);
    const def = deriveCharacter({ ...c, choices: { 'fighter.fightingStyle': ['defense'] } });
    expect(def.ac - plain.ac).toBe(c.equipped.armor ? 1 : 0);
  });
});

describe('Cavaleiro Arcano conjura como um terço de conjurador', () => {
  it('sem magia antes do 3º; slots e truques do PHB', () => {
    expect(casterOf(at('fighter', 2, { subclassId: 'eldritch' }))).toBeNull();
    const c3 = casterOf(at('fighter', 3, { subclassId: 'eldritch' }))!;
    expect(c3.listClass).toBe('wizard');
    expect(c3.ability).toBe('int');
    expect(c3.cantrips).toBe(2);
    expect(c3.guide.count).toBe(3);
    expect(c3.slots).toEqual({ 1: 2 });
    const c20 = casterOf(at('fighter', 20, { subclassId: 'eldritch' }))!;
    expect(c20.cantrips).toBe(3);
    expect(c20.guide.count).toBe(13);
    expect(c20.slots).toEqual({ 1: 4, 2: 3, 3: 3, 4: 1 });
    expect(casterOf(at('fighter', 5, { subclassId: 'champion' }))).toBeNull();
  });

  it('Trapaceiro Arcano: 3 truques (4 no 10º)', () => {
    expect(casterOf(at('rogue', 3, { subclassId: 'trickster' }))!.cantrips).toBe(3);
    expect(casterOf(at('rogue', 10, { subclassId: 'trickster' }))!.cantrips).toBe(4);
  });
});
