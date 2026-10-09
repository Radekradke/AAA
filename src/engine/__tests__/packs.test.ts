import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { itemToInventory } from '../inventory';
import { PACK_CONTENTS } from '../loadout';
import { isPack, openPack, undoPack } from '../packs';
import { getItem, GEAR } from '@/data/items';
import type { Character } from '@/types/character';

function hero(): Character {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'Teste', classId: 'fighter', raceId: 'human' }));
  c.inventory = [];
  c.equipped = { armor: null, shield: null, mainHand: null, offHand: null, ranged: null };
  return c;
}

const qty = (c: Character, id: string) => c.inventory.filter((i) => i.itemId === id).reduce((n, i) => n + i.quantity, 0);

describe('pacotes', () => {
  it('todo item do grupo Pacotes tem conteúdo, e todo conteúdo existe no catálogo', () => {
    const packs = GEAR.filter((g) => g.group === 'Pacotes');
    expect(packs.length).toBe(7);
    for (const p of packs) {
      expect(isPack(p.id), p.name).toBe(true);
      for (const [cid] of PACK_CONTENTS[p.id]) expect(getItem(cid), `${p.name}: ${cid}`).toBeTruthy();
    }
  });

  it('kits não são pacotes: continuam uma ferramenta só', () => {
    for (const id of ['g-healkit', 'g-disguise', 'g-thieves', 'g-herbalism']) expect(isPack(id)).toBe(false);
  });

  it('abre o Pacote de Explorador em itens de verdade, sem o pacote', () => {
    const c = hero();
    openPack(c, 'g-explorer');
    expect(qty(c, 'g-torch')).toBe(10);
    expect(qty(c, 'g-rations')).toBe(10);
    expect(qty(c, 'g-backpack')).toBe(1);
    expect(qty(c, 'g-explorer')).toBe(0);
  });

  it('soma às pilhas que o herói já tem', () => {
    const c = hero();
    c.inventory.push(itemToInventory(getItem('g-torch')!, 3));
    openPack(c, 'g-explorer');
    expect(c.inventory.filter((i) => i.itemId === 'g-torch')).toHaveLength(1);
    expect(qty(c, 'g-torch')).toBe(13);
  });

  it('não soma a uma pilha que está no Baú (vai para a Mochila)', () => {
    const c = hero();
    c.inventory.push({ ...itemToInventory(getItem('g-torch')!, 3), location: 'bau' });
    openPack(c, 'g-explorer');
    expect(c.inventory.filter((i) => i.itemId === 'g-torch')).toHaveLength(2);
  });

  it('dois pacotes rendem o dobro', () => {
    const c = hero();
    openPack(c, 'g-pack-dungeoneer', 2);
    expect(qty(c, 'g-piton')).toBe(20);
  });

  it('desfazer volta exatamente ao que era', () => {
    const c = hero();
    c.inventory.push(itemToInventory(getItem('g-torch')!, 3));
    const before = c.inventory.map((i) => [i.itemId, i.quantity]);
    const changes = openPack(c, 'g-explorer');
    undoPack(c, changes);
    expect(c.inventory.map((i) => [i.itemId, i.quantity])).toEqual(before);
  });

  it('o peso aberto é o dos itens de dentro', () => {
    const c = hero();
    openPack(c, 'g-explorer');
    const kg = c.inventory.reduce((n, i) => n + i.weight * i.quantity, 0);
    expect(kg).toBeGreaterThan(20);
  });
});
