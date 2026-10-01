import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/lib/useTheme';
import { modStr } from '@/engine/dice';
import { canRoll3d, clear3d, roll3d } from '@/lib/dice3d';
import { DICE_SKINS } from '@/data/diceSkins';

const TUMBLE_MS = 620;

/**
 * Overlay cinematográfico do resultado. Com "Dados 3D" ligado, os dados com
 * física rolam pela tela e caem nas faces sorteadas; o painel com o total
 * aparece embaixo quando eles param. Sem 3D (ou d100), o dado 2D tomba.
 */
export function RollOverlay() {
  const roll = useUiStore((s) => s.currentRoll);
  const clearRoll = useUiStore((s) => s.clearRoll);
  const dice3d = useUiStore((s) => s.dice3d);
  const themeName = useUiStore((s) => s.theme);
  const t = useTheme();

  const [phase, setPhase] = useState<'physics' | 'tumble' | 'result'>('tumble');
  /** Esta rolagem foi encenada em 3D (painel vai para baixo, sem dado 2D). */
  const [staged3d, setStaged3d] = useState(false);
  const rollIdRef = useRef<string | null>(null);
  const [face, setFace] = useState(0);
  const flickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // natural do dado (face que "para"): 1d20 mostra o dado (com vantagem/desvantagem, o escolhido);
  // vários dados mostram a soma
  const naturalFace = roll ? (roll.rolls.length === 1 ? roll.rolls[0] : roll.total - roll.modifier) : 0;

  useEffect(() => {
    rollIdRef.current = roll?.id ?? null;
    if (!roll) {
      clear3d();
      return;
    }

    const tumble2d = () => {
      setStaged3d(false);
      setPhase('tumble');
      const max = roll.sides || 20;
      flickerRef.current = setInterval(() => setFace(1 + Math.floor(Math.random() * max)), 70);
      timerRef.current = setTimeout(() => {
        if (flickerRef.current) clearInterval(flickerRef.current);
        setFace(naturalFace);
        setPhase('result');
      }, TUMBLE_MS);
    };

    if (dice3d && canRoll3d(roll)) {
      setStaged3d(true);
      setPhase('physics');
      void roll3d(roll, themeName).then((outcome) => {
        if (rollIdRef.current !== roll.id) return; // já veio outra rolagem
        if (outcome === 'unavailable') {
          clear3d();
          tumble2d();
        } else {
          // 'slow': aparelho lento — o total aparece e os dados terminam de cair
          setPhase('result');
        }
      });
    } else {
      clear3d();
      tumble2d();
    }
    return () => {
      if (flickerRef.current) clearInterval(flickerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roll?.id]);

  // ao desmontar (sair da ficha), recolhe os dados da mesa
  useEffect(() => () => clear3d(), []);

  // dado 2D com a mesma skin do 3D (corpo, números e contorno do tema)
  const skin = DICE_SKINS[themeName];
  const color = roll ? (roll.crit ? t.gold : roll.fail ? t.danger : roll.damage ? t.danger : t.acc) : t.acc;
  const flavor = roll ? (roll.crit ? 'CRÍTICO!' : roll.fail ? 'FALHA CRÍTICA' : 'rolagem') : '';
  const detail = roll ? `${roll.expr} [${roll.rolls.join(', ')}]${roll.modifier ? ' ' + modStr(roll.modifier) : ''}` : '';

  // portal em document.body: `fixed` dentro de ancestrais animados
  // (transform/filter) desloca o overlay — fora da árvore, centraliza sempre
  return createPortal(
    <AnimatePresence>
      {roll && phase !== 'physics' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'grid',
            // 3D: painel embaixo, para não cobrir os dados que caíram no centro
            placeItems: staged3d ? 'end center' : 'center',
            padding: staged3d ? '14px 14px calc(92px + env(safe-area-inset-bottom))' : 14,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            key={roll.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: [0.2, 0.9, 0.3, 1.2] }}
            // crítico: explosão de luz; falha crítica: tremor (veja "Assinaturas" no CSS)
            className={'fv-panel fv-roll-panel' + (phase === 'result' && roll.crit ? ' is-crit' : '') + (phase === 'result' && roll.fail ? ' is-fail' : '')}
            style={{
              position: 'relative',
              pointerEvents: 'auto',
              border: '1px solid var(--gold)',
              borderRadius: 20,
              boxShadow: '0 24px 70px rgba(0,0,0,.6), 0 0 40px var(--bloom)',
              backdropFilter: 'blur(14px)',
              padding: 'clamp(18px,4vw,24px) clamp(22px,6vw,40px) clamp(20px,4vw,26px)',
              textAlign: 'center',
              minWidth: 'min(250px, 100%)',
              maxWidth: 'min(430px, calc(100vw - 28px))',
            }}
          >
            {phase === 'result' && roll.crit && <span className="fv-roll-burst" aria-hidden />}
            <button
              onClick={clearRoll}
              aria-label="Fechar resultado"
              style={{ position: 'absolute', top: 8, right: 8, cursor: 'pointer', width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--sunk)', color: 'var(--muted)', fontSize: 13 }}
            >
              ✕
            </button>
            <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>{roll.label}</div>

            {/* dado 2D tombando (com os dados 3D, eles já estão na mesa) */}
            {!staged3d && (
            <div style={{ perspective: 600, height: 92, display: 'grid', placeItems: 'center', margin: '6px 0 2px', filter: `drop-shadow(0 6px 10px rgba(0,0,0,.45)) drop-shadow(0 0 10px ${color}66)` }}>
              <div
                key={`${roll.id}-${phase}`}
                className="fv-die2d"
                style={{
                  width: 76,
                  height: 76,
                  display: 'grid',
                  placeItems: 'center',
                  transformStyle: 'preserve-3d',
                  // faceta de luz + corpo do tema; o contorno é uma segunda camada recortada
                  background: `radial-gradient(circle at 34% 24%, rgba(255,255,255,.38), transparent 46%), linear-gradient(155deg, ${skin.body[0]}, color-mix(in srgb, ${skin.body[0]}, #000 38%))`,
                  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  animation: phase === 'tumble' ? `dieTumble ${TUMBLE_MS}ms cubic-bezier(.3,.7,.3,1)` : undefined,
                  transition: 'transform .25s',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Chakra Petch', monospace",
                    fontWeight: 700,
                    fontSize: 30,
                    color: skin.ink[0],
                    WebkitTextStroke: skin.outline[0] !== 'none' ? `1px ${skin.outline[0]}` : undefined,
                    paintOrder: 'stroke fill',
                  }}
                >
                  {phase === 'tumble' ? face : naturalFace}
                </span>
              </div>
            </div>
            )}

            {/* total + detalhes (revelados após o tombo) */}
            <AnimatePresence mode="wait">
              {phase === 'result' && (
                <motion.div key="res" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 64, lineHeight: 1, color, textShadow: '0 0 30px var(--bloom)' }}>
                    {roll.total}
                  </div>
                  <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 13.5, color: 'var(--ink)' }}>{detail}</div>
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '.1em', color }}>{flavor}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
