import type { KeyboardEvent, ReactNode } from 'react';
import { useId, useRef } from 'react';
import { nextIndex } from '@/lib/roving';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string> {
  /** Nome do grupo para o leitor de tela. */
  label: string;
  options: SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Escolha única entre poucas opções (2–5). É um grupo de rádio: Tab entra
 * uma vez, as setas trocam a opção (padrão WAI-ARIA).
 */
export function Segmented<T extends string>({ label, options, value, onChange, size = 'md', className = '' }: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(0, options.findIndex((o) => o.value === value));
  const onKey = (e: KeyboardEvent, i: number) => {
    const next = nextIndex(e.key, i, options.map((o) => !!o.disabled));
    if (next === null) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={`fv-ui-seg fv-ui-seg--${size} ${className}`.trim()}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => void (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === current ? 0 : -1}
            disabled={o.disabled}
            className={on ? 'is-on' : undefined}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export interface ChipProps {
  children: ReactNode;
  /** Liga/desliga (aria-pressed). Sem isso, o chip é só um rótulo. */
  pressed?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** Texto pequeno à direita (contagem, custo). */
  meta?: ReactNode;
  className?: string;
}

/** Pílula: filtro ou opção que liga e desliga; sem onClick vira etiqueta estática. */
export function Chip({ children, pressed, onClick, disabled, meta, className = '' }: ChipProps) {
  const body = (
    <>
      {children}
      {meta !== undefined && <small>{meta}</small>}
    </>
  );
  if (!onClick) return <span className={`fv-pill is-static ${className}`.trim()}>{body}</span>;
  return (
    <button type="button" className={`fv-pill${pressed ? ' is-on' : ''} ${className}`.trim()} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      {body}
    </button>
  );
}

export type BadgeTone = 'neutral' | 'accent' | 'metal' | 'danger' | 'ok';

/** Selo curto de estado ("Novo", "3 pendentes", "Concentrando"). */
export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return <span className={`fv-ui-badge fv-ui-badge--${tone} ${className}`.trim()}>{children}</span>;
}

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string> {
  label: string;
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  /** Conteúdo da aba ativa. */
  children: ReactNode;
  className?: string;
}

/**
 * Abas com o padrão WAI-ARIA: tablist/tab/tabpanel ligados por id, setas e
 * Home/End trocam de aba, só a ativa entra no Tab.
 */
export function Tabs<T extends string>({ label, tabs, active, onChange, children, className = '' }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = `fv-tabs${useId().replace(/:/g, '')}`;
  const current = Math.max(0, tabs.findIndex((t) => t.id === active));
  const onKey = (e: KeyboardEvent, i: number) => {
    const next = nextIndex(e.key, i, tabs.map((t) => !!t.disabled));
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div className={`fv-ui-tabs ${className}`.trim()}>
      <div role="tablist" aria-label={label} className="fv-ui-tablist">
        {tabs.map((t, i) => {
          const on = i === current;
          return (
            <button
              key={t.id}
              ref={(el) => void (refs.current[i] = el)}
              type="button"
              role="tab"
              id={`${base}-${t.id}`}
              aria-selected={on}
              aria-controls={`${base}-painel`}
              tabIndex={on ? 0 : -1}
              disabled={t.disabled}
              className={on ? 'is-on' : undefined}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${base}-painel`} aria-labelledby={`${base}-${tabs[current]?.id}`} tabIndex={0} className="fv-ui-tabpanel">
        {children}
      </div>
    </div>
  );
}
