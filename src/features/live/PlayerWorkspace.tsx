import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { InitiativeTrack } from '@/components/session/InitiativeTrack';
import type { SharedHero } from '@/components/session/MasterDeck';
import { EventFeed } from '@/components/session/EventFeed';
import { InitiativeButton } from '@/components/sheet/InitiativeButton';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { myActiveCombatant, useSessionStore } from '@/store/sessionStore';
import { deriveCharacter } from '@/engine/dndRules';
import { modStr } from '@/engine/dice';
import { StageView } from '@/components/stage/StageView';
import { HandoutInbox, IncomingHandout } from '@/components/stage/Handouts';
import { CutsceneOverlay } from '@/components/stage/CutsceneOverlay';
import { liveScene, useStageStore } from '@/store/stageStore';
import type { CampaignNpc } from '@/types/npc';
import type { Campaign } from '@/types/models';
import { LiveHeader } from './LiveHeader';

/**
 * Mesa do JOGADOR (a mesma de antes do console do mestre): o palco em
 * primeiro plano; herói, iniciativa, pistas e crônica embaixo.
 */
export function PlayerWorkspace({ campaign, heroes, npcs, loadError }: { campaign: Campaign | null; heroes: SharedHero[]; npcs: CampaignNpc[]; loadError: string | null }) {
  const s = useSessionStore();
  const user = useAuthStore((u) => u.user)!;
  const stageLive = useStageStore((st) => liveScene(st));
  const stageMissing = useStageStore((st) => st.missing);
  const enc = s.encounter;
  const active = enc?.activeCombatantId ? s.combatants.find((c) => c.id === enc.activeCombatantId) : null;
  const mineNow = myActiveCombatant(s);

  return (
    <div className="fv-live">
      <LiveHeader campaignName={campaign?.name ?? null} />

      {(loadError || s.error) && (
        <div className="fv-live-error" role="alert">
          {loadError ?? s.error}
          {s.error && (
            <button type="button" onClick={s.clearError} aria-label="Fechar">
              ×
            </button>
          )}
        </div>
      )}

      {campaign && (
        <>
          {!s.session && !s.loading && !stageLive && (
            <section className="fv-panel fv-live-card fv-live-center">
              <div className="fv-live-wait" aria-hidden />
              <div className="fv-label">Aguardando o mestre</div>
              <p className="fv-live-hint">Quando o mestre abrir a sessão ou mostrar uma cena, esta tela muda sozinha.</p>
            </section>
          )}
          {(stageLive || s.session || stageMissing) && (
            <StageView isMaster={false} userId={user.id} heroes={heroes} npcs={npcs} combatants={s.combatants} encounter={enc} />
          )}
          {s.session && (
            <div className="fv-live-grid">
              <div className="fv-live-main">
                <section className="fv-panel fv-live-board">
                  {enc ? (
                    <>
                      <div className="fv-live-round">
                        <div className="fv-live-medal" aria-label={`Rodada ${enc.round}`}>
                          <small>Rodada</small>
                          <b key={enc.round}>{enc.round || '—'}</b>
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
                      <InitiativeTrack encounter={enc} combatants={s.combatants} isMaster={false} userId={user.id} />
                    </>
                  ) : (
                    <div className="fv-live-empty">Sem combate agora — a sessão está aberta.</div>
                  )}
                </section>
              </div>
              <aside className="fv-live-side">
                <PlayerCard heroes={heroes} />
                <HandoutInbox />
                <EventFeed events={s.events} />
              </aside>
            </div>
          )}
          {!s.session && <HandoutInbox />}
          <IncomingHandout />
          <CutsceneOverlay isMaster={false} />
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
      <section className="fv-panel fv-live-card fv-live-me">
        <div className="fv-label">Seu herói</div>
        <p className="fv-live-hint">
          Vincule sua ficha na <Link to={`/mesa/${s.campaignId}`}>sala da mesa</Link> para o mestre poder colocá-la no combate.
        </p>
      </section>
    );
  }

  const needsRoll = inEncounter && inEncounter.initiative === null && s.encounter?.status !== 'finished';
  return (
    <section className={'fv-panel fv-live-card fv-live-me' + (needsRoll ? ' is-calling' : '')}>
      <div className="fv-label">Seu herói</div>
      {mine.length > 1 && !inEncounter && (
        <div className="fv-live-chips">
          {mine.map((h) => (
            <button
              key={h.share.id}
              type="button"
              className={'fv-live-chip' + (h.share.sheetId === selectedId ? ' is-on' : '')}
              onClick={() => s.setCharacter(h.share.sheetId, h.snapshot?.name ?? null)}
            >
              {h.snapshot?.name ?? 'Ficha'}
            </button>
          ))}
        </div>
      )}
      <div className="fv-live-hero">
        <b>{selectedName ?? 'Herói'}</b>
        {local && derived && <HeroVitals hp={local.hpCurrent} max={derived.maxHp} temp={local.combat.hpTemp} ac={derived.ac} />}
        {inEncounter ? (
          <small>{inEncounter.initiative === null ? 'No combate — role sua iniciativa!' : `Iniciativa ${inEncounter.initiative}`}</small>
        ) : (
          <small>{s.encounter ? 'Ainda fora deste encontro — o mestre adiciona.' : 'Aguardando combate.'}</small>
        )}
      </div>
      {needsRoll &&
        (local && derived ? (
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
      {local && (
        <Link className="fv-live-openhero" to={`/ficha/${local.id}`}>
          Abrir ficha ›
        </Link>
      )}
    </section>
  );
}

/** PV e CA do herói, à vista na mesa (no celular, sem precisar abrir a ficha). */
function HeroVitals({ hp, max, temp, ac }: { hp: number; max: number; temp: number; ac: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((hp / Math.max(1, max)) * 100)));
  const tone = hp <= 0 ? 'is-down' : pct <= 25 ? 'is-low' : pct <= 50 ? 'is-hurt' : '';
  return (
    <div className="fv-live-vitals">
      <span className={'fv-live-hp ' + tone} role="meter" aria-label="Pontos de vida" aria-valuemin={0} aria-valuemax={max} aria-valuenow={hp} aria-valuetext={`${hp} de ${max} PV${temp > 0 ? `, mais ${temp} temporários` : ''}`}>
        <span className="fv-live-hp-num">
          <b>{hp}</b>/{max} PV{temp > 0 && <em> +{temp}</em>}
        </span>
        <span className="fv-live-hp-bar" aria-hidden>
          <i style={{ width: `${pct}%` }} />
        </span>
      </span>
      <span className="fv-live-ac">
        CA <b>{ac}</b>
      </span>
    </div>
  );
}
