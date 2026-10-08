import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { pendingChoices, applyChoicePicks } from '../classChoices';
import { grantChoiceEffects } from '../choiceEffects';
import { proficienciesOf, isWeaponProficient } from '../proficiencies';
import type { Character } from '@/types/character';

const hero = (classId: string, patch: Partial<Character> = {}): Character => {
  const c = finalizeCharacter({ ...createDraftCharacter({ ownerId: 'u', name: 'Teste', classId }), ...patch });
  return { ...c, ...patch, classLevels: [{ classId, level: patch.level ?? c.level }] };
};
const pick = (c: Character, picks: Record<string, string[]>) => {
  const copy = structuredClone(c);
  applyChoicePicks(copy, picks);
  grantChoiceEffects(copy, picks);
  return copy;
};

describe('ferramentas à escolha (PHB 2014)', () => {
  it('Bardo escolhe 3 instrumentos e eles entram na ficha', () => {
    const b = hero('bard', { raceId: 'human', backgroundId: 'soldier' });
    expect(pendingChoices(b).find((p) => p.spec.storeKey === 'bard.bardInstruments')?.missing).toBe(3);
    const done = pick(b, { 'bard.bardInstruments': ['lute', 'flute', 'lyre'] });
    expect(done.toolProfs.filter((t) => t.source === 'Bardo').map((t) => t.id)).toEqual(['lute', 'flute', 'lyre']);
    expect(pendingChoices(done).some((p) => p.spec.storeKey === 'bard.bardInstruments')).toBe(false);
  });

  it('Monge escolhe uma ferramenta de artesão ou instrumento', () => {
    const m = hero('monk', { raceId: 'human' });
    expect(pendingChoices(m).some((p) => p.spec.storeKey === 'monk.monkTool')).toBe(true);
  });

  it('Anão escolhe entre ferreiro, cervejeiro e pedreiro', () => {
    const d = hero('fighter', { raceId: 'dwarf', subraceId: 'hill-dwarf' });
    const pend = pendingChoices(d).find((p) => p.spec.storeKey === 'race.dwarfTool')!;
    expect(pend.spec.only).toEqual(['smiths-tools', 'brewers-supplies', 'masons-tools']);
    expect(pick(d, { 'race.dwarfTool': ['brewers-supplies'] }).toolProfs.some((t) => t.id === 'brewers-supplies')).toBe(true);
  });

  it('Gnomo das Rochas já vem com Ferramentas de Funileiro', () => {
    expect(hero('wizard', { raceId: 'gnome', subraceId: 'rock-gnome' }).toolProfs.some((t) => t.id === 'tinkers-tools')).toBe(true);
  });
});

describe('armas escolhidas', () => {
  it('Mestre em Armas: só as 4 armas escolhidas', () => {
    const w = hero('wizard', { raceId: 'human', feats: ['weapon-master'] });
    expect(pendingChoices(w).some((p) => p.spec.storeKey === 'feat.weaponMasterWeapons')).toBe(true);
    const done = pick(w, { 'feat.weaponMasterWeapons': ['w-longsword', 'w-longbow', 'w-rapier', 'w-whip'] });
    const p = proficienciesOf(done);
    expect(isWeaponProficient(p, { itemId: 'w-longbow', name: 'Arco Longo' }, 'martial', 'ranged')).toBe(true);
    expect(isWeaponProficient(p, { itemId: 'w-greataxe', name: 'Machado Grande' }, 'martial', 'melee')).toBe(false);
  });

  it('Pacto da Lâmina: proficiente com a forma escolhida', () => {
    const k = hero('warlock', { raceId: 'human', level: 3, choices: { 'warlock.pact': ['blade'] } });
    expect(pendingChoices(k).some((p) => p.spec.storeKey === 'warlock.pactWeapon')).toBe(true);
    const done = pick(k, { 'warlock.pactWeapon': ['w-greatsword'] });
    expect(isWeaponProficient(proficienciesOf(done), { itemId: 'w-greatsword', name: 'Espada Grande' }, 'martial', 'melee')).toBe(true);
    expect(isWeaponProficient(proficienciesOf(done), { itemId: 'w-halberd', name: 'Alabarda' }, 'martial', 'melee')).toBe(false);
  });
});
