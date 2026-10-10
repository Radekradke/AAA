import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { itemToInventory } from '../inventory';
import { ammoCount, ammoKindFor, ammoStatus, recoverAmmo, refundAmmo, spendAmmo } from '../ammo';
import { getItem } from '@/data/items';
import type { Character, InventoryItem } from '@/types/character';

/** Ficha vazia com as armas e a munição pedidas. */
function hero(items: Array<[string, number?]>): Character {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'Arqueira', classId: 'ranger', raceId: 'elf' }));
  c.inventory = items.map(([id, q]) => itemToInventory(getItem(id)!, q ?? 1));
  c.combat.ammoSpent = {};
  return c;
}
const uidOf = (c: Character, id: string) => c.inventory.find((i) => i.itemId === id)!.uid;
const fire = (c: Character, id: string) => spendAmmo(c, uidOf(c, id));

describe('munição: arma certa, peça certa', () => {
  it('arco gasta flecha, besta gasta virote, funda bala, zarabatana agulha', () => {
    const kind = (id: string) => ammoKindFor(itemToInventory(getItem(id)!))?.itemId;
    expect(kind('w-shortbow')).toBe('g-arrows');
    expect(kind('w-longbow')).toBe('g-arrows');
    expect(kind('w-lightcrossbow')).toBe('g-bolts');
    expect(kind('w-handcrossbow')).toBe('g-bolts');
    expect(kind('w-heavycrossbow')).toBe('g-bolts');
    expect(kind('w-sling')).toBe('g-bullets');
    expect(kind('w-blowgun')).toBe('g-needles');
  });

  it('armas corpo a corpo e de arremesso não usam munição', () => {
    for (const id of ['w-longsword', 'w-dagger', 'w-javelin', 'w-dart']) expect(ammoKindFor(itemToInventory(getItem(id)!))).toBeUndefined();
  });

  it('arco encantado (+1) e arco da Forja também gastam flecha', () => {
    expect(ammoKindFor(itemToInventory(getItem('w-longbow-plus1')!))?.itemId).toBe('g-arrows');
    const forged: InventoryItem = { ...itemToInventory(getItem('w-longbow')!), itemId: undefined, name: 'Arco de Teixo do Avô' };
    expect(ammoKindFor(forged)?.itemId).toBe('g-arrows');
    const xbow: InventoryItem = { ...itemToInventory(getItem('w-heavycrossbow')!), itemId: undefined, name: 'Besta Anã' };
    expect(ammoKindFor(xbow)?.itemId).toBe('g-bolts');
  });
});

describe('munição: cada disparo gasta uma', () => {
  it('"Flechas (20)": 20 disparos, contando 19, 18…', () => {
    const c = hero([['w-longbow'], ['g-arrows']]);
    expect(ammoStatus(c, uidOf(c, 'w-longbow'))?.count).toBe(20);
    const r = fire(c, 'w-longbow');
    expect(r).toMatchObject({ ok: true, left: 19 });
    expect(ammoCount(c.inventory.find((i) => i.itemId === 'g-arrows')!)).toBe(19);
    expect(c.combat.ammoSpent?.['g-arrows']).toBe(1);
  });

  it('besta gasta virote, não flecha', () => {
    const c = hero([['w-lightcrossbow'], ['g-arrows'], ['g-bolts']]);
    fire(c, 'w-lightcrossbow');
    expect(ammoCount(c.inventory.find((i) => i.itemId === 'g-bolts')!)).toBe(19);
    expect(ammoCount(c.inventory.find((i) => i.itemId === 'g-arrows')!)).toBe(20);
  });

  it('dois pacotes: abre um, e ao acabar passa para o próximo', () => {
    const c = hero([['w-shortbow'], ['g-arrows', 2]]);
    for (let i = 0; i < 21; i++) fire(c, 'w-shortbow');
    const arrows = c.inventory.find((i) => i.itemId === 'g-arrows')!;
    expect(arrows.quantity).toBe(1);
    expect(ammoCount(arrows)).toBe(19);
  });

  it('a última flecha some da mochila; depois disso, avisa que acabou', () => {
    const c = hero([['w-shortbow'], ['g-arrows']]);
    for (let i = 0; i < 19; i++) fire(c, 'w-shortbow');
    expect(fire(c, 'w-shortbow')).toMatchObject({ ok: true, left: 0 });
    expect(c.inventory.some((i) => i.itemId === 'g-arrows')).toBe(false);
    expect(fire(c, 'w-shortbow')).toMatchObject({ ok: false, reason: 'empty' });
  });

  it('flechas guardadas no Baú não servem: o aviso diz onde estão', () => {
    const c = hero([['w-shortbow'], ['g-arrows']]);
    c.inventory.find((i) => i.itemId === 'g-arrows')!.location = 'bau';
    const st = ammoStatus(c, uidOf(c, 'w-shortbow'))!;
    expect([st.count, st.stored]).toEqual([0, 20]);
    expect(fire(c, 'w-shortbow')).toMatchObject({ ok: false, reason: 'stored' });
  });

  it('espada não mexe em nada', () => {
    const c = hero([['w-longsword'], ['g-arrows']]);
    expect(fire(c, 'w-longsword')).toBeNull();
    expect(ammoCount(c.inventory.find((i) => i.itemId === 'g-arrows')!)).toBe(20);
  });
});

describe('munição: desfazer e recolher depois da luta', () => {
  it('desfazer devolve a flecha e tira da conta do recolher', () => {
    const c = hero([['w-longbow'], ['g-arrows']]);
    const r = fire(c, 'w-longbow');
    refundAmmo(c, r!.kind);
    expect(ammoStatus(c, uidOf(c, 'w-longbow'))).toMatchObject({ count: 20, spent: 0 });
  });

  it('desfazer a última flecha: ela volta para a mochila', () => {
    const c = hero([['w-longbow'], ['g-arrows']]);
    let r = fire(c, 'w-longbow');
    for (let i = 0; i < 19; i++) r = fire(c, 'w-longbow');
    refundAmmo(c, r!.kind);
    expect(ammoStatus(c, uidOf(c, 'w-longbow'))?.count).toBe(1);
  });

  it('recolher devolve metade do disparado (para baixo) e zera a conta', () => {
    const c = hero([['w-longbow'], ['g-arrows']]);
    for (let i = 0; i < 7; i++) fire(c, 'w-longbow');
    const kind = ammoKindFor(c.inventory.find((i) => i.itemId === 'w-longbow'))!;
    expect(recoverAmmo(c, kind)).toBe(3);
    expect(ammoStatus(c, uidOf(c, 'w-longbow'))).toMatchObject({ count: 16, spent: 0 });
  });

  it('recolher depois de esvaziar a aljava cria o pacote de novo', () => {
    const c = hero([['w-longbow'], ['g-arrows']]);
    for (let i = 0; i < 20; i++) fire(c, 'w-longbow');
    const kind = ammoKindFor(c.inventory.find((i) => i.itemId === 'w-longbow'))!;
    expect(recoverAmmo(c, kind)).toBe(10);
    const arrows = c.inventory.find((i) => i.itemId === 'g-arrows')!;
    expect([arrows.quantity, ammoCount(arrows)]).toEqual([1, 10]);
  });
});
