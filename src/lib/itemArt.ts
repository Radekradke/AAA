import type { InventoryItem } from '@/types/character';

/**
 * Arte padrão dos itens do catálogo: basta soltar `src/assets/itens/<id>.webp`
 * (ex.: `w-longsword.webp`, `a-chain-mail.webp`) — o app pega sozinho.
 * Veja docs/ARTE-ITENS.md (a lista de todos os ids). A foto que o jogador
 * enviar para o item na ficha sempre vence a padrão.
 */
const ART: Record<string, string> = {};
for (const [path, url] of Object.entries(
  import.meta.glob('../assets/itens/*.{webp,png,jpg,jpeg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
)) {
  ART[path.split('/').pop()!.replace(/\.[a-z]+$/i, '').toLowerCase()] = url;
}

/** Ids que já têm arte padrão (para o guia e os testes). */
export function bundledItemArt(): Record<string, string> {
  return ART;
}

/** Arte do item: a foto do jogador ou, sem ela, a padrão do catálogo (armas +1/+2/+3 usam a da base). */
export function itemArt(it: Pick<InventoryItem, 'image' | 'itemId'>): string | null {
  if (it.image) return it.image;
  const id = it.itemId?.replace(/-plus[123]$/, '');
  return (id && ART[id]) || null;
}
