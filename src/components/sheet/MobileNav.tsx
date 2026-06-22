import { SHEET_TABS } from './sheetTabs';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';

interface MobileNavProps {
  active: string;
  onSelect: (id: string) => void;
  isCaster: boolean;
}

/** Navegação inferior por abas (modo mobile / mesa de RPG). */
export function MobileNav({ active, onSelect, isCaster }: MobileNavProps) {
  const t = useTheme();
  const tabs = SHEET_TABS.filter((tab) => !tab.caster || isCaster);

  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 45,
        display: 'flex',
        justifyContent: 'space-around',
        gap: 2,
        padding: '8px 6px calc(8px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(180deg, rgba(6,8,12,.4), rgba(6,8,12,.9))',
        borderTop: '1px solid var(--line)',
        backdropFilter: 'blur(14px)',
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
              flex: 1,
              minWidth: 0,
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
            <span style={{ fontSize: 17, lineHeight: 1, filter: isActive ? 'none' : 'grayscale(.4)', opacity: isActive ? 1 : 0.7 }}>
              {tab.icon}
            </span>
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
    </nav>
  );
}
