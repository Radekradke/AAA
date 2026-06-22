import { useMemo } from 'react';
import { useTheme } from '@/lib/useTheme';

/** Glifos rúnicos (alfabeto fictício/decorativo) para a atmosfera arcana. */
const RUNES = ['ᚠ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᛁ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛏ', 'ᛒ', 'ᛞ', 'ᛟ', '✦', '❂', '⟡'];

interface DriftItem {
  glyph: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

/**
 * Camada leve de runas que sobem e giram lentamente + sopros de fumaça arcana.
 * Tudo em DOM (poucos elementos) e pausado em prefers-reduced-motion.
 */
export function RuneDrift({ count = 10 }: { count?: number }) {
  const t = useTheme();

  const runes = useMemo<DriftItem[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        glyph: RUNES[i % RUNES.length],
        left: Math.random() * 100,
        size: 14 + Math.random() * 26,
        duration: 26 + Math.random() * 26,
        delay: -Math.random() * 40,
        opacity: 0.1 + Math.random() * 0.16,
      })),
    [count],
  );

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
      {smoke.map((s, i) => (
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
      {runes.map((r, i) => (
        <span
          key={`r${i}`}
          style={
            {
              position: 'absolute',
              bottom: '-8%',
              left: `${r.left}%`,
              fontSize: r.size,
              fontFamily: "'Cinzel', serif",
              color: i % 3 === 0 ? t.gold : t.particle,
              textShadow: `0 0 14px ${t.bloom}`,
              animation: `runeFloat ${r.duration}s linear infinite`,
              animationDelay: `${r.delay}s`,
              '--rune-opacity': r.opacity,
            } as React.CSSProperties
          }
        >
          {r.glyph}
        </span>
      ))}
    </div>
  );
}
