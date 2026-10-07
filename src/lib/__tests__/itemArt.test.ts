import { describe, expect, it } from 'vitest';
import { bundledItemArt, itemArt } from '../itemArt';
import { ITEM_BY_ID } from '@/data/items';

describe('arte padrão dos itens', () => {
  it('a foto do jogador vence; sem nenhuma, não inventa arte', () => {
    expect(itemArt({ image: 'data:image/webp;base64,xx', itemId: 'w-longsword' })).toBe('data:image/webp;base64,xx');
    expect(itemArt({ itemId: 'w-item-que-nao-existe' })).toBeNull();
    expect(itemArt({})).toBeNull();
  });

  it('todo arquivo em src/assets/itens tem o nome de um item do catálogo', () => {
    for (const id of Object.keys(bundledItemArt())) expect(ITEM_BY_ID[id], `${id} não é um item`).toBeTruthy();
  });

  it('ids do catálogo servem de nome de arquivo (minúsculas e hífens)', () => {
    for (const id of Object.keys(ITEM_BY_ID)) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
