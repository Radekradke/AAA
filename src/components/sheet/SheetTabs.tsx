import { SHEET_TABS } from './sheetTabDefs';
import type { SheetTabDef } from './sheetTabDefs';
import { Icon } from '@/components/ui/Icon';

interface SheetTabsProps {
  active: string;
  onSelect: (id: string) => void;
  isCaster: boolean;
}

/**
 * Abas do topo (desktop/tablet): chips com brilho na cor de metal do tema.
 * As de jogo vêm primeiro; as ocasionais (Evoluir, Descanso, Retrato,
 * Dados) depois de um separador, menores. Cores pelas variáveis CSS (não
 * pelo objeto do tema) para que temas que invertem a barra, como o
 * Eclipse, consigam pintá-la.
 */
export function SheetTabs({ active, onSelect, isCaster }: SheetTabsProps) {
  const tabs = SHEET_TABS.filter((tab) => !tab.caster || isCaster);
  const play = tabs.filter((tab) => tab.group === 'play');
  const occasional = tabs.filter((tab) => tab.group === 'occasional');
  const chip = (tab: SheetTabDef) => {
    const isActive = active === tab.id;
    return (
      <button
        type="button"
        key={tab.id}
        onClick={() => onSelect(tab.id)}
        aria-current={isActive ? 'page' : undefined}
        title={tab.hint}
        className={'fv-sheet-tab' + (isActive ? ' is-on' : '') + (tab.group === 'occasional' ? ' is-occasional' : '')}
      >
        <Icon name={tab.icon} size={tab.group === 'occasional' ? 15 : 17} color="currentColor" />
        {tab.label}
      </button>
    );
  };

  return (
    <nav className="fv-sheet-tabs fv-no-scrollbar" data-tour="tabs" aria-label="Abas da ficha">
      {play.map(chip)}
      <span className="fv-sheet-tabs-sep" aria-hidden />
      {occasional.map(chip)}
    </nav>
  );
}
