import { useEffect, useRef } from 'react';
import { ParticleField } from './ParticleField';

interface BackgroundSceneProps {
  /** Vídeo de fundo opcional (luz volumétrica/cena). */
  video?: string | null;
  videoOpacity?: number;
}

/**
 * Cena de fundo cinematográfica: vídeo opcional + camadas de gradiente
 * (bloom superior, brilho arcano inferior, vinheta) + partículas.
 */
export function BackgroundScene({ video = null, videoOpacity = 0.5 }: BackgroundSceneProps) {
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
          background: 'linear-gradient(180deg, rgba(6,8,12,.62), rgba(6,8,12,.78))',
        }}
      />
      {/* bloom superior na cor do tema */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(70% 55% at 50% -8%, var(--bloom), transparent 62%)',
        }}
      />
      <ParticleField />
      {/* brilho arcano inferior */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(45% 70% at 50% 118%, var(--accSoft), transparent 60%)',
        }}
      />
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
