import { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useStageStore } from '@/store/stageStore';
import { confirmAction, toast } from '@/store/feedbackStore';
import { masterService, trayCount } from '@/services/masterService';
import type { SessionTray } from '@/services/masterService';
import { MONSTER_BY_ID } from '@/data/bestiary';
import { EventFeed } from '@/components/session/EventFeed';
import { RollVisibilityToggle } from '@/features/live/LiveHeader';
import { useMasterStore } from '../masterStore';
import type { Selection } from '../masterStore';
import { useMaster } from '../context';
import { hpWithUndo } from '../actions';

/**
 * SESSÃO: abrir agora (improvisar), preparar para depois (sessão planejada
 * com bandeja), pausar/encerrar, quem vê as rolagens e a crônica curta.
 */
export function SessionPanel() {
  const s = useSessionStore();
  const m = useMasterStore();
  const { campaign } = useMaster();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void m.loadPlanned();
  }, [campaign.id, s.session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  if (s.session) {
    const live = s.session;
    return (
      <div className="fv-bs-stack">
        <section className="fv-bs-card">
          <div className="fv-bs-card-head">
            <b>{live.name}</b>
            <span className={'fv-bs-pill' + (live.status === 'active' ? ' is-live' : '')}>{live.status === 'active' ? 'Ao vivo' : 'Pausada'}</span>
          </div>
          <RollVisibilityToggle isMaster />
          <div className="fv-bs-row">
            {live.status === 'active' ? (
              <button type="button" className="fv-btn-ghost fv-bs-btn" disabled={s.busy} onClick={() => void s.setSessionStatus('paused')}>
                Pausar
              </button>
            ) : (
              <button type="button" className="fv-btn-ghost fv-bs-btn" disabled={s.busy} onClick={() => void s.setSessionStatus('active')}>
                Retomar
              </button>
            )}
            <button
              type="button"
              className="fv-btn-ghost fv-bs-btn is-danger"
              disabled={s.busy}
              onClick={async () =>
                (await confirmAction({ title: 'Encerrar a sessão para todos?', message: 'O encontro aberto também termina. A bandeja e as notas ficam guardadas.', confirmLabel: 'Encerrar', danger: true })) &&
                void s.setSessionStatus('finished')
              }
            >
              Encerrar sessão
            </button>
          </div>
        </section>
        <SessionTrayView />
        <EventFeed events={s.events} targets={s.combatants} onApply={(c, n) => void hpWithUndo(c, -n)} />
      </div>
    );
  }

  const editing = m.planned.find((p) => p.id === m.traySessionId) ?? null;
  return (
    <div className="fv-bs-stack">
      <section className="fv-bs-card">
        <div className="fv-bs-card-head">
          <b>Nenhuma sessão ao vivo</b>
        </div>
        <p className="fv-bs-hint">Comece agora e improvise, ou prepare a próxima: separe NPCs, cenas, pistas e criaturas que talvez use. Nada é obrigatório.</p>
        <input className="fv-input" placeholder="Nome (opcional)" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <div className="fv-bs-row">
          <button type="button" className="fv-btn-gold fv-bs-btn" disabled={busy || s.busy} onClick={() => run(() => s.startSession(name || undefined).then(() => setName('')))}>
            Começar agora
          </button>
          <button
            type="button"
            className="fv-btn-ghost fv-bs-btn"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const p = await masterService.plan(campaign.id, name || undefined);
                setName('');
                await m.loadPlanned();
                await m.loadTray(p.id);
                toast(`${p.name} em preparação. Marque ☆ no que quiser deixar à mão.`);
              })
            }
          >
            Preparar para depois
          </button>
        </div>
      </section>

      {m.planned.length > 0 && (
        <section className="fv-bs-card">
          <div className="fv-bs-card-head">
            <b>Em preparação</b>
          </div>
          <ul className="fv-bs-list">
            {m.planned.map((p) => (
              <li key={p.id} className={p.id === m.traySessionId ? 'is-on' : ''}>
                <button type="button" className="fv-bs-item" onClick={() => void m.loadTray(p.id)} aria-pressed={p.id === m.traySessionId}>
                  <b>{p.name}</b>
                  <small>{p.id === m.traySessionId ? `${trayCount(m.tray)} atalho(s) na bandeja` : 'Ver bandeja'}</small>
                </button>
                <div className="fv-bs-item-acts">
                  <button
                    type="button"
                    className="fv-btn-gold fv-bs-mini"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await masterService.startPlanned(p.id);
                        await s.refresh();
                        await m.loadPlanned();
                        toast(`${p.name} começou. A bandeja veio junto.`);
                      })
                    }
                  >
                    Começar
                  </button>
                  <button
                    type="button"
                    className="fv-bs-x"
                    aria-label={`Descartar ${p.name}`}
                    onClick={async () => {
                      if (!(await confirmAction({ title: `Descartar ${p.name}?`, message: 'A bandeja dela some. NPCs, cenas e pistas continuam na campanha.', confirmLabel: 'Descartar', danger: true }))) return;
                      void run(async () => {
                        await masterService.discardPlanned(p.id);
                        if (m.traySessionId === p.id) await m.loadTray(null);
                        await m.loadPlanned();
                      });
                    }}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {editing && <SessionTrayView />}
    </div>
  );
}

const TRAY_LABEL: Record<keyof SessionTray, string> = { npcs: 'NPCs', scenes: 'Cenas', handouts: 'Pistas', monsters: 'Criaturas' };

/**
 * Bandeja da sessão: atalhos, não roteiro. Sem ordem e sem obrigação — toque
 * para abrir no inspetor, × para tirar da bandeja.
 */
export function SessionTrayView() {
  const m = useMasterStore();
  const { npcs } = useMaster();
  const scenes = useStageStore((st) => st.scenes);
  const handouts = useStageStore((st) => st.handouts);
  const total = trayCount(m.tray);
  const label = (kind: keyof SessionTray, id: string): string | null => {
    if (kind === 'npcs') return npcs.find((n) => n.id === id)?.name ?? null;
    if (kind === 'scenes') return scenes.find((x) => x.id === id)?.name ?? null;
    if (kind === 'handouts') return handouts.find((h) => h.id === id)?.title ?? null;
    return MONSTER_BY_ID[id]?.name ?? null;
  };
  const pick = (kind: keyof SessionTray, id: string): Selection =>
    kind === 'npcs' ? { kind: 'npc', id } : kind === 'scenes' ? { kind: 'scene', id } : kind === 'handouts' ? { kind: 'handout', id } : { kind: 'monster', ref: id };

  return (
    <section className="fv-bs-card fv-bandeja">
      <div className="fv-bs-card-head">
        <b>Bandeja da sessão</b>
        <small>{total ? `${total} atalho${total > 1 ? 's' : ''}` : 'vazia'}</small>
      </div>
      {!m.traySessionId ? (
        <p className="fv-bs-hint">Prepare ou abra uma sessão para separar atalhos.</p>
      ) : total === 0 ? (
        <p className="fv-bs-hint">Marque ☆ em NPCs, cenas, pistas e criaturas para deixá-los à mão aqui. Use tudo, nada ou em qualquer ordem.</p>
      ) : (
        (Object.keys(TRAY_LABEL) as (keyof SessionTray)[]).map((kind) =>
          m.tray[kind].length ? (
            <div key={kind} className="fv-bandeja-group">
              <small>{TRAY_LABEL[kind]}</small>
              <div className="fv-bandeja-chips">
                {m.tray[kind].map((id) => {
                  const text = label(kind, id);
                  return (
                    <span key={id} className={'fv-bandeja-chip' + (text ? '' : ' is-gone')}>
                      <button type="button" onClick={() => text && m.select(pick(kind, id))} disabled={!text} title={text ? 'Abrir no inspetor' : 'Não existe mais'}>
                        {text ?? 'removido'}
                      </button>
                      <button type="button" className="fv-bandeja-x" aria-label="Tirar da bandeja" onClick={() => void m.toggleTray(kind, id)}>
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null,
        )
      )}
    </section>
  );
}

/** ☆ — separa (ou tira) um atalho na bandeja da sessão. */
export function TrayStar({ kind, id, label }: { kind: keyof SessionTray; id: string; label: string }) {
  const on = useMasterStore((m) => m.tray[kind].includes(id));
  const has = useMasterStore((m) => !!m.traySessionId);
  const toggle = useMasterStore((m) => m.toggleTray);
  return (
    <button
      type="button"
      className={'fv-star' + (on ? ' is-on' : '')}
      aria-pressed={on}
      aria-label={on ? `Tirar ${label} da bandeja` : `Separar ${label} na bandeja`}
      title={has ? (on ? 'Na bandeja da sessão' : 'Separar na bandeja da sessão') : 'Prepare ou abra uma sessão para usar a bandeja'}
      disabled={!has}
      onClick={(e) => {
        e.stopPropagation();
        void toggle(kind, id);
      }}
    >
      {on ? '★' : '☆'}
    </button>
  );
}
