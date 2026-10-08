import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, LazyMotion, m } from 'framer-motion';
import { useFeedback } from '@/store/feedbackStore';
import { useDialogFocus } from '@/lib/useDialogFocus';

// arrastar para dispensar e reordenar (layout) precisam do domMax: pedaço à
// parte, pedido quando o navegador folga (não disputa banda com a 1ª tela)
const whenIdle = () =>
  new Promise<void>((done) => ('requestIdleCallback' in window ? requestIdleCallback(() => done(), { timeout: 3000 }) : setTimeout(done, 1500)));
const loadMax = () => whenIdle().then(() => import('@/lib/motionFeatures')).then((r) => r.default);

/**
 * Avisos (toasts) e confirmações no visual do tema. Montado uma vez no App.
 * Toasts ficam no rodapé, acima da barra de abas do celular, e são lidos
 * por leitores de tela (aria-live).
 */
export function FeedbackHost() {
  const toasts = useFeedback((s) => s.toasts);
  const dismiss = useFeedback((s) => s.dismiss);
  const pause = useFeedback((s) => s.pause);
  const resume = useFeedback((s) => s.resume);
  const confirm = useFeedback((s) => s.confirm);
  const okRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // foco preso na confirmação, Esc = cancelar, foco volta para quem pediu
  useDialogFocus(dialogRef, !!confirm, () => confirm?.resolve(false));
  useEffect(() => {
    if (confirm) okRef.current?.focus();
  }, [confirm]);

  return createPortal(
    <LazyMotion features={loadMax}>
      <div className="fv-toasts" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <m.div
              key={t.id}
              layout
              className={`fv-toast is-${t.tone}` + (t.action ? ' has-action' : '')}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 0, y: 8, transition: { duration: 0.16 } }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              // arrastar para o lado dispensa (celular); mouse/foco em cima segura o tempo
              drag="x"
              dragSnapToOrigin
              dragElastic={0.5}
              onDragEnd={(_, info) => Math.abs(info.offset.x) > 90 && dismiss(t.id)}
              onMouseEnter={() => pause(t.id)}
              onMouseLeave={() => resume(t.id)}
              onFocus={() => pause(t.id)}
              onBlur={() => resume(t.id)}
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
              {/* quanto tempo resta para desfazer */}
              {t.action && <i className="fv-toast-time" style={{ animationDuration: `${t.ms}ms` }} aria-hidden />}
            </m.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirm && (
          <m.div className="fv-confirm-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => confirm.resolve(false)}>
            <m.div
              ref={dialogRef}
              tabIndex={-1}
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
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>,
    document.body,
  );
}
