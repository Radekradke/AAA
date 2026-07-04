import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/lib/useTheme';
import { modStr } from '@/engine/dice';

const TUMBLE_MS = 620;

/** Overlay cinematográfico: dado 3D tombando e revelando o resultado. */
export function RollOverlay() {
  const roll = useUiStore((s) => s.currentRoll);
  const clearRoll = useUiStore((s) => s.clearRoll);
  const t = useTheme();

  const [phase, setPhase] = useState<'tumble' | 'result'>('tumble');
  const [face, setFace] = useState(0);
  const flickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // natural do dado (face que "para"): 1d20 mostra o dado; vários dados mostram a soma
  const naturalFace = roll ? (roll.rolls.length === 1 ? roll.rolls[0] : roll.rolls.reduce((a, b) => a + b, 0)) : 0;

  useEffect(() => {
    if (!roll) return;
    setPhase('tumble');
    const max = roll.sides || 20;
    flickerRef.current = setInterval(() => setFace(1 + Math.floor(Math.random() * max)), 70);
    timerRef.current = setTimeout(() => {
      if (flickerRef.current) clearInterval(flickerRef.current);
      setFace(naturalFace);
      setPhase('result');
    }, TUMBLE_MS);
    return () => {
      if (flickerRef.current) clearInterval(flickerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roll?.id]);

  const color = roll ? (roll.crit ? t.gold : roll.fail ? t.danger : roll.damage ? t.danger : t.acc) : t.acc;
  const flavor = roll ? (roll.crit ? 'CRÍTICO!' : roll.fail ? 'FALHA CRÍTICA' : 'rolagem') : '';
  const detail = roll ? `${roll.expr} [${roll.rolls.join(', ')}]${roll.modifier ? ' ' + modStr(roll.modifier) : ''}` : '';

  return (
    <AnimatePresence>
      {roll && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <motion.div
            key={roll.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: [0.2, 0.9, 0.3, 1.2] }}
            className="fv-panel"
            style={{
              position: 'relative',
              pointerEvents: 'auto',
              border: '1px solid var(--gold)',
              borderRadius: 20,
              boxShadow: '0 24px 70px rgba(0,0,0,.6), 0 0 40px var(--bloom)',
              backdropFilter: 'blur(14px)',
              padding: '24px 40px 26px',
              textAlign: 'center',
              minWidth: 250,
            }}
          >
            <button
              onClick={clearRoll}
              aria-label="Fechar resultado"
              style={{ position: 'absolute', top: 8, right: 8, cursor: 'pointer', width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(0,0,0,.3)', color: 'var(--muted)', fontSize: 13 }}
            >
              ✕
            </button>
            <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>{roll.label}</div>

            {/* dado 3D */}
            <div style={{ perspective: 600, height: 92, display: 'grid', placeItems: 'center', margin: '6px 0 2px' }}>
              <div
                key={`${roll.id}-${phase}`}
                style={{
                  width: 72,
                  height: 72,
                  display: 'grid',
                  placeItems: 'center',
                  transformStyle: 'preserve-3d',
                  borderRadius: 16,
                  border: `2px solid ${color}`,
                  background: `linear-gradient(150deg, ${t.panel}, ${t.panel2})`,
                  boxShadow: `0 0 26px ${t.bloom}, inset 0 0 18px ${color}33`,
                  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  animation: phase === 'tumble' ? `dieTumble ${TUMBLE_MS}ms cubic-bezier(.3,.7,.3,1)` : undefined,
                  transition: 'transform .25s',
                }}
              >
                <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 30, color: 'var(--ink)', textShadow: `0 0 14px ${color}` }}>
                  {phase === 'tumble' ? face : naturalFace}
                </span>
              </div>
            </div>

            {/* total + detalhes (revelados após o tombo) */}
            <AnimatePresence mode="wait">
              {phase === 'result' && (
                <motion.div key="res" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 64, lineHeight: 1, color, textShadow: '0 0 30px var(--bloom)' }}>
                    {roll.total}
                  </div>
                  <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 13.5, color: 'var(--ink)' }}>{detail}</div>
                  <div style={{ marginTop: 6, fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: '.1em', color }}>{flavor}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
