import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';

const SearchPalette = lazy(() => import('./SearchPalette').then((m) => ({ default: m.SearchPalette })));

/** Está digitando? Aí o "/" é texto, não atalho. */
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * Lupa da barra do topo (todas as telas depois do menu principal). Abre a
 * busca geral; Ctrl/⌘+K ou "/" também abrem. A paleta só baixa ao abrir.
 */
export function SearchButton() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const enabled = pathname !== '/';

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <button type="button" className="fv-topbar-icon fv-search-btn" onClick={() => setOpen(true)} aria-label="Buscar (Ctrl+K)" title="Buscar (Ctrl+K ou /)" aria-haspopup="dialog">
        <Icon name="search" size={17} />
        <span className="fv-search-btn-label">Buscar</span>
        <kbd className="fv-search-btn-kbd">Ctrl K</kbd>
      </button>
      {open && (
        <Suspense fallback={null}>
          <SearchPalette onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
