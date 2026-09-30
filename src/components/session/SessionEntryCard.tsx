import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '@/services/sessionService';
import { getSupabase } from '@/services/supabaseClient';
import type { GameSession } from '@/types/session';

/**
 * Entrada da sessão ao vivo na sala da campanha. Fica fora do
 * CampaignRoom de propósito: a sala só mostra o card; toda a mesa ao vivo
 * mora em /mesa/:id/jogar.
 */
export function SessionEntryCard({ campaignId, isMaster }: { campaignId: string; isMaster: boolean }) {
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

  return (
    <div className={'fv-panel fv-live-entry' + (live ? ' is-live' : '')}>
      <div className="fv-live-entry-text">
        <div className="fv-label">{live ? <><i className="fv-live-dot is-connected" aria-hidden /> Sessão ao vivo</> : 'Sessão de jogo'}</div>
        <b>{live ? live.name : isMaster ? 'Abra a sessão da noite' : checked ? 'Nenhuma sessão aberta agora' : '…'}</b>
        <small>
          {live
            ? 'Iniciativa compartilhada, rodadas e turnos em tempo real.'
            : isMaster
              ? 'Os jogadores entram, rolam iniciativa e veem a mesma ordem que você.'
              : 'Quando o mestre abrir, entre por aqui.'}
        </small>
        {error && <small className="fv-live-entry-error">{error}</small>}
      </div>
      {live ? (
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
