import type { Character } from '@/types/character';
import { getItem } from '@/data/items';
import { containerOf, itemToInventory, removeFromSlots } from './inventory';
import { PACK_CONTENTS, STACKS } from './loadout';

/**
 * Pacotes do Livro do Jogador (Explorador, Masmorras, Assaltante…) são só
 * itens vendidos juntos: na ficha eles sempre viram os itens de dentro, para
 * dar para gastar uma tocha ou contar as rações. Kits (Curandeiro, Disfarce…)
 * não são pacotes — são uma ferramenta só e não passam por aqui.
 */
export function isPack(itemId: string | null | undefined): boolean {
  return !!itemId && !!PACK_CONTENTS[itemId];
}

/** Quantos itens diferentes o pacote rende (para o aviso "8 itens"). */
export function packSize(itemId: string): number {
  return PACK_CONTENTS[itemId]?.length ?? 0;
}

/** O que a abertura mudou: o Desfazer volta exatamente isso. */
export interface PackChange {
  uid: string;
  /** Quanto foi somado a uma pilha que já existia (0 = item novo). */
  added: number;
}

/**
 * Abre `qty` pacotes na ficha (muta o rascunho). Itens que empilham somam à
 * pilha que o herói já tem no mesmo recipiente (3 tochas + 10 = 13); o resto
 * entra como item novo.
 */
export function openPack(c: Character, packId: string, qty = 1, location?: 'mochila' | 'bau'): PackChange[] {
  const contents = PACK_CONTENTS[packId];
  if (!contents) return [];
  const changes: PackChange[] = [];
  const where = location ?? 'mochila';
  for (const [cid, n] of contents) {
    const item = getItem(cid);
    if (!item) continue;
    const total = n * qty;
    if (STACKS(cid)) {
      const pile = c.inventory.find((i) => i.itemId === cid && !i.homebrew && containerOf(c, i) === where);
      if (pile) {
        pile.quantity += total;
        changes.push({ uid: pile.uid, added: total });
        continue;
      }
      const inst = { ...itemToInventory(item, total), ...(location && { location }) };
      c.inventory.push(inst);
      changes.push({ uid: inst.uid, added: 0 });
    } else {
      for (let i = 0; i < total; i++) {
        const inst = { ...itemToInventory(item), ...(location && { location }) };
        c.inventory.push(inst);
        changes.push({ uid: inst.uid, added: 0 });
      }
    }
  }
  return changes;
}

/** Desfaz uma abertura: tira os itens novos e devolve as pilhas ao que eram. */
export function undoPack(c: Character, changes: PackChange[]): void {
  for (const ch of changes) {
    const it = c.inventory.find((i) => i.uid === ch.uid);
    if (!it) continue;
    if (ch.added > 0 && it.quantity > ch.added) {
      it.quantity -= ch.added;
      continue;
    }
    c.inventory = c.inventory.filter((i) => i.uid !== ch.uid);
    c.equipped = removeFromSlots(c.equipped, ch.uid);
  }
}
