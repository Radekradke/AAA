import type { ReactElement, ReactNode } from 'react';
import '@/styles/layers.css';
import { cloneElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { usePopFlip } from './usePopFlip';

/* ============================================================
   Camadas do design system (etapa 2.3). Todas seguem as mesmas regras:
   Esc fecha a camada de cima, o foco volta para quem abriu e o leitor de
   tela sabe o que é cada uma.
   - Modal (Modal.tsx): decisão ou formulário que bloqueia a página.
   - Sheet: painel que sobe de baixo (celular) / entra pela direita (PC).
   - Popover: janela pequena presa a um botão, sem bloquear a página.
   - Tooltip: dica curta no passar do mouse ou no foco do teclado.
   - Toast: aviso que some sozinho — toast() de '@/store/feedbackStore'.
   ============================================================ */

export interface SheetProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** 'bottom' no celular e 'right' no PC (padrão: decide pela largura via CSS). */
  side?: 'auto' | 'bottom' | 'right';
}

/** Painel modal deslizante: foco preso, Esc e fundo fecham, título nomeia. */
export function Sheet({ title, onClose, children, footer, side = 'auto' }: SheetProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  useDialogFocus(ref, true, onClose);
  return createPortal(
    <div className="fv-ui-sheet-overlay" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`fv-ui-sheet fv-ui-sheet--${side}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="fv-ui-sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="fv-ui-sheet-close" onClick={onClose} aria-label="Fechar" title="Fechar">
            ✕
          </button>
        </div>
        <div className="fv-ui-sheet-body">{children}</div>
        {footer && <div className="fv-ui-sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Fecha ao apertar Esc (com o foco dentro) ou ao tocar fora. Devolve o foco
 * ao botão que abriu quando o Esc fecha.
 */
export function useDismiss(open: boolean, close: () => void, box: React.RefObject<HTMLElement | null>, trigger: React.RefObject<HTMLElement | null>) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && (box.current?.contains(t) || trigger.current?.contains(t))) return;
      closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const a = document.activeElement;
      if (a && !box.current?.contains(a) && a !== trigger.current) return;
      e.preventDefault();
      e.stopPropagation();
      closeRef.current();
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, box, trigger]);
}

export interface PopoverProps {
  /** O botão que abre. Recebe aria-expanded, aria-controls e o clique. */
  trigger: ReactElement<{ onClick?: (e: React.MouseEvent) => void; 'aria-expanded'?: boolean; 'aria-controls'?: string; 'aria-haspopup'?: 'dialog'; ref?: React.Ref<HTMLElement> }>;
  /** Nome da janela para o leitor de tela. */
  label: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Controle de fora (opcional). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'end';
  className?: string;
}

/**
 * Janela pequena presa a um botão (sem bloquear a página): abre embaixo e
 * vira para cima se não couber; Esc e toque fora fecham; o foco entra ao
 * abrir e volta ao botão no Esc.
 */
export function Popover({ trigger, label, children, open: openProp, onOpenChange, align = 'start', className = '' }: PopoverProps) {
  const [inner, setInner] = useState(false);
  const open = openProp ?? inner;
  const setOpen = useCallback(
    (v: boolean) => {
      if (openProp === undefined) setInner(v);
      onOpenChange?.(v);
    },
    [openProp, onOpenChange],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);
  const id = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const { ref: boxRef, up } = usePopFlip<HTMLDivElement>(open);
  useDismiss(open, close, boxRef, triggerRef);

  useEffect(() => {
    if (open) boxRef.current?.focus({ preventScroll: true });
  }, [open, boxRef]);

  const t = cloneElement(trigger, {
    ref: (el: HTMLElement | null) => void (triggerRef.current = el),
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
    'aria-haspopup': 'dialog',
    onClick: (e: React.MouseEvent) => {
      trigger.props.onClick?.(e);
      setOpen(!open);
    },
  });

  return (
    <span className="fv-ui-popover-anchor">
      {t}
      {open && (
        <div ref={boxRef} id={id} role="dialog" aria-label={label} tabIndex={-1} className={`fv-ui-popover fv-ui-popover--${align}${up ? ' is-up' : ''} ${className}`.trim()}>
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </span>
  );
}

export interface TooltipProps {
  /** Texto curto da dica (sem botões dentro — para isso, Popover). */
  content: ReactNode;
  children: ReactElement<{ 'aria-describedby'?: string; onMouseEnter?: (e: React.MouseEvent) => void; onMouseLeave?: (e: React.MouseEvent) => void; onFocus?: (e: React.FocusEvent) => void; onBlur?: (e: React.FocusEvent) => void }>;
  /** Atraso para aparecer no mouse, em ms (no foco é imediato). */
  delay?: number;
}

/** Dica no mouse e no foco do teclado, ligada por aria-describedby; Esc esconde. */
export function Tooltip({ content, children, delay = 350 }: TooltipProps) {
  const [show, setShow] = useState(false);
  const id = useId();
  const timer = useRef<number | undefined>(undefined);
  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setShow(false);
  }, []);
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, hide]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const p = children.props;
  const child = cloneElement(children, {
    'aria-describedby': [p['aria-describedby'], id].filter(Boolean).join(' '),
    onMouseEnter: (e: React.MouseEvent) => {
      p.onMouseEnter?.(e);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setShow(true), delay);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      p.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: React.FocusEvent) => {
      p.onFocus?.(e);
      setShow(true);
    },
    onBlur: (e: React.FocusEvent) => {
      p.onBlur?.(e);
      hide();
    },
  });
  return (
    <span className="fv-ui-tooltip-anchor">
      {child}
      <span role="tooltip" id={id} className={`fv-ui-tooltip${show ? ' is-on' : ''}`} hidden={!show}>
        {content}
      </span>
    </span>
  );
}
