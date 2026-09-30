/**
 * Cor com alfa. Usado pelos brilhos/sombras AAA.
 * - `#rrggbb` / `#rgb` → `rgba(...)`
 * - qualquer outra cor (variável de tema `var(--danger)`, `rgb(...)`, nome) →
 *   `color-mix(...)` — antes virava `rgba(NaN,...)` e a borda/fundo sumia.
 */
export function hexA(color: string, a: number): string {
  const alpha = Math.max(0, Math.min(1, a));
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return `color-mix(in srgb, ${color} ${Math.round(alpha * 1000) / 10}%, transparent)`;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}
