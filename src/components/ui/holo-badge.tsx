import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';

/**
 * Selo holográfico: inclinação 3D que segue o cursor/dedo + reflexo
 * arco-íris girando por baixo de um "verniz". Adaptado do AwardBadge
 * (21st.dev / Product Hunt) — mesma matemática de matrix3d e das camadas
 * de brilho, sem a marca e com conteúdo livre, tamanho fluido, toque no
 * celular e respeito a prefers-reduced-motion.
 */

export type HoloTone = 'gold' | 'silver' | 'bronze' | 'steel';

interface HoloBadgeProps {
  children: ReactNode;
  tone?: HoloTone;
  /** Aceso: reflexo forte, brilho externo e animação contínua. */
  active?: boolean;
  onClick?: () => void;
  /** Botão de alternância (ex.: Inspiração). */
  pressed?: boolean;
  /** Botão que abre/fecha um painel (ex.: Mochila). */
  expanded?: boolean;
  controls?: string;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const identityMatrix = '1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1';
const maxRotate = 0.25;
const minRotate = -0.25;
const maxScale = 1;
const minScale = 0.97;

/** Superfícies: claras (folha metálica) usam blend "overlay"; escura usa "screen". */
const TONES: Record<HoloTone, { bg: string; ink: string; edge: string; blend: CSSProperties['mixBlendMode']; glow: string }> = {
  gold: { bg: 'linear-gradient(135deg, #fbeebb 0%, #e9c46a 42%, #f6dd98 62%, #c9993c 100%)', ink: '#3b2a07', edge: 'rgba(90,60,10,.35)', blend: 'overlay', glow: 'rgba(255,214,110,.55)' },
  silver: { bg: 'linear-gradient(135deg, #f1f3f6 0%, #c9ced6 45%, #e6e9ee 65%, #a9b0bb 100%)', ink: '#2a3038', edge: 'rgba(40,50,60,.3)', blend: 'overlay', glow: 'rgba(210,220,235,.4)' },
  bronze: { bg: 'linear-gradient(135deg, #f6d7b3 0%, #d69a5c 45%, #efc394 65%, #a8672e 100%)', ink: '#3a1f08', edge: 'rgba(80,40,10,.35)', blend: 'overlay', glow: 'rgba(240,170,100,.45)' },
  steel: { bg: 'linear-gradient(145deg, var(--panel) 0%, var(--well) 60%, var(--panel2) 100%)', ink: 'var(--ink)', edge: 'var(--line)', blend: 'screen', glow: 'var(--bloom)' },
};

/** Faixas do arco-íris (mesmas do original). */
const LAYERS = ['hsl(358,100%,62%)', 'hsl(30,100%,50%)', 'hsl(60,100%,50%)', 'hsl(96,100%,50%)', 'hsl(233,85%,47%)', 'hsl(271,85%,47%)', 'hsl(300,20%,35%)', 'transparent', 'transparent', 'white'];

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function HoloBadge({ children, tone = 'gold', active = true, onClick, pressed, expanded, controls, ariaLabel, className, style }: HoloBadgeProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const uid = useId().replace(/:/g, '');
  const [overlayPos, setOverlayPos] = useState(0);
  const [matrix, setMatrix] = useState(identityMatrix);
  const [currentMatrix, setCurrentMatrix] = useState(identityMatrix);
  const [disableInOut, setDisableInOut] = useState(true);
  const [disableOverlayAnim, setDisableOverlayAnim] = useState(false);
  const [timeoutDone, setTimeoutDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = prefersReducedMotion();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const dims = () => {
    const r = ref.current?.getBoundingClientRect();
    return { left: r?.left ?? 0, right: r?.right ?? 0, top: r?.top ?? 0, bottom: r?.bottom ?? 0 };
  };

  // --- matemática do original: escala/rotação conforme a distância do centro ---
  const getMatrix = (clientX: number, clientY: number) => {
    const { left, right, top, bottom } = dims();
    const xCenter = (left + right) / 2;
    const yCenter = (top + bottom) / 2;
    const scale = [
      maxScale - ((maxScale - minScale) * Math.abs(xCenter - clientX)) / (xCenter - left),
      maxScale - ((maxScale - minScale) * Math.abs(yCenter - clientY)) / (yCenter - top),
      maxScale - ((maxScale - minScale) * (Math.abs(xCenter - clientX) + Math.abs(yCenter - clientY))) / (xCenter - left + yCenter - top),
    ];
    const rotate = {
      x1: 0.25 * ((yCenter - clientY) / yCenter - (xCenter - clientX) / xCenter),
      x2: maxRotate - ((maxRotate - minRotate) * Math.abs(right - clientX)) / (right - left),
      y2: maxRotate - ((maxRotate - minRotate) * (top - clientY)) / (top - bottom),
      z0: -(maxRotate - ((maxRotate - minRotate) * Math.abs(right - clientX)) / (right - left)),
      z1: 0.2 - ((0.2 + 0.6) * (top - clientY)) / (top - bottom),
    };
    return `${scale[0]}, 0, ${rotate.z0}, 0, ${rotate.x1}, ${scale[1]}, ${rotate.z1}, 0, ${rotate.x2}, ${rotate.y2}, ${scale[2]}, 0, 0, 0, 0, 1`;
  };

  const getOppositeMatrix = (m: string, clientY: number, entering?: boolean) => {
    const { top, bottom } = dims();
    const oppositeY = bottom - clientY + top;
    const weakening = entering ? 0.7 : 4;
    const multiplier = entering ? -1 : 1;
    return m
      .split(', ')
      .map((item, i) => {
        if (i === 2 || i === 4 || i === 8) return (-parseFloat(item) * multiplier) / weakening;
        if (i === 0 || i === 5 || i === 10) return '1';
        if (i === 6) return (multiplier * (maxRotate - ((maxRotate - minRotate) * (top - oppositeY)) / (top - bottom))) / weakening;
        if (i === 9) return (maxRotate - ((maxRotate - minRotate) * (top - oppositeY)) / (top - bottom)) / weakening;
        return item;
      })
      .join(', ');
  };

  const overlayFrom = (x: number, y: number) => {
    const { left, right, top, bottom } = dims();
    return (Math.abs((left + right) / 2 - x) + Math.abs((top + bottom) / 2 - y)) / 1.5;
  };

  const enter = (e: PointerEvent<HTMLButtonElement>) => {
    if (reduced.current) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setDisableOverlayAnim(true);
    setDisableInOut(false);
    later(() => setDisableInOut(true), 350);
    const { clientX, clientY } = e;
    requestAnimationFrame(() => requestAnimationFrame(() => setOverlayPos(overlayFrom(clientX, clientY))));
    setMatrix(getOppositeMatrix(getMatrix(clientX, clientY), clientY, true));
    setTimeoutDone(false);
    later(() => setTimeoutDone(true), 200);
  };

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (reduced.current) return;
    const { clientX, clientY } = e;
    later(() => setOverlayPos(overlayFrom(clientX, clientY)), 150);
    if (timeoutDone) setCurrentMatrix(getMatrix(clientX, clientY));
  };

  const leave = (e: PointerEvent<HTMLButtonElement>) => {
    if (reduced.current) return;
    setCurrentMatrix(getOppositeMatrix(matrix, e.clientY));
    later(() => setCurrentMatrix(identityMatrix), 200);
    const pos = overlayPos;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setDisableInOut(false);
        later(() => setOverlayPos(-pos / 4), 150);
        later(() => setOverlayPos(0), 300);
        later(() => {
          setDisableOverlayAnim(false);
          setDisableInOut(true);
        }, 500);
      }),
    );
  };

  useEffect(() => {
    if (timeoutDone) setMatrix(currentMatrix);
  }, [currentMatrix, timeoutDone]);

  const tn = TONES[tone];
  const animate = active && !disableOverlayAnim;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={ariaLabel}
      className={'fv-holo' + (active ? ' is-active' : '') + (className ? ' ' + className : '')}
      // mouse: segue o cursor; toque: inclina no ponto tocado e volta
      onPointerEnter={(e) => e.pointerType === 'mouse' && enter(e)}
      onPointerMove={(e) => e.pointerType === 'mouse' && move(e)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && leave(e)}
      onPointerDown={(e) => e.pointerType !== 'mouse' && enter(e)}
      onPointerUp={(e) => e.pointerType !== 'mouse' && later(() => leave(e), 180)}
      onPointerCancel={(e) => e.pointerType !== 'mouse' && leave(e)}
      style={{ ['--holo-glow' as string]: tn.glow, ...style }}
    >
      <div
        className="fv-holo-card"
        style={{
          transform: `perspective(700px) matrix3d(${matrix})`,
          background: tn.bg,
          color: tn.ink,
          boxShadow: `inset 0 0 0 1px ${tn.edge}, inset 0 1px 0 rgba(255,255,255,.45)`,
        }}
      >
        {/* moldura interna (o traço de 1px do original) */}
        <span aria-hidden className="fv-holo-frame" style={{ borderColor: tn.edge }} />

        {/* reflexo arco-íris: 10 faixas desfocadas girando em fase */}
        <svg aria-hidden className="fv-holo-shine" viewBox="0 0 260 54" preserveAspectRatio="none" style={{ mixBlendMode: tn.blend, opacity: active ? 1 : 0.35 }}>
          <defs>
            <filter id={`holo-blur-${uid}`}>
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
          </defs>
          {LAYERS.map((fill, i) => (
            <g
              key={i}
              style={{
                transform: `rotate(${overlayPos + i * 10}deg)`,
                transformOrigin: 'center center',
                transformBox: 'fill-box',
                transition: !disableInOut ? 'transform 200ms ease-out' : 'none',
                animation: animate ? `holoSweep${i + 1} 5s infinite` : 'none',
                willChange: 'transform',
              }}
            >
              <polygon points="0,0 260,54 260,0 0,54" fill={fill} filter={`url(#holo-blur-${uid})`} opacity={tone === 'steel' ? 0.22 : 0.5} />
            </g>
          ))}
        </svg>

        <div className="fv-holo-content">{children}</div>
      </div>
    </button>
  );
}
