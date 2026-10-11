import { useCallback, useRef, useState } from 'react';
import type { ReactNode, UIEvent } from 'react';
import { m } from 'framer-motion';
import { AppShell } from './AppShell';
import { TopBar } from './TopBar';
import { GuildNav } from './GuildNav';
import { useUiStore } from '@/store/uiStore';
import type { TopBarMenuItem } from './TopBar';

interface ScreenProps {
  children: ReactNode;
  actions?: ReactNode;
  /** Ações secundárias no menu "⋯" da barra superior. */
  menu?: TopBarMenuItem[];
  video?: string | readonly string[] | null;
  posters?: readonly string[];
  videoOpacity?: number;
  darken?: number;
  /** Conteúdo rola internamente (telas longas como a ficha). */
  scroll?: boolean;
}

/**
 * Tela completa: casca + barra superior + área de conteúdo com entrada
 * cinematográfica. Base de todas as páginas.
 */
export function Screen({ children, actions, menu, video, posters, videoOpacity, darken, scroll }: ScreenProps) {
  const theme = useUiStore((s) => s.theme);
  // a barra do topo ganha fundo quando o conteúdo rola por baixo dela (só muda o estado ao cruzar o limite)
  const [scrolled, setScrolled] = useState(false);
  const frame = useRef(0);
  const onScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setScrolled(el.scrollTop > 12));
  }, []);
  return (
    <AppShell video={video} posters={posters} videoOpacity={videoOpacity} darken={darken}>
      {/* teclado/leitor de tela: pula a barra do topo direto para o conteúdo */}
      <a className="fv-skip" href="#fv-conteudo" onClick={(e) => { e.preventDefault(); document.getElementById('fv-conteudo')?.focus(); }}>
        Pular para o conteúdo
      </a>
      <TopBar actions={actions} menu={menu} scrolled={scrolled} />
      {/* Guilda Rubra: navegação de app de jogos (lateral no PC, inferior no celular) */}
      {theme === 'rubra' && <GuildNav />}
      {/* só opacidade + transform (GPU): blur na tela inteira custava quadros no
          celular e o filter residual virava bloco de contenção para position:fixed */}
      <m.div
        initial={{ opacity: 0, scale: 1.035, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="fv-screen-scroll"
        id="fv-conteudo"
        tabIndex={-1}
        onScroll={scroll ? onScroll : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          overflowY: scroll ? 'auto' : 'hidden',
          overflowX: 'hidden',
        }}
      >
        {children}
      </m.div>
    </AppShell>
  );
}
