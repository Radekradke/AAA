import type { IconName } from '@/components/ui/Icon';

export interface SheetTabDef {
  id: string;
  label: string;
  icon: IconName;
  /** Visível apenas para conjuradores. */
  caster?: boolean;
}

/** Abas do workspace da ficha (ícones vetoriais do HUD). */
export const SHEET_TABS: SheetTabDef[] = [
  { id: 'mesa', label: 'Mesa', icon: 'banner' },
  { id: 'ficha', label: 'Ficha', icon: 'crest' },
  { id: 'combate', label: 'Combate', icon: 'swords' },
  { id: 'inventario', label: 'Inventário', icon: 'satchel' },
  { id: 'magias', label: 'Magias', icon: 'spark', caster: true },
  { id: 'evoluir', label: 'Evoluir', icon: 'levelup' },
  { id: 'descanso', label: 'Descanso', icon: 'moon' },
  { id: 'diario', label: 'Diário', icon: 'quill' },
  { id: 'dados', label: 'Dados', icon: 'd20' },
];
