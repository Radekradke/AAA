import { useSyncExternalStore } from 'react';
import { voiceKeyFromFileName } from './heroArtName';
import { music } from './music';

/**
 * Falas dos heróis: ao escolher a classe, o personagem se apresenta com a voz
 * do sexo escolhido. Os áudios ficam em `src/assets/vozes/` (veja o LEIA-ME
 * de lá) e são reconhecidos pelo nome do arquivo. Uma fala por vez; a trilha
 * abaixa enquanto o herói fala. Dá para silenciar (lembrado no aparelho).
 */
const FILES = import.meta.glob('/src/assets/vozes/*.{mp3,ogg,m4a,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const VOICES: Record<string, string> = {};
for (const [path, url] of Object.entries(FILES)) {
  const key = voiceKeyFromFileName(path.split('/').pop() ?? '');
  if (key) VOICES[key] = url;
}

/** Chaves `<classe>-<sexo>` que já têm fala (para o contador de artes). */
export function voiceKeys(): Record<string, string> {
  return VOICES;
}

export function voiceFor(classId: string, gender: 'masc' | 'fem'): string | null {
  return VOICES[`${classId}-${gender}`] ?? null;
}

export interface VoiceState {
  muted: boolean;
  /** chave `<classe>-<sexo>` da fala tocando agora */
  speaking: string | null;
}

const KEY = 'fv-voices';
let state: VoiceState = { muted: readMuted(), speaking: null };
const listeners = new Set<() => void>();
let audio: HTMLAudioElement | null = null;

function readMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === 'mudo';
  } catch {
    return false;
  }
}

function emit(patch: Partial<VoiceState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function finish(el: HTMLAudioElement) {
  if (audio !== el) return;
  audio = null;
  music.duck(false);
  emit({ speaking: null });
}

export const voices = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** Toca a fala da classe (corta a anterior). Sem áudio ou no mudo, não faz nada. */
  play(classId: string, gender: 'masc' | 'fem') {
    const url = voiceFor(classId, gender);
    voices.stop();
    if (!url || state.muted) return;
    const el = new Audio(url);
    el.volume = 0.95;
    audio = el;
    el.addEventListener('ended', () => finish(el));
    el.addEventListener('error', () => finish(el));
    music.duck(true);
    emit({ speaking: `${classId}-${gender}` });
    el.play().catch(() => finish(el));
  },
  stop() {
    const el = audio;
    if (!el) return;
    el.pause();
    finish(el);
  },
  setMuted(muted: boolean) {
    try {
      localStorage.setItem(KEY, muted ? 'mudo' : 'som');
    } catch {
      /* armazenamento indisponível */
    }
    if (muted) voices.stop();
    emit({ muted });
  },
};

export function useVoices(): VoiceState {
  return useSyncExternalStore(voices.subscribe, voices.get, voices.get);
}
