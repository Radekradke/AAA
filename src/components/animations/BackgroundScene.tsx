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
        on ? <LoopVideo key={list[0]} src={list[0]} poster={posters?.[0]} opacity={videoOpacity} /> : null
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

/**
 * Dá o play num vídeo de fundo sem depender da sorte: marca como mudo de
 * todas as formas (propriedade, padrão e atributo — alguns navegadores só
 * liberam o autoplay olhando o atributo) e, se o navegador recusar, tenta de
 * novo quando os dados chegarem e no primeiro toque ou tecla na página.
 */
export function startVideo(el: HTMLVideoElement | null) {
  if (!el) return;
  el.muted = true;
  el.defaultMuted = true;
  el.setAttribute('muted', '');
  el.setAttribute('playsinline', '');
  const p = el.play();
  if (!p) return;
  p.catch(() => {
    const retry = () => void el.play()?.catch(() => {});
    el.addEventListener('canplay', retry, { once: true });
    const gestures = ['pointerdown', 'keydown', 'touchstart'] as const;
    const onGesture = () => {
      retry();
      for (const g of gestures) window.removeEventListener(g, onGesture, true);
    };
    for (const g of gestures) window.addEventListener(g, onGesture, true);
  });
}

/** Um vídeo só, em loop (o fundo clássico). */
function LoopVideo({ src, poster, opacity }: { src: string; poster?: string; opacity: number }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (src) {
      if (el.getAttribute('src') !== src) {
        el.src = src;
        el.load();
      }
      startVideo(el);
    } else if (!el.paused) {
      el.pause();
    }
  }, [src]);
  return <>
    {poster && <img src={poster} alt="" style={videoStyle(opacity)} />}
    <video ref={ref} muted loop playsInline preload="none" onPlaying={() => setPlaying(true)} style={{ ...videoStyle(playing ? opacity : 0), transition: 'opacity .6s ease' }} />
  </>;
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
  const [playing, setPlaying] = useState(false);
  const fadeTimer = useRef<number>();
  const generation = useRef(0);

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
    startVideo(refs[0].current);
    // vigia: se depois de uns segundos a cena da frente ainda não andou, tenta de novo
    const watchdog = window.setTimeout(() => {
      const el = refs[frontRef.current].current;
      if (el && el.paused && el.currentTime === 0 && !document.hidden) startVideo(el);
    }, 2500);
    const onVis = () => {
      if (document.hidden) for (const r of refs) r.current?.pause();
      else startVideo(refs[frontRef.current].current);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      generation.current += 1;
      window.clearTimeout(fadeTimer.current);
      window.clearTimeout(watchdog);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTime = (layer: number) => async () => {
    const el = refs[layer].current;
    if (!el || layer !== frontRef.current || fading.current || !el.duration || document.hidden) return;
    const back = refs[1 - layer].current;
    if (!back) return;
    if (el.currentTime >= el.duration - 5) load(back, clip.current + 1);
    if (el.currentTime < el.duration - FADE) return;
    // Mantém o último quadro se o próximo clipe ainda estiver carregando.
    if (back.readyState < 3) return;
    fading.current = true;
    const attempt = generation.current;
    back.currentTime = 0;
    try {
      await back.play();
    } catch {
      if (attempt === generation.current) fading.current = false;
      return;
    }
    if (attempt !== generation.current) return;
    clip.current += 1;
    frontRef.current = 1 - layer;
    setFront(1 - layer);
    fadeTimer.current = window.setTimeout(() => {
      fading.current = false;
      el.pause();
    }, FADE * 1000 + 100);
  };

  return (
    <>
      {posters?.[start] && <img src={posters[start]} alt="" style={videoStyle(opacity)} />}
      {refs.map((r, layer) => (
        <video
          key={layer}
          ref={r}
          muted
          playsInline
          preload="auto"
          onTimeUpdate={onTime(layer)}
          onPlaying={() => { if (layer === frontRef.current) setPlaying(true); }}
          onCanPlay={() => { if (layer !== frontRef.current) void onTime(frontRef.current)(); }}
          style={{ ...videoStyle(playing && layer === front ? opacity : 0), transition: `opacity ${FADE}s ease` }}
        />
      ))}
    </>
  );
}
