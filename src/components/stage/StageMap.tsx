import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as RPointerEvent } from 'react';
import { useMediaUrl } from '@/services/mediaService';
import { boardSize, fitView, fmtMeters, metersBetween, snapCell, zoomAt } from '@/engine/grid';
import type { Scene, StagePing, Token } from '@/types/stage';

export interface TokenFace {
  /** Imagem do peão (retrato, arte do herói). */
  url?: string;
  /** Enquadramento do rosto (background-size/position). */
  style?: CSSProperties;
}

interface StageMapProps {
  scene: Scene;
  tokens: Token[];
  isMaster: boolean;
  canMove: (t: Token) => boolean;
  faceFor: (t: Token) => TokenFace | null;
  /** Deslocamento do peão em metros (herói/monstro), para a régua. */
  speedFor: (t: Token) => number | null;
  /** Vida (só o mestre vê a barra). */
  hpFor?: (t: Token) => { cur: number; max: number } | null;
  activeIds: Set<string>;
  drags: Record<string, { x: number; y: number }>;
  pings: StagePing[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onPing: (x: number, y: number) => void;
}

type View = { x: number; y: number; z: number };
type DragState = { id: string; pointer: number; from: { x: number; y: number }; grab: { x: number; y: number }; at: { x: number; y: number } };

/**
 * Mapa tático: imagem do mestre + grade de 1,5 m + peões.
 * · arrastar o fundo move o mapa; roda do mouse / pinça dá zoom;
 * · arrastar um peão (o seu, ou qualquer um sendo mestre) mostra a régua em
 *   metros contra o deslocamento; solta e encaixa na casa;
 * · duplo clique (ou segurar o dedo) manda um "olha aqui!" para a mesa.
 */
export function StageMap(p: StageMapProps) {
  const { scene } = p;
  const g = scene.grid;
  const box = useRef<HTMLDivElement>(null);
  const { url: imageUrl, error: imageError } = useMediaUrl(scene.imagePath);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const board = boardSize(g, scene.imagePath ? natural : null);
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 0.5 });
  const [fitted, setFitted] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [drag, setDrag] = useState<DragState | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pinch = useRef<{ d: number; view: View; cx: number; cy: number } | null>(null);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);

  const ready = !scene.imagePath || !!natural;

  // enquadra ao abrir a cena (e quando a imagem termina de carregar)
  const fit = useCallback(() => {
    const el = box.current;
    if (!el) return;
    setView(fitView(board, { w: el.clientWidth, h: el.clientHeight }));
  }, [board.w, board.h]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const key = `${scene.id}:${board.w}x${board.h}`;
    if (!ready || fitted === key) return;
    fit();
    setFitted(key);
  }, [ready, scene.id, board.w, board.h, fitted, fit]);

  // roda do mouse: zoom em volta do cursor (listener não-passivo para impedir a rolagem da página)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setView((v) => zoomAt(v, e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  /** Tela → casa (fracionária). */
  const toCell = (sx: number, sy: number) => ({ x: ((sx - view.x) / view.z - g.ox) / g.size, y: ((sy - view.y) / view.z - g.oy) / g.size });

  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    const pt = local(e);
    pointers.current.set(e.pointerId, pt);
    box.current?.setPointerCapture(e.pointerId);
    if (pointers.current.size === 2) {
      cancelPress();
      pan.current = null;
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), view, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      return;
    }
    if (drag) return;
    pan.current = { x: pt.x, y: pt.y, vx: view.x, vy: view.y };
    p.onSelect?.(null);
    if (e.pointerType !== 'mouse') {
      // segurar o dedo parado = ping
      press.current = {
        x: pt.x,
        y: pt.y,
        timer: setTimeout(() => {
          const c = toCell(pt.x, pt.y);
          p.onPing(c.x, c.y);
          pan.current = null;
          press.current = null;
        }, 550),
      };
    }
  };

  const onTokenDown = (t: Token, e: RPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    p.onSelect?.(t.id);
    if (!p.canMove(t) || pointers.current.size) return;
    const pt = local(e);
    pointers.current.set(e.pointerId, pt);
    box.current?.setPointerCapture(e.pointerId);
    const c = toCell(pt.x, pt.y);
    setDrag({ id: t.id, pointer: e.pointerId, from: { x: t.x, y: t.y }, grab: { x: c.x - t.x, y: c.y - t.y }, at: { x: t.x, y: t.y } });
  };

  const onMoveEvt = (e: RPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const pt = local(e);
    pointers.current.set(e.pointerId, pt);
    if (press.current && Math.hypot(pt.x - press.current.x, pt.y - press.current.y) > 8) cancelPress();
    if (drag && e.pointerId === drag.pointer) {
      const c = toCell(pt.x, pt.y);
      const at = { x: c.x - drag.grab.x, y: c.y - drag.grab.y };
      setDrag({ ...drag, at });
      p.onDrag(drag.id, at.x, at.y);
      return;
    }
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const pc = pinch.current;
      const z = zoomAt(pc.view, pc.cx, pc.cy, d / Math.max(1, pc.d));
      setView({ ...z, x: z.x + ((a.x + b.x) / 2 - pc.cx), y: z.y + ((a.y + b.y) / 2 - pc.cy) });
      return;
    }
    if (pan.current) {
      const pn = pan.current;
      setView((v) => ({ ...v, x: pn.vx + (pt.x - pn.x), y: pn.vy + (pt.y - pn.y) }));
    }
  };

  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    cancelPress();
    if (drag && e.pointerId === drag.pointer) {
      const s = snapCell(drag.at.x, drag.at.y);
      if (s.x !== drag.from.x || s.y !== drag.from.y) p.onMove(drag.id, s.x, s.y);
      setDrag(null);
    }
    if (pointers.current.size < 2) pinch.current = null;
    if (!pointers.current.size) pan.current = null;
  };

  const onDouble = (e: React.MouseEvent) => {
    const pt = local(e);
    const c = toCell(pt.x, pt.y);
    p.onPing(c.x, c.y);
  };

  const zoomBtn = (f: number) => {
    const el = box.current;
    if (el) setView((v) => zoomAt(v, el.clientWidth / 2, el.clientHeight / 2, f));
  };

  const dragged = drag ? p.tokens.find((t) => t.id === drag.id) ?? null : null;
  const ruler = useMemo(() => {
    if (!drag || !dragged) return null;
    const s = snapCell(drag.at.x, drag.at.y);
    const m = metersBetween(drag.from.x, drag.from.y, s.x, s.y);
    const speed = p.speedFor(dragged);
    const half = dragged.size / 2;
    return { from: { x: drag.from.x + half, y: drag.from.y + half }, to: { x: s.x + half, y: s.y + half }, snap: s, m, speed, over: speed !== null && m > speed };
  }, [drag, dragged, p]);

  const cellPx = (c: number, axis: 'x' | 'y') => (axis === 'x' ? g.ox : g.oy) + c * g.size;
  const gridOn = showGrid && g.show;
  const selected = p.selectedId ? p.tokens.find((t) => t.id === p.selectedId) ?? null : null;

  return (
    <div className="fv-map">
      <div
        ref={box}
        className={'fv-map-view' + (drag ? ' is-dragging' : '')}
        onPointerDown={onDown}
        onPointerMove={onMoveEvt}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={onDouble}
        role="application"
        aria-label={`Mapa tático: ${scene.name}. Arraste para mover o mapa, roda do mouse para zoom, duplo clique para apontar um lugar.`}
      >
        {scene.imagePath && !imageUrl && <div className="fv-map-loading">{imageError ?? 'Carregando o mapa…'}</div>}
        <div className="fv-map-world" style={{ width: board.w, height: board.h, transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" draggable={false} onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
          ) : (
            !scene.imagePath && <div className="fv-map-blank" />
          )}
          {gridOn && ready && (
            <svg className="fv-map-grid" width={board.w} height={board.h} aria-hidden>
              <defs>
                <pattern id={`grid-${scene.id}`} x={g.ox} y={g.oy} width={g.size} height={g.size} patternUnits="userSpaceOnUse">
                  <path d={`M ${g.size} 0 L 0 0 0 ${g.size}`} fill="none" stroke="currentColor" strokeWidth={Math.max(1, g.size / 60)} />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#grid-${scene.id})`} />
            </svg>
          )}

          {ruler && (
            <svg className="fv-map-ruler" width={board.w} height={board.h} aria-hidden>
              <rect x={cellPx(ruler.snap.x, 'x')} y={cellPx(ruler.snap.y, 'y')} width={g.size * (dragged?.size ?? 1)} height={g.size * (dragged?.size ?? 1)} className={ruler.over ? 'is-over' : ''} />
              <line x1={cellPx(ruler.from.x, 'x')} y1={cellPx(ruler.from.y, 'y')} x2={cellPx(ruler.to.x, 'x')} y2={cellPx(ruler.to.y, 'y')} className={ruler.over ? 'is-over' : ''} strokeWidth={Math.max(3, g.size / 12)} />
            </svg>
          )}

          {p.tokens.map((t) => {
            const live = drag?.id === t.id ? drag.at : p.drags[t.id] ?? { x: t.x, y: t.y };
            const face = p.faceFor(t);
            const hp = p.hpFor?.(t) ?? null;
            const px = g.size * t.size;
            const cls = [
              'fv-token',
              `is-${t.kind}`,
              t.hidden ? 'is-hidden' : '',
              p.activeIds.has(t.id) ? 'is-active' : '',
              p.selectedId === t.id ? 'is-selected' : '',
              drag?.id === t.id ? 'is-grabbed' : p.drags[t.id] ? 'is-remote' : '',
              p.canMove(t) ? 'is-movable' : '',
              hp && hp.cur <= 0 ? 'is-down' : '',
            ].join(' ');
            return (
              <button
                key={t.id}
                type="button"
                className={cls}
                style={{ left: cellPx(live.x, 'x'), top: cellPx(live.y, 'y'), width: px, height: px, '--tk': t.color ?? undefined, fontSize: Math.max(10, g.size * 0.3) } as CSSProperties}
                onPointerDown={(e) => onTokenDown(t, e)}
                onDoubleClick={(e) => e.stopPropagation()}
                aria-label={`${t.label || 'Peão'}${t.hidden ? ' (escondido)' : ''}`}
              >
                <span className="fv-token-disc" style={face?.url ? { backgroundImage: `url("${face.url}")`, ...face.style } : undefined}>
                  {!face?.url && (t.kind === 'marker' ? '✦' : initials(t.label))}
                </span>
                {hp && hp.max > 0 && (
                  <span className="fv-token-hp" aria-hidden>
                    <i style={{ width: `${Math.max(0, Math.min(100, (hp.cur / hp.max) * 100))}%` }} />
                  </span>
                )}
                {t.label && <span className="fv-token-label">{t.label}</span>}
              </button>
            );
          })}

          {p.pings.map((pg) => (
            <span
              key={pg.id}
              className="fv-map-ping"
              style={{ left: cellPx(pg.x, 'x'), top: cellPx(pg.y, 'y'), '--ping': pg.color, width: g.size * 2, height: g.size * 2 } as CSSProperties}
              aria-hidden
            >
              <b style={{ fontSize: Math.max(12, g.size * 0.32) }}>{pg.who}</b>
            </span>
          ))}
        </div>

        {ruler && (
          <div className={'fv-map-meter' + (ruler.over ? ' is-over' : '')} role="status">
            {fmtMeters(ruler.m)}
            {ruler.speed !== null && <small> de {fmtMeters(ruler.speed)}</small>}
            {ruler.over && <small> · passou do deslocamento</small>}
          </div>
        )}
      </div>

      <div className="fv-map-tools" role="toolbar" aria-label="Zoom do mapa">
        <button type="button" onClick={() => zoomBtn(1.25)} aria-label="Aproximar">+</button>
        <button type="button" onClick={() => zoomBtn(0.8)} aria-label="Afastar">−</button>
        <button type="button" onClick={fit} aria-label="Enquadrar o mapa">⤢</button>
        {g.show && (
          <button type="button" className={showGrid ? 'is-on' : ''} onClick={() => setShowGrid((v) => !v)} aria-pressed={showGrid} aria-label="Mostrar grade">
            #
          </button>
        )}
      </div>
      {!selected && <div className="fv-map-hint">{p.isMaster ? 'Duplo clique aponta um lugar para todos · arraste qualquer peão' : 'Arraste o seu peão · duplo clique (ou segure o dedo) aponta um lugar'}</div>}
    </div>
  );
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const num = label.match(/\d+$/)?.[0];
  return (parts[0][0] + (num ?? parts[1]?.[0] ?? '')).toUpperCase();
}
