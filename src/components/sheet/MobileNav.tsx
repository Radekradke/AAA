import { useEffect, useRef, useState } from 'react';
import type { Ref } from 'react';
import { createPortal } from 'react-dom';
import { SHEET_TABS } from './sheetTabDefs';
import type { SheetTabDef } from './sheetTabDefs';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';

interface MobileNavProps {
  active: string;
  onSelect: (id: string) => void;
  isCaster: boolean;
}

/** Abas que ficam sempre na barra; o resto vai para "Mais". */
const PRIMARY = ['mesa', 'ficha', 'combate', 'inventario', 'magias'];

/**
 * Navegação inferior (celular). No máximo 6 botões com rótulo inteiro —
 * o Diário e as abas de uso ocasional (Evoluir, Descanso, Retrato, Dados)
 * ficam numa gaveta "Mais", cada uma com uma linha dizendo para que serve. Renderizada num portal em document.body: `position: fixed`
 * dentro de ancestrais com transform/filter "congela" a barra no conteúdo.
 */
export function MobileNav({ active, onSelect, isCaster }: MobileNavProps) {
  const t = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = SHEET_TABS.filter((tab) => !tab.caster || isCaster);
  const primary = tabs.filter((tab) => PRIMARY.includes(tab.id));
  const secondary = tabs.filter((tab) => !PRIMARY.includes(tab.id));
  const activeSecondary = secondary.find((tab) => tab.id === active);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);

  // teclado (como o menu "⋯" da barra do topo): o foco entra na aba atual (ou na 1ª);
  // setas/Home/End andam; Esc fecha e devolve o foco ao "Mais"; Tab fecha
  useEffect(() => {
    if (!moreOpen) return;
    const items = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    (menuRef.current?.querySelector<HTMLElement>('[role="menuitem"][aria-current]') ?? items()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        moreRef.current?.focus();
        return;
      }
      if (e.key === 'Tab') return setMoreOpen(false);
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      const go = (n: number) => {
        e.preventDefault();
        list[(n + list.length) % list.length]?.focus();
      };
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') go(i + 1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') go(i - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(list.length - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const select = (id: string) => {
    // a aba escolhida na gaveta some com ela: o foco volta ao "Mais" (que passa a mostrar a aba)
    if (moreOpen) moreRef.current?.focus();
    setMoreOpen(false);
    onSelect(id);
  };

  return createPortal(
    <>
      {moreOpen && (
        <div className="fv-mobile-only fv-nav-more-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setMoreOpen(false); }}>
          <div ref={menuRef} className="fv-panel fv-nav-more" role="menu" aria-label="Mais abas">
            {secondary.map((tab) => (
              <MoreItem key={tab.id} tab={tab} active={active === tab.id} onClick={() => select(tab.id)} />
            ))}
          </div>
        </div>
      )}
      <nav className="fv-mobile-only fv-mobile-nav" aria-label="Abas da ficha" data-tour="tabs">
        {primary.map((tab) => (
          <NavButton key={tab.id} icon={tab.icon} label={tab.short ?? tab.label} active={active === tab.id} onClick={() => select(tab.id)} gold={t.gold} muted={t.muted} />
        ))}
        <NavButton
          icon={activeSecondary?.icon ?? 'more'}
          label={activeSecondary?.label ?? 'Mais'}
          active={!!activeSecondary || moreOpen}
          onClick={() => setMoreOpen((o) => !o)}
          gold={t.gold}
          muted={t.muted}
          expanded={moreOpen}
          btnRef={moreRef}
        />
      </nav>
    </>,
    document.body,
  );
}

function NavButton({ icon, label, active, onClick, gold, muted, expanded, btnRef }: { icon: IconName; label: string; active: boolean; onClick: () => void; gold: string; muted: string; expanded?: boolean; btnRef?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      aria-haspopup={expanded === undefined ? undefined : 'menu'}
      aria-current={active && expanded === undefined ? 'page' : undefined}
      aria-expanded={expanded}
      className="fv-mobile-nav-btn"
      style={{ background: active ? hexA(gold, 0.12) : 'transparent', color: active ? gold : muted }}
    >
      <Icon name={icon} size={22} />
      <span>{label}</span>
    </button>
  );
}

function MoreItem({ tab, active, onClick }: { tab: SheetTabDef; active: boolean; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" aria-current={active ? 'page' : undefined} onClick={onClick} className="fv-nav-more-item" style={{ color: active ? 'var(--gold)' : 'var(--ink)', borderColor: active ? 'var(--gold)' : 'var(--line)' }}>
      <Icon name={tab.icon} size={26} color="var(--gold)" />
      <span>{tab.label}</span>
      <small className="fv-nav-more-hint">{tab.hint}</small>
    </button>
  );
}
