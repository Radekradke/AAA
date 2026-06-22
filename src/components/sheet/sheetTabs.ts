export interface SheetTabDef {
  id: string;
  label: string;
  icon: string;
  /** Visível apenas para conjuradores. */
  caster?: boolean;
}

/** Abas do workspace da ficha (ícones servem à navegação mobile). */
export const SHEET_TABS: SheetTabDef[] = [
  { id: 'ficha', label: 'Ficha', icon: '◈' },
  { id: 'combate', label: 'Combate', icon: '⚔' },
  { id: 'inventario', label: 'Inventário', icon: '🎒' },
  { id: 'magias', label: 'Magias', icon: '✦', caster: true },
  { id: 'descanso', label: 'Descanso', icon: '☾' },
  { id: 'diario', label: 'Diário', icon: '✒' },
  { id: 'dados', label: 'Dados', icon: '🎲' },
];
