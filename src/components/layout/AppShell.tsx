import { useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useTheme, useThemeMode } from '@/lib/useTheme';
import { BackgroundScene } from '@/components/animations/BackgroundScene';
import { RollOverlay } from '@/components/dice/RollOverlay';
import { CastNotice } from '@/components/spells/CastNotice';
import { loadThemeCss } from '@/lib/themeCss';

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
  const mode = useThemeMode();

  // sincroniza os atributos no <html> (para fundo/scrollbar globais)
  useEffect(() => {
    void loadThemeCss(theme); // já vem carregado na partida; aqui cobre a troca de tema
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', mode);
  }, [theme, mode]);

  // as variáveis de cor vêm do CSS do tema ([data-theme][data-mode]); o JS
  // usa a mesma paleta (resolveTheme) só para os estilos inline
  const rootStyle: CSSProperties = {
    // absolute + inset para as telas sobreporem durante a transição de rota
    // (crossfade sem mode="wait"); #root é o contexto de posicionamento.
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    background: `radial-gradient(120% 95% at 50% -12%, ${t.bg2} 0%, ${t.bg} 58%)`,
    color: t.ink,
    // modo claro: campos, rolagem e controles nativos claros
    colorScheme: t.light ? 'light' : 'dark',
    fontFamily: 'var(--font-body)',
  };

  return (
    <div data-theme={theme} data-mode={mode} style={rootStyle}>
      <BackgroundScene video={video} videoOpacity={videoOpacity} darken={darken} />
      {children}
      <RollOverlay />
      <CastNotice />
    </div>
  );
}
