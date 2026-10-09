import { ThemePickerModal } from './ThemePickerModal';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useThemeMode } from '@/lib/useTheme';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { SyncBadge } from '@/components/ui/SyncBadge';
import { MusicControl } from './MusicControl';
import { SearchButton } from '@/components/search/SearchButton';
import { Modal } from '@/components/ui/Modal';
import { useInstallPrompt } from '@/lib/pwaInstall';
import { THEMES } from '@/data/themes';
import { useAuthStore } from '@/store/authStore';

/** Navegação global: sempre no mesmo lugar, com a tela atual marcada. */
const NAV: { to: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { to: '/', label: 'Início', icon: 'home', match: (p) => p === '/' },
  { to: '/personagens', label: 'Heróis', icon: 'crest', match: (p) => p === '/personagens' || p.startsWith('/ficha/') || p === '/criar' },
  { to: '/mesas', label: 'Mesas', icon: 'banner', match: (p) => p === '/mesas' || p.startsWith('/mesa/') || p.startsWith('/sala/') },
  { to: '/config', label: 'Configurações', icon: 'gear', match: (p) => p === '/config' || p === '/diagnostico' || p === '/retratos' },
];

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
  /** O conteúdo já rolou: a barra ganha fundo sólido (no celular, o conteúdo passa por baixo). */
  scrolled?: boolean;
}

/**
 * Barra superior fixa. Desktop: marca, atmosfera, som, salvamento e ações.
 * Celular: só o essencial (marca, salvamento, ações principais) — o resto
 * vai para o menu "⋯", para nada ser cortado na borda da tela.
 */
export function TopBar({ actions, menu = [], scrolled }: TopBarProps) {
  const theme = useUiStore((s) => s.theme);
  const mode = useThemeMode();
  const toggleThemeMode = useUiStore((s) => s.toggleThemeMode);
  const [open, setOpen] = useState(false);
  const [iosGuide, setIosGuide] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const installer = useInstallPrompt();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  // a barra de navegação aparece com alguém dentro, fora do menu principal (que já é a navegação)
  // e fora da Guilda Rubra (que tem a lateral própria)
  const showNav = !!user && pathname !== '/' && theme !== 'rubra';
  const menuRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    // teclado: o foco entra no 1º item; setas/Home/End andam; Esc fecha e devolve o foco; Tab sai
    const itemsOf = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]') ?? [])].filter((n) => n.getClientRects().length > 0);
    itemsOf()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        moreRef.current?.focus();
        return;
      }
      if (e.key === 'Tab') return setOpen(false);
      const list = itemsOf();
      const i = list.indexOf(document.activeElement as HTMLElement);
      const go = (n: number) => {
        e.preventDefault();
        list[(n + list.length) % list.length]?.focus();
      };
      if (e.key === 'ArrowDown') go(i + 1);
      else if (e.key === 'ArrowUp') go(i - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(list.length - 1);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // menu "⋯" em grupos: o que é desta tela, para onde ir, aparência e o app
  type Item = TopBarMenuItem & { key: string; current?: boolean; check?: boolean };
  const groups = ([
    { key: 'page', title: 'Nesta tela', items: menu.map((m, i) => ({ ...m, key: `m${i}` })) },
    {
      key: 'nav',
      title: 'Ir para',
      items: NAV.map((n) => ({ key: `nav-${n.to}`, label: n.label, icon: n.icon, current: n.match(pathname), onClick: () => navigate(n.to) })),
    },
    {
      key: 'look',
      title: 'Aparência',
      items: [
        { key: 'theme', label: `Tema: ${THEMES[theme].label}`, icon: 'image', onClick: () => setThemesOpen(true) },
        { key: 'mode', label: 'Paleta clara', icon: 'contrast', check: mode === 'light', onClick: toggleThemeMode },
      ] as Item[],
    },
    // app instalável: só aparece quando dá para instalar (e ainda não está instalado)
    ...(installer.canPrompt || installer.needsIOSGuide
      ? [{ key: 'app', title: 'App', items: [{ key: 'install', label: 'Instalar no aparelho', icon: 'chestOpen' as const, onClick: () => (installer.canPrompt ? void installer.install() : setIosGuide(true)) }] }]
      : []),
  ] as { key: string; title: string; items: Item[] }[]).filter((g) => g.items.length);

  const run = (it: Item) => {
    if (it.check === undefined) {
      setOpen(false);
      moreRef.current?.focus(); // o item some com o menu: quem abrir um modal devolve o foco aqui
    }
    it.onClick();
  };

  return (
    <div className={'fv-topbar' + (scrolled ? ' is-scrolled' : '')}>
      {/* a marca leva ao menu principal */}
      <button type="button" className="fv-topbar-brand" onClick={() => navigate('/')} aria-label="Menu principal" title="Menu principal">
        <div className="fv-topbar-logo" aria-hidden>
          <span>F</span>
        </div>
        <span className="fv-hide-mobile" style={{ fontFamily: 'var(--font-display)', letterSpacing: '.22em', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          FICHA&nbsp;VIVA
        </span>
      </button>

      {showNav && (
        <nav className="fv-topnav" aria-label="Navegação principal">
          {NAV.slice(0, 3).map((n) => {
            const on = n.match(pathname);
            return (
              <button key={n.to} type="button" className={on ? 'is-on' : ''} aria-current={on ? 'page' : undefined} onClick={() => navigate(n.to)}>
                <Icon name={n.icon} size={15} />
                {n.label}
              </button>
            );
          })}
        </nav>
      )}

      <div className="fv-topbar-tools">
        {user && <SearchButton />}
        <SyncBadge />
        <MusicControl />
        {actions}

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            ref={moreRef}
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
            <div role="menu" aria-label="Mais opções" className="fv-topbar-menu fv-panel">
              {user && (
                <div className="fv-topbar-menu-user" aria-hidden>
                  <span className="fv-menu-avatar">{user.name.trim().charAt(0).toUpperCase() || '?'}</span>
                  <span>
                    <b>{user.guest ? 'Convidado' : user.name}</b>
                    <small>{user.guest ? 'Offline · fichas só neste aparelho' : user.email ?? 'Conta na nuvem'}</small>
                  </span>
                </div>
              )}
              {groups.map((g) => (
                <div key={g.key} role="group" aria-label={g.title} className={'fv-topbar-menu-group' + (g.key === 'nav' && showNav ? ' is-nav' : '')}>
                  <span className="fv-topbar-menu-title" aria-hidden>{g.title}</span>
                  {g.items.map((it) => (
                    <button
                      key={it.key}
                      role={it.check === undefined ? 'menuitem' : 'menuitemcheckbox'}
                      aria-checked={it.check === undefined ? undefined : it.check}
                      aria-current={it.current ? 'page' : undefined}
                      tabIndex={-1}
                      className={'fv-topbar-menu-item' + (it.mobileOnly ? ' fv-mobile-only' : '') + (it.danger ? ' is-danger' : '') + (it.current ? ' is-current' : '')}
                      onClick={() => run(it)}
                    >
                      {it.icon && <Icon name={it.icon} size={16} />}
                      <span className="fv-topbar-menu-label">{it.label}</span>
                      {it.current && <span className="fv-topbar-menu-here">aqui</span>}
                      {it.check !== undefined && <span className={'fv-topbar-menu-switch' + (it.check ? ' is-on' : '')} aria-hidden />}
                    </button>
                  ))}
                </div>
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
