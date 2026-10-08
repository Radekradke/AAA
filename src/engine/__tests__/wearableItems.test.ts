import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { ensureCharacterV2 } from '../levelUp';
import { canEquip, containerOf, customInventoryItem, itemIsActive, moveItemTo } from '../inventory';
import { itemGrantedSpells } from '../spellcasting';
import type { Character, InventoryItem } from '@/types/character';

function hero(): Character {
  const d = createDraftCharacter({ ownerId: 't', name: 'T', classId: 'sorcerer', raceId: 'human' });
  return ensureCharacterV2(finalizeCharacter(d));
}
const withItem = (c: Character, it: InventoryItem): Character => ({ ...c, inventory: [...c.inventory, it] });

describe('Forja: vestível e parte do corpo', () => {
  it('parte do corpo vale sempre, não pesa e não sai do herói', () => {
    const base = hero();
    const eye = customInventoryItem({ name: 'Olho Demoníaco', category: 'other', wear: 'body', weight: 1, magic: { spellDC: 1, resistances: ['fogo'] } });
    const c = withItem(base, eye);
    const d = deriveCharacter(c);
    expect(d.spellDC).toBe(deriveCharacter(base).spellDC! + 1);
    expect(d.resistances.map((r) => r.value)).toContain('fogo');
    expect(d.carriedWeight).toBe(deriveCharacter(base).carriedWeight);
    expect(containerOf(c, eye)).toBe('equipado');
    expect(canEquip(eye)).toBe(false);
    const r = moveItemTo(c, eye.uid, 'bau');
    expect(r.ok).toBe(false);
  });

  it('vestível só vale vestido (Vestir/Tirar pelo Equipado)', () => {
    const amulet = customInventoryItem({ name: 'Amuleto', category: 'wondrous', wear: 'worn', magic: { ac: 1 } });
    const c = withItem(hero(), amulet);
    const ac0 = deriveCharacter(c).ac;
    expect(amulet.worn).toBe(false);
    expect(canEquip(amulet)).toBe(true);

    expect(moveItemTo(c, amulet.uid, 'equipado').ok).toBe(true);
    expect(c.inventory.find((i) => i.uid === amulet.uid)!.worn).toBe(true);
    expect(deriveCharacter(c).ac).toBe(ac0 + 1);

    moveItemTo(c, amulet.uid, 'mochila');
    expect(deriveCharacter(c).ac).toBe(ac0);
  });

  it('vestível que pede sintonia precisa estar vestido E sintonizado', () => {
    const c = hero();
    const ring = customInventoryItem({ name: 'Colar', category: 'wondrous', wear: 'worn', worn: true, attunement: true, magic: { saves: 1 } });
    expect(itemIsActive(c, ring)).toBe(false);
    expect(itemIsActive(c, { ...ring, attuned: true })).toBe(true);
  });

  it('item forjado novo guarda a magia concedida (antes se perdia)', () => {
    const arm = customInventoryItem({ name: 'Braço Rúnico', category: 'other', wear: 'body', grantsSpells: [{ spellId: 'sp-maosmagicas', recharge: 'atwill' }] });
    expect(arm.grantsSpells).toHaveLength(1);
    const spells = itemGrantedSpells(withItem(hero(), arm));
    expect(spells.map((s) => s.itemName)).toContain('Braço Rúnico');
  });

  it('item comum continua igual (sem "como se usa")', () => {
    const rope = customInventoryItem({ name: 'Corda', category: 'gear' });
    expect(rope.wear).toBeUndefined();
    expect(canEquip(rope)).toBe(false);
  });
});
