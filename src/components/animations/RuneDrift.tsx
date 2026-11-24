import { useMemo } from 'react';
import { useTheme } from '@/lib/useTheme';

/**
 * Desenhos por clima, em SVG (antes eram caracteres como ❦ ☘ ✿ ✦, que em
 * alguns aparelhos viravam emoji colorido): runas (Arcano), folhas (Mata,
 * Ártemis), pétalas (Corte) e estrelas (Véu Astral). A Brasa e o Orfeu usam
 * pontos de luz. Cada desenho ocupa 1em: o tamanho vem do font-size.
 */
const RUNE_PATHS: Record<string, string> = {
  fehu: 'M8 3v18M8 9l7-4M8 14l7-4',
  raidho: 'M8 3v18M8 3l6 4-6 4 6 10',
  kaun: 'M15 4 8 12l7 8',
  gebo: 'M6 4l12 16M18 4 6 20',
  isa: 'M12 3v18',
  eihwaz: 'M12 3v18M12 3l5 4M12 21l-5-4',
  perthro: 'M8 3v18M8 3l6 4M8 21l6-4',
  algiz: 'M12 3v18M12 11 6 4M12 11l6-7',
  tiwaz: 'M12 3v18M12 3 6 9M12 3l6 6',
  berkano: 'M8 3v18M8 3l7 4.5L8 12l7 4.5L8 21',
  dagaz: 'M5 4v16l14-16v16L5 4',
  othala: 'M12 3 18 9l-12 12M12 3 6 9l12 12',
};
const RUNES = Object.keys(RUNE_PATHS);
const LEAF_PATHS: string[] = [
  'M20 4C10 4 4 9 4 16c0 1.4.3 2.7.8 4 1.1-4.6 4.6-8.4 9.2-10.2-3.8 2.5-6.6 6.2-7.6 10.5C8 20.7 9.4 21 11 21c6 0 9-6 9-17Z',
  'M12 2c3 3 4.5 6.3 4.5 9.2S14.4 17 12 19.5c-2.4-2.5-4.5-5.4-4.5-8.3S9 5 12 2Zm-.7 17.5h1.4V22h-1.4Z',
  'M12 21V11M12 11c-1.6-3.5-4.6-5-8-4.5.6 3.6 3.4 5.6 8 4.5Zm0 0c1.6-3.5 4.6-5 8-4.5-.6 3.6-3.4 5.6-8 4.5Zm0-1C10.4 6.6 11 4 12 2c1 2 1.6 4.6 0 8Z',
];
const PETAL_PATHS: string[] = [
  'M12 11.2c-1.2-3.9-.7-7 0-8.7.7 1.7 1.2 4.8 0 8.7Zm.8.6c3.4-2.2 6.5-2.3 8.2-1.7-1.3 1.3-4.2 2.6-8.2 1.7Zm-.3 1c2.4 3.2 2.9 6.3 2.6 8.1-1.5-1.1-3.1-3.8-2.6-8.1Zm-1 0c.5 4.3-1.1 7-2.6 8.1-.3-1.8.2-4.9 2.6-8.1Zm-.3-1c-4 .9-6.9-.4-8.2-1.7 1.7-.6 4.8-.5 8.2 1.7Z',
  'M12 3c4 3.5 5.5 8 3.6 12.3C14.6 17.6 13.4 19.6 12 21c-1.4-1.4-2.6-3.4-3.6-5.7C6.5 11 8 6.5 12 3Z',
];
const SPARKLE_PATH = 'M12 2c.8 5.4 2.6 7.2 8 8-5.4.8-7.2 2.6-8 8-.8-5.4-2.6-7.2-8-8 5.4-.8 7.2-2.6 8-8Z';

/** Um desenho do fundo: runa (traço) ou folha/pétala/estrela (preenchida). */
function DriftGlyph({ glyph }: { glyph: string }) {
  const [kind, idx] = glyph.split(':');
  if (kind === 'rune') {
    return (
      <svg className="fv-drift-glyph" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={RUNE_PATHS[idx]} />
      </svg>
    );
  }
  const d = kind === 'leaf' ? LEAF_PATHS[Number(idx)] : kind === 'petal' ? PETAL_PATHS[Number(idx)] : SPARKLE_PATH;
  return (
    <svg className="fv-drift-glyph" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={d} />
    </svg>
  );
}

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
 * · souls  — almas do Estige: luzes verde-água subindo devagar (Lira de Orfeu)
 * Tudo em DOM (poucos elementos) e pausado em prefers-reduced-motion.
 */
export function RuneDrift({ count = 10 }: { count?: number }) {
  const t = useTheme();
  const motif = t.motif;

  const items = useMemo<DriftItem[]>(() => {
    const n = motif === 'embers' ? Math.round(count * 1.8) : motif === 'stars' ? count * 4 : motif === 'souls' ? Math.round(count * 1.4) : count;
    return Array.from({ length: n }, (_, i) => {
      if (motif === 'souls') {
        return {
          glyph: '',
          left: 4 + Math.random() * 92,
          size: 2 + Math.random() * 2.5,
          duration: 26 + Math.random() * 20,
          delay: -Math.random() * 40,
          opacity: 0.3 + Math.random() * 0.4,
          sway: (Math.random() - 0.5) * 90,
        };
      }
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
          glyph: i % 5 === 0 ? 'star' : '',
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
          glyph: motif === 'petals' ? `petal:${i % PETAL_PATHS.length}` : `leaf:${i % LEAF_PATHS.length}`,
          left: Math.random() * 100,
          size: 13 + Math.random() * 14,
          duration: 24 + Math.random() * 18,
          delay: -Math.random() * 40,
          opacity: 0.12 + Math.random() * 0.16,
          sway: 30 + Math.random() * 60,
        };
      }
      return {
        glyph: i % 6 === 5 ? 'star' : `rune:${RUNES[i % RUNES.length]}`,
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
      {motif !== 'leaves' && motif !== 'petals' && motif !== 'souls' &&
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
        // fagulhas e almas: pontos de luz subindo (as almas, devagar e verde-água)
        if (motif === 'embers' || motif === 'souls') {
          const soul = motif === 'souls';
          const gold = i % (soul ? 5 : 4) === 0;
          return (
            <span
              key={`e${i}`}
              style={{
                ...common,
                bottom: '-4%',
                width: r.size,
                height: r.size,
                borderRadius: '50%',
                background: gold ? (soul ? t.goldB : t.gold) : t.particle,
                boxShadow: `0 0 ${r.size * (soul ? 4 : 3)}px ${soul ? (gold ? t.gold : t.acc2) : t.acc}`,
                animation: `emberRise ${r.duration}s ${soul ? 'ease-in-out' : 'ease-out'} infinite`,
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
              {r.glyph && <DriftGlyph glyph={r.glyph} />}
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
              <DriftGlyph glyph={r.glyph} />
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
            <DriftGlyph glyph={r.glyph} />
          </span>
        );
      })}
    </div>
  );
}
