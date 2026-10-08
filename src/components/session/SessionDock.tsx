import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { myActiveCombatant, resumeInfo, useSessionStore } from '@/store/sessionStore';
import { useAuthStore } from '@/store/authStore';
import { cloudEnabled } from '@/services/supabaseClient';
import { campaignService } from '@/services/campaignService';
import { TurnBanner } from './TurnBanner';
import { TableRollToast } from './TableRollToast';
import { KillCreditPrompt } from './KillCreditPrompt';
import '@/styles/session.css';

/**
 * Presença global da mesa ao vivo: enquanto estou numa sessão, uma pílula
 * fica no canto em qualquer tela (ex.: com a ficha aberta) mostrando a
 * rodada e de quem é a vez — e o "SEU TURNO" aparece aqui também.
 * Depois de um reload, volta sozinha para a mesa em que eu estava.
 */
export function SessionDock() {
  const loc = useLocation();
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const campaignId = useSessionStore((s) => s.campaignId);
  const session = useSessionStore((s) => s.session);
  const enc = useSessionStore((s) => s.encounter);
  const combatants = useSessionStore((s) => s.combatants);
  const connection = useSessionStore((s) => s.connection);
  const mine = useSessionStore((s) => myActiveCombatant(s));

  // reload fora da página da mesa: reconecta na última mesa
  useEffect(() => {
    if (campaignId || !user || user.guest || !cloudEnabled()) return;
    const info = resumeInfo();
    if (!info || info.userId !== user.id) return;
    let alive = true;
    void campaignService.getCampaign(info.campaignId).then((c) => {
      if (!alive || !c || useSessionStore.getState().campaignId) return;
      void useSessionStore.getState().join(c.id, { userId: user.id, name: user.name, isMaster: c.masterId === user.id, characterId: null, characterName: null });
    }).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [campaignId, user]);

  // saiu da conta: sai da mesa
  useEffect(() => {
    if (!user && campaignId) useSessionStore.getState().leave();
  }, [user, campaignId]);

  if (!campaignId || !session) return null;
  const onLivePage = loc.pathname === `/mesa/${campaignId}/jogar`;
  const active = enc?.activeCombatantId ? combatants.find((c) => c.id === enc.activeCombatantId) : null;

  return (
    <>
      <TurnBanner />
      <TableRollToast />
      <KillCreditPrompt />
      {!onLivePage && (
        <button type="button" className={'fv-live-dock' + (mine ? ' is-mine' : '')} onClick={() => nav(`/mesa/${campaignId}/jogar`)} title="Voltar para a mesa ao vivo">
          <i className={`fv-live-dot is-${connection}`} aria-hidden />
          <span>
            <b>{mine ? 'SEU TURNO' : 'Mesa ao vivo'}</b>
            <small>
              {enc && enc.status === 'active' && enc.round > 0
                ? `Rodada ${enc.round}${active && !mine ? ` · vez de ${active.name}` : ''}`
                : enc && enc.status === 'preparing' ? 'Preparando combate' : session.name}
            </small>
          </span>
        </button>
      )}
    </>
  );
}
