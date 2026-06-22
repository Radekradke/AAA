import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/lib/useTheme';
import { modStr } from '@/engine/dice';

/** Overlay cinematográfico do resultado da rolagem (impacto + crítico/falha). */
export function RollOverlay() {
  const roll = useUiStore((s) => s.currentRoll);
  const t = useTheme();

  const color = roll ? (roll.crit ? t.gold : roll.fail ? t.danger : roll.damage ? t.danger : t.acc) : t.acc;
  const flavor = roll ? (roll.crit ? 'CRÍTICO!' : roll.fail ? 'FALHA CRÍTICA' : 'rolagem') : '';
  const detail = roll ? `${roll.expr} [${roll.rolls.join(', ')}]${roll.modifier ? ' ' + modStr(roll.modifier) : ''}` : '';

  return (
    <AnimatePresence>
      {roll && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <motion.div
            key={roll.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: [0.8, 1.06, 1] }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ duration: 0.32, ease: [0.2, 0.9, 0.3, 1.2] }}
            className="fv-panel"
            style={{
              border: '1px solid var(--gold)',
              borderRadius: 20,
              boxShadow: '0 24px 70px rgba(0,0,0,.6), 0 0 40px var(--bloom)',
              backdropFilter: 'blur(14px)',
              padding: '26px 40px',
              textAlign: 'center',
              minWidth: 230,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {roll.label}
            </div>
            <div
              style={{
                fontFamily: "'Chakra Petch', monospace",
                fontWeight: 700,
                fontSize: 72,
                lineHeight: 1,
                margin: '8px 0 2px',
                color,
                textShadow: '0 0 30px var(--bloom)',
              }}
            >
              {roll.total}
            </div>
            <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 14, color: 'var(--ink)' }}>{detail}</div>
            <div
              style={{
                marginTop: 8,
                fontFamily: "'Cinzel', serif",
                fontSize: 13,
                letterSpacing: '.1em',
                color,
              }}
            >
              {flavor}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
