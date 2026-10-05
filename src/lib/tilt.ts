import type React from 'react';

/**
 * Inclinação 3D + reflexo seguindo o ponteiro (carta do herói e dos
 * companheiros). Escreve --mx/--my/--rx/--ry/--hue no próprio elemento;
 * no toque não faz nada (o dedo já está em cima).
 */
export function tiltHandlers(depth = 1): { onPointerMove: (e: React.PointerEvent<HTMLElement>) => void; onPointerLeave: (e: React.PointerEvent<HTMLElement>) => void } {
  return {
    onPointerMove(e) {
      if (e.pointerType === 'touch') return;
      const r = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const el = e.currentTarget.style;
      el.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      el.setProperty('--rx', `${((0.5 - y) * 9 * depth).toFixed(2)}deg`);
      el.setProperty('--ry', `${((x - 0.5) * 11 * depth).toFixed(2)}deg`);
      el.setProperty('--hue', `${Math.round(x * 220 + y * 140)}deg`);
    },
    onPointerLeave(e) {
      for (const v of ['--mx', '--my', '--rx', '--ry', '--hue']) e.currentTarget.style.removeProperty(v);
    },
  };
}
