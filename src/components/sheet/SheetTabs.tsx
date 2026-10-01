import { SHEET_TABS } from './sheetTabDefs';
import { Icon } from '@/components/ui/Icon';

interface SheetTabsProps {
  active: string;
  onSelect: (id: string) => void;
  isCaster: boolean;
}

/**
 * Abas do topo (desktop/tablet): chips com brilho na cor de metal do tema.
 * Cores pelas variáveis CSS (não pelo objeto do tema) para que temas que
 * invertem a barra, como o Eclipse, consigam pintá-la.
 */
export function SheetTabs({ active, onSelect, isCaster }: SheetTabsProps) {
  const tabs = SHEET_TABS.filter((tab) => !tab.caster || isCaster);

  return (
    <div className="fv-sheet-tabs fv-no-scrollbar" data-tour="tabs">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            className={'fv-sheet-tab' + (isActive ? ' is-on' : '')}
          >
            <Icon name={tab.icon} size={17} color="currentColor" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
