import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ParticleField } from './ParticleField';
import { RuneDrift } from './RuneDrift';
import { useTheme } from '@/lib/useTheme';
import { useUiStore } from '@/store/uiStore';

interface BackgroundSceneProps {
  /** Vídeo de fundo opcional (luz volumétrica/cena). Uma lista vira playlist: cada clipe toca até o fim e funde no próximo. */
  video?: string | readonly string[] | null;
  /** Imagem parada de cada clipe (mesma ordem da lista), mostrada enquanto o vídeo carrega. */
  posters?: readonly string[];
  videoOpacity?: number;
  /** Intensidade do escurecimento sobre o vídeo (1 = padrão; menor = mais visível). */
  darken?: number;
}

/**
 * Cena de fundo cinematográfica: vídeo opcional + camadas de gradiente
 * (bloom superior, brilho arcano inferior, vinheta) + partículas.
 */
/**
 * O vídeo de fundo é enfeite de vários MB: no automático fica de fora em telas
 * pequenas, com "economia de dados" ligada, em conexão lenta ou para quem pediu
 * menos movimento — a cena em gradiente + partículas continua lá. Nas
 * Configurações dá para forçar (sempre) ou desligar.
 */
export function videoWorthIt(pref: 'auto' | 'on' | 'off' = useUiStore.getState().bgVideo): boolean {
  if (typeof window === 'undefined' || pref === 'off') return false;
  // "Sempre" (Configurações → Aparência): ignora as travas de economia
  if (pref === 'on') return true;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
  if (nav.connection?.saveData) return false;
  if (nav.connection?.effectiveType && /(^|-)2g|3g/.test(nav.connection.effectiveType)) return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  return window.innerWidth >= 900;
}

export function BackgroundScene({ video = null, posters, videoOpacity = 0.5, darken = 1 }: BackgroundSceneProps) {
  const motif = useTheme().motif;
  const topDark = Math.min(1, 0.4 * darken);
  const botDark = Math.min(1, 0.66 * darken);
  const list = video == null ? [] : typeof video === 'string' ? [video] : video;
  const playlist = list.length > 1;
  // decidido por tela (e ao mudar a preferência): a tela pode reorganizar o layout em volta do vídeo ([data-video])
  const pref = useUiStore((s) => s.bgVideo);
  const worth = useMemo(() => videoWorthIt(pref), [pref]);
  const on = list.length > 0 && worth;

  return (
    <div className="fv-bg" data-video={on ? '' : undefined} aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {on && playlist ? (
        <VideoPlaylist list={list} posters={posters} opacity={videoOpacity} />
      ) : (
        <LoopVideo src={on ? list[0] : null} opacity={videoOpacity} />
      )}
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

const videoStyle = (opacity: number): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  opacity,
});

/** Um vídeo só, em loop (o fundo clássico). */
function LoopVideo({ src, opacity }: { src: string | null; opacity: number }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (src) {
      if (el.getAttribute('src') !== src) {
        el.src = src;
        el.load();
      }
      el.play()?.catch(() => {});
    } else if (!el.paused) {
      el.pause();
    }
  }, [src]);
  return <video ref={ref} muted loop playsInline preload="none" style={{ ...videoStyle(src ? opacity : 0), transition: 'opacity .6s ease' }} />;
}

/** Fusão entre um clipe e o próximo (s). */
const FADE = 0.9;

/**
 * Playlist de fundo: duas camadas de vídeo se revezam. Perto do fim do clipe
 * a camada de trás já começa o próximo e as duas se fundem; o próximo fica
 * carregado de antemão. Com a aba escondida, pausa.
 */
function VideoPlaylist({ list, posters, opacity }: { list: readonly string[]; posters?: readonly string[]; opacity: number }) {
  const refs = [useRef<HTMLVideoElement | null>(null), useRef<HTMLVideoElement | null>(null)];
  // começa por um clipe sorteado: cada visita abre com uma cena
  const [start] = useState(() => Math.floor(Math.random() * list.length));
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);
  frontRef.current = front;
  const clip = useRef(start);
  const fading = useRef(false);

  const load = (el: HTMLVideoElement | null, i: number) => {
    if (!el) return;
    const src = list[i % list.length];
    if (el.getAttribute('src') !== src) {
      el.src = src;
      el.load();
    }
  };

  useEffect(() => {
    load(refs[0].current, start);
    load(refs[1].current, start + 1);
    refs[0].current?.play()?.catch(() => {});
    const onVis = () => {
      if (document.hidden) for (const r of refs) r.current?.pause();
      else refs[frontRef.current].current?.play()?.catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTime = (layer: number) => () => {
    const el = refs[layer].current;
    if (!el || layer !== front || fading.current || !el.duration) return;
    if (el.currentTime < el.duration - FADE) return;
    // hora de fundir: a camada de trás (já carregada) começa do zero e vem para a frente
    fading.current = true;
    const back = refs[1 - layer].current;
    if (back) {
      back.currentTime = 0;
      back.play()?.catch(() => {});
    }
    clip.current += 1;
    setFront(1 - layer);
    window.setTimeout(() => {
      fading.current = false;
      // a que saiu de cena para e já carrega o clipe seguinte
      el.pause();
      load(el, clip.current + 1);
    }, FADE * 1000 + 100);
  };

  return (
    <>
      {refs.map((r, layer) => (
        <video
          key={layer}
          ref={r}
          muted
          playsInline
          preload="auto"
          poster={layer === 0 ? posters?.[start % list.length] : undefined}
          onTimeUpdate={onTime(layer)}
          style={{ ...videoStyle(layer === front ? opacity : 0), transition: `opacity ${FADE}s ease` }}
        />
      ))}
    </>
  );
}
