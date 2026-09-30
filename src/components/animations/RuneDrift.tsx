import { useMemo } from 'react';
import { useTheme } from '@/lib/useTheme';

/** Glifos por clima: runas (Arcano), folhas e flores (Mata). A Brasa usa fagulhas (pontos de luz). */
const RUNES = ['ᚠ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᛁ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛏ', 'ᛒ', 'ᛞ', 'ᛟ', '✦', '❂', '⟡'];
const LEAVES = ['❦', '❧', '☘', '⚘', '❦', '❧'];
const PETALS = ['❀', '✿', '❁', '❀', '✾'];

interface DriftItem {
  glyph: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  sway: number;
  /** Posição vertical fixa (estrelas). */
  top?: number;
}

/**
 * Motivo animado do fundo, próprio de cada clima:
 * · runes  — runas que sobem girando devagar + fumaça arcana
 * · embers — fagulhas da forja subindo rápido, oscilando + calor embaixo
 * · leaves — folhas caindo do dossel, balançando
 * · petals — pétalas de rosa caindo devagar (Corte Carmesim)
 * · stars  — estrelas cintilando no lugar (Véu Astral)
 * Tudo em DOM (poucos elementos) e pausado em prefers-reduced-motion.
 */
export function RuneDrift({ count = 10 }: { count?: number }) {
  const t = useTheme();
  const motif = t.motif;

  const items = useMemo<DriftItem[]>(() => {
    const n = motif === 'embers' ? Math.round(count * 1.8) : motif === 'stars' ? count * 4 : count;
    return Array.from({ length: n }, (_, i) => {
      if (motif === 'embers') {
        return {
          glyph: '',
          left: 5 + Math.random() * 90,
          size: 2 + Math.random() * 3.5,
          duration: 9 + Math.random() * 10,
          delay: -Math.random() * 18,
          opacity: 0.35 + Math.random() * 0.45,
          sway: (Math.random() - 0.5) * 120,
        };
      }
      if (motif === 'stars') {
        return {
          glyph: i % 5 === 0 ? '✦' : '',
          left: Math.random() * 100,
          size: i % 5 === 0 ? 10 + Math.random() * 8 : 1.5 + Math.random() * 2.2,
          duration: 3 + Math.random() * 5,
          delay: -Math.random() * 8,
          opacity: 0.35 + Math.random() * 0.5,
          sway: (Math.random() - 0.5) * 40,
          top: Math.random() * 92,
        };
      }
      if (motif === 'leaves' || motif === 'petals') {
        return {
          glyph: motif === 'petals' ? PETALS[i % PETALS.length] : LEAVES[i % LEAVES.length],
          left: Math.random() * 100,
          size: 13 + Math.random() * 14,
          duration: 24 + Math.random() * 18,
          delay: -Math.random() * 40,
          opacity: 0.12 + Math.random() * 0.16,
          sway: 30 + Math.random() * 60,
        };
      }
      return {
        glyph: RUNES[i % RUNES.length],
        left: Math.random() * 100,
        size: 14 + Math.random() * 26,
        duration: 26 + Math.random() * 26,
        delay: -Math.random() * 40,
        opacity: 0.1 + Math.random() * 0.16,
        sway: 0,
      };
    });
  }, [count, motif]);

  const smoke = useMemo(
    () =>
      Array.from({ length: 3 }, () => ({
        left: 20 + Math.random() * 60,
        size: 220 + Math.random() * 200,
        duration: 22 + Math.random() * 16,
        delay: -Math.random() * 20,
      })),
    [],
  );

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {motif !== 'leaves' && motif !== 'petals' &&
        smoke.map((s, i) => (
          <div
            key={`s${i}`}
            style={{
              position: 'absolute',
              bottom: '-10%',
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${t.bloom} 0%, transparent 70%)`,
              filter: 'blur(24px)',
              animation: `smokeDrift ${s.duration}s ease-in infinite`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      {items.map((r, i) => {
        const common = {
          position: 'absolute',
          left: `${r.left}%`,
          animationDelay: `${r.delay}s`,
          '--rune-opacity': r.opacity,
          '--sway': `${r.sway}px`,
        } as React.CSSProperties;
        if (motif === 'embers') {
          return (
            <span
              key={`e${i}`}
              style={{
                ...common,
                bottom: '-4%',
                width: r.size,
                height: r.size,
                borderRadius: '50%',
                background: i % 4 === 0 ? t.gold : t.particle,
                boxShadow: `0 0 ${r.size * 3}px ${t.acc}`,
                animation: `emberRise ${r.duration}s ease-out infinite`,
                animationDelay: `${r.delay}s`,
              }}
            />
          );
        }
        if (motif === 'stars') {
          return (
            <span
              key={`st${i}`}
              style={{
                ...common,
                top: `${r.top}%`,
                width: r.glyph ? undefined : r.size,
                height: r.glyph ? undefined : r.size,
                fontSize: r.glyph ? r.size : undefined,
                lineHeight: 1,
                borderRadius: '50%',
                color: i % 2 ? t.particle : t.acc2,
                background: r.glyph ? undefined : i % 3 === 0 ? t.acc : t.particle,
                boxShadow: r.glyph ? undefined : `0 0 ${r.size * 4}px ${t.particle}`,
                textShadow: r.glyph ? `0 0 12px ${t.particle}` : undefined,
                animation: `twinkle ${r.duration}s ease-in-out infinite`,
                animationDelay: `${r.delay}s`,
              }}
            >
              {r.glyph}
            </span>
          );
        }
        if (motif === 'leaves' || motif === 'petals') {
          return (
            <span
              key={`l${i}`}
              style={{
                ...common,
                top: '-8%',
                fontSize: r.size,
                lineHeight: 1,
                color: motif === 'petals' ? (i % 3 === 0 ? t.acc : t.particle) : i % 3 === 0 ? t.acc2 : t.particle,
                animation: `leafFall ${r.duration}s linear infinite`,
                animationDelay: `${r.delay}s`,
              }}
            >
              {r.glyph}
            </span>
          );
        }
        return (
          <span
            key={`r${i}`}
            style={{
              ...common,
              bottom: '-8%',
              fontSize: r.size,
              fontFamily: 'var(--font-display)',
              color: i % 3 === 0 ? t.gold : t.particle,
              textShadow: `0 0 14px ${t.bloom}`,
              animation: `runeFloat ${r.duration}s linear infinite`,
              animationDelay: `${r.delay}s`,
            }}
          >
            {r.glyph}
          </span>
        );
      })}
    </div>
  );
}
