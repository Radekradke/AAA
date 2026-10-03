import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { prefetchOnIdle } from '@/lib/prefetch';
import { Screen } from '@/components/layout/Screen';
import { RuneRing } from '@/components/animations/RuneRing';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore, useCharactersHydrated } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { SupportModal } from '@/components/SupportModal';
import { hasSupport } from '@/lib/support';
import { rememberNext } from '@/lib/nextPath';
import { heroAvatar, heroFace, shortSubtitle } from '@/lib/summary';

interface MenuItem {
  key: string;
  label: string;
  hint: string;
  icon: IconName;
  run: () => void;
}

/**
 * Menu principal, como a tela inicial de um jogo: a marca no alto e as
 * escolhas embaixo — continuar o último herói, heróis, nova ficha, mesas
 * (multiplayer), configurações e tutorial. Setas ↑/↓ navegam pelo menu.
 */
export function Home() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const bump = useUiStore((s) => s.bump);
  // próximas telas prováveis: lista de heróis e a ficha (baixadas com o aparelho ocioso)
  useEffect(() => prefetchOnIdle('heroes', 'sheet'), []);
  const onboarded = useUiStore((s) => s.onboarded);
  const openTutorial = useUiStore((s) => s.openTutorial);
  const characters = useCharacterStore((s) => s.characters);
  const currentId = useCharacterStore((s) => s.currentId);
  const setCurrent = useCharacterStore((s) => s.setCurrent);
  const hydrated = useCharactersHydrated();
  const [support, setSupport] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);

  // o herói para "Continuar": o aberto por último (ou o mais recente)
  const lastHero = useMemo(() => {
    if (!user || !hydrated) return null;
    const mine = characters.filter((c) => c.ownerId === user.id && !c.draft);
    return mine.find((c) => c.id === currentId) ?? [...mine].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  }, [characters, currentId, user, hydrated]);

  // primeira visita: o tutorial abre sozinho (depois só pelo menu)
  useEffect(() => {
    if (onboarded) return;
    const t = setTimeout(openTutorial, 700);
    return () => clearTimeout(t);
  }, [onboarded, openTutorial]);

  /** Telas que pedem conta (ou convidado) passam pela tela de entrar e voltam. */
  const go = (path: string, auth = true) => {
    bump(1.2);
    if (auth && !user) {
      rememberNext(path);
      navigate('/entrar');
      return;
    }
    navigate(path);
  };

  const items: MenuItem[] = [
    { key: 'heroes', label: 'Heróis', hint: 'Abra suas fichas ou importe um personagem', icon: 'crest', run: () => go('/personagens') },
    { key: 'new', label: 'Nova ficha', hint: 'Forje um herói em 7 capítulos guiados', icon: 'anvil', run: () => go('/criar') },
    { key: 'tables', label: 'Mesas', hint: 'Jogue com amigos: o mestre cria a sala e convida', icon: 'banner', run: () => go('/mesas') },
    { key: 'config', label: 'Configurações', hint: 'Tema, som, dados 3D e livros', icon: 'gear', run: () => go('/config', false) },
    { key: 'tutorial', label: 'Tutorial', hint: 'Como tudo funciona, em 2 minutos', icon: 'book', run: openTutorial },
  ];

  // setas movem o foco entre os itens, como num menu de jogo
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
    e.preventDefault();
  };

  return (
    <Screen video="/assets/bg.mp4" videoOpacity={0.32}>
      <div className="fv-menu">
        <header className="fv-menu-brand">
          <RuneRing size="clamp(84px,12vh,128px)">
            <span className="fv-menu-sigil">F</span>
          </RuneRing>
          <h1 className="fv-home-title fv-menu-title">FICHA&nbsp;VIVA</h1>
          <p className="fv-menu-tag">Crie&nbsp;·&nbsp;Desperte&nbsp;·&nbsp;Jogue</p>
        </header>

        <nav className="fv-menu-nav" aria-label="Menu principal">
          <ul ref={listRef} onKeyDown={onKeyDown}>
            {lastHero && (
              <li>
                <button
                  type="button"
                  className="fv-menu-item is-primary"
                  onClick={() => {
                    setCurrent(lastHero.id);
                    go(`/ficha/${lastHero.id}`);
                  }}
                >
                  <span className="fv-menu-face" aria-hidden style={{ backgroundImage: `url("${heroAvatar(lastHero)}")`, ...heroFace(lastHero) }} />
                  <span className="fv-menu-text">
                    <b>Continuar</b>
                    <small>
                      {lastHero.name} · {shortSubtitle(lastHero)}
                    </small>
                  </span>
                  <span className="fv-menu-arrow" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            )}
            {items.map((it, i) => (
              <li key={it.key}>
                <button type="button" className={'fv-menu-item' + (!lastHero && i === 0 ? ' is-primary' : '')} onClick={it.run}>
                  <span className="fv-menu-icon" aria-hidden>
                    <Icon name={it.icon} size={22} />
                  </span>
                  <span className="fv-menu-text">
                    <b>{it.label}</b>
                    <small>{it.hint}</small>
                  </span>
                  <span className="fv-menu-arrow" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="fv-menu-foot">
          {user ? (
            <span className="fv-menu-user">
              <span className="fv-menu-avatar" aria-hidden>
                {user.name.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <span>{user.guest ? 'Jogando offline (sem conta)' : <>Entrou como <b>{user.name}</b></>}</span>
              <button
                type="button"
                className="fv-menu-link"
                onClick={() => {
                  logout();
                  if (user.guest) navigate('/entrar');
                }}
              >
                <Icon name="logout" size={14} /> {user.guest ? 'Entrar com conta' : 'Sair'}
              </button>
            </span>
          ) : (
            <button type="button" className="fv-menu-link" onClick={() => go('/entrar', false)}>
              Entrar ou criar conta (ou continuar offline)
            </button>
          )}
          {hasSupport() && (
            <button type="button" className="fv-menu-link" onClick={() => setSupport(true)}>
              <span aria-hidden>❤</span> Apoiar o projeto
            </button>
          )}
        </footer>
      </div>

      {support && <SupportModal onClose={() => setSupport(false)} />}
    </Screen>
  );
}
