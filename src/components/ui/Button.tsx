import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'gold' | 'ghost' | 'danger' | 'accent';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  pulse?: boolean;
  children: ReactNode;
}

/** Botão AAA com variações de superfície e brilho mágico opcional. */
export function Button({ variant = 'ghost', pulse, children, className = '', style, ...rest }: ButtonProps) {
  const base: React.CSSProperties = {
    cursor: 'pointer',
    fontFamily: variant === 'gold' ? "'Cinzel', serif" : "'Inter', sans-serif",
    fontWeight: variant === 'gold' ? 700 : 600,
    letterSpacing: variant === 'gold' ? '0.08em' : '0.02em',
    borderRadius: 12,
    transition: 'transform .2s, box-shadow .2s, border-color .2s, background .2s',
    ...style,
  };

  const variants: Record<Variant, React.CSSProperties> = {
    gold: {
      color: '#1a1206',
      padding: '14px 30px',
      fontSize: 15,
      border: '1px solid var(--goldB)',
      background: 'linear-gradient(180deg, var(--goldB), var(--gold))',
      boxShadow: '0 10px 28px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.6)',
      animation: pulse ? 'glowPulse 3.4s ease-in-out infinite' : undefined,
    },
    ghost: {
      color: 'var(--muted)',
      padding: '11px 18px',
      fontSize: 13,
      border: '1px solid var(--line)',
      background: 'var(--panel)',
      backdropFilter: 'blur(8px)',
    },
    accent: {
      color: 'var(--acc)',
      padding: '11px 18px',
      fontSize: 13,
      border: '1px solid var(--line)',
      background: 'var(--accSoft)',
      backdropFilter: 'blur(8px)',
    },
    danger: {
      color: 'var(--danger)',
      padding: '11px 18px',
      fontSize: 13,
      border: '1px solid var(--danger)',
      background: 'rgba(255,80,40,.1)',
    },
  };

  return (
    <button className={className} style={{ ...base, ...variants[variant] }} {...rest}>
      {children}
    </button>
  );
}
