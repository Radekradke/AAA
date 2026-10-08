import { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { poolAffected } from '@/engine/spellCast';
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
        <m.div
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
            {n.pool && <PoolCalc pool={n.pool} />}
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
        </m.div>
      )}
    </AnimatePresence>
  );
}

/** Sono / Leque Cromático: digite os PV atuais das criaturas na área e veja quem é afetado. */
function PoolCalc({ pool }: { pool: { total: number; effect: string; immune: string } }) {
  const [text, setText] = useState('');
  const hps = text.split(/[^0-9]+/).filter(Boolean).map(Number);
  const res = poolAffected(pool.total, hps);
  return (
    <span className="fv-castnote-pool">
      <span className="fv-castnote-pool-total">
        <b>{pool.total}</b> PV no total. Da criatura com menos PV atuais para a com mais: se o que sobra cobre os PV dela, ela é afetada e os PV dela saem do total.
      </span>
      <label>
        PV atuais das criaturas na área
        <input className="fv-input" inputMode="numeric" placeholder="ex.: 7 7 12 30" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      {hps.length > 0 && (
        <span className="fv-castnote-pool-res">
          {res.affected.length ? <>Afetadas: <b>{res.affected.join(', ')}</b></> : 'Nenhuma criatura afetada'}
          {res.spared.length > 0 && <> · resistem: {res.spared.join(', ')}</>} · sobram {res.left}
        </span>
      )}
      <small>Afetadas {pool.effect}. {pool.immune}</small>
    </span>
  );
}
