import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { RuneRing } from '@/components/animations/RuneRing';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

type Mode = 'login' | 'register';

/** Login, cadastro e acesso como convidado. */
export function Login() {
  const navigate = useNavigate();
  const { login, register, loginAsGuest } = useAuthStore();
  const bump = useUiStore((s) => s.bump);

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = mode === 'login' ? login(email, password) : register(name, email, password);
    if (!res.ok) {
      setError(res.error ?? 'Algo deu errado.');
      return;
    }
    bump(1.3);
    navigate('/personagens');
  };

  const guest = () => {
    loginAsGuest();
    bump(1.2);
    navigate('/personagens');
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    cursor: 'pointer',
    fontFamily: "'Cinzel', serif",
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: '.04em',
    padding: '11px 0',
    borderRadius: 999,
    border: '1px solid ' + (active ? 'var(--gold)' : 'transparent'),
    color: active ? 'var(--gold)' : 'var(--muted)',
    background: active ? 'rgba(255,224,138,.12)' : 'transparent',
    boxShadow: active ? '0 0 18px var(--bloom)' : 'none',
    transition: '.25s',
  });

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
        <div
          className="fv-panel animate-riseIn"
          style={{ width: '100%', maxWidth: 440, padding: 'clamp(24px,4vw,38px)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 22 }}>
            <RuneRing size={78}>
              <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 24, color: 'var(--gold)' }}>
                F
              </span>
            </RuneRing>
            <h1
              style={{
                margin: '16px 0 4px',
                fontFamily: "'Cinzel', serif",
                fontWeight: 700,
                fontSize: 24,
                color: 'var(--ink)',
              }}
            >
              Entre na lenda
            </h1>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13.5, textAlign: 'center' }}>
              Salve seus heróis e continue a aventura de qualquer dispositivo.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: 4,
              borderRadius: 999,
              background: 'rgba(0,0,0,.28)',
              border: '1px solid var(--line)',
              marginBottom: 20,
            }}
          >
            <button onClick={() => setMode('login')} style={tabStyle(mode === 'login')}>
              Entrar
            </button>
            <button onClick={() => setMode('register')} style={tabStyle(mode === 'register')}>
              Cadastrar
            </button>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {mode === 'register' && (
              <label>
                <span className="fv-label" style={{ display: 'block', fontSize: 11.5, marginBottom: 7 }}>
                  Nome
                </span>
                <input
                  className="fv-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como te chamam?"
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              <span className="fv-label" style={{ display: 'block', fontSize: 11.5, marginBottom: 7 }}>
                E-mail
              </span>
              <input
                className="fv-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@reino.com"
                autoComplete="email"
              />
            </label>
            <label>
              <span className="fv-label" style={{ display: 'block', fontSize: 11.5, marginBottom: 7 }}>
                Senha
              </span>
              <input
                className="fv-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{error}</div>
            )}

            <button type="submit" className="fv-btn-gold" style={{ marginTop: 4, padding: '14px', fontSize: 15 }}>
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '.1em' }}>OU</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <button
            onClick={guest}
            style={{
              width: '100%',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--ink)',
              padding: '13px',
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--panel)',
              backdropFilter: 'blur(8px)',
              transition: '.25s',
            }}
          >
            Continuar como convidado
          </button>
          <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--muted)', textAlign: 'center' }}>
            Os dados ficam salvos apenas neste navegador. Sem servidores, sem complicação.
          </p>
        </div>
      </div>
    </Screen>
  );
}
