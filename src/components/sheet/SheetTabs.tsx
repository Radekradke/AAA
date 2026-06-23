import { SHEET_TABS } from './sheetTabDefs';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';

interface SheetTabsProps {
  active: string;
  onSelect: (id: string) => void;
  isCaster: boolean;
}

/** Abas do topo (desktop/tablet) em chips Cinzel com brilho dourado. */
export function SheetTabs({ active, onSelect, isCaster }: SheetTabsProps) {
  const t = useTheme();
  const tabs = SHEET_TABS.filter((tab) => !tab.caster || isCaster);

  return (
    <div
      className="fv-no-scrollbar"
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        margin: 'clamp(16px,2.2vw,22px) 0 clamp(14px,1.6vw,18px)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 16px',
              borderRadius: 999,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: "'Cinzel', serif",
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: '.03em',
              color: isActive ? t.gold : t.muted,
              border: '1px solid ' + (isActive ? t.gold : t.line),
              background: isActive ? hexA(t.gold, 0.12) : t.panel,
              boxShadow: isActive ? '0 0 22px ' + hexA(t.gold, 0.3) : 'none',
              backdropFilter: 'blur(8px)',
              transition: '.25s',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: isActive ? t.gold : t.muted,
                boxShadow: isActive ? '0 0 9px ' + hexA(t.gold, 0.7) : 'none',
              }}
            />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
