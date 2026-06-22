import { useUiStore } from '@/store/uiStore';
import { THEMES } from '@/data/themes';
import type { ThemeDef } from '@/types/dnd';

/** Retorna o objeto de tema ativo (cores cruas, úteis para estilos inline). */
export function useTheme(): ThemeDef {
  const theme = useUiStore((s) => s.theme);
  return THEMES[theme];
}
