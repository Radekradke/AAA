import { useCallback } from 'react';
import type { MouseEvent } from 'react';

const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window;

/**
 * Microinteração de inclinação 3D nos cards (luz + deslocamento ao passar o
 * mouse). Desativada em telas de toque para preservar performance no celular.
 */
export function useTilt() {
  const onMouseMove = useCallback((e: MouseEvent<HTMLElement>) => {
    if (isTouch) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(820px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-4px)`;
  }, []);

  const onMouseLeave = useCallback((e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = '';
  }, []);

  return { onMouseMove, onMouseLeave };
}
