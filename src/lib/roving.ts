/**
 * Foco "itinerante" de grupos (abas, controle segmentado): as setas andam
 * entre as opções, Home/End vão às pontas, e o grupo inteiro é uma parada
 * só do Tab. Pula as opções desligadas. Devolve o índice novo, ou null se a
 * tecla não move.
 */
export function nextIndex(key: string, current: number, disabled: boolean[], orientation: 'horizontal' | 'vertical' = 'horizontal'): number | null {
  const n = disabled.length;
  if (!n || disabled.every(Boolean)) return null;
  const fwd = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
  const back = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
  const step = (from: number, dir: 1 | -1) => {
    let i = from;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!disabled[i]) return i;
    }
    return from;
  };
  if (key === fwd) return step(current, 1);
  if (key === back) return step(current, -1);
  if (key === 'Home') return step(n - 1, 1);
  if (key === 'End') return step(0, -1);
  return null;
}
