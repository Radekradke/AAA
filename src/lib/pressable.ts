import type { KeyboardEvent, MouseEvent } from 'react';

/**
 * Elemento que age como botão sem ser <button> (cartão de atributo, losango
 * de espaço de magia): recebe foco e responde a Enter e Espaço, como o mouse.
 * Prefira <button>; use isto quando o elemento já é um layout próprio.
 */
export function pressable(run: (e: MouseEvent | KeyboardEvent) => void, label?: string) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    ...(label ? { 'aria-label': label } : {}),
    onClick: (e: MouseEvent) => run(e),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      run(e);
    },
  };
}
