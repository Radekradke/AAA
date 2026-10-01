import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useFeedback } from '@/store/feedbackStore';

/**
 * Avisos (toasts) e confirmações no visual do tema. Montado uma vez no App.
 * Toasts ficam no rodapé, acima da barra de abas do celular, e são lidos
 * por leitores de tela (aria-live).
 */
export function FeedbackHost() {
  const toasts = useFeedback((s) => s.toasts);
  const dismiss = useFeedback((s) => s.dismiss);
  const confirm = useFeedback((s) => s.confirm);
  const okRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!confirm) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') confirm.resolve(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm]);

  return createPortal(
    <>
      <div className="fv-toasts" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`fv-toast is-${t.tone}`}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.16 } }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <span className="fv-toast-dot" aria-hidden />
              <span className="fv-toast-msg">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="fv-toast-action"
                  onClick={() => {
                    t.action!.run();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" className="fv-toast-close" aria-label="Fechar aviso" onClick={() => dismiss(t.id)}>
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirm && (
          <motion.div className="fv-confirm-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => confirm.resolve(false)}>
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="fv-confirm-title"
              aria-describedby={confirm.message ? 'fv-confirm-msg' : undefined}
              className="fv-confirm fv-panel"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="fv-confirm-title">{confirm.title}</h2>
              {confirm.message && <p id="fv-confirm-msg">{confirm.message}</p>}
              <div className="fv-confirm-actions">
                <button type="button" className="fv-btn-ghost fv-confirm-btn" onClick={() => confirm.resolve(false)}>
                  {confirm.cancelLabel ?? 'Cancelar'}
                </button>
                <button
                  ref={okRef}
                  type="button"
                  className={'fv-confirm-btn ' + (confirm.danger ? 'fv-confirm-danger' : 'fv-btn-gold')}
                  onClick={() => confirm.resolve(true)}
                >
                  {confirm.confirmLabel ?? 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
