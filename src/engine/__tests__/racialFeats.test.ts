import { describe, it, expect } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { featPrereqIssue } from '../levelUp';
import { deriveCharacter } from '../dndRules';
import { itemGrantedSpells } from '../spellcasting';
import { characterResources } from '../classResources';
import { pendingChoices } from '../classChoices';
import { initiativeRules } from '../initiative';
import { FEATS, getFeat } from '@/data/feats';
import type { Character } from '@/types/character';

function hero(raceId: string, subraceId: string | null, feats: string[] = [], classId = 'fighter', patch: Partial<Character> = {}): Character {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'T', classId, raceId }));
  return { ...c, subraceId, feats, ...patch };
}

describe('talentos raciais do Xanathar (XGE)', () => {
  it('estão todos os 15', () => {
    const xge = FEATS.filter((f) => f.source === 'XGE').map((f) => f.id).sort();
    expect(xge).toEqual([
      'bountiful-luck', 'dragon-fear', 'dragon-hide', 'drow-high-magic', 'dwarven-fortitude', 'elven-accuracy', 'fade-away',
      'fey-teleportation', 'flames-of-phlegethos', 'infernal-constitution', 'orcish-fury', 'prodigy', 'second-chance',
      'squat-nimbleness', 'wood-elf-magic',
    ]);
  });

  it('linhagem é exigida: drow, alto elfo e elfo da floresta', () => {
    const drow = getFeat('drow-high-magic')!;
    expect(featPrereqIssue(hero('elf', 'high-elf'), drow)).not.toBeNull();
    expect(featPrereqIssue(hero('elf', 'drow'), drow)).toBeNull();
    expect(featPrereqIssue(hero('elf', 'wood-elf'), getFeat('fey-teleportation')!)).not.toBeNull();
    expect(featPrereqIssue(hero('elf', 'wood-elf'), getFeat('wood-elf-magic')!)).toBeNull();
    expect(featPrereqIssue(hero('human', null), getFeat('elven-accuracy')!)).not.toBeNull();
    expect(featPrereqIssue(hero('half-elf', null), getFeat('elven-accuracy')!)).toBeNull();
    expect(featPrereqIssue(hero('gnome', null), getFeat('squat-nimbleness')!)).toBeNull();
    expect(featPrereqIssue(hero('elf', 'high-elf'), getFeat('squat-nimbleness')!)).not.toBeNull();
  });

  it('Couro Dracônico: CA 13 + DES sem armadura e garras 1d4', () => {
    const base = hero('dragonborn', null, [], 'wizard');
    const naked = { ...base, equipped: { ...base.equipped, armor: null } };
    const without = deriveCharacter(naked);
    const withHide = deriveCharacter({ ...naked, feats: ['dragon-hide'] });
    expect(withHide.ac - without.ac).toBe(3);
    expect(withHide.attacks.find((a) => a.uid === 'dragon-claws')?.damageDie).toBe(4);
  });

  it('Constituição Infernal: resistência a frio e veneno', () => {
    const d = deriveCharacter(hero('tiefling', null, ['infernal-constitution']));
    expect(d.resistances.map((r) => r.value)).toEqual(expect.arrayContaining(['frio', 'veneno']));
  });

  it('Teleporte Feérico: Silvestre e passo enevoado 1×/descanso curto', () => {
    const c = hero('elf', 'high-elf', ['fey-teleportation']);
    expect(deriveCharacter(c).languages).toContain('Silvestre');
    const misty = itemGrantedSpells(c).find((s) => s.spell.id === 'sp-passos')!;
    expect([misty.recharge, misty.usesMax]).toEqual(['short', 1]);
  });

  it('Alta Magia Drow: detectar magia à vontade, levitação e dissipar magia 1×/descanso longo', () => {
    const spells = itemGrantedSpells(hero('elf', 'drow', ['drow-high-magic']));
    expect(spells.map((s) => [s.spell.id, s.recharge])).toEqual([
      ['sp-detectar', 'atwill'], ['phb-levitate', 'long'], ['sp-relampagosagrado', 'long'],
    ]);
  });

  it('Magia do Elfo da Floresta: truque de druida pendente e magias 1×/descanso longo', () => {
    const c = hero('elf', 'wood-elf', ['wood-elf-magic']);
    expect(pendingChoices(c).some((p) => p.spec.storeKey === 'feat.woodElfCantrip')).toBe(true);
    const spells = itemGrantedSpells({ ...c, choices: { 'feat.woodElfCantrip': ['phb-druidcraft'] } });
    expect(spells.map((s) => s.spell.id)).toEqual(['phb-druidcraft', 'phb-longstrider', 'phb-pass-without-trace']);
  });

  it('Agilidade Atarracada: +1,5 m e perícia escolhida', () => {
    const c = hero('dwarf', 'hill-dwarf', ['squat-nimbleness'], 'fighter', { choices: { 'feat.squatSkill': ['acrobatics'] } });
    const d = deriveCharacter(c);
    expect(d.speed - deriveCharacter({ ...c, feats: [] }).speed).toBe(1.5);
    expect(d.skills.find((s) => s.key === 'acrobatics')!.proficient).toBe(true);
  });

  it('Prodígio: perícia e idioma escolhidos', () => {
    const c = hero('human', null, ['prodigy'], 'fighter', { choices: { 'feat.prodigySkill': ['stealth'], 'feat.prodigyLanguage': ['Élfico'] } });
    const d = deriveCharacter(c);
    expect(d.skills.find((s) => s.key === 'stealth')!.proficient).toBe(true);
    expect(d.languages).toContain('Élfico');
  });

  it('Desvanecer, Fúria Orc e Segunda Chance viram recursos de descanso curto', () => {
    const ids = (c: Character) => characterResources(c).filter((r) => r.recharge === 'short').map((r) => r.id);
    expect(ids(hero('gnome', null, ['fade-away']))).toContain('featFadeAway');
    expect(ids(hero('half-orc', null, ['orcish-fury']))).toContain('featOrcishFury');
    const hal = hero('halfling', null, ['second-chance'], 'fighter');
    expect(ids(hal)).toContain('featSecondChance');
    const spent = { ...hal, combat: { ...hal.combat, resources: { ...hal.combat.resources, featSecondChance: 0 } } };
    expect(initiativeRules(spent).refills.map((r) => r.resId)).toContain('featSecondChance');
  });
});
