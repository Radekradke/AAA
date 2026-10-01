import { useEffect, useMemo, useState } from 'react';
import { confirmAction } from '@/store/feedbackStore';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { InitiativeTrack } from '@/components/session/InitiativeTrack';
import { MasterDeck } from '@/components/session/MasterDeck';
import type { SharedHero } from '@/components/session/MasterDeck';
import { EventFeed } from '@/components/session/EventFeed';
import { MonsterStatBlock } from '@/components/session/MonsterStatBlock';
import { MONSTER_BY_ID } from '@/data/bestiary';
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
import { StageView } from '@/components/stage/StageView';
import { SceneLibrary } from '@/components/stage/SceneLibrary';
import { HandoutDesk, HandoutInbox, IncomingHandout } from '@/components/stage/Handouts';
import { CutsceneOverlay } from '@/components/stage/CutsceneOverlay';
import { useCampaignNpcs } from '@/components/campaign/NpcGallery';
import { liveScene, useStageStore } from '@/store/stageStore';
import type { Campaign } from '@/types/models';
import type { ConnectionState } from '@/types/session';

const CONN: Record<ConnectionState, string> = {
  idle: 'Fora da sessão',
  connecting: 'Conectando…',
  connected: 'Ao vivo',
  reconnecting: 'Reconectando…',
  offline: 'Sem conexão',
};

type MasterTab = 'palco' | 'encontro' | 'cenas' | 'handouts';
const MASTER_TABS: [MasterTab, string][] = [['palco', 'Palco'], ['encontro', 'Encontro'], ['cenas', 'Cenas'], ['handouts', 'Handouts']];
const TAB_KEY = 'fv-live-tab';
function savedTab(): MasterTab {
  try {
    const v = localStorage.getItem(TAB_KEY);
    if (MASTER_TABS.some(([t]) => t === v)) return v as MasterTab;
  } catch {
    /* ignora */
  }
  return 'palco';
}

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
  const [tab, setTab] = useState<MasterTab>(() => savedTab());
  const pickTab = (t: MasterTab) => {
    setTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* ignora */
    }
  };
  const { npcs } = useCampaignNpcs(campaign?.id, isMaster);
  const stageLive = useStageStore((st) => liveScene(st));
  const stageMissing = useStageStore((st) => st.missing);

  // nome no ping do jogador acompanha o herói escolhido
  const myHeroName = s.me?.characterName ?? null;
  useEffect(() => {
    if (campaign && user && !isMaster) useStageStore.setState({ who: myHeroName ?? user.name });
  }, [myHeroName, campaign, user, isMaster]);

  // entra na mesa (idempotente: voltar da ficha não reconecta)
  useEffect(() => {
    if (!id || !user || !canPlay) return;
    let alive = true;
    campaignService.getCampaign(id).then((c) => {
      if (!alive) return;
      if (!c) return setLoadError('Mesa não encontrada — você faz parte dela?');
      setCampaign(c);
      const cur = useSessionStore.getState().me;
      useStageStore.getState().open(c.id, {
        isMaster: c.masterId === user.id,
        userId: user.id,
        who: c.masterId === user.id ? 'Mestre' : cur?.characterName ?? user.name,
      });
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
              {s.session && (
                <span className="fv-live-vis" title="Quem vê as suas rolagens (ficha, mesa, monstros)">
                  Rolagens:
                  <span className="fv-live-seg" role="group" aria-label="Visibilidade das rolagens">
                    {([['public', 'Todos'], ['master', isMaster ? 'Só eu (mestre)' : 'Só o mestre'], ['private', 'Não enviar']] as const).map(([v, label]) => (
                      <button key={v} type="button" className={s.rollVisibility === v ? 'is-on' : ''} onClick={() => s.setRollVisibility(v)}>{label}</button>
                    ))}
                  </span>
                </span>
              )}
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

        {(() => {
          if (!campaign) return null;
          const startCard = !s.session && !s.loading && (
            isMaster ? (
              <section className="fv-panel fv-live-card fv-live-center">
                <div className="fv-label">Nenhuma sessão aberta</div>
                <p className="fv-live-hint">Ao abrir a sessão, os jogadores entram, rolam iniciativa e as rolagens aparecem para a mesa. Cenas e handouts funcionam mesmo antes.</p>
                <div className="fv-live-inline">
                  <input className="fv-input" placeholder="Nome da sessão (opcional)" value={sessName} onChange={(e) => setSessName(e.target.value)} maxLength={60} />
                  <button type="button" className="fv-btn-gold fv-live-big" disabled={s.busy} onClick={() => void s.startSession(sessName || undefined)}>
                    Iniciar sessão
                  </button>
                </div>
              </section>
            ) : (
              !stageLive && (
                <section className="fv-panel fv-live-card fv-live-center">
                  <div className="fv-live-wait" aria-hidden />
                  <div className="fv-label">Aguardando o mestre</div>
                  <p className="fv-live-hint">Quando o mestre abrir a sessão ou mostrar uma cena, esta tela muda sozinha.</p>
                </section>
              )
            )
          );

          const board = s.session && (
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
                <div className="fv-live-empty">{isMaster ? 'Sem combate agora. Prepare um encontro na aba Encontro.' : 'Sem combate agora — a sessão está aberta.'}</div>
              )}
            </section>
          );

          // vez de um monstro do bestiário: a ficha dele fica à mão do mestre
          const turnCard = isMaster && active?.monsterRef && MONSTER_BY_ID[active.monsterRef] && (
            <section className="fv-panel fv-live-card fv-live-turncard">
              <div className="fv-label">Vez de {active.name}</div>
              <MonsterStatBlock m={MONSTER_BY_ID[active.monsterRef]} who={active.name} attacker={active} targets={s.combatants} />
            </section>
          );

          const stage = (
            <StageView
              isMaster={isMaster}
              userId={user!.id}
              heroes={heroes}
              npcs={npcs}
              combatants={s.combatants}
              encounter={enc}
              onOpenLibrary={() => pickTab('cenas')}
            />
          );

          if (!isMaster) {
            // JOGADOR: o palco em primeiro plano; herói, pistas e mesa embaixo
            return (
              <>
                {startCard}
                {(stageLive || s.session || stageMissing) && stage}
                {s.session && (
                  <div className="fv-live-grid">
                    <div className="fv-live-main">{board}</div>
                    <aside className="fv-live-side">
                      <PlayerCard heroes={heroes} />
                      <HandoutInbox />
                      <EventFeed events={s.events} targets={isMaster ? s.combatants : undefined} onApply={isMaster ? (c, n) => void s.changeHp(c, -n) : undefined} />
                    </aside>
                  </div>
                )}
                {!s.session && <HandoutInbox />}
                <IncomingHandout />
                <CutsceneOverlay isMaster={false} />
              </>
            );
          }

          // MESTRE: cabine com abas
          return (
            <>
              <nav className="fv-live-tabs" role="tablist" aria-label="Cabine do mestre">
                {MASTER_TABS.map(([t, label]) => (
                  <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-on' : ''} onClick={() => pickTab(t)}>
                    {label}
                    {t === 'palco' && stageLive && <i className="fv-live-tabs-dot" aria-label="cena no ar" />}
                    {t === 'encontro' && enc?.status === 'active' && <i className="fv-live-tabs-dot is-combat" aria-label="combate rolando" />}
                  </button>
                ))}
              </nav>

              {tab === 'palco' && (
                <div className="fv-live-grid is-stage">
                  <div className="fv-live-main">{stage}</div>
                  <aside className="fv-live-side">
                    {turnCard}
                    {board ?? startCard}
                    {s.session && <EventFeed events={s.events} targets={isMaster ? s.combatants : undefined} onApply={isMaster ? (c, n) => void s.changeHp(c, -n) : undefined} />}
                  </aside>
                </div>
              )}

              {tab === 'encontro' && (
                <>
                  {startCard}
                  {s.session && (
                    <div className="fv-live-grid">
                      <div className="fv-live-main">{board}</div>
                      <aside className="fv-live-side">
                        {turnCard}
                        <MasterDeck heroes={heroes} />
                        <EventFeed events={s.events} targets={isMaster ? s.combatants : undefined} onApply={isMaster ? (c, n) => void s.changeHp(c, -n) : undefined} />
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
                            onClick={async () => (await confirmAction({ title: 'Encerrar a sessão para todos?', message: 'O encontro aberto também termina.', confirmLabel: 'Encerrar', danger: true })) && void s.setSessionStatus('finished')}
                          >
                            Encerrar sessão
                          </button>
                        </section>
                      </aside>
                    </div>
                  )}
                </>
              )}

              {tab === 'cenas' && <SceneLibrary campaignId={campaign.id} onShow={() => pickTab('palco')} />}
              {tab === 'handouts' && <HandoutDesk campaignId={campaign.id} heroes={heroes} />}
              <CutsceneOverlay isMaster />
            </>
          );
        })()}

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
          <button type="button" className="fv-btn-ghost is-danger" disabled={s.busy} onClick={async () => (await confirmAction({ title: 'Encerrar este encontro?', confirmLabel: 'Encerrar', danger: true })) && void s.setEncounterStatus('finished')}>Encerrar</button>
        </>
      )}
      {enc.status === 'paused' && (
        <>
          <button type="button" className="fv-btn-gold fv-live-big" disabled={s.busy} onClick={() => void s.setEncounterStatus('active')}>Retomar combate</button>
          <button type="button" className="fv-btn-ghost is-danger" disabled={s.busy} onClick={async () => (await confirmAction({ title: 'Encerrar este encontro?', confirmLabel: 'Encerrar', danger: true })) && void s.setEncounterStatus('finished')}>Encerrar</button>
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
