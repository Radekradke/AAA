import { useUiStore, themeModeOf } from '@/store/uiStore';
import { resolveTheme } from '@/data/themes';
import type { ThemeDef, ThemeMode } from '@/types/dnd';

/** Tema ativo já com a paleta do modo (claro/escuro) — cores cruas para estilos inline. */
export function useTheme(): ThemeDef {
  const theme = useUiStore((s) => s.theme);
  const mode = useUiStore((s) => themeModeOf(s.theme, s.modes));
  return resolveTheme(theme, mode);
}

/** Modo efetivo do tema ativo. */
export function useThemeMode(): ThemeMode {
  return useUiStore((s) => themeModeOf(s.theme, s.modes));
}
