import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { ensureCharacterV2 } from '../levelUp';
import { itemToInventory } from '../inventory';
import { ALL_ITEMS, getItem } from '@/data/items';
import { WEAPONS } from '@/data/weapons';
import { ARMORS } from '@/data/armors';
import type { Character, InventoryItem } from '@/types/character';

function hero(classId = 'fighter'): Character {
  const d = createDraftCharacter({ ownerId: 't', name: 'T', classId, raceId: 'human' });
  return ensureCharacterV2(finalizeCharacter(d));
}
function give(c: Character, id: string, patch: Partial<InventoryItem> = {}): { c: Character; it: InventoryItem } {
  const it = { ...itemToInventory(getItem(id)!), ...patch };
  return { c: { ...c, inventory: [...c.inventory, it] }, it };
}

describe('catálogo do Livro do Jogador', () => {
  it('37 armas (14 simples + 23 marciais) e 13 armaduras/escudo', () => {
    const base = WEAPONS.filter((w) => !w.id.includes('plus'));
    expect(base.length).toBe(37);
    expect(base.filter((w) => w.weapon?.type === 'simple').length).toBe(14);
    expect(ARMORS.length).toBe(13);
  });
  it('ids únicos em todo o catálogo e preço em todos', () => {
    const ids = ALL_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ALL_ITEMS.filter((i) => i.value === undefined).map((i) => i.id)).toEqual([]);
    expect(ALL_ITEMS.length).toBeGreaterThan(250);
  });
  it('arma encantada é reconhecida pelo id (fichas salvas)', () => {
    const it = getItem('w-longsword-plus2')!;
    expect(it.name).toBe('Espada Longa +2');
    expect(it.weapon!.magicBonus).toBe(2);
    expect(it.rarity).toBe('raro');
  });
});

describe('itens mágicos aplicam sozinhos (vestidos e sintonizados)', () => {
  it('Manoplas de Força do Ogro: FOR passa a 19', () => {
    const { c, it } = give(hero(), 'm-gauntlets-ogre', { worn: true });
    expect(deriveCharacter(c).abilities.str.total).toBeLessThan(19);
    const on = { ...c, inventory: c.inventory.map((x) => (x.uid === it.uid ? { ...x, attuned: true } : x)) };
    expect(deriveCharacter(on).abilities.str.total).toBe(19);
  });
  it('Anel de Proteção vestido e sintonizado: +1 CA e +1 em salvaguardas', () => {
    const base = deriveCharacter(hero());
    const { c } = give(hero(), 'm-ring-prot', { attuned: true, worn: true });
    const d = deriveCharacter(c);
    expect(d.ac).toBe(base.ac + 1);
    expect(d.abilities.dex.save).toBe(base.abilities.dex.save + 1);
  });
  it('Braçadeiras de Defesa só sem armadura e sem escudo', () => {
    const bare = (c: Character) => ({ ...c, equipped: { ...c.equipped, armor: null, shield: null } });
    const monk = hero('monk');
    const { c } = give(monk, 'm-bracers-defense', { attuned: true, worn: true });
    expect(deriveCharacter(bare(c)).ac).toBe(deriveCharacter(bare(monk)).ac + 2);
    // com armadura de couro: as braçadeiras não somam
    const { c: armored, it: leather } = give(c, 'a-leather');
    const { c: plain, it: leather2 } = give(monk, 'a-leather');
    expect(deriveCharacter({ ...armored, equipped: { ...armored.equipped, armor: leather.uid, shield: null } }).ac).toBe(
      deriveCharacter({ ...plain, equipped: { ...plain.equipped, armor: leather2.uid, shield: null } }).ac,
    );
  });
  it('Armadura +1 soma na CA; Varinha do Mago de Guerra +2 soma no ataque de magia', () => {
    const f = hero();
    const { c, it } = give(f, 'a-chainmail-plus1');
    expect(deriveCharacter({ ...c, equipped: { ...c.equipped, armor: it.uid, shield: null } }).ac).toBe(17);
    const w = hero('wizard');
    const { c: cw } = give(w, 'm-wand-warmage2', { attuned: true });
    expect(deriveCharacter(cw).spellAttack).toBe(deriveCharacter(w).spellAttack! + 2);
  });
  it('item no Baú não vale; Língua de Fogo soma 2d6 de fogo', () => {
    const { c, it } = give(hero(), 'mw-flametongue', { attuned: true });
    const d = deriveCharacter({ ...c, equipped: { ...c.equipped, mainHand: it.uid } });
    expect(d.attacks.find((a) => a.uid === it.uid)!.bonusDamage).toEqual({ dice: 2, die: 6, type: 'fogo' });
    const { c: cs } = give(hero(), 'm-periapt-poison', { location: 'bau' });
    expect(deriveCharacter(cs).resistances.some((r) => r.source.includes('Periapto'))).toBe(false);
  });
});
