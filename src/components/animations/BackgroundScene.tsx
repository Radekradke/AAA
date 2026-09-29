import { useEffect, useRef } from 'react';
import { ParticleField } from './ParticleField';
import { RuneDrift } from './RuneDrift';

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
export function BackgroundScene({ video = null, videoOpacity = 0.5, darken = 1 }: BackgroundSceneProps) {
  const topDark = 0.62 * darken;
  const botDark = 0.78 * darken;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (video) {
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
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: video ? videoOpacity : 0,
          transition: 'opacity .6s ease',
        }}
      />
      {/* escurecimento para legibilidade */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, rgba(6,8,12,${topDark}), rgba(6,8,12,${botDark}))`,
        }}
      />
      {/* luz própria do clima: céu frio (Arcano), calor da forja (Brasa), dossel (Mata) */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--scene)' }} />
      <RuneDrift count={9} />
      <ParticleField />
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
