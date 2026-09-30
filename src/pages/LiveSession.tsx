import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { InitiativeTrack } from '@/components/session/InitiativeTrack';
import { MasterDeck } from '@/components/session/MasterDeck';
import type { SharedHero } from '@/components/session/MasterDeck';
import { EventFeed } from '@/components/session/EventFeed';
import { InitiativeButton } from '@/components/sheet/InitiativeButton';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { myActiveCombatant, useSessionStore } from '@/store/sessionStore';
import { campaignService } from '@/services/campaignService';
import { cloudEnabled } from '@/services/supabaseClient';
import { deriveCharacter } from '@/engine/dndRules';
import { modStr } from '@/engine/dice';
import { music } from '@/lib/music';
import type { Campaign } from '@/types/models';
import type { ConnectionState } from '@/types/session';

const CONN: Record<ConnectionState, string> = {
  idle: 'Fora da sessão',
  connecting: 'Conectando…',
  connected: 'Ao vivo',
  reconnecting: 'Reconectando…',
  offline: 'Sem conexão',
};

/**
 * Mesa ao vivo (/mesa/:id/jogar): a sessão da noite. O mestre abre a
 * sessão, prepara o encontro e passa os turnos; os jogadores entram, rolam a
 * própria iniciativa e recebem o "SEU TURNO". A verdade está no banco — esta
 * tela é um espelho do sessionStore.
 */
export function LiveSession() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const user = useAuthStore((u) => u.user);
  const s = useSessionStore();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [heroes, setHeroes] = useState<SharedHero[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessName, setSessName] = useState('');

  const canPlay = cloudEnabled() && !!user && !user.guest;
  const isMaster = !!campaign && !!user && campaign.masterId === user.id;

  // entra na mesa (idempotente: voltar da ficha não reconecta)
  useEffect(() => {
    if (!id || !user || !canPlay) return;
    let alive = true;
    campaignService.getCampaign(id).then((c) => {
      if (!alive) return;
      if (!c) return setLoadError('Mesa não encontrada — você faz parte dela?');
      setCampaign(c);
      const cur = useSessionStore.getState().me;
      void s.join(c.id, {
        userId: user.id,
        name: user.name,
        isMaster: c.masterId === user.id,
        characterId: cur?.characterId ?? null,
        characterName: cur?.characterName ?? null,
      });
    }).catch((e) => setLoadError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [id, user?.id, canPlay]); // eslint-disable-line react-hooks/exhaustive-deps

  // fichas vinculadas (heróis que podem entrar no encontro)
  const encId = s.encounter?.id;
  useEffect(() => {
    if (!id || !canPlay) return;
    campaignService.sharedSheets(id).then(setHeroes).catch(() => undefined);
  }, [id, canPlay, encId, s.session?.id]);

  // começou o combate com a trilha tocando → música de batalha
  const combatOn = s.encounter?.status === 'active';
  useEffect(() => {
    if (combatOn && music.get().playing) music.setMood('combate');
  }, [combatOn]);

  if (!canPlay) {
    return (
      <Screen scroll actions={<Button onClick={() => nav(`/mesa/${id}`)} style={{ fontSize: 12.5 }}>Sala</Button>}>
        <div className="fv-live">
          <section className="fv-panel fv-live-card fv-live-center">
            <div className="fv-label">Mesa ao vivo</div>
            <p className="fv-live-hint">A sessão ao vivo precisa da nuvem e de uma conta (não funciona como convidado). Sua ficha continua funcionando offline normalmente.</p>
          </section>
        </div>
      </Screen>
    );
  }

  const enc = s.encounter;
  const active = enc?.activeCombatantId ? s.combatants.find((c) => c.id === enc.activeCombatantId) : null;
  const mineNow = myActiveCombatant(s);

  return (
    <Screen scroll actions={<Button onClick={() => nav(`/mesa/${id}`)} style={{ fontSize: 12.5 }}>Sala</Button>}>
      <div className={'fv-live' + (isMaster && enc ? ' has-turnbar' : '')}>
        {/* cabeçalho: mesa, sessão, conexão e quem está online */}
        <header className="fv-live-head">
          <div className="fv-live-title">
            <div className="fv-label">{isMaster ? 'Você é o mestre' : 'Mesa ao vivo'}</div>
            <h1>{campaign?.name ?? 'Carregando…'}</h1>
            <div className="fv-live-sub">
              <span className={`fv-live-conn is-${s.connection}`}><i className={`fv-live-dot is-${s.connection}`} aria-hidden />{CONN[s.connection]}</span>
              {s.session && <span>{s.session.name}{s.session.status === 'paused' ? ' · pausada' : ''}</span>}
            </div>
          </div>
          {s.session && (
            <ul className="fv-live-online" aria-label="Quem está na mesa">
              {s.online.map((p) => (
                <li key={p.userId} className={p.role === 'master' ? 'is-master' : ''} title={`${p.name}${p.characterName ? ` · ${p.characterName}` : ''}`}>
                  <span className="fv-live-avatar">{(p.characterName ?? p.name).slice(0, 1).toUpperCase()}</span>
                  <small>{p.role === 'master' ? 'Mestre' : p.characterName ?? p.name}</small>
                </li>
              ))}
            </ul>
          )}
        </header>

        {(loadError || s.error) && (
          <div className="fv-live-error" role="alert">
            {loadError ?? s.error}
            {s.error && <button type="button" onClick={s.clearError} aria-label="Fechar">×</button>}
          </div>
        )}

        {/* sem sessão */}
        {!s.session && !s.loading && campaign && (
          isMaster ? (
            <section className="fv-panel fv-live-card fv-live-center">
              <div className="fv-label">Nenhuma sessão aberta</div>
              <p className="fv-live-hint">Ao abrir a sessão, os jogadores da mesa podem entrar e acompanhar a iniciativa ao vivo.</p>
              <div className="fv-live-inline">
                <input className="fv-input" placeholder="Nome da sessão (opcional)" value={sessName} onChange={(e) => setSessName(e.target.value)} maxLength={60} />
                <button type="button" className="fv-btn-gold fv-live-big" disabled={s.busy} onClick={() => void s.startSession(sessName || undefined)}>
                  Iniciar sessão
                </button>
              </div>
            </section>
          ) : (
            <section className="fv-panel fv-live-card fv-live-center">
              <div className="fv-live-wait" aria-hidden />
              <div className="fv-label">Aguardando o mestre</div>
              <p className="fv-live-hint">Quando o mestre abrir a sessão, esta tela entra sozinha.</p>
            </section>
          )
        )}

        {s.session && (
          <div className="fv-live-grid">
            <div className="fv-live-main">
              {/* medalhão da rodada + trilha */}
              <section className="fv-panel fv-live-board">
                {enc ? (
                  <>
                    <div className="fv-live-round">
                      <div className="fv-live-medal" aria-label={`Rodada ${enc.round}`}>
                        <small>Rodada</small>
                        <b>{enc.round || '—'}</b>
                      </div>
                      <div className="fv-live-round-info">
                        <div className="fv-label">{enc.name}</div>
                        <strong>
                          {enc.status === 'preparing' && 'Rolando iniciativa'}
                          {enc.status === 'active' && (mineNow ? 'Seu turno!' : active ? `Vez de ${active.name}` : '—')}
                          {enc.status === 'paused' && 'Combate pausado'}
                        </strong>
                      </div>
                    </div>
                    <InitiativeTrack encounter={enc} combatants={s.combatants} isMaster={isMaster} userId={user!.id} />
                  </>
                ) : (
                  <div className="fv-live-empty">{isMaster ? 'Sem combate agora. Prepare um encontro quando a história pedir.' : 'Sem combate agora — a sessão está aberta.'}</div>
                )}
              </section>
            </div>

            <aside className="fv-live-side">
              {isMaster ? <MasterDeck heroes={heroes} /> : <PlayerCard heroes={heroes} />}
              <EventFeed events={s.events} />
              {isMaster && (
                <section className="fv-live-session-ctl">
                  {s.session.status === 'active' ? (
                    <button type="button" className="fv-btn-ghost" disabled={s.busy} onClick={() => void s.setSessionStatus('paused')}>Pausar sessão</button>
                  ) : (
                    <button type="button" className="fv-btn-ghost" disabled={s.busy} onClick={() => void s.setSessionStatus('active')}>Retomar sessão</button>
                  )}
                  <button
                    type="button"
                    className="fv-btn-ghost is-danger"
                    disabled={s.busy}
                    onClick={() => window.confirm('Encerrar a sessão para todos? O encontro aberto também termina.') && void s.setSessionStatus('finished')}
                  >
                    Encerrar sessão
                  </button>
                </section>
              )}
            </aside>
          </div>
        )}

        {/* portal: a tela anima com transform/filter, o que prenderia o position:fixed ao conteúdo */}
        {isMaster && enc && createPortal(<TurnBar />, document.body)}
      </div>
    </Screen>
  );
}

/** Barra de turno do mestre (fixa embaixo, polegar alcança no celular). */
function TurnBar() {
  const s = useSessionStore();
  const enc = s.encounter!;
  const noInit = s.combatants.filter((c) => c.initiative === null).length;
  return (
    <div className="fv-live-turnbar" role="toolbar" aria-label="Controle de turnos">
      {enc.status === 'preparing' && (
        <>
          <span className="fv-live-turnbar-note">{s.combatants.length === 0 ? 'Adicione participantes' : noInit ? `${noInit} sem iniciativa (vão para o fim)` : 'Todos rolaram'}</span>
          <button type="button" className="fv-btn-gold fv-live-big" disabled={s.busy || s.combatants.length === 0} onClick={() => void s.startCombat()}>
            Iniciar combate
          </button>
        </>
      )}
      {enc.status === 'active' && (
        <>
          <button type="button" className="fv-btn-ghost" disabled={s.busy} onClick={() => void s.prevTurn()} aria-label="Turno anterior">◀</button>
          <button type="button" className="fv-btn-gold fv-live-big" disabled={s.busy} onClick={() => void s.nextTurn()}>
            Próximo<span className="fv-live-wide"> turno</span> ▶
          </button>
          <button type="button" className="fv-btn-ghost" disabled={s.busy} onClick={() => void s.setEncounterStatus('paused')}>Pausar</button>
          <button type="button" className="fv-btn-ghost is-danger" disabled={s.busy} onClick={() => window.confirm('Encerrar este encontro?') && void s.setEncounterStatus('finished')}>Encerrar</button>
        </>
      )}
      {enc.status === 'paused' && (
        <>
          <button type="button" className="fv-btn-gold fv-live-big" disabled={s.busy} onClick={() => void s.setEncounterStatus('active')}>Retomar combate</button>
          <button type="button" className="fv-btn-ghost is-danger" disabled={s.busy} onClick={() => window.confirm('Encerrar este encontro?') && void s.setEncounterStatus('finished')}>Encerrar</button>
        </>
      )}
    </div>
  );
}

/** Jogador: escolhe com qual herói está na mesa e rola a própria iniciativa. */
function PlayerCard({ heroes }: { heroes: SharedHero[] }) {
  const s = useSessionStore();
  const user = useAuthStore((u) => u.user)!;
  const characters = useCharacterStore((c) => c.characters);
  const { check } = useDiceRoller();
  const mine = useMemo(() => heroes.filter((h) => h.share.ownerId === user.id), [heroes, user.id]);
  const inEncounter = s.combatants.find((c) => c.ownerId === user.id) ?? null;
  const selectedId = inEncounter?.sheetId ?? s.me?.characterId ?? mine[0]?.share.sheetId ?? null;
  const local = characters.find((c) => c.id === selectedId) ?? null;
  const derived = useMemo(() => (local ? deriveCharacter(local) : null), [local]);

  // presença mostra com qual herói estou
  const selectedName = local?.name ?? mine.find((h) => h.share.sheetId === selectedId)?.snapshot?.name ?? inEncounter?.name ?? null;
  useEffect(() => {
    if (s.me && s.me.characterId !== selectedId) s.setCharacter(selectedId, selectedName);
  }, [selectedId, selectedName]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mine.length) {
    return (
      <section className="fv-panel fv-live-card">
        <div className="fv-label">Seu herói</div>
        <p className="fv-live-hint">Vincule sua ficha na <Link to={`/mesa/${s.campaignId}`}>sala da mesa</Link> para o mestre poder colocá-la no combate.</p>
      </section>
    );
  }

  const needsRoll = inEncounter && inEncounter.initiative === null && s.encounter?.status !== 'finished';
  return (
    <section className={'fv-panel fv-live-card' + (needsRoll ? ' is-calling' : '')}>
      <div className="fv-label">Seu herói</div>
      {mine.length > 1 && !inEncounter && (
        <div className="fv-live-chips">
          {mine.map((h) => (
            <button key={h.share.id} type="button" className={'fv-live-chip' + (h.share.sheetId === selectedId ? ' is-on' : '')} onClick={() => s.setCharacter(h.share.sheetId, h.snapshot?.name ?? null)}>
              {h.snapshot?.name ?? 'Ficha'}
            </button>
          ))}
        </div>
      )}
      <div className="fv-live-hero">
        <b>{selectedName ?? 'Herói'}</b>
        {inEncounter ? (
          <small>{inEncounter.initiative === null ? 'No combate — role sua iniciativa!' : `Iniciativa ${inEncounter.initiative}`}</small>
        ) : (
          <small>{s.encounter ? 'Ainda fora deste encontro — o mestre adiciona.' : 'Aguardando combate.'}</small>
        )}
      </div>
      {needsRoll && (local && derived ? (
        // mesmo botão da ficha: vantagem de classe, recargas e envio automático para o encontro
        <InitiativeButton char={local} derived={derived} />
      ) : (
        <button
          type="button"
          className="fv-btn-gold"
          onClick={() => {
            const r = check('Iniciativa', inEncounter!.initiativeBonus);
            void s.setInitiative(inEncounter!.id, r.total);
          }}
        >
          Rolar iniciativa ({modStr(inEncounter!.initiativeBonus)})
        </button>
      ))}
      {local && <Link className="fv-live-link" to={`/ficha/${local.id}`}>Abrir ficha ›</Link>}
    </section>
  );
}
