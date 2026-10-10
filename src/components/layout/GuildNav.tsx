import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';

interface NavItem {
  label: string;
  icon: IconName;
  to: string;
  /** Rota ativa quando o caminho começa com este prefixo. */
  match: (path: string) => boolean;
}

/** Telas "de hub", onde a barra inferior aparece no celular. */
const MOBILE_HUBS = ['/', '/personagens', '/mesas', '/config'];

/**
 * Navegação do tema Guilda Rubra: barra lateral compacta no PC (ícone com
 * rótulo visível embaixo) e barra inferior no celular, só nas telas de hub
 * (a ficha e a criação já têm a própria navegação embaixo).
 */
export function GuildNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const currentId = useCharacterStore((s) => s.currentId);
  const hasCurrent = useCharacterStore((s) => !!s.currentId && s.characters.some((c) => c.id === s.currentId && !c.draft));
  // sessão ao vivo tem layout próprio de tela cheia
  if (!user || pathname.endsWith('/jogar')) return null;

  const items: NavItem[] = [
    { label: 'Início', icon: 'home', to: '/', match: (p) => p === '/' },
    { label: 'Heróis', icon: 'crest', to: '/personagens', match: (p) => p === '/personagens' },
    ...(hasCurrent ? [{ label: 'Ficha', icon: 'quill' as IconName, to: `/ficha/${currentId}`, match: (p: string) => p.startsWith('/ficha/') }] : []),
    { label: 'Mesas', icon: 'banner', to: '/mesas', match: (p) => p === '/mesas' || p.startsWith('/mesa/') },
    { label: 'Ajustes', icon: 'gear', to: '/config', match: (p) => p === '/config' || p === '/retratos' || p === '/diagnostico' },
  ];
  const onHub = MOBILE_HUBS.includes(pathname);

  return (
    <nav className={'fv-guild-nav' + (onHub ? ' is-hub' : '')} aria-label="Navegação principal">
      <div className="fv-guild-brand" aria-hidden>
        <span>F</span>
      </div>
      <ul>
        {items.map((it) => {
          const on = it.match(pathname);
          return (
            <li key={it.label}>
              <button type="button" className={on ? 'is-on' : ''} aria-current={on ? 'page' : undefined} onClick={() => navigate(it.to)}>
                <Icon name={it.icon} size={21} />
                <span>{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className={'fv-guild-new' + (pathname === '/criar' ? ' is-on' : '')}
        aria-current={pathname === '/criar' ? 'page' : undefined}
        onClick={() => navigate('/criar')}
        title="Novo herói"
      >
        <span aria-hidden>+</span>
        <small>Novo</small>
      </button>
    </nav>
  );
}
