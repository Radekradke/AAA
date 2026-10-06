import type { InventoryItem } from '@/types/character';
import type { Item } from '@/types/dnd';
import { toggleEquip as computeEquip, itemToInventory, MAX_ATTUNEMENT, moveItemTo } from '@/engine/inventory';
import type { CharacterState, StoreCtx } from './types';
import { playSample } from '@/lib/sfx';

/** Mochila e moedas: itens, equipar, mover entre recipientes, favoritos, sintonização. */
export function inventoryActions({ get, mutate }: StoreCtx): Pick<CharacterState, 'addInventoryItem' | 'updateInventoryItem' | 'removeInventoryItem' | 'toggleEquip' | 'moveItem' | 'toggleFavorite' | 'toggleAttune' | 'adjustCoin' | 'setCoin'> {
  return {
    addInventoryItem(id, item) {
      playSample('mochila');
      mutate(id, (c) => {
        const inst = 'uid' in item ? (item as InventoryItem) : itemToInventory(item as Item);
        c.inventory.push(inst);
      });
    },
    updateInventoryItem(id, uid, patch) {
      mutate(id, (c) => {
        const idx = c.inventory.findIndex((i) => i.uid === uid);
        if (idx === -1) return;
        // item editado deixa de referenciar o catálogo: os dados passam a viver na instância
        c.inventory[idx] = { ...c.inventory[idx], ...patch, uid, itemId: undefined };
      });
    },
    removeInventoryItem(id, uid) {
      mutate(id, (c) => {
        c.inventory = c.inventory.filter((i) => i.uid !== uid);
        for (const slot of Object.keys(c.equipped) as Array<keyof typeof c.equipped>) {
          if (c.equipped[slot] === uid) c.equipped[slot] = null;
        }
      });
    },
    toggleEquip(id, uid) {
      playSample('equipar');
      const char = get().getCharacter(id);
      if (!char) return;
      const it = char.inventory.find((i) => i.uid === uid);
      if (!it) return;
      const equipped = computeEquip(char, it);
      mutate(id, (c) => {
        c.equipped = equipped;
      });
    },
    moveItem(id, uid, target) {
      const char = get().getCharacter(id);
      if (!char) return { ok: false, reason: 'Ficha não encontrada.' };
      // valida num rascunho: movimento recusado não marca a ficha como editada
      const probe = moveItemTo(structuredClone(char), uid, target);
      if (!probe.ok) return probe;
      mutate(id, (c) => void moveItemTo(c, uid, target));
      return probe;
    },
    toggleFavorite(id, uid) {
      mutate(id, (c) => {
        const it = c.inventory.find((i) => i.uid === uid);
        if (it) it.favorite = !it.favorite;
      });
    },
    toggleAttune(id, uid) {
      mutate(id, (c) => {
        const it = c.inventory.find((i) => i.uid === uid);
        if (!it) return;
        if (it.attuned) {
          it.attuned = false;
        } else if (c.inventory.filter((i) => i.attuned).length < MAX_ATTUNEMENT) {
          it.attuned = true;
        }
      });
    },
    adjustCoin(id, coin, delta) {
      if (delta) playSample('moedas');
      mutate(id, (c) => {
        c.coins[coin] = Math.max(0, c.coins[coin] + delta);
      });
    },
    setCoin(id, coin, value) {
      mutate(id, (c) => {
        c.coins[coin] = Math.max(0, Math.floor(value) || 0);
      });
    },
  };
}
