import { ParticleField } from './ParticleField';
import { RuneDrift } from './RuneDrift';
import { useTheme } from '@/lib/useTheme';

/**
 * Cena de fundo de toda tela: escurecimento na cor do clima, a luz própria do
 * tema, o motivo animado (runas, fagulhas, folhas, pétalas, estrelas) e uma
 * vinheta. Sem vídeo: os vídeos de fundo saíram do app (pesavam vários MB).
 */
export function BackgroundScene() {
  const motif = useTheme().motif;
  const topDark = 0.4;
  const botDark = 0.66;

  return (
    <div className="fv-bg" aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* escurecimento para legibilidade */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          // escurece na cor do próprio clima (antes era cinza-azulado fixo e "lavava" os temas)
          background: `linear-gradient(180deg, color-mix(in srgb, var(--bg) ${Math.round(topDark * 100)}%, transparent), color-mix(in srgb, var(--bg) ${Math.round(botDark * 100)}%, transparent))`,
        }}
      />
      {/* luz própria do clima: céu, calor da forja, luar, salão carmesim, nebulosa */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--scene)' }} />
      {/* temas chapados (Ouro Velho) não têm partículas nem runas */}
      {motif !== 'none' && (
        <>
          <RuneDrift count={9} />
          <ParticleField />
        </>
      )}
      {/* vinheta */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          mixBlendMode: 'overlay',
          opacity: 0.5,
          background: 'radial-gradient(120% 100% at 50% 0%, transparent 60%, rgba(0,0,0,.5))',
        }}
      />
    </div>
  );
}
