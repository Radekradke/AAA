import { describe, expect, it } from 'vitest';
import { bundledItemArt, cardArt, itemArt } from '../itemArt';
import { ITEM_BY_ID } from '@/data/items';

describe('arte padrão dos itens', () => {
  it('a foto do jogador vence; sem nenhuma, não inventa arte', () => {
    expect(itemArt({ image: 'data:image/webp;base64,xx', itemId: 'w-longsword' })).toBe('data:image/webp;base64,xx');
    expect(itemArt({ itemId: 'w-item-que-nao-existe' })).toBeNull();
    expect(itemArt({})).toBeNull();
  });

  it('coleção: foto do jogador sempre; arte padrão só acima de comum', () => {
    const withArt = Object.keys(bundledItemArt())[0];
    if (!withArt) return; // sem artes na pasta ainda
    expect(itemArt({ itemId: withArt })).toBeTruthy();
    expect(cardArt({ itemId: withArt, rarity: 'comum' })).toBeNull();
    expect(cardArt({ itemId: withArt, rarity: 'raro' })).toBe(itemArt({ itemId: withArt }));
    expect(cardArt({ image: 'data:image/webp;base64,yy', itemId: withArt, rarity: 'comum' })).toBe('data:image/webp;base64,yy');
  });

  it('todo arquivo em src/assets/itens tem o nome de um item do catálogo', () => {
    for (const id of Object.keys(bundledItemArt())) expect(ITEM_BY_ID[id], `${id} não é um item`).toBeTruthy();
  });

  it('ids do catálogo servem de nome de arquivo (minúsculas e hífens)', () => {
    for (const id of Object.keys(ITEM_BY_ID)) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
