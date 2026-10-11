import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Janela flutuante presa a um botão (dano, acertou?, conjurar): se não cabe
 * embaixo, abre para cima. Sem isso o fim da janela (e o botão "Rolar dano")
 * some atrás do fim da página ou de um contêiner com rolagem.
 */
export function usePopFlip<T extends HTMLElement>(open: unknown) {
  const ref = useRef<T | null>(null);
  const [up, setUp] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return setUp(false);
    const anchor = el.parentElement?.getBoundingClientRect();
    if (!anchor) return;
    const h = el.offsetHeight;
    const below = window.innerHeight - anchor.bottom - 8;
    const above = anchor.top - 8;
    setUp(h > below && above > below);
  }, [open]);
  return { ref, up };
}
