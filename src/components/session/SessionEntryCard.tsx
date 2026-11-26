import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '@/services/sessionService';
import { getSupabase } from '@/services/supabaseClient';
import type { GameSession } from '@/types/session';
import { confirmAction } from '@/store/feedbackStore';
import { isStaleSession, openForLabel, sessionOpenFor } from '@/lib/sessionAge';

/**
 * Entrada da sessão ao vivo na sala da campanha. Fica fora do
 * CampaignRoom de propósito: a sala só mostra o card; toda a mesa ao vivo
 * mora em /mesa/:id/jogar.
 */
export function SessionEntryCard({ campaignId, isMaster, linkedCount }: { campaignId: string; isMaster: boolean; linkedCount?: number }) {
  const nav = useNavigate();
  const [live, setLive] = useState<GameSession | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      sessionService.live(campaignId)
        .then((s) => alive && setLive(s))
        .catch(() => undefined)
        .finally(() => alive && setChecked(true));
    void load();
    // jogador vê "a sessão começou" sem recarregar
    const client = getSupabase();
    const ch = client
      ?.channel(`room-sessions-${campaignId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `campaign_id=eq.${campaignId}` }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      if (client && ch) void client.removeChannel(ch);
    };
  }, [campaignId]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await sessionService.start(campaignId);
      nav(`/mesa/${campaignId}/jogar`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // sessão esquecida aberta: o mestre é lembrado de encerrar; o jogador não é chamado para uma mesa vazia
  const stale = !!live && isStaleSession(live);
  const finish = async () => {
    if (!live) return;
    const ok = await confirmAction({
      title: 'Encerrar esta sessão?',
      message: `Está aberta ${openForLabel(sessionOpenFor(live))}. O encontro aberto também termina; bandeja e notas ficam guardadas.`,
      confirmLabel: 'Encerrar',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await sessionService.setStatus(live.id, 'finished');
      setLive(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={'fv-panel fv-live-entry' + (live && !stale ? ' is-live' : '')}>
      <div className="fv-live-entry-text">
        <div className="fv-label">
          {live && !stale ? <><i className="fv-live-dot is-connected" aria-hidden /> Sessão ao vivo</> : live ? 'Sessão aberta' : 'Sessão de jogo'}
        </div>
        <b>{live ? live.name : isMaster ? 'Abra a sessão da noite' : checked ? 'Nenhuma sessão aberta agora' : '…'}</b>
        <small>
          {live && stale
            ? isMaster
              ? `Aberta ${openForLabel(sessionOpenFor(live))} — se a noite de jogo já acabou, encerre para a mesa não aparecer como ao vivo.`
              : `Aberta ${openForLabel(sessionOpenFor(live))}. O mestre pode estar fora agora.`
            : live
            ? 'Iniciativa compartilhada, rodadas e turnos em tempo real.'
            : isMaster
              ? 'Os jogadores entram, rolam iniciativa e veem a mesma ordem que você.'
              : 'Quando o mestre abrir, entre por aqui.'}
        </small>
        {linkedCount !== undefined && (
          <small role="status">{linkedCount > 1 ? `${linkedCount} fichas vinculadas` : linkedCount === 1 ? 'Ficha vinculada' : 'Sem ficha vinculada · vincule abaixo para jogar com seu herói.'}</small>
        )}
        {error && <small className="fv-live-entry-error">{error}</small>}
      </div>
      {live && stale && isMaster ? (
        <div className="fv-live-entry-actions">
          <button type="button" className="fv-btn-ghost" disabled={busy} onClick={() => void finish()}>
            {busy ? 'Encerrando…' : 'Encerrar sessão'}
          </button>
          <button type="button" className="fv-btn-gold fv-live-big" onClick={() => nav(`/mesa/${campaignId}/jogar`)}>
            Voltar à mesa
          </button>
        </div>
      ) : live ? (
        <button type="button" className="fv-btn-gold fv-live-big" onClick={() => nav(`/mesa/${campaignId}/jogar`)}>
          {isMaster ? 'Voltar à mesa' : 'Entrar na sessão'}
        </button>
      ) : isMaster ? (
        <button type="button" className="fv-btn-gold fv-live-big" disabled={busy} onClick={() => void start()}>
          {busy ? 'Abrindo…' : 'Iniciar sessão'}
        </button>
      ) : (
        <button type="button" className="fv-btn-ghost" onClick={() => nav(`/mesa/${campaignId}/jogar`)}>
          Esperar na mesa
        </button>
      )}
    </div>
  );
}
