import { describe, it, expect } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { catalogFor, groupSpecs, pendingChoices, specsAt, validateChoicePicks } from '../classChoices';
import { characterResources } from '../classResources';
import { casterOf } from '../spellcasting';
import { deriveCharacter } from '../dndRules';
import { initiativeRules } from '../initiative';
import type { Character } from '@/types/character';

function at(classId: string, level: number, patch: Partial<Character> = {}): Character {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'T', classId }));
  return { ...c, ...patch, level, classLevels: [{ classId, level }] };
}
const ids = (c: Character) => characterResources(c).map((r) => r.id);

describe('Bruxo (PHB 2014)', () => {
  it('invocações 2/3/4/5/6/7/8 nos níveis 2/5/7/9/12/15/18', () => {
    const gained = [2, 5, 7, 9, 12, 15, 18].map((lv) => specsAt('warlock', lv, null).find((s) => s.key === 'invocation')!.count);
    expect(gained.reduce((a, b) => a + b, 0)).toBe(8);
    // nos outros níveis só troca
    expect(specsAt('warlock', 4, null).find((s) => s.key === 'invocation')!.count).toBe(0);
  });

  it('pré-requisitos: nível, pacto e rajada mística', () => {
    const c2 = at('warlock', 2, { preparedSpells: [] });
    const spec = specsAt('warlock', 2, null)[0];
    const opts2 = catalogFor(spec, c2).map((o) => o.id);
    expect(opts2).not.toContain('thirstingBlade');
    expect(opts2).not.toContain('agonizingBlast');
    expect(opts2).not.toContain('ascendantStep');
    const c5 = at('warlock', 4, { preparedSpells: ['sp-eldritch'], choices: { 'warlock.pact': ['blade'], 'warlock.invocation': [] } });
    const opts5 = catalogFor(specsAt('warlock', 5, null)[0], c5).map((o) => o.id);
    expect(opts5).toContain('thirstingBlade');
    expect(opts5).toContain('agonizingBlast');
    expect(opts5).not.toContain('chainMaster');
  });

  it('Pacto do Tomo libera 3 truques de qualquer classe', () => {
    expect(specsAt('warlock', 3, null, {}).some((s) => s.key === 'tomeCantrips')).toBe(false);
    const withTome = specsAt('warlock', 3, null, { 'warlock.pact': ['tome'] });
    const tome = withTome.find((s) => s.key === 'tomeCantrips')!;
    expect(tome.count).toBe(3);
    expect(catalogFor(tome).every((o) => o.tag === 'truque')).toBe(true);
  });

  it('Arcano Místico: sem magia de 6º no catálogo, a escolha não trava a ficha', () => {
    const c = at('warlock', 11, { choices: { 'warlock.pact': ['chain'], 'warlock.invocation': ['devilsSight', 'eldritchSight', 'beastSpeech', 'runeKeeper', 'mistyVisions'] } });
    const groups = groupSpecs(c, specsAt('warlock', 11, null));
    const arc = groups.find((g) => g.spec.key === 'arcanum6')!;
    expect(arc.need).toBe(Math.min(1, arc.options.length));
  });

  it('invocação de magia 1×/descanso vira recurso', () => {
    const c = at('warlock', 5, { choices: { 'warlock.invocation': ['mireTheMind'] } });
    expect(ids(c)).toContain('inv-mireTheMind');
  });
});

describe('Bardo, Patrulheiro, Druida, Monge, Bárbaro, Paladino, Ladino', () => {
  it('Segredos Mágicos no 10º: qualquer classe, até 5º círculo', () => {
    const spec = specsAt('bard', 10, null)[0];
    const circles = catalogFor(spec).map((o) => o.tag);
    expect(circles).not.toContain('6º círculo');
    expect(circles).toContain('5º círculo');
  });

  it('Colégio do Conhecimento: 3 perícias que ainda não tem', () => {
    const c = at('bard', 3, { subclassId: 'lore' });
    const g = groupSpecs(c, specsAt('bard', 3, 'lore'))[0];
    expect(g.need).toBe(3);
    expect(g.options.some((o) => c.skillProfs.includes(o.id as never))).toBe(false);
    const d = deriveCharacter({ ...c, choices: { 'bard.loreSkills': [g.options[0].id] } });
    expect(d.skills.find((s) => s.key === g.options[0].id)!.proficient).toBe(true);
  });

  it('Patrulheiro 1º: inimigo favorito e terreno pendentes', () => {
    const keys = pendingChoices(at('ranger', 1)).map((p) => p.spec.key);
    expect(keys).toEqual(expect.arrayContaining(['favoredEnemy', 'favoredTerrain']));
  });

  it('Quatro Elementos: disciplinas respeitam o nível', () => {
    const c3 = at('monk', 3, { subclassId: 'elements' });
    const opts = groupSpecs(c3, specsAt('monk', 3, 'elements'))[0].options.map((o) => o.id);
    expect(opts).toContain('fangs');
    expect(opts).not.toContain('phoenix');
    expect(validateChoicePicks(c3, specsAt('monk', 3, 'elements'), { 'monk.discipline': ['phoenix'] })).not.toEqual([]);
  });

  it('Monge: movimento sem armadura, golpe desarmado com artes marciais e Alma de Diamante', () => {
    const base = at('monk', 1);
    const naked = { ...base, equipped: { ...base.equipped, armor: null, shield: null } };
    const d1 = deriveCharacter(naked);
    const d10 = deriveCharacter({ ...naked, level: 10, classLevels: [{ classId: 'monk', level: 10 }] });
    expect(d10.speed - d1.speed).toBe(6);
    expect(d10.attacks.find((a) => a.uid === 'monk-unarmed')!.damageDie).toBe(6);
    const d14 = deriveCharacter({ ...naked, level: 14, classLevels: [{ classId: 'monk', level: 14 }] });
    expect(d14.abilityList.every((a) => a.saveProf)).toBe(true);
  });

  it('Bárbaro: Campeão Primal (+4, teto 24), Movimento Rápido e Instinto Selvagem', () => {
    const c = at('barbarian', 20, { asiBonuses: { str: 10, con: 10 } });
    const d = deriveCharacter(c);
    expect(d.abilities.str.total).toBe(24);
    expect(d.abilities.con.total).toBe(24);
    expect(initiativeRules(at('barbarian', 7)).advantage).toBe(true);
    expect(initiativeRules(at('barbarian', 6)).advantage).toBe(false);
  });

  it('Paladino 6º: Aura de Proteção soma CAR (mín. 1) às salvaguardas', () => {
    const c5 = deriveCharacter(at('paladin', 5));
    const c6 = deriveCharacter(at('paladin', 6));
    const aura = Math.max(1, c6.abilities.cha.mod);
    expect(c6.abilities.dex.save - c5.abilities.dex.save).toBe(aura);
  });

  it('Ladino 15º: Mente Escorregadia dá salvaguarda de SAB', () => {
    expect(deriveCharacter(at('rogue', 14)).abilities.wis.saveProf).toBe(false);
    expect(deriveCharacter(at('rogue', 15)).abilities.wis.saveProf).toBe(true);
  });

  it('Druida da Terra ganha truque extra; Mago Adivinhador tem Portento 2/3', () => {
    const plain = casterOf(at('druid', 2))!.cantrips;
    expect(casterOf(at('druid', 2, { subclassId: 'land' }))!.cantrips).toBe(plain + 1);
    const p2 = characterResources(at('wizard', 2, { subclassId: 'divination' })).find((r) => r.id === 'portent')!;
    const p14 = characterResources(at('wizard', 14, { subclassId: 'divination' })).find((r) => r.id === 'portent')!;
    expect([p2.max, p14.max]).toEqual([2, 3]);
  });
});

describe('subclasses completas do PHB (Clérigo e Mago)', () => {
  it('existem as 7 de Clérigo e as 8 de Mago', async () => {
    const { subclassesFor } = await import('@/data/subclasses');
    expect(subclassesFor('cleric').length).toBe(7);
    expect(subclassesFor('wizard').length).toBe(8);
  });

  it('Conhecimento: 2 idiomas + 2 perícias com proficiência dobrada', () => {
    const c = at('cleric', 1, { subclassId: 'knowledge' });
    const groups = groupSpecs(c, specsAt('cleric', 1, 'knowledge'));
    expect(groups.map((g) => g.need)).toEqual([2, 2]);
    const skills = groups[1].options.map((o) => o.id);
    expect(skills.every((s) => ['arcana', 'history', 'nature', 'religion'].includes(s))).toBe(true);
    const d = deriveCharacter({ ...c, choices: { 'cleric.knowledgeSkills': ['arcana', 'history'], 'cleric.knowledgeLanguages': ['Dracônico', 'Silvestre'] } });
    expect(d.skills.find((s) => s.key === 'arcana')!.expertise).toBe(true);
    expect(d.languages).toEqual(expect.arrayContaining(['Dracônico', 'Silvestre']));
  });

  it('Tempestade: Ira da Tempestade usa SAB; Necromante 10º resiste a necrótico', () => {
    expect(characterResources(at('cleric', 1, { subclassId: 'tempest' })).some((r) => r.id === 'wrathStorm')).toBe(true);
    const d = deriveCharacter(at('wizard', 10, { subclassId: 'necromancy' }));
    expect(d.resistances.some((r) => r.value === 'necrótico')).toBe(true);
  });
});
