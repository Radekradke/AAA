import { useState } from 'react';
import { useStageStore } from '@/store/stageStore';
import { stageService } from '@/services/stageService';
import { HandoutDesk } from '@/components/stage/Handouts';
import { toast } from '@/store/feedbackStore';
import { useMasterStore } from '../masterStore';
import { useMaster, heroName } from '../context';
import { TrayStar } from './SessionPanel';
import { BackstageOverlay } from './BackstageOverlay';

/** Para quem a pista foi entregue, em palavras. */
export function recipientsLabel(recipients: string[] | null, heroes: ReturnType<typeof useMaster>['heroes']): string {
  if (!recipients) return 'todos';
  const names = recipients.map((uid) => heroes.find((h) => h.share.ownerId === uid)).filter(Boolean).map((h) => heroName(h!));
  return names.length ? names.join(', ') : `${recipients.length} jogador(es)`;
}

export async function keepHandout(id: string, title: string, refresh: () => Promise<void>): Promise<void> {
  try {
    await stageService.keepHandout(id);
    await refresh();
    toast(`"${title}" guardada na campanha.`);
  } catch (e) {
    toast((e as Error).message, { tone: 'danger' });
  }
}

/**
 * PISTAS: o que está na gaveta e o que já foi entregue. Toque abre no
 * inspetor (destinatários, mostrar/recolher); a gaveta completa (imagens,
 * edição) abre por cima.
 */
export function HandoutsPanel() {
  const { campaign, heroes } = useMaster();
  const handouts = useStageStore((st) => st.handouts);
  const refresh = useStageStore((st) => st.refresh);
  const select = useMasterStore((m) => m.select);
  const openQuick = useMasterStore((m) => m.openQuick);
  const selection = useMasterStore((m) => m.selection);
  const [desk, setDesk] = useState(false);

  return (
    <div className="fv-bs-stack">
      <div className="fv-bs-row">
        <button type="button" className="fv-btn-gold fv-bs-btn" onClick={() => openQuick('pista')}>
          + Pista agora
        </button>
        <button type="button" className="fv-btn-ghost fv-bs-btn" onClick={() => setDesk(true)}>
          Gaveta completa
        </button>
      </div>
      {!handouts.length && <p className="fv-bs-hint">Nenhuma pista ainda. Cartas, mapas e bilhetes entram aqui.</p>}
      <ul className="fv-bs-list">
        {handouts.map((h) => (
          <li key={h.id} className={selection?.kind === 'handout' && selection.id === h.id ? 'is-on' : ''}>
            <button type="button" className="fv-bs-item" onClick={() => select({ kind: 'handout', id: h.id })}>
              <b>
                {h.title}
                {h.improvisedIn && <em className="fv-bs-tag">improviso</em>}
              </b>
              <small>{h.shownAt ? `Entregue a ${recipientsLabel(h.recipients, heroes)}` : 'Na gaveta (ninguém viu)'}</small>
            </button>
            <div className="fv-bs-item-acts">
              <TrayStar kind="handouts" id={h.id} label={h.title} />
              {h.improvisedIn && (
                <button type="button" className="fv-bs-mini fv-btn-ghost" title="Guardar na campanha" onClick={() => void keepHandout(h.id, h.title, refresh)}>
                  Guardar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {desk && (
        <BackstageOverlay title="Gaveta de pistas" onClose={() => setDesk(false)}>
          <HandoutDesk campaignId={campaign.id} heroes={heroes} />
        </BackstageOverlay>
      )}
    </div>
  );
}
