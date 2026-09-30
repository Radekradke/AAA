import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '@/store/uiStore';

/**
 * Aviso de conjuração: toda magia deixa rastro — até truque de utilidade,
 * que não rola dado nenhum. Mostra o que foi gasto (ação, espaço), o que
 * mudou na ficha (PV temporários, CA…) e as escolhas rápidas.
 */
export function CastNotice() {
  const n = useUiStore((s) => s.castNotice);
  const clear = useUiStore((s) => s.clearCastNotice);
  return (
    <AnimatePresence>
      {n && (
        <motion.div
          key={n.id}
          className="fv-castnote"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span className="fv-castnote-sigil" aria-hidden>
            <i />
            ✦
          </span>
          <span className="fv-castnote-body">
            <b>{n.title}</b>
            <small>{n.sub}</small>
            {n.lines.map((l) => (
              <span key={l} className="fv-castnote-line">{l}</span>
            ))}
            {n.warn && <span className="fv-castnote-warn">⚠ {n.warn}</span>}
            {!!n.actions?.length && (
              <span className="fv-castnote-actions">
                {n.actions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    className={a.primary ? 'is-primary' : ''}
                    onClick={() => {
                      a.run();
                      clear();
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </span>
            )}
          </span>
          <button type="button" className="fv-castnote-close" onClick={clear} aria-label="Fechar aviso">×</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
