import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignService } from '@/services/campaignService';
import type { RosterEntry } from '@/services/campaignService';
import { confirmAction, toast } from '@/store/feedbackStore';
import { useSessionStore } from '@/store/sessionStore';
import { useStageStore } from '@/store/stageStore';

const joinedLabel = (at: number) => (at ? new Date(at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

/**
 * Mestre: quem está na mesa (nome da conta e fichas vinculadas) e remover
 * quem deixou o grupo. `version` muda quando a sala recarrega (alguém
 * entrou, vinculou ou saiu) para a lista acompanhar.
 */
export function MembersCard({ campaignId, version }: { campaignId: string; version: number }) {
  const [list, setList] = useState<RosterEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(() => {
    campaignService
      .roster(campaignId)
      .then((r) => {
        setList(r);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [campaignId]);
  useEffect(load, [load, version]);

  const remove = async (p: RosterEntry) => {
    const ok = await confirmAction({
      title: `Remover ${p.name} da mesa?`,
      message:
        (p.heroes ? `As ${p.heroes === 1 ? 'ficha vinculada sai' : `${p.heroes} fichas vinculadas saem`} junto. ` : '') +
        'A pessoa deixa de ver a sala e a sessão ao vivo. A ficha dela não é apagada — continua com ela.',
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!ok) return;
    setRemoving(p.userId);
    try {
      await campaignService.removeMember(campaignId, p.userId);
      toast(`${p.name} saiu da mesa. Para impedir a volta pelo mesmo convite, gere um código novo.`, { tone: 'ok', ms: 6000 });
      load();
    } catch (e) {
      toast((e as Error).message, { tone: 'danger' });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <section className="fv-panel fv-members" aria-labelledby="fv-members-t">
      <div className="fv-label" id="fv-members-t">
        Jogadores{list ? ` · ${list.length}` : ''}
      </div>
      {error ? (
        <p className="fv-members-hint">{error}</p>
      ) : !list ? (
        <p className="fv-members-hint">Carregando…</p>
      ) : !list.length ? (
        <p className="fv-members-hint">Ninguém entrou ainda — passe o código de convite para os jogadores.</p>
      ) : (
        <ul className="fv-members-list">
          {list.map((p) => (
            <li key={p.userId}>
              <span className="fv-members-avatar" aria-hidden>
                {p.name.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <span className="fv-members-text">
                <b>{p.name}</b>
                <small>
                  {p.heroes ? `${p.heroes} ficha${p.heroes > 1 ? 's' : ''} vinculada${p.heroes > 1 ? 's' : ''}` : 'Ainda sem ficha vinculada'}
                  {p.joinedAt ? ` · desde ${joinedLabel(p.joinedAt)}` : ''}
                </small>
              </span>
              <button
                type="button"
                className="fv-btn-danger fv-members-btn"
                onClick={() => void remove(p)}
                disabled={removing !== null}
                aria-busy={removing === p.userId}
                aria-label={`Remover ${p.name} da mesa`}
              >
                {removing === p.userId ? 'Removendo…' : 'Remover'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Jogador: sair da mesa (as fichas vinculadas saem junto; a ficha continua com ele). */
export function LeaveCampaignButton({ campaignId, campaignName }: { campaignId: string; campaignName: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const leave = async () => {
    const ok = await confirmAction({
      title: `Sair de “${campaignName}”?`,
      message: 'O mestre deixa de ver as fichas que você vinculou aqui. Seus heróis continuam com você. Para voltar, peça um convite ao mestre.',
      confirmLabel: 'Sair da mesa',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await campaignService.leaveCampaign(campaignId);
      // estava na mesa ao vivo desta campanha: desliga a sessão e o palco
      if (useSessionStore.getState().campaignId === campaignId) useSessionStore.getState().leave();
      if (useStageStore.getState().campaignId === campaignId) useStageStore.getState().close();
      toast(`Você saiu de “${campaignName}”.`, { tone: 'ok' });
      navigate('/mesas', { replace: true });
    } catch (e) {
      toast((e as Error).message, { tone: 'danger' });
      setBusy(false);
    }
  };

  return (
    <div className="fv-members-leave">
      <button type="button" className="fv-btn-danger fv-members-btn" onClick={() => void leave()} disabled={busy} aria-busy={busy}>
        {busy ? 'Saindo…' : 'Sair desta mesa'}
      </button>
    </div>
  );
}
