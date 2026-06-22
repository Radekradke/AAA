/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Cores ligadas às variáveis de tema (trocadas por [data-theme]).
      // Permitem usar utilitários Tailwind sem perder o sistema de temas.
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        panel: 'var(--panel)',
        panel2: 'var(--panel2)',
        steel: 'var(--steel)',
        line: 'var(--line)',
        acc: 'var(--acc)',
        acc2: 'var(--acc2)',
        gold: 'var(--gold)',
        goldB: 'var(--goldB)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        cinzel: ["'Cinzel'", 'serif'],
        chakra: ["'Chakra Petch'", 'monospace'],
        inter: ["'Inter'", 'system-ui', 'sans-serif'],
      },
      keyframes: {
        screenIn: {
          from: { opacity: '0', transform: 'scale(1.035) translateY(10px)', filter: 'blur(6px)' },
          to: { opacity: '1', transform: 'none', filter: 'none' },
        },
        riseIn: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'none' },
        },
        ringSpin: { to: { transform: 'rotate(360deg)' } },
        glowPulse: { '0%,100%': { opacity: '.55' }, '50%': { opacity: '1' } },
        coneSway: {
          '0%,100%': { transform: 'translateX(-50%) rotate(-2.2deg)' },
          '50%': { transform: 'translateX(-50%) rotate(2.2deg)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(.8)' },
          '60%': { transform: 'scale(1.06)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        breathe: {
          '0%,100%': { opacity: '.85', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.012)' },
        },
      },
      animation: {
        screenIn: 'screenIn .6s cubic-bezier(.2,.8,.2,1)',
        riseIn: 'riseIn .4s ease',
        ringSpin: 'ringSpin 38s linear infinite',
        ringSpinFast: 'ringSpin 30s linear infinite',
        glowPulse: 'glowPulse 3.4s ease-in-out infinite',
        coneSway: 'coneSway 7s ease-in-out infinite',
        popIn: 'popIn .3s cubic-bezier(.2,.9,.3,1.2)',
        breathe: 'breathe 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
