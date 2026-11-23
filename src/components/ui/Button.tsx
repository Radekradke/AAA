import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

export type ButtonVariant = 'gold' | 'ghost' | 'accent' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** gold = ação principal · ghost = secundária · accent = ação viva · danger = destrutiva */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Mostra o giro e bloqueia o clique (aria-busy). */
  loading?: boolean;
  /** Ícone antes / depois do texto. */
  icon?: ReactNode;
  iconEnd?: ReactNode;
  /** Ocupa toda a largura. */
  block?: boolean;
  /** Brilho que pulsa (chamada para a ação principal). */
  pulse?: boolean;
  children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  gold: 'fv-btn-gold',
  ghost: 'fv-btn-ghost',
  accent: 'fv-btn-accent',
  danger: 'fv-btn-danger',
};

/**
 * Botão do design system. Usa as classes de sempre (fv-btn-gold,
 * fv-btn-ghost…) para ficar igual ao resto do app, e acrescenta tamanho,
 * carregando, ícone e foco de teclado (src/styles/ui.css).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ghost', size = 'md', loading, icon, iconEnd, block, pulse, children, className = '', disabled, type = 'button', ...rest },
  ref,
) {
  const cls = ['fv-ui-btn', VARIANT_CLASS[variant], `fv-ui-btn--${size}`, block && 'fv-ui-btn--block', pulse && 'fv-ui-btn--pulse', loading && 'is-loading', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="fv-ui-spinner" aria-hidden /> : icon && <span className="fv-ui-btn-icon" aria-hidden>{icon}</span>}
      <span className="fv-ui-btn-label">{children}</span>
      {iconEnd && !loading && <span className="fv-ui-btn-icon" aria-hidden>{iconEnd}</span>}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Nome falado pelo leitor de tela e mostrado na dica (obrigatório). */
  label: string;
  icon: ReactNode;
  variant?: 'ghost' | 'accent' | 'danger';
  size?: ButtonSize;
  /** Botão liga/desliga: aria-pressed. */
  pressed?: boolean;
}

/** Botão só de ícone: sempre com nome acessível e alvo de toque de 44 px no tamanho md. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', size = 'md', pressed, className = '', type = 'button', title, ...rest },
  ref,
) {
  const cls = ['fv-ui-iconbtn', VARIANT_CLASS[variant], `fv-ui-iconbtn--${size}`, pressed && 'is-on', className].filter(Boolean).join(' ');
  return (
    <button ref={ref} type={type} className={cls} aria-label={label} title={title ?? label} aria-pressed={pressed} {...rest}>
      <span aria-hidden>{icon}</span>
    </button>
  );
});
