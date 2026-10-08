import { useEffect, useRef } from 'react';
import { ParticleField } from './ParticleField';
import { RuneDrift } from './RuneDrift';
import { useTheme } from '@/lib/useTheme';

interface BackgroundSceneProps {
  /** Vídeo de fundo opcional (luz volumétrica/cena). */
  video?: string | null;
  videoOpacity?: number;
  /** Intensidade do escurecimento sobre o vídeo (1 = padrão; menor = mais visível). */
  darken?: number;
}

/**
 * Cena de fundo cinematográfica: vídeo opcional + camadas de gradiente
 * (bloom superior, brilho arcano inferior, vinheta) + partículas.
 */
/**
 * O vídeo de fundo é enfeite de vários MB: fica de fora em telas pequenas,
 * com "economia de dados" ligada, em conexão lenta ou para quem pediu menos
 * movimento — a cena em gradiente + partículas continua lá.
 */
function videoWorthIt(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
  if (nav.connection?.saveData) return false;
  if (nav.connection?.effectiveType && /(^|-)2g|3g/.test(nav.connection.effectiveType)) return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  return window.innerWidth >= 900;
}

export function BackgroundScene({ video = null, videoOpacity = 0.5, darken = 1 }: BackgroundSceneProps) {
  const motif = useTheme().motif;
  const topDark = Math.min(1, 0.4 * darken);
  const botDark = Math.min(1, 0.66 * darken);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (video && videoWorthIt()) {
      if (el.getAttribute('src') !== video) {
        el.src = video;
        el.load();
      }
      const p = el.play();
      if (p && p.catch) p.catch(() => {});
    } else if (!el.paused) {
      el.pause();
    }
  }, [video]);

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: video && videoWorthIt() ? videoOpacity : 0,
          transition: 'opacity .6s ease',
        }}
      />
      {/* escurecimento para legibilidade */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          // escurece na cor do próprio clima (antes era cinza-azulado fixo e "lavava" os temas)
          background: `linear-gradient(180deg, color-mix(in srgb, var(--bg) ${Math.round(topDark * 100)}%, transparent), color-mix(in srgb, var(--bg) ${Math.round(botDark * 100)}%, transparent))`,
        }}
      />
      {/* luz própria do clima: céu, calor da forja, luar, salão carmesim, nebulosa */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--scene)' }} />
      {/* temas chapados (Ouro Velho) não têm partículas nem runas */}
      {motif !== 'none' && (
        <>
          <RuneDrift count={9} />
          <ParticleField />
        </>
      )}
      {/* vinheta */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          mixBlendMode: 'overlay',
          opacity: 0.5,
          background: 'radial-gradient(120% 100% at 50% 0%, transparent 60%, rgba(0,0,0,.5))',
        }}
      />
    </div>
  );
}
