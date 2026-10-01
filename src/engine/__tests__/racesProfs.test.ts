import { describe, expect, it } from 'vitest';
import { deriveCharacter } from '../dndRules';
import { createDraftCharacter } from '../characterBuilder';
import { characterResources } from '../classResources';
import { proficienciesOf } from '../proficiencies';
import type { Character, InventoryItem } from '@/types/character';
import { getItem } from '@/data/items';

const make = (patch: Partial<Character>): Character => {
  const c = { ...createDraftCharacter({ ownerId: 'u', name: 'Teste', classId: patch.classId ?? 'fighter' }), skillProfs: [], ...patch };
  return { ...c, classLevels: [{ classId: c.classId, level: c.level }] };
};
const item = (itemId: string): InventoryItem => {
  const base = getItem(itemId)!;
  return { uid: itemId, itemId, name: base.name, category: base.category, note: '', rarity: 'comum', weight: base.weight, quantity: 1, favorite: false, attuned: false, weapon: base.weapon, armor: base.armor, acBonus: base.acBonus };
};
const wield = (c: Character, weaponId: string, armorId?: string): Character => ({
  ...c,
  inventory: [item(weaponId), ...(armorId ? [item(armorId)] : [])],
  equipped: { armor: armorId ?? null, shield: null, mainHand: weaponId, offHand: null, ranged: null },
});

describe('proficiência com armas e armaduras', () => {
  it('Mago com espada longa não soma proficiência; com adaga soma', () => {
    const base = make({ classId: 'wizard', raceId: 'human' });
    const sword = deriveCharacter(wield(base, 'w-longsword')).attacks[0];
    const dagger = deriveCharacter(wield(base, 'w-dagger')).attacks[0];
    expect(sword.hitBreakdown.parts.some((p) => p.sourceType === 'proficiency')).toBe(false);
    expect(sword.note).toMatch(/sem proficiência/);
    expect(dagger.hitBreakdown.parts.some((p) => p.sourceType === 'proficiency')).toBe(true);
  });

  it('Alto Elfo Mago sabe usar espada longa (Treinamento Élfico)', () => {
    const c = wield(make({ classId: 'wizard', raceId: 'elf', subraceId: 'high-elf' }), 'w-longsword');
    expect(deriveCharacter(c).attacks[0].note).not.toMatch(/sem proficiência/);
  });

  it('Guerreiro sabe tudo; armadura de placas sem proficiência avisa', () => {
    expect(proficienciesOf(make({ classId: 'fighter' })).armor.has('pesada')).toBe(true);
    const wiz = wield(make({ classId: 'wizard', raceId: 'human' }), 'w-dagger', 'a-plate');
    expect(deriveCharacter(wiz).breakdowns.ac.note).toMatch(/sem proficiência/);
  });

  it('armadura pesada sem a Força exigida tira 3 m (anão não perde)', () => {
    const weak = wield(make({ classId: 'fighter', raceId: 'human', baseAbilities: { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 10 } }), 'w-longsword', 'a-plate');
    expect(deriveCharacter(weak).speed).toBe(6);
    const dwarf = { ...weak, raceId: 'dwarf', subraceId: 'hill-dwarf' };
    expect(deriveCharacter(dwarf).speed).toBe(7.5);
  });
});

describe('raças: escolhas do livro', () => {
  it('Meio-Elfo escolhe os dois +1 (padrão antigo: DES e SAB)', () => {
    const c = make({ raceId: 'half-elf', baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } });
    expect(deriveCharacter(c).abilities.dex.total).toBe(11);
    const pick = { ...c, raceAbilityChoice: ['str', 'con'] as Character['raceAbilityChoice'] };
    const d = deriveCharacter(pick);
    expect([d.abilities.str.total, d.abilities.con.total, d.abilities.dex.total, d.abilities.cha.total]).toEqual([11, 11, 10, 12]);
  });

  it('Draconato Vermelho: resistência a fogo e sopro em cone', () => {
    const c = make({ raceId: 'dragonborn', subraceId: 'dragon-red' });
    expect(deriveCharacter(c).resistances.map((r) => r.value)).toContain('fogo');
    const breath = characterResources(c).find((r) => r.id === 'breath')!;
    expect(breath.desc).toMatch(/2d6 de fogo numa cone de 4,5 m|2d6 de fogo/);
    expect(characterResources({ ...c, level: 11 }).find((r) => r.id === 'breath')!.die).toBe('4d6');
  });
});
