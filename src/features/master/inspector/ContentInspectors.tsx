import { useState } from 'react';
import { NpcAvatar } from '@/components/campaign/NpcGallery';
import { MonsterStatBlock } from '@/components/session/MonsterStatBlock';
import { monsterCombatants } from '@/components/session/BestiaryPicker';
import { MONSTER_BY_ID } from '@/data/bestiary';
import { useMonsterLook } from '@/services/bestiaryService';
import { MonsterPortrait } from '@/components/bestiary/MonsterPortrait';
import { MonsterDetailModal } from '@/components/bestiary/BestiaryGallery';
import { npcService } from '@/services/npcService';
import { stageService } from '@/services/stageService';
import { useMediaUrl } from '@/services/mediaService';
import { liveScene, useStageStore } from '@/store/stageStore';
import { useSessionStore } from '@/store/sessionStore';
import { useCharacterStore } from '@/store/characterStore';
import { toast } from '@/store/feedbackStore';
import { useMaster, heroName } from '../context';
import { useMasterStore } from '../masterStore';
import { addToEncounter, npcToCombatant } from '../actions';
import { TrayStar } from '../backstage/SessionPanel';
import { keepNpc } from '../backstage/NpcsPanel';
import { keepHandout, recipientsLabel } from '../backstage/HandoutsPanel';

/** Centro (em casas) da cena vista agora — onde um peão novo aparece. */
function sceneCenter(): { sceneId: string; x: number; y: number } | null {
  const st = useStageStore.getState();
  const sc = st.scenes.find((x) => x.id === st.viewSceneId) ?? liveScene(st);
  if (!sc || sc.kind !== 'map') return null;
  return { sceneId: sc.id, x: Math.max(0, Math.floor((sc.grid.cols ?? 20) / 2)), y: Math.max(0, Math.floor((sc.grid.rows ?? 14) / 2)) };
}

/** NPC: retrato, o que os jogadores sabem, segredos do mestre e atalhos. */
export function NpcInspector({ id }: { id: string }) {
  const { npcs, secrets, reloadNpcs, campaign } = useMaster();
  const characters = useCharacterStore((c) => c.characters);
  const addTokens = useStageStore((s) => s.addTokens);
  const n = npcs.find((x) => x.id === id);
  if (!n) return <p className="fv-bs-hint">Este NPC não existe mais.</p>;
  const sec = secrets[n.id];
  const toggleReveal = async () => {
    try {
      await npcService.save(campaign.id, { ...n, revealed: !n.revealed });
      reloadNpcs();
      toast(n.revealed ? `${n.name} ficou oculto da galeria dos jogadores.` : `${n.name} aparece para os jogadores.`, { tone: 'info' });
    } catch (e) {
      toast((e as Error).message, { tone: 'danger' });
    }
  };
  const toStage = () => {
    const at = sceneCenter();
    if (!at) return toast('Abra um mapa no palco para pôr o peão.', { tone: 'info' });
    void addTokens([{ sceneId: at.sceneId, kind: 'npc', label: n.name, sheetId: null, ownerId: null, npcId: n.id, combatantId: null, monsterRef: sec?.stats.monsterRef ?? null, color: null, imagePath: null, x: at.x, y: at.y, size: 1, hidden: !n.revealed }]);
    toast(`${n.name} no mapa.`);
  };
  return (
    <div className="fv-ins">
      <header className="fv-ins-head has-avatar">
        <NpcAvatar npc={n} size={56} />
        <div>
          <small>
            NPC{n.improvisedIn ? ' · improviso' : ''}
            {!n.revealed ? ' · oculto' : ''}
          </small>
          <h3>{n.name}</h3>
          {n.role && <p className="fv-ins-line">{n.role}</p>}
        </div>
        <TrayStar kind="npcs" id={n.id} label={n.name} />
      </header>
      {n.summary && <p className="fv-ins-text">{n.summary}</p>}
      {(sec?.notes || Object.keys(sec?.stats ?? {}).length > 0) && (
        <div className="fv-ins-secret">
          <small>🔒 Só o mestre</small>
          {sec?.notes && <p>{sec.notes}</p>}
          {sec?.stats && (
            <p>
              {sec.stats.ac !== undefined && `CA ${sec.stats.ac} · `}
              {sec.stats.hp !== undefined && `${sec.stats.hp} PV · `}
              {sec.stats.monsterRef && MONSTER_BY_ID[sec.stats.monsterRef] && `base: ${MONSTER_BY_ID[sec.stats.monsterRef].name}`}
            </p>
          )}
        </div>
      )}
      <div className="fv-ins-acts">
        <button type="button" className="fv-btn-gold fv-bs-mini" onClick={toStage}>
          Pôr no palco
        </button>
        <button type="button" className="fv-btn-ghost fv-bs-mini" onClick={() => void addToEncounter([npcToCombatant(n, secrets, characters)])}>
          Adicionar ao encontro
        </button>
        <button type="button" className="fv-btn-ghost fv-bs-mini" onClick={() => void toggleReveal()}>
          {n.revealed ? 'Ocultar dos jogadores' : 'Mostrar aos jogadores'}
        </button>
        {n.improvisedIn && (
          <button type="button" className="fv-btn-ghost fv-bs-mini" onClick={() => void keepNpc(n.id, n.name, reloadNpcs)}>
            Guardar na campanha
          </button>
        )}
      </div>
    </div>
  );
}

/** Pista: conteúdo, para quem, mostrar ou recolher. */
export function HandoutInspector({ id }: { id: string }) {
  const { heroes } = useMaster();
  const h = useStageStore((s) => s.handouts.find((x) => x.id === id));
  const show = useStageStore((s) => s.showHandout);
  const refresh = useStageStore((s) => s.refresh);
  const img = useMediaUrl(h?.imagePath);
  const owners = [...new Map(heroes.map((x) => [x.share.ownerId, x])).values()];
  const [to, setTo] = useState<string[] | null>(h?.recipients ?? null);
  if (!h) return <p className="fv-bs-hint">Esta pista não existe mais.</p>;
  const toggle = (uid: string) => setTo((cur) => (cur === null ? [uid] : cur.includes(uid) ? (cur.length > 1 ? cur.filter((x) => x !== uid) : null) : [...cur, uid]));
  return (
    <div className="fv-ins">
      <header className="fv-ins-head">
        <small>
          Pista{h.improvisedIn ? ' · improviso' : ''} · {h.shownAt ? `entregue a ${recipientsLabel(h.recipients, heroes)}` : 'na gaveta'}
        </small>
        <h3>{h.title}</h3>
        <TrayStar kind="handouts" id={h.id} label={h.title} />
      </header>
      {img.url && <img className="fv-ins-img" src={img.url} alt="" />}
      {h.body && <p className="fv-ins-text">{h.body}</p>}
      <div className="fv-ins-recips" role="group" aria-label="Para quem">
        <button type="button" className={to === null ? 'is-on' : ''} onClick={() => setTo(null)}>
          Todos
        </button>
        {owners.map((o) => (
          <button key={o.share.ownerId} type="button" className={to?.includes(o.share.ownerId) ? 'is-on' : ''} onClick={() => toggle(o.share.ownerId)}>
            {heroName(o)}
          </button>
        ))}
      </div>
      <div className="fv-ins-acts">
        <button type="button" className="fv-btn-gold fv-bs-mini" onClick={() => void show(h.id, to).then(() => toast(`"${h.title}" entregue.`))}>
          {h.shownAt ? 'Entregar de novo' : 'Mostrar agora'}
        </button>
        {h.shownAt && (
          <button
            type="button"
            className="fv-btn-ghost fv-bs-mini"
            onClick={() =>
              void stageService
                .hideHandout(h.id)
                .then(refresh)
                .then(() => toast(`"${h.title}" voltou para a gaveta.`, { tone: 'info' }))
            }
          >
            Recolher
          </button>
        )}
        {h.improvisedIn && (
          <button type="button" className="fv-btn-ghost fv-bs-mini" onClick={() => void keepHandout(h.id, h.title, refresh)}>
            Guardar na campanha
          </button>
        )}
      </div>
    </div>
  );
}

/** Cena: ver no seu palco, pôr no ar ou tirar. */
export function SceneInspector({ id }: { id: string }) {
  const sc = useStageStore((s) => s.scenes.find((x) => x.id === id));
  const live = useStageStore((s) => liveScene(s));
  const viewScene = useStageStore((s) => s.viewScene);
  const goLive = useStageStore((s) => s.goLive);
  if (!sc) return <p className="fv-bs-hint">Esta cena não existe mais.</p>;
  const isLive = live?.id === sc.id;
  return (
    <div className="fv-ins">
      <header className="fv-ins-head">
        <small>{sc.kind === 'map' ? 'Mapa tático' : sc.kind === 'image' ? 'Ambiente' : 'Cutscene'}{isLive ? ' · no ar' : ''}</small>
        <h3>{sc.name}</h3>
        <TrayStar kind="scenes" id={sc.id} label={sc.name} />
      </header>
      <div className="fv-ins-acts">
        <button type="button" className="fv-btn-ghost fv-bs-mini" onClick={() => viewScene(sc.id)}>
          Ver no meu palco
        </button>
        <button type="button" className={'fv-bs-mini ' + (isLive ? 'fv-btn-ghost' : 'fv-btn-gold')} onClick={() => void goLive(isLive ? null : sc.id)}>
          {isLive ? 'Tirar do ar' : 'Pôr no ar para todos'}
        </button>
      </div>
    </div>
  );
}

/** Ficha do bestiário (fora do encontro): estatísticas e "pôr N no encontro". */
export function MonsterInspector({ monsterRef }: { monsterRef: string }) {
  const busy = useSessionStore((s) => s.busy);
  const [qty, setQty] = useState(1);
  const [hidden, setHidden] = useState(false);
  const look = useMonsterLook(monsterRef);
  const campaignId = useSessionStore((s) => s.campaignId);
  const [detail, setDetail] = useState(false);
  const m = MONSTER_BY_ID[monsterRef];
  if (!m || !look) return <p className="fv-bs-hint">Criatura desconhecida.</p>;
  return (
    <div className="fv-ins">
      <header className="fv-ins-head fv-ins-head-face">
        <button type="button" className="fv-ins-face" onClick={() => setDetail(true)} title="Ver e personalizar">
          <MonsterPortrait look={look} size={64} />
        </button>
        <div>
          <small>Bestiário · ND {m.cr}</small>
          <h3>{look.name}</h3>
          <button type="button" className="fv-ins-link" onClick={() => setDetail(true)}>Personalizar foto e nome</button>
        </div>
        <TrayStar kind="monsters" id={m.id} label={look.name} />
      </header>
      {detail && <MonsterDetailModal m={m} campaignId={campaignId} onClose={() => setDetail(false)} />}
      <div className="fv-ins-acts">
        <label className="fv-bs-qty">
          ×
          <input className="fv-input" type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} aria-label="Quantidade" />
        </label>
        <label className="fv-ins-check">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Oculto
        </label>
        <button type="button" className="fv-btn-gold fv-bs-mini" disabled={busy} onClick={() => void addToEncounter(monsterCombatants(m, qty, { hpMode: 'average', hidden, together: true }))}>
          Pôr no encontro
        </button>
      </div>
      <MonsterStatBlock m={m} who={look.name} />
    </div>
  );
}

/** Peão de marcação (sem herói, NPC ou criatura ligada). */
export function MarkerInspector({ id }: { id: string }) {
  const t = useStageStore((s) => s.tokens.find((x) => x.id === id));
  const update = useStageStore((s) => s.updateTokens);
  const remove = useStageStore((s) => s.removeToken);
  const select = useMasterStore((m) => m.select);
  if (!t) return <p className="fv-bs-hint">Este peão não está mais no mapa.</p>;
  return (
    <div className="fv-ins">
      <header className="fv-ins-head">
        <small>Peão{t.hidden ? ' · oculto' : ''}</small>
        <h3>{t.label || 'Marcador'}</h3>
      </header>
      <div className="fv-ins-acts">
        <button type="button" className="fv-btn-ghost fv-bs-mini" onClick={() => void update([t.id], { hidden: !t.hidden })}>
          {t.hidden ? 'Mostrar' : 'Ocultar'}
        </button>
        <button
          type="button"
          className="fv-btn-ghost fv-bs-mini is-danger"
          onClick={() => {
            void remove(t.id);
            select(null);
          }}
        >
          Tirar do mapa
        </button>
      </div>
    </div>
  );
}
