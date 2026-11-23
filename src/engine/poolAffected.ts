/** Quem é afetado: do menor PV ao maior, enquanto o total cobrir (Sono, Cor Cintilante…). */
export function poolAffected(total: number, hps: number[]): { affected: number[]; spared: number[]; left: number } {
  const sorted = hps.filter((h) => Number.isFinite(h) && h > 0).sort((a, b) => a - b);
  const affected: number[] = [];
  let left = total;
  let i = 0;
  for (; i < sorted.length && sorted[i] <= left; i++) {
    affected.push(sorted[i]);
    left -= sorted[i];
  }
  return { affected, spared: sorted.slice(i), left };
}
