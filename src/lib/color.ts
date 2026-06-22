/** Converte um hex (#rrggbb) em rgba com alfa. Usado pelos brilhos/sombras AAA. */
export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substr(0, 2), 16);
  const g = parseInt(h.substr(2, 2), 16);
  const b = parseInt(h.substr(4, 2), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}
