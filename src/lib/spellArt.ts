/**
 * Arte das magias: basta soltar `src/assets/magias/<id>.webp`
 * (ex.: `sp-bolafogo.webp`, `phb-guiding-bolt.webp`) — o app pega sozinho e
 * mostra a carta ao lado dos detalhes da magia. Veja docs/ARTE-MAGIAS.md
 * (a lista de todos os ids e o prompt de cada uma).
 */
const ART: Record<string, string> = {};
for (const [path, url] of Object.entries(
  import.meta.glob('../assets/magias/*.{webp,png,jpg,jpeg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
)) {
  ART[path.split('/').pop()!.replace(/\.[a-z]+$/i, '').toLowerCase()] = url;
}

/** Ids que já têm arte (para o guia e os testes). */
export function bundledSpellArt(): Record<string, string> {
  return ART;
}

export function spellArt(id: string | null | undefined): string | null {
  return (id && ART[id]) || null;
}

/**
 * Moldura da carta pelo círculo, nas cores de raridade dos itens:
 * truque comum, 1º–2º incomum, 3º–5º raro, 6º–8º muito raro, 9º lendário.
 */
export function spellRarity(level: number): string {
  if (level <= 0) return 'comum';
  if (level <= 2) return 'incomum';
  if (level <= 5) return 'raro';
  if (level <= 8) return 'muito-raro';
  return 'lendario';
}
