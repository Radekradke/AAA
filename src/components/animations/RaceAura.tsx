import { getRace } from '@/data/races';
import { hexA } from '@/lib/color';

interface RaceAuraProps {
  raceId: string;
}

/**
 * Luz da linhagem ao fundo da criação: uma lavagem de cor suave, vinda do
 * lado do retrato do herói. Reacende a cada troca de raça. Decorativo — o
 * protagonista visual é o retrato no painel do herói.
 */
export function RaceAura({ raceId }: RaceAuraProps) {
  const race = getRace(raceId);
  return (
    <div
      key={race.id}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: `radial-gradient(60% 80% at 88% 40%, ${hexA(race.jewel, 0.16)}, transparent 70%)`,
        mixBlendMode: 'screen',
        animation: 'auraIn .7s ease-out',
      }}
    />
  );
}
