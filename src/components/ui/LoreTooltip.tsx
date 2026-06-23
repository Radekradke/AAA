import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react';
import type { LoreInfo } from '@/lib/lore';

interface LoreTooltipProps {
  info: LoreInfo;
  children: ReactNode;
  anchorStyle?: CSSProperties;
  disabled?: boolean;
}

function isCoarsePointer() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none), (pointer: coarse)').matches || window.innerWidth <= 760;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type Placement = 'right' | 'left' | 'bottom' | 'top';
type Point = { x: number; y: number };

/** BG3-like lore popover: hover/focus on desktop, first tap on mobile. */
export function LoreTooltip({ info, children, anchorStyle, disabled }: LoreTooltipProps) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<Point | null>(null);
  const [open, setOpen] = useState(false);
  const [touchMode, setTouchMode] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'right' as Placement });

  const place = () => {
    const width = Math.min(340, window.innerWidth - 24);
    const height = tipRef.current?.offsetHeight ?? 220;
    const gap = 18;
    const point = pointerRef.current;
    const anchor = anchorRef.current?.getBoundingClientRect();
    const x = point?.x ?? (anchor ? anchor.right : window.innerWidth / 2);
    const y = point?.y ?? (anchor ? anchor.top + anchor.height / 2 : window.innerHeight / 2);

    let placement: Placement = 'right';
    let left = x + gap;
    let top = y + gap;

    if (left + width > window.innerWidth - 12) {
      placement = 'left';
      left = x - width - gap;
    }
    if (top + height > window.innerHeight - 12) {
      placement = 'top';
      top = y - height - gap;
    }
    if (top < 12 && anchor) {
      placement = 'bottom';
      top = anchor.bottom + 10;
    }

    setPos({
      left: clamp(left, 12, window.innerWidth - width - 12),
      top: clamp(top, 12, Math.max(12, window.innerHeight - height - 12)),
      placement,
    });
  };

  const show = (fromTouch = false, point?: Point) => {
    if (disabled) return;
    if (point) pointerRef.current = point;
    setTouchMode(fromTouch);
    setOpen(true);
    window.requestAnimationFrame(place);
  };

  const hide = () => setOpen(false);

  const followPointer = (point: Point) => {
    pointerRef.current = point;
    if (open) place();
    else show(false, point);
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onPointerDownCapture = (e: PointerEvent<HTMLSpanElement>) => {
    if (!isCoarsePointer() || disabled) return;
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    if (!open) {
      e.preventDefault();
      e.stopPropagation();
      show(true, { x: e.clientX, y: e.clientY });
    } else {
      hide();
    }
  };

  const onClickCapture = (e: MouseEvent<HTMLSpanElement>) => {
    if (!isCoarsePointer() || disabled) return;
    if (!open) {
      e.preventDefault();
      e.stopPropagation();
      show(true, { x: e.clientX, y: e.clientY });
    }
  };

  const anchor = (
    <span
      ref={anchorRef}
      className="fv-lore-anchor"
      tabIndex={0}
      aria-label={`${info.title}: ${info.body}`}
      onPointerOver={(e) => {
        if (e.pointerType !== 'touch' && !isCoarsePointer()) show(false, { x: e.clientX, y: e.clientY });
      }}
      onPointerOut={(e) => {
        if (e.pointerType !== 'touch' && !isCoarsePointer()) hide();
      }}
      onMouseEnter={(e) => {
        if (!isCoarsePointer()) show(false, { x: e.clientX, y: e.clientY });
      }}
      onMouseMove={(e) => {
        if (!isCoarsePointer()) followPointer({ x: e.clientX, y: e.clientY });
      }}
      onMouseLeave={() => {
        if (!isCoarsePointer()) hide();
      }}
      onFocus={() => {
        pointerRef.current = null;
        show(false);
      }}
      onBlur={hide}
      onPointerDownCapture={onPointerDownCapture}
      onClickCapture={onClickCapture}
      style={anchorStyle}
    >
      {children}
    </span>
  );

  return (
    <>
      {anchor}
      {open && createPortal(
        <div
          ref={tipRef}
          className="fv-lore-tooltip"
          data-placement={pos.placement}
          style={{ top: pos.top, left: pos.left, width: Math.min(340, window.innerWidth - 24) }}
          role="tooltip"
        >
          <div className="fv-lore-title">{info.title}</div>
          {info.subtitle && <div className="fv-lore-subtitle">{info.subtitle}</div>}
          <div className="fv-lore-body">{info.body}</div>
          {info.tags?.length ? (
            <div className="fv-lore-tags">
              {info.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          ) : null}
          {touchMode && <div className="fv-lore-mobile">Toque novamente para executar a ação.</div>}
        </div>,
        document.body,
      )}
    </>
  );
}
