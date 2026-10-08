import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Ferramenta grande (biblioteca de cenas, gaveta de pistas) por cima do
 * console — o palco e a sessão continuam lá atrás. Esc fecha.
 */
export function BackstageOverlay({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fv-bs-overlay" role="dialog" aria-modal="true" aria-label={title}>
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
