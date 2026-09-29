import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/lib/useTheme';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { SyncBadge } from '@/components/ui/SyncBadge';

export interface TopBarMenuItem {
  label: string;
  onClick: () => void;
  icon?: IconName;
  /** Só aparece no menu em telas pequenas (no desktop já está visível na barra). */
  mobileOnly?: boolean;
  danger?: boolean;
}

interface TopBarProps {
  /** Ações principais à direita (sempre visíveis). */
  actions?: ReactNode;
  /** Ações secundárias, recolhidas no menu "⋯". */
  menu?: TopBarMenuItem[];
}

/**
 * Barra superior fixa. Desktop: marca, atmosfera, som, salvamento e ações.
 * Celular: só o essencial (marca, salvamento, ações principais) — o resto
 * vai para o menu "⋯", para nada ser cortado na borda da tela.
 */
export function TopBar({ actions, menu = [] }: TopBarProps) {
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const sound = useUiStore((s) => s.sound);
  const toggleSound = useUiStore((s) => s.toggleSound);
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items: (TopBarMenuItem & { key: string })[] = [
    ...menu.map((m, i) => ({ ...m, key: `m${i}` })),
    { key: 'theme', label: `Atmosfera: ${t.label}`, icon: 'spark', onClick: toggleTheme, mobileOnly: true },
    { key: 'sound', label: sound ? 'Desativar som' : 'Ativar som', icon: sound ? 'volume' : 'volumeOff', onClick: toggleSound, mobileOnly: true },
  ];
  const hasDesktopItems = items.some((i) => !i.mobileOnly);

  return (
    <div className="fv-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, pointerEvents: 'auto' }}>
        <div className="fv-topbar-logo" aria-hidden>
          <span>F</span>
        </div>
        <span className="fv-hide-mobile" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '.22em', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          FICHA&nbsp;VIVA
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
        <button onClick={toggleTheme} aria-label="Alternar atmosfera" className="fv-topbar-pill fv-hide-mobile">
          <span style={{ width: 11, height: 11, borderRadius: 999, background: 'linear-gradient(135deg, var(--acc), var(--acc2))', boxShadow: '0 0 10px var(--acc)' }} />
          {t.label}
        </button>
        <button
          onClick={toggleSound}
          aria-label={sound ? 'Desativar som' : 'Ativar som'}
          title={sound ? 'Som ativado' : 'Som desativado'}
          className="fv-topbar-icon fv-hide-mobile"
          style={{ borderColor: sound ? 'var(--gold)' : undefined, color: sound ? 'var(--gold)' : undefined }}
        >
          <Icon name={sound ? 'volume' : 'volumeOff'} size={17} />
        </button>
        <SyncBadge />
        {actions}

        <div ref={menuRef} style={{ position: 'relative' }} className={hasDesktopItems ? undefined : 'fv-mobile-only'}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Mais opções"
            aria-haspopup="menu"
            aria-expanded={open}
            className="fv-topbar-icon"
            style={{ borderColor: open ? 'var(--gold)' : undefined, color: open ? 'var(--gold)' : undefined }}
          >
            <Icon name="more" size={18} />
          </button>
          {open && (
            <div role="menu" className="fv-topbar-menu fv-panel">
              {items.map((it) => (
                <button
                  key={it.key}
                  role="menuitem"
                  className={'fv-topbar-menu-item' + (it.mobileOnly ? ' fv-mobile-only' : '')}
                  style={{ color: it.danger ? 'var(--danger)' : undefined }}
                  onClick={() => {
                    setOpen(false);
                    it.onClick();
                  }}
                >
                  {it.icon && <Icon name={it.icon} size={16} color={it.danger ? 'var(--danger)' : 'var(--gold)'} />}
                  {it.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
