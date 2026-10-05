import { describe, it, expect } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { allyView, alliesOf, beastsFor, damageText } from '../allies';
import { getAllyBeast } from '@/data/allyBeasts';
import type { Character } from '@/types/character';

function at(classId: string, level: number, patch: Partial<Character> = {}): Character {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'T', classId }));
  return { ...c, ...patch, level, classLevels: [{ classId, level }] };
}

describe('aliados (companheiro, montaria, familiar)', () => {
  it('usa os números da fera de base e o nome da fera quando não há nome', () => {
    const v = allyView({ id: 'a', kind: 'montaria', name: '', beastId: 'warhorse' });
    expect(v).toMatchObject({ name: 'Cavalo de Guerra', base: 'Cavalo de Guerra', ac: 11, hpMax: 19, hp: 19, speed: '18 m', cr: '1/2', size: 'Grande' });
    expect(v.mods?.str).toBe(4);
    expect(damageText(v.attacks[0])).toBe('2d6+4');
  });

  it('PV atual fica entre 0 e o máximo', () => {
    expect(allyView({ id: 'a', kind: 'montaria', name: 'T', beastId: 'pony', hpCurrent: 99 }).hp).toBe(11);
    expect(allyView({ id: 'a', kind: 'montaria', name: 'T', beastId: 'pony', hpCurrent: -3 }).hp).toBe(0);
  });

  it('criatura livre: números à mão, sem atributos nem ataques', () => {
    const v = allyView({ id: 'a', kind: 'familiar', name: 'Faísca', ac: 13, hpMax: 4, speed: '3 m, voo 12 m' });
    expect(v).toMatchObject({ name: 'Faísca', base: null, ac: 13, hpMax: 4, hp: 4, speed: '3 m, voo 12 m', abilities: null, attacks: [] });
  });

  it('o companheiro do Mestre das Feras vem primeiro, com o retrato da ficha', () => {
    const c = at('ranger', 5, { subclassId: 'beastmaster', choices: { 'ranger.companion': ['wolf'] }, companion: { portrait: 'data:x' }, allies: [{ id: 'h', kind: 'montaria', name: 'Trovão', beastId: 'warhorse' }] });
    const list = alliesOf(c);
    expect(list.map((a) => a.id)).toEqual(['class-companion', 'h']);
    expect(list[0]).toMatchObject({ fromClass: true, base: 'Lobo', ac: 16, portrait: 'data:x' });
    expect(list[0].attacks[0].toHit).toBe(7);
  });

  it('o seletor sugere primeiro as feras do tipo escolhido, e todas existem', () => {
    expect(beastsFor('montaria')[0].group).toBe('Montarias');
    expect(beastsFor('familiar')[0].group).toBe('Familiares');
    for (const g of beastsFor('companheiro')) for (const b of g.beasts) expect(getAllyBeast(b.id)?.label).toBe(b.label);
  });
});
