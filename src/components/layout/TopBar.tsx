import { ThemePickerModal } from './ThemePickerModal';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useUiStore } from '@/store/uiStore';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { SyncBadge } from '@/components/ui/SyncBadge';
import { MusicControl } from './MusicControl';
import { Modal } from '@/components/ui/Modal';
import { useInstallPrompt } from '@/lib/pwaInstall';
import { THEMES } from '@/data/themes';

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
  const theme = useUiStore((s) => s.theme);
  const [open, setOpen] = useState(false);
  const [iosGuide, setIosGuide] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const installer = useInstallPrompt();
  const navigate = useNavigate();
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
    { key: 'home', label: 'Menu principal', icon: 'spark', onClick: () => navigate('/') },
    { key: 'config', label: 'Configurações', icon: 'gear', onClick: () => navigate('/config') },
    { key: 'theme', label: `Escolher tema · ${THEMES[theme].label}`, icon: 'image', onClick: () => setThemesOpen(true) },
    // app instalável: só aparece quando dá para instalar (e ainda não está instalado)
    ...(installer.canPrompt || installer.needsIOSGuide
      ? [{ key: 'install', label: 'Instalar app no aparelho', icon: 'chestOpen' as const, onClick: () => (installer.canPrompt ? void installer.install() : setIosGuide(true)) }]
      : []),
  ];

  return (
    <div className="fv-topbar">
      {/* a marca leva ao menu principal */}
      <button type="button" className="fv-topbar-brand" onClick={() => navigate('/')} aria-label="Menu principal" title="Menu principal">
        <div className="fv-topbar-logo" aria-hidden>
          <span>F</span>
        </div>
        <span className="fv-hide-mobile" style={{ fontFamily: 'var(--font-display)', letterSpacing: '.22em', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          FICHA&nbsp;VIVA
        </span>
      </button>

      <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
        <SyncBadge />
        <MusicControl />
        {actions}

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Mais opções"
            data-tour="more"
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

      {themesOpen && <ThemePickerModal onClose={() => setThemesOpen(false)} />}
      {iosGuide && (
        <Modal title="Instalar no iPhone / iPad" icon="d20" onClose={() => setIosGuide(false)} maxWidth={420}>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, lineHeight: 1.5, color: 'var(--ink)' }}>
            <li>Abra este site no <b>Safari</b>.</li>
            <li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li>
            <li>Escolha <b>Adicionar à Tela de Início</b> e confirme.</li>
          </ol>
          <p style={{ margin: '14px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
            A Ficha Viva vira um ícone na tela e abre em tela cheia — e funciona sem internet depois da primeira visita.
          </p>
        </Modal>
      )}
    </div>
  );
}
