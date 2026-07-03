import type { CSSProperties, ReactNode } from 'react';
import { useTilt } from '@/lib/useTilt';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';

interface SelectableCardProps {
  selected: boolean;
  onClick: () => void;
  jewel?: string;
  children: ReactNode;
  style?: CSSProperties;
  /** Selo no canto quando selecionado (ex.: SELECIONADO / EQUIPADO). */
  badge?: string;
}

/** Card 3D selecionável com brilho dourado quando ativo — base da criação. */
export function SelectableCard({ selected, onClick, jewel = '#888', children, style, badge }: SelectableCardProps) {
  const tilt = useTilt();
  const t = useTheme();

  const cardStyle: CSSProperties = {
    position: 'relative',
    cursor: 'pointer',
    minWidth: 0,
    background: 'linear-gradient(160deg, var(--panel), var(--panel2))',
    border: '1px solid ' + (selected ? t.gold : t.line),
    borderRadius: 14,
    padding: 14,
    boxShadow:
      (selected
        ? `0 0 0 1px ${t.gold}, 0 0 30px ${hexA(t.gold, 0.3)},`
        : '0 12px 30px rgba(0,0,0,0.45),') +
      `inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 30px ${hexA(jewel, selected ? 0.12 : 0.06)}`,
    transition: 'transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .3s, border-color .3s, background .3s',
    transformStyle: 'preserve-3d',
    overflow: 'hidden',
    ...style,
  };

  return (
    <div
      onClick={onClick}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={cardStyle}
    >
      {badge && selected && (
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            fontSize: 10,
            letterSpacing: '.1em',
            color: '#140d04',
            background: t.gold,
            padding: '3px 8px',
            borderRadius: 999,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      )}
      {children}
    </div>
  );
}
