import { getRace } from '@/data/races';
import { hexA } from '@/lib/color';

interface RaceAuraProps {
  raceId: string;
}

/**
 * Presença da raça ao fundo da criação: lavagem de cor na tonalidade da
 * linhagem, sigilo monumental flutuando e anel rúnico girando lentamente.
 * Reanima a cada troca de raça (key no id). Puramente decorativo.
 */
export function RaceAura({ raceId }: RaceAuraProps) {
  const race = getRace(raceId);

  return (
    <div
      key={race.id}
      aria-hidden
      className="fv-desktop-only"
      style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', animation: 'auraIn .7s ease-out' }}
    >
      {/* lavagem de cor da linhagem sobre a cena */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(55% 75% at 22% 60%, ${hexA(race.jewel, 0.16)}, transparent 68%)`,
          mixBlendMode: 'screen',
        }}
      />
      {/* sigilo monumental da raça, respirando */}
      <div
        style={{
          position: 'absolute',
          left: 'clamp(-40px, 4vw, 120px)',
          bottom: '-4%',
          width: 'min(46vh, 420px)',
          height: 'min(60vh, 560px)',
          display: 'grid',
          placeItems: 'center',
          animation: 'auraFloat 9s ease-in-out infinite',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '6% 4%',
            borderRadius: 999,
            border: `1px solid ${hexA(race.jewel, 0.28)}`,
            boxShadow: `0 0 80px ${hexA(race.jewel, 0.22)}, inset 0 0 60px ${hexA(race.jewel, 0.1)}`,
          }}
        />
        <div
          className="animate-ringSpin"
          style={{ position: 'absolute', inset: '12% 10%', borderRadius: 999, border: `1px dashed ${hexA(race.jewel, 0.3)}` }}
        />
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 800,
            fontSize: 'min(30vh, 260px)',
            lineHeight: 1,
            color: hexA(race.jewel, 0.2),
            textShadow: `0 0 70px ${hexA(race.jewel, 0.35)}`,
          }}
        >
          {race.mono}
        </span>
        <span
          style={{
            position: 'absolute',
            bottom: '2%',
            fontFamily: "'Cinzel', serif",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '.5em',
            textTransform: 'uppercase',
            color: hexA(race.jewel, 0.55),
            textShadow: `0 0 24px ${hexA(race.jewel, 0.4)}`,
          }}
        >
          {race.label}
        </span>
      </div>
    </div>
  );
}
