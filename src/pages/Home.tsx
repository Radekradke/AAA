import { useNavigate } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { RuneRing } from '@/components/animations/RuneRing';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/lib/useTheme';

/** Tela inicial cinematográfica — o portal de entrada da Ficha Viva. */
export function Home() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const bump = useUiStore((s) => s.bump);
  const t = useTheme();

  const start = () => {
    bump(1.4);
    navigate(user ? '/personagens' : '/entrar');
  };

  return (
    <Screen video="/assets/bg.mp4" videoOpacity={0.32}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <RuneRing size="clamp(120px,18vw,168px)" className="mb-[clamp(22px,4vh,40px)]">
          <span
            style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 800,
              fontSize: 'clamp(34px,5vw,46px)',
              color: 'var(--gold)',
              textShadow: '0 0 30px var(--bloom)',
            }}
          >
            F
          </span>
        </RuneRing>

        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 800,
            fontSize: 'clamp(40px,8vw,82px)',
            lineHeight: 0.96,
            letterSpacing: '.04em',
            color: 'var(--ink)',
            textShadow: '0 0 40px var(--bloom)',
          }}
        >
          FICHA&nbsp;VIVA
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(13px,1.6vw,16px)',
            letterSpacing: '.34em',
            textTransform: 'uppercase',
            color: 'var(--acc)',
          }}
        >
          Crie&nbsp;·&nbsp;Desperte&nbsp;·&nbsp;Jogue
        </div>
        <p style={{ maxWidth: 440, margin: '20px auto 0', color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
          A ficha de RPG que ganha vida — criação cinematográfica de personagem e um HUD de combate digno de um
          jogo AAA.
        </p>

        <button
          onClick={start}
          className="animate-glowPulse"
          style={{
            marginTop: 'clamp(26px,5vh,46px)',
            cursor: 'pointer',
            fontFamily: "'Cinzel', serif",
            fontWeight: 700,
            letterSpacing: '.12em',
            fontSize: 'clamp(15px,1.7vw,17px)',
            color: '#1a1206',
            padding: '16px 42px',
            borderRadius: 13,
            border: '1px solid var(--goldB)',
            background: 'linear-gradient(180deg, var(--goldB), var(--gold))',
            boxShadow: '0 12px 34px rgba(0,0,0,.5), 0 0 30px var(--bloom), inset 0 1px 0 rgba(255,255,255,.6)',
          }}
        >
          COMEÇAR&nbsp;A&nbsp;JORNADA
        </button>
        <div style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)' }}>
          Toque no seletor no topo para alternar a atmosfera ✦{' '}
          <b style={{ color: 'var(--ink)' }}>{t.label}</b>
        </div>
      </div>
    </Screen>
  );
}
