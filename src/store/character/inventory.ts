import type { InventoryItem } from '@/types/character';
import type { Item } from '@/types/dnd';
import { attunementBlock, toggleEquip as computeEquip, isWearable, isWorn, itemToInventory, MAX_ATTUNEMENT, moveItemTo, removeFromSlots } from '@/engine/inventory';
import type { CharacterState, StoreCtx } from './types';
import { playSample } from '@/lib/sfx';
import { isPack, openPack, undoPack } from '@/engine/packs';
import type { PackChange } from '@/engine/packs';
import { toast } from '@/store/feedbackStore';

/** Aviso "Pacote aberto" com Desfazer (que volta exatamente o que mudou). */
function announceOpened(mutate: StoreCtx['mutate'], id: string, name: string, changes: PackChange[], closed?: InventoryItem) {
  if (!changes.length) return;
  const n = new Set(changes.map((c) => c.uid)).size;
  toast(`${name} aberto: ${n} ${n === 1 ? 'item' : 'itens'} ${closed?.location === 'bau' ? 'no Baú' : 'na Mochila'}`, {
    tone: 'ok',
    action: {
      label: 'Desfazer',
      run: () =>
        mutate(id, (c) => {
          undoPack(c, changes);
          if (closed) c.inventory.push(closed);
        }),
    },
  });
}

/** Mochila e moedas: itens, equipar, mover entre recipientes, favoritos, sintonização. */
export function inventoryActions({ get, mutate }: StoreCtx): Pick<CharacterState, 'addInventoryItem' | 'updateInventoryItem' | 'removeInventoryItem' | 'openPackItem' | 'toggleEquip' | 'moveItem' | 'toggleFavorite' | 'toggleAttune' | 'adjustCoin' | 'setCoin'> {
  return {
    addInventoryItem(id, item) {
      playSample('mochila');
      const inst = 'uid' in item ? (item as InventoryItem) : null;
      const itemId = inst ? inst.itemId : (item as Item).id;
      // pacote do catálogo: entra aberto (cada tocha e ração vira item de verdade)
      if (isPack(itemId) && !inst?.homebrew) {
        let changes: PackChange[] = [];
        mutate(id, (c) => {
          changes = openPack(c, itemId!, inst?.quantity ?? 1, inst?.location);
        });
        announceOpened(mutate, id, item.name, changes);
        return;
      }
      mutate(id, (c) => {
        c.inventory.push(inst ?? itemToInventory(item as Item));
      });
    },
    openPackItem(id, uid) {
      const pack = get().getCharacter(id)?.inventory.find((i) => i.uid === uid);
      if (!pack || !isPack(pack.itemId)) return;
      playSample('mochila');
      let changes: PackChange[] = [];
      mutate(id, (c) => {
        c.inventory = c.inventory.filter((i) => i.uid !== uid);
        c.equipped = removeFromSlots(c.equipped, uid);
        changes = openPack(c, pack.itemId!, pack.quantity, pack.location);
      });
      // Desfazer devolve o pacote fechado
      announceOpened(mutate, id, pack.name, changes, pack);
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
        c.equipped = removeFromSlots(c.equipped, uid);
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
        } else if (c.inventory.filter((i) => i.attuned).length < MAX_ATTUNEMENT && !attunementBlock(c, it)) {
          // fixa o "vestido" antes (ficha antiga não tinha): sintonizar não veste sozinho por baixo dos panos
          if (isWearable(it) && it.worn === undefined) it.worn = isWorn(it);
          it.attuned = true;
          // sintonizou anel/capa/botas guardado: veste junto, se houver encaixe livre
          if (isWearable(it) && !it.worn) moveItemTo(c, uid, 'equipado');
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
