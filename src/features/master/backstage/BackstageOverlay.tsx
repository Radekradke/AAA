import { useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '@/lib/useDialogFocus';

/**
 * Ferramenta grande (biblioteca de cenas, gaveta de pistas) por cima do
 * console — o palco e a sessão continuam lá atrás. Foco preso, Esc fecha e
 * o foco volta para quem abriu (B-008).
 */
export function BackstageOverlay({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useDialogFocus(ref, true, onClose);
  return createPortal(
    <div ref={ref} tabIndex={-1} className="fv-bs-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fv-bs-overlay-head">
        <b>{title}</b>
        <button type="button" className="fv-btn-ghost fv-bs-mini" onClick={onClose}>
          Voltar à sessão
        </button>
      </div>
      <div className="fv-bs-overlay-body">{children}</div>
    </div>,
    document.body,
  );
}
