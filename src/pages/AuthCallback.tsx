import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RuneRing } from '@/components/animations/RuneRing';
import { Screen } from '@/components/layout/Screen';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

/** Finaliza o retorno do OAuth do Supabase e leva o jogador para suas fichas. */
export function AuthCallback() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    authService.currentUser().then((user) => {
      if (!alive) return;
      if (user) {
        setUser(user);
        navigate('/personagens', { replace: true });
      } else {
        setError('Nao foi possivel concluir o login com Google.');
      }
    });

    return () => {
      alive = false;
    };
  }, [navigate, setUser]);

  return (
    <Screen video="/assets/bg.mp4" videoOpacity={0.22}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div className="fv-panel animate-riseIn" style={{ width: '100%', maxWidth: 420, padding: 32, textAlign: 'center' }}>
          <RuneRing size={72}>
            <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 23, color: 'var(--gold)' }}>
              F
            </span>
          </RuneRing>
          <h1
            style={{
              margin: '18px 0 8px',
              fontFamily: "'Cinzel', serif",
              fontWeight: 700,
              fontSize: 23,
              color: 'var(--ink)',
            }}
          >
            Abrindo o portal
          </h1>
          <p style={{ margin: 0, color: error ? 'var(--danger)' : 'var(--muted)', fontSize: 13.5 }}>
            {error ?? 'Concluindo seu login com Google...'}
          </p>
        </div>
      </div>
    </Screen>
  );
}
