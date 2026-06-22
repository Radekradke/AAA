import type { CSSProperties, ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Ocupa toda a largura da grade. */
  full?: boolean;
}

/** Painel de vidro AAA (gradiente, borda, sombra, blur). */
export function Panel({ children, className = '', style, full }: PanelProps) {
  return (
    <div
      className={`fv-panel ${className}`}
      style={{ padding: 18, ...(full ? { gridColumn: '1 / -1' } : {}), ...style }}
    >
      {children}
    </div>
  );
}

interface SectionLabelProps {
  children: ReactNode;
  right?: ReactNode;
  style?: CSSProperties;
}

/** Cabeçalho de seção em Cinzel maiúsculo espaçado. */
export function SectionLabel({ children, right, style }: SectionLabelProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 13,
        ...style,
      }}
    >
      <div className="fv-label">{children}</div>
      {right}
    </div>
  );
}
