import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Janela pequena presa a um botão (menu de conjurar, "acertou?", golpe final):
 * Esc fecha quando o foco está dentro de `box` e devolve o foco a quem abriu.
 * Não fecha com clique fora (o comportamento de cada janela continua o mesmo).
 */
export function useEscClose(open: boolean, close: () => void, box: RefObject<HTMLElement | null>) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const a = document.activeElement;
      if (!a || !box.current?.contains(a)) return;
      e.preventDefault();
      e.stopPropagation(); // não chega aos atalhos da página
      closeRef.current();
      if (opener?.isConnected && box.current?.contains(opener)) opener.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, box]);
}
