import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const select = (id: string) => {
    setMoreOpen(false);
    onSelect(id);
  };

  return createPortal(
    <>
      {moreOpen && (
        <div className="fv-mobile-only fv-nav-more-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="fv-panel fv-nav-more" role="menu" aria-label="Mais abas" onClick={(e) => e.stopPropagation()}>
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
        />
      </nav>
    </>,
    document.body,
  );
}

function NavButton({ icon, label, active, onClick, gold, muted, expanded }: { icon: IconName; label: string; active: boolean; onClick: () => void; gold: string; muted: string; expanded?: boolean }) {
  return (
    <button
      onClick={onClick}
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
    <button role="menuitem" onClick={onClick} className="fv-nav-more-item" style={{ color: active ? 'var(--gold)' : 'var(--ink)', borderColor: active ? 'var(--gold)' : 'var(--line)' }}>
      <Icon name={tab.icon} size={26} color="var(--gold)" />
      <span>{tab.label}</span>
      <small className="fv-nav-more-hint">{tab.hint}</small>
    </button>
  );
}
