import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/** Diálogos abertos, do de baixo para o de cima: só o de cima reage ao teclado. */
const stack: HTMLElement[] = [];

/**
 * Foco de diálogo acessível (modal, confirmação):
 * - ao abrir, o foco entra no diálogo (o leitor de tela anuncia o título);
 * - Tab / Shift+Tab ficam presos dentro dele;
 * - Esc fecha só o diálogo de cima (os de baixo e atalhos da página não reagem);
 * - ao fechar, o foco volta para quem abriu.
 * O elemento precisa de tabIndex={-1}.
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  const escRef = useRef(onEscape);
  escRef.current = onEscape;

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    stack.push(el);
    if (!el.contains(document.activeElement)) el.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== el) return;
      if (e.key === 'Escape') {
        if (!escRef.current) return;
        // campo que pediu (data-esc-list) com a lista aberta: o Esc fecha só a lista
        const t = e.target as HTMLElement | null;
        if (t?.hasAttribute?.('data-esc-list') && t.getAttribute('aria-expanded') === 'true') return;
        e.preventDefault();
        e.stopPropagation(); // não chega aos atalhos da página (ex.: sair da tela cheia)
        escRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.getClientRects().length > 0);
      if (!items.length) {
        e.preventDefault();
        el.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const cur = document.activeElement;
      if (e.shiftKey && (cur === first || cur === el || !el.contains(cur))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (cur === last || !el.contains(cur))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      const i = stack.lastIndexOf(el);
      if (i >= 0) stack.splice(i, 1);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [active, ref]);
}
