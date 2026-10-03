import { useSyncExternalStore } from 'react';
import { TRACKS } from '@/data/soundtrack';
import type { MusicMood, Track } from '@/data/soundtrack';

/**
 * Tocador da trilha sonora: um elemento <audio> por vez, com fade entre
 * faixas, playlist por ambiente e volume lembrado no aparelho. Nunca toca
 * sozinho: só começa por um toque do jogador (regra de autoplay dos
 * navegadores e bom senso na mesa).
 */
export interface MusicState {
  playing: boolean;
  mood: MusicMood;
  track: Track | null;
  volume: number;
}

const KEY = 'fv-music';
const FADE_MS = 1400;

function load(): Pick<MusicState, 'mood' | 'volume'> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { mood: raw.mood ?? 'taverna', volume: typeof raw.volume === 'number' ? raw.volume : 0.45 };
  } catch {
    return { mood: 'taverna', volume: 0.45 };
  }
}

let state: MusicState = { playing: false, track: null, ...load() };
const listeners = new Set<() => void>();
let audio: HTMLAudioElement | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
let ducked = false;

function emit(patch: Partial<MusicState>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify({ mood: state.mood, volume: state.volume }));
  } catch {
    /* armazenamento indisponível */
  }
  listeners.forEach((l) => l());
}

function fadeTo(el: HTMLAudioElement, target: number, done?: () => void) {
  if (fadeTimer) clearInterval(fadeTimer);
  const start = el.volume;
  const t0 = performance.now();
  fadeTimer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / FADE_MS);
    el.volume = Math.max(0, Math.min(1, start + (target - start) * k));
    if (k >= 1) {
      if (fadeTimer) clearInterval(fadeTimer);
      fadeTimer = null;
      done?.();
    }
  }, 50);
}

function pickNext(mood: MusicMood, avoid?: string): Track {
  const pool = TRACKS.filter((t) => t.mood === mood);
  const options = pool.length > 1 ? pool.filter((t) => t.id !== avoid) : pool;
  return options[Math.floor(Math.random() * options.length)];
}

function start(track: Track) {
  const old = audio;
  const el = new Audio(track.file);
  el.preload = 'auto';
  el.volume = 0;
  // ao terminar, segue para outra faixa do mesmo ambiente
  el.addEventListener('ended', () => {
    if (audio === el && state.playing) start(pickNext(state.mood, track.id));
  });
  audio = el;
  emit({ track, playing: true });
  el.play()
    .then(() => fadeTo(el, ducked ? state.volume * 0.25 : state.volume))
    .catch(() => emit({ playing: false }));
  if (old) {
    const o = old;
    // fade-out curto da faixa anterior (independente do fade-in)
    const v0 = o.volume;
    const t0 = performance.now();
    const id = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / FADE_MS);
      o.volume = Math.max(0, v0 * (1 - k));
      if (k >= 1) {
        clearInterval(id);
        o.pause();
      }
    }, 50);
  }
}

export const music = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  play() {
    if (audio && state.track && audio.paused && audio.src) {
      audio.play().then(() => fadeTo(audio!, ducked ? state.volume * 0.25 : state.volume)).catch(() => emit({ playing: false }));
      emit({ playing: true });
      return;
    }
    start(pickNext(state.mood));
  },
  pause() {
    const el = audio;
    emit({ playing: false });
    if (el) fadeTo(el, 0, () => el.pause());
  },
  toggle() {
    if (state.playing) music.pause();
    else music.play();
  },
  next() {
    start(pickNext(state.mood, state.track?.id));
  },
  /** Toca uma faixa escolhida na lista (e passa para o ambiente dela). */
  playTrack(id: string) {
    const t = TRACKS.find((x) => x.id === id);
    if (!t) return;
    if (t.id === state.track?.id && state.playing) return;
    if (t.mood !== state.mood) emit({ mood: t.mood });
    start(t);
  },
  setMood(mood: MusicMood) {
    if (mood === state.mood && state.playing) return;
    emit({ mood });
    if (state.playing) start(pickNext(mood));
  },
  /** Abaixa a trilha enquanto alguém fala (voz do herói) e devolve depois. */
  duck(on: boolean) {
    ducked = on;
    if (audio && state.playing) fadeTo(audio, on ? state.volume * 0.25 : state.volume);
  },
  setVolume(v: number) {
    const vol = Math.max(0, Math.min(1, v));
    emit({ volume: vol });
    if (audio && !fadeTimer) audio.volume = ducked ? vol * 0.25 : vol;
  },
};

export function useMusic(): MusicState {
  return useSyncExternalStore(music.subscribe, music.get, music.get);
}
