import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { RuneRing } from '@/components/animations/RuneRing';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { authService } from '@/services/authService';

type Mode = 'login' | 'register';

/** Login, cadastro (nuvem via Supabase quando configurado) e modo offline. */
export function Login() {
  const navigate = useNavigate();
  const { login, register, loginAsGuest, setUser } = useAuthStore();
  const bump = useUiStore((s) => s.bump);
  const cloud = authService.cloudEnabled();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await authService.signInWithGoogle(`${window.location.origin}/auth/callback`);
      if (!res.ok) setError(res.error ?? 'Não foi possível iniciar o login com Google.');
    } finally {
      setBusy(false);
    }
  };

  // sessão já ativa (ex.: retorno do OAuth) → entra direto
  useEffect(() => {
    if (!cloud) return;
    void authService.currentUser().then((u) => {
      if (u) {
        setUser(u);
        navigate('/personagens');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (cloud) {
        // nuvem: Supabase Auth (senha nunca fica no aparelho)
        const res = mode === 'login'
          ? await authService.signIn(email, password)
          : await authService.signUp(name, email, password);
        if (!res.ok || !res.user) {
          setError(res.error ?? 'Algo deu errado.');
          return;
        }
        setUser(res.user);
      } else {
        // sem nuvem configurada: conta local deste navegador
        const res = mode === 'login' ? await login(email, password) : await register(name, email, password);
        if (!res.ok) {
          setError(res.error ?? 'Algo deu errado.');
          return;
        }
      }
      bump(1.3);
      navigate('/personagens');
    } finally {
      setBusy(false);
    }
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

            <button type="submit" disabled={busy} className="fv-btn-gold" style={{ marginTop: 4, padding: '14px', fontSize: 15, opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '.1em' }}>OU</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          {cloud && (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={busy}
              style={{
                opacity: busy ? 0.7 : 1,
                width: '100%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--ink)',
                padding: '13px',
                marginBottom: 10,
                borderRadius: 12,
                border: '1px solid var(--line)',
                background: 'var(--panel)',
                backdropFilter: 'blur(8px)',
                transition: '.25s',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.12-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z" />
                <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.6 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.89 8.87 4.77 12 4.77z" />
              </svg>
              Entrar com Google
            </button>
          )}

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
            Continuar offline
          </button>
          <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--muted)', textAlign: 'center' }}>
            {cloud
              ? 'No modo offline as fichas ficam salvas neste aparelho e você pode entrar depois para sincronizar na nuvem.'
              : 'As fichas ficam salvas neste aparelho (funciona sem internet). Configure o Supabase para sincronizar na nuvem — veja docs/SUPABASE.md.'}
          </p>
        </div>
      </div>
    </Screen>
  );
}
