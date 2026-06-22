/**
 * Efeitos sonoros opcionais e leves, sintetizados via WebAudio (sem arquivos).
 * Desativados por padrão; ativados por gesto do usuário (toggle), o que também
 * satisfaz as políticas de autoplay dos navegadores.
 */

let ctx: AudioContext | null = null;
let enabled = false;

export function setSfxEnabled(on: boolean) {
  enabled = on;
  if (on && !ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      ctx = null;
    }
  }
  if (on && ctx?.state === 'suspended') ctx.resume().catch(() => {});
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, peak: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.02);
}

function noiseBurst(dur: number, peak: number) {
  if (!ctx) return;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = peak;
  src.buffer = buffer;
  src.connect(gain).connect(ctx.destination);
  src.start();
}

/** Som de dado rolando (tombo + brilho extra no crítico). */
export function playDice(crit = false) {
  if (!enabled || !ctx) return;
  noiseBurst(0.18, 0.05);
  tone(180, 0, 0.18, 'triangle', 0.08);
  tone(90, 0.05, 0.22, 'sine', 0.1);
  if (crit) {
    tone(880, 0.18, 0.25, 'sine', 0.07);
    tone(1320, 0.24, 0.3, 'sine', 0.05);
  }
}

/** Blip curto de seleção/confirmação. */
export function playSelect() {
  if (!enabled || !ctx) return;
  tone(620, 0, 0.08, 'triangle', 0.05);
  tone(880, 0.04, 0.1, 'sine', 0.04);
}

/** Arpejo ascendente ao subir de nível / despertar. */
export function playLevel() {
  if (!enabled || !ctx) return;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.22, 'sine', 0.06));
}
