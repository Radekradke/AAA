import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { campaignService } from '@/services/campaignService';
import { authService } from '@/services/authService';
import { cloudEnabled } from '@/services/supabaseClient';

/** Entrada na sala pelo link de convite: /sala/:token → vira membro e abre a mesa. */
export function JoinCampaign() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [error, setError] = useState<string | null>(null);
  const triedRef = useRef(false);

  useEffect(() => {
    if (!token || triedRef.current) return;
    if (!cloudEnabled() || !user || user.guest) return; // aguarda login real
    triedRef.current = true;
    void (async () => {
      // o `user` fica salvo no aparelho, mas a sessão do Supabase pode ter
      // expirado — sem ela, auth.uid() é nulo e o convite falha no banco.
      // Confirma uma sessão viva antes de chamar o RPC.
      const live = await authService.currentUser();
      if (!live) {
        triedRef.current = false;
        setError('Sua sessão expirou. Entre novamente para aceitar o convite.');
        return;
      }
      try {
        const campaignId = await campaignService.joinByToken(token);
        navigate(`/mesa/${campaignId}`, { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Convite inválido.');
      }
    })();
  }, [token, user, navigate]);

  const needsLogin = !cloudEnabled() || !user || user.guest;

  return (
    <Screen>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {needsLogin ? (
            <EmptyState
              icon="banner"
              title="Convite para uma mesa"
              hint="Entre com sua conta (e-mail ou Google) para aceitar o convite — depois você volta direto para a sala."
              action={
                <button className="fv-btn-gold" style={{ minHeight: 42, padding: '0 22px', fontSize: 13.5 }} onClick={() => navigate('/entrar')}>
                  Entrar para aceitar
                </button>
              }
            />
          ) : error ? (
            <EmptyState
              icon="banner"
              title="Não foi possível entrar"
              hint={error}
              action={
                <button className="fv-btn-gold" style={{ minHeight: 42, padding: '0 22px', fontSize: 13.5 }} onClick={() => navigate('/entrar')}>
                  Entrar novamente
                </button>
              }
            />
          ) : (
            <EmptyState icon="banner" title="Abrindo a mesa…" hint="Validando seu convite." />
          )}
        </div>
      </div>
    </Screen>
  );
}
