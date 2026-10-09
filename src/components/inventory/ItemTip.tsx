import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { getItem } from '@/data/items';
import { itemArt } from '@/lib/itemArt';
import { itemLore } from '@/lib/lore';
import type { LoreInfo } from '@/lib/lore';

/**
 * Nome de item com a dica do BG3 ao passar o mouse (no celular: segurar):
 * tipo, dano/CA, propriedades, peso e preço — e a carta, se tiver arte.
 */
/** A dica completa de um item do catálogo (com a carta, se tiver arte). */
export function itemInfo(id: string): LoreInfo | null {
  const it = getItem(id);
  if (!it) return null;
  const art = itemArt({ itemId: it.id });
  return { ...itemLore(it), ...(art ? { art: { src: art, rarity: it.rarity } } : {}) };
}

export function ItemTip({ id, label, qty }: { id: string | undefined | null; label?: string; qty?: number }) {
  const it = getItem(id);
  const text = `${label ?? it?.name ?? id ?? ''}${qty && qty > 1 ? ` ×${qty}` : ''}`;
  const info = it ? itemInfo(it.id) : null;
  if (!info) return <>{text}</>;
  return (
    <LoreTooltip info={info}>
      <span className="fv-item-tip">{text}</span>
    </LoreTooltip>
  );
}

/** Lista "a, b, c" com nós React (cada item com a sua dica). */
export function joinNodes(nodes: ReactNode[], sep = ', '): ReactNode {
  return nodes.map((n, i) => (
    <Fragment key={i}>
      {i > 0 && sep}
      {n}
    </Fragment>
  ));
}
