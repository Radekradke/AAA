import { useEffect, useRef } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
}

/**
 * Campo de partículas mágicas/brasas que sobem do rodapé — porte fiel do
 * sistema da referência. Reage ao sinal `bump` (intensifica em cada ação)
 * e respeita prefers-reduced-motion.
 */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = useTheme();
  const colorRef = useRef(theme.particle);
  colorRef.current = theme.particle;

  // estado mutável fora do React para performance
  const state = useRef({
    parts: [] as Particle[],
    intensity: 0,
    w: 0,
    h: 0,
    raf: 0,
    touch: false,
    reduced: false,
  });

  // ouve os "bumps" do store sem re-renderizar o componente
  useEffect(() => {
    return useUiStore.subscribe((s, prev) => {
      if (s.bumpSignal !== prev.bumpSignal) {
        state.current.intensity = Math.min(1.4, state.current.intensity + 0.5 * s.bumpAmount);
      }
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const st = state.current;
    st.touch = 'ontouchstart' in window;
    st.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      st.w = canvas.clientWidth;
      st.h = canvas.clientHeight;
      canvas.width = st.w * dpr;
      canvas.height = st.h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);

    const tick = () => {
      st.raf = requestAnimationFrame(tick);
      const { w, h } = st;
      ctx.clearRect(0, 0, w, h);
      if (st.reduced) return; // sem animação para quem prefere menos movimento

      const inten = st.intensity;
      const base = st.touch ? 0.16 : 0.32;
      const rate = base + inten * 0.9;
      const max = st.touch ? 42 : 82;

      if (st.parts.length < max && Math.random() < rate) {
        st.parts.push({
          x: w * 0.5 + (Math.random() - 0.5) * w * 0.78,
          y: h + 10,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(0.22 + Math.random() * 0.6) * (0.6 + inten),
          r: 0.6 + Math.random() * 2.1,
          life: 0,
          max: 150 + Math.random() * 200,
        });
      }

      const col = colorRef.current;
      for (let i = st.parts.length - 1; i >= 0; i--) {
        const p = st.parts[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx += Math.sin((p.life + i) * 0.02) * 0.006;
        const ra = p.life / p.max;
        if (ra >= 1 || p.y < -20) {
          st.parts.splice(i, 1);
          continue;
        }
        const fade = ra < 0.16 ? ra / 0.16 : 1 - ra;
        const alpha = Math.max(0, Math.min(0.75, fade * 0.7 * (0.45 + inten * 0.55)));
        const rad = p.r * 5;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0, hexA(col, alpha));
        g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, 6.2832);
        ctx.fill();
      }
      st.intensity = inten * 0.96;
    };
    st.raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(st.raf);
      window.removeEventListener('resize', size);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
