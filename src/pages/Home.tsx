import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { prefetchOnIdle } from '@/lib/prefetch';
import { Screen } from '@/components/layout/Screen';
import { RuneRing } from '@/components/animations/RuneRing';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { lastHeroOf } from '@/lib/lastHero';
import { useCharacterStore, useCharactersHydrated } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { mayAutoShow } from '@/services/onboardingSync';
import { SupportModal } from '@/components/SupportModal';
import { hasSupport } from '@/lib/support';
import { rememberNext } from '@/lib/nextPath';
import { heroAvatar, heroFace, shortSubtitle } from '@/lib/summary';
import type { UpcomingForMe } from '@/services/agendaService';
import { cloudEnabled } from '@/services/supabaseClient';
import { isHappening, relativeLabel, timeLabel } from '@/lib/agenda';

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
  const onboarded = useUiStore((s) => s.onboarded || s.tipsOff);
  const openTutorial = useUiStore((s) => s.openTutorial);
  const characters = useCharacterStore((s) => s.characters);
  const currentId = useCharacterStore((s) => s.currentId);
  const setCurrent = useCharacterStore((s) => s.setCurrent);
  const hydrated = useCharactersHydrated();
  const [support, setSupport] = useState(false);
  const [nextSession, setNextSession] = useState<UpcomingForMe | null>(null);

  // o herói para "Continuar": o aberto por último (ou o mais recente)
  const lastHero = useMemo(() => {
    if (!user || !hydrated) return null;
    return lastHeroOf(characters, user.id, currentId);
  }, [characters, currentId, user, hydrated]);

  // a próxima sessão marcada em qualquer mesa minha (sem o agenda.sql: nada aparece)
  useEffect(() => {
    if (!user || user.guest || !cloudEnabled()) {
      setNextSession(null);
      return;
    }
    let alive = true;
    // sob demanda: a agenda não pesa a abertura do app
    import('@/services/agendaService')
      .then((m) => m.agendaService.upcomingForMe(user.id))
      .then((list) => alive && setNextSession(list[0] ?? null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user]);

  // primeira visita: o tutorial abre sozinho (depois só pelo menu). Com conta,
  // "primeira vez" é da conta: confere o que ela já viu em outro aparelho.
  useEffect(() => {
    if (onboarded) return;
    let alive = true;
    const t = setTimeout(() => {
      void mayAutoShow((ui) => ui.onboarded).then((ok) => alive && ok && openTutorial());
    }, 700);
    return () => {
      alive = false;
      clearTimeout(t);
    };
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

  // quantos heróis a pessoa tem (para dizer no menu e decidir o que vem primeiro)
  const heroCount = useMemo(() => (user && hydrated ? characters.filter((c) => c.ownerId === user.id && !c.draft).length : 0), [characters, user, hydrated]);
  const newHero: MenuItem = {
    key: 'new',
    label: 'Nova ficha',
    hint: heroCount ? 'Forje outro herói em capítulos guiados' : 'Forje seu primeiro herói, capítulo a capítulo',
    icon: 'anvil',
    run: () => go('/criar'),
  };
  const heroes: MenuItem = {
    key: 'heroes',
    label: 'Heróis',
    hint: heroCount ? `${heroCount} ${heroCount === 1 ? 'herói' : 'heróis'} · abrir, duplicar ou importar` : 'Importe uma ficha (arquivo ou ChatGPT)',
    icon: 'crest',
    run: () => go('/personagens'),
  };
  // jogar primeiro; ajustes e ajuda descem para a linha de baixo
  const items: MenuItem[] = [
    ...(heroCount ? [heroes, newHero] : [newHero, heroes]),
    { key: 'tables', label: 'Mesas', hint: 'Jogue com amigos: crie ou entre numa sala', icon: 'banner', run: () => go('/mesas') },
  ];
  const extras: MenuItem[] = [
    { key: 'config', label: 'Configurações', hint: 'Tema, som, dados e conta', icon: 'gear', run: () => go('/config', false) },
    { key: 'tutorial', label: 'Tutorial', hint: 'Como tudo funciona', icon: 'compass', run: openTutorial },
  ];

  // setas movem o foco entre os itens (os de baixo também), como num menu de jogo
  const navRef = useRef<HTMLElement | null>(null);
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = Array.from(navRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
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

        <nav className="fv-menu-nav" aria-label="Menu principal" ref={navRef} onKeyDown={onKeyDown}>
          <ul>
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
            {nextSession && <NextSessionItem s={nextSession} onOpen={() => go(`/mesa/${nextSession.event.campaignId}`)} />}
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
          <div className="fv-menu-sub">
            {extras.map((it) => (
              <button key={it.key} type="button" onClick={it.run} title={it.hint}>
                <Icon name={it.icon} size={16} />
                {it.label}
              </button>
            ))}
            {hasSupport() && (
              <button type="button" onClick={() => setSupport(true)}>
                <span aria-hidden>❤</span> Apoiar
              </button>
            )}
          </div>
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
        </footer>
      </div>

      {support && <SupportModal onClose={() => setSupport(false)} />}
    </Screen>
  );
}

/** Item do menu com a próxima sessão marcada: dia em destaque, mesa e se você já confirmou. */
function NextSessionItem({ s, onOpen }: { s: UpcomingForMe; onOpen: () => void }) {
  const d = new Date(s.event.startsAt);
  const live = isHappening(s.event);
  return (
    <li>
      <button type="button" className="fv-menu-item" onClick={onOpen}>
        <span className="fv-menu-icon fv-menu-when" aria-hidden>
          <b>{d.getDate()}</b>
          <small>{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '')}</small>
        </span>
        <span className="fv-menu-text">
          <b>{live ? 'Sessão acontecendo agora' : `Próxima sessão ${relativeLabel(s.event.startsAt)}`}</b>
          <small>
            {s.campaignName} · {timeLabel(s.event.startsAt)} ·{' '}
            {s.mine === 'yes' ? (
              <span className="fv-menu-rsvp is-yes">você vai</span>
            ) : s.mine ? (
              <span className="fv-menu-rsvp">{s.mine === 'maybe' ? 'talvez' : 'não vai'}</span>
            ) : (
              <span className="fv-menu-rsvp is-ask">confirme</span>
            )}
          </small>
        </span>
        <span className="fv-menu-arrow" aria-hidden>
          ›
        </span>
      </button>
    </li>
  );
}
