import { useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/lib/useTheme';
import { themeToVars } from '@/data/themes';
import { BackgroundScene } from '@/components/animations/BackgroundScene';
import { RollOverlay } from '@/components/dice/RollOverlay';

interface AppShellProps {
  children: ReactNode;
  /** Vídeo de fundo opcional. */
  video?: string | null;
  videoOpacity?: number;
  darken?: number;
}

/**
 * Casca raiz: aplica as variáveis do tema, monta a cena de fundo
 * cinematográfica e o overlay global de rolagem.
 */
export function AppShell({ children, video = null, videoOpacity, darken }: AppShellProps) {
  const theme = useUiStore((s) => s.theme);
  const t = useTheme();

  // sincroniza o atributo no <html> (para fundo/scrollbar globais)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const rootStyle: CSSProperties = {
    ...(themeToVars(t) as CSSProperties),
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: `radial-gradient(120% 95% at 50% -12%, ${t.bg2} 0%, ${t.bg} 58%)`,
    color: t.ink,
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  return (
    <div data-theme={theme} style={rootStyle}>
      <BackgroundScene video={video} videoOpacity={videoOpacity} darken={darken} />
      {children}
      <RollOverlay />
    </div>
  );
}
