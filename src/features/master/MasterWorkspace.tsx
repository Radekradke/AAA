import { useEffect, useMemo } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useStageStore } from '@/store/stageStore';
import { StageView } from '@/components/stage/StageView';
import { CutsceneOverlay } from '@/components/stage/CutsceneOverlay';
import type { SharedHero } from '@/components/session/MasterDeck';
import type { CampaignNpc, NpcSecret } from '@/types/npc';
import type { Campaign } from '@/types/models';
import { CONN, OnlineList } from '@/features/live/LiveHeader';
import { MONSTER_BY_ID } from '@/data/bestiary';
import { monsterCombatants } from '@/components/session/BestiaryPicker';
import { addToEncounter } from './actions';
import { MasterContext } from './context';
import type { MasterCtx } from './context';
import { useMasterStore } from './masterStore';
import { BackstageRail } from './backstage/BackstageRail';
import { ContextInspector } from './inspector/ContextInspector';
import { InitiativeDock } from './initiative/InitiativeDock';
import { MasterQuickBar } from './quick/MasterQuickBar';
import '@/styles/master.css';

interface Props {
  campaign: Campaign;
  userId: string;
  heroes: SharedHero[];
  npcs: CampaignNpc[];
  secrets: Record<string, NpcSecret>;
  reloadNpcs: () => void;
  loadError: string | null;
}

/**
 * CONSOLE DO MESTRE: Bastidores | PALCO | Inspetor, com a iniciativa e a
 * barra de improviso embaixo. O palco é o centro; nada aqui obriga ordem,
 * preparação ou roteiro — são ferramentas para reagir à mesa.
 * No celular/tablet, Bastidores e Inspetor viram gavetas.
 */
export function MasterWorkspace({ campaign, userId, heroes, npcs, secrets, reloadNpcs, loadError }: Props) {
  const s = useSessionStore();
  const m = useMasterStore();
  const stageError = useStageStore((st) => st.error);

  useEffect(() => m.bind(campaign.id), [campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // sessão ao vivo: a bandeja dela vem junto (a preparação não se perde ao começar)
  const liveId = s.session?.id ?? null;
  useEffect(() => {
    if (liveId) void m.loadTray(liveId);
  }, [liveId]); // eslint-disable-line react-hooks/exhaustive-deps

  // vez de uma criatura/NPC: o inspetor já mostra a ficha dela (se o mestre não estiver olhando outra coisa)
  const activeId = s.encounter?.status === 'active' ? s.encounter.activeCombatantId : null;
  useEffect(() => {
    if (!activeId) return;
    const c = useSessionStore.getState().combatants.find((x) => x.id === activeId);
    const sel = useMasterStore.getState().selection;
    // sem abrir gaveta no celular: só troca o que o inspetor mostra
    if (c && c.type !== 'player' && (!sel || sel.kind === 'combatant')) useMasterStore.setState({ selection: { kind: 'combatant', id: c.id } });
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // criatura do bestiário solta no mapa: entra no encontro (abre um, se preciso) e vira peão ali
  const dropMonster = async (ref: string, qty: number) => {
    const m = MONSTER_BY_ID[ref];
    if (!m) return [];
    const before = new Set(useSessionStore.getState().combatants.map((c) => c.id));
    await addToEncounter(monsterCombatants(m, qty, { hpMode: 'average', hidden: false, together: true }));
    return useSessionStore.getState().combatants.filter((c) => !before.has(c.id));
  };

  const ctx: MasterCtx = useMemo(() => ({ campaign, userId, heroes, npcs, secrets, reloadNpcs }), [campaign, userId, heroes, npcs, secrets, reloadNpcs]);
  const error = loadError ?? s.error ?? m.error ?? stageError;

  return (
    <MasterContext.Provider value={ctx}>
      <div className={'fv-mw' + (s.encounter ? ' has-dock' : '') + (m.drawer ? ` is-drawer-${m.drawer}` : '')}>
        <header className="fv-mw-head">
          <div className="fv-mw-title">
            <span className="fv-label">Console do mestre</span>
            <b>{campaign.name}</b>
          </div>
          <span className={`fv-live-conn is-${s.connection}`}>
            <i className={`fv-live-dot is-${s.connection}`} aria-hidden />
            {s.session ? `${s.session.name} · ${s.session.status === 'paused' ? 'pausada' : CONN[s.connection]}` : 'Sem sessão'}
          </span>
          {s.session && <OnlineList compact />}
        </header>

        {error && (
          <div className="fv-live-error fv-mw-error" role="alert">
            {error}
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => {
                s.clearError();
                m.clearError();
              }}
            >
              ×
            </button>
          </div>
        )}

        <aside className="fv-mw-left" aria-label="Bastidores">
          <DrawerClose />
          <BackstageRail />
        </aside>

        <main className="fv-mw-stage" aria-label="Palco">
          <StageView
            isMaster
            userId={userId}
            heroes={heroes}
            npcs={npcs}
            combatants={s.combatants}
            encounter={s.encounter}
            onOpenLibrary={() => {
              m.setPanel('cenas');
              m.setDrawer('backstage');
            }}
            // mexer no mapa não abre gaveta: o inspetor só acompanha (abre pelo botão ◧)
            onDropMonster={dropMonster}
            onSelectToken={(t) => t && useMasterStore.setState({ selection: { kind: 'token', id: t.id } })}
          />
        </main>

        <aside className="fv-mw-right" aria-label="Inspetor">
          <DrawerClose />
          <ContextInspector />
        </aside>

        <div className="fv-mw-bottom">
          <InitiativeDock />
          <MasterQuickBar />
        </div>

        {m.drawer && <button type="button" className="fv-mw-scrim" aria-label="Fechar gaveta" onClick={() => m.setDrawer(null)} />}
        <CutsceneOverlay isMaster />
      </div>
    </MasterContext.Provider>
  );
}

/** Só aparece quando a coluna vira gaveta (celular/tablet). */
function DrawerClose() {
  const setDrawer = useMasterStore((m) => m.setDrawer);
  return (
    <button type="button" className="fv-mw-close" onClick={() => setDrawer(null)}>
      Fechar ✕
    </button>
  );
}
