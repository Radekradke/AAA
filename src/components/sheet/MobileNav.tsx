import { createPortal } from 'react-dom';
import { SHEET_TABS } from './sheetTabDefs';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { Icon } from '@/components/ui/Icon';

interface MobileNavProps {
  active: string;
  onSelect: (id: string) => void;
  isCaster: boolean;
}

/**
 * Navegação inferior por abas (modo mobile / mesa de RPG).
 * Renderizada num portal em document.body: `position: fixed` dentro de
 * ancestrais com transform/filter (animações de página) faz a barra
 * "congelar" no meio do conteúdo — o portal escapa desse containing block.
 */
export function MobileNav({ active, onSelect, isCaster }: MobileNavProps) {
  const t = useTheme();
  const tabs = SHEET_TABS.filter((tab) => !tab.caster || isCaster);

  return createPortal(
    <nav
      className="fv-mobile-only"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 45,
        justifyContent: 'space-around',
        gap: 2,
        padding: '8px 6px calc(8px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(180deg, rgba(6,8,12,.4), rgba(6,8,12,.9))',
        borderTop: '1px solid var(--line)',
        backdropFilter: 'blur(14px)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            aria-label={tab.label}
            style={{
              flex: '1 0 46px',
              minWidth: 46,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '6px 2px',
              borderRadius: 12,
              border: 'none',
              background: isActive ? hexA(t.gold, 0.12) : 'transparent',
              transition: '.2s',
            }}
          >
            <Icon name={tab.icon} size={19} color={isActive ? t.gold : t.muted} />
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: '.02em',
                color: isActive ? t.gold : t.muted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>,
    document.body,
  );
}
