import { useMemo, useState } from 'react';
import { StageMap } from './StageMap';
import type { TokenFace } from './StageMap';
import { mediaService, useMediaUrl, useMediaUrls } from '@/services/mediaService';
import { liveScene, useStageStore } from '@/store/stageStore';
import { useCharacterStore } from '@/store/characterStore';
import { deriveCharacter } from '@/engine/dndRules';
import { heroAvatar, heroFace } from '@/lib/summary';
import { MONSTER_BY_ID } from '@/data/bestiary';
import type { SharedHero } from '@/components/session/MasterDeck';
import type { CampaignNpc } from '@/types/npc';
import type { Combatant, Encounter } from '@/types/session';
import type { NewToken } from '@/services/stageService';
import type { Scene, Token } from '@/types/stage';

interface StageViewProps {
  isMaster: boolean;
  userId: string;
  heroes: SharedHero[];
  npcs: CampaignNpc[];
  combatants: Combatant[];
  encounter: Encounter | null;
  /** Mestre: abre a aba de cenas. */
  onOpenLibrary?: () => void;
}

const KIND_LABEL: Record<Scene['kind'], string> = { map: 'Mapa tático', image: 'Ambiente', cutscene: 'Cutscene' };

/**
 * O PALCO: o que a mesa está vendo. Jogador vê a cena no ar; o mestre vê
 * a cena que escolher (pode preparar uma sem mostrar) e tem as ferramentas.
 */
export function StageView({ isMaster, userId, heroes, npcs, combatants, encounter, onOpenLibrary }: StageViewProps) {
  const st = useStageStore();
  const live = liveScene(st);
  const scene = isMaster ? st.scenes.find((s) => s.id === st.viewSceneId) ?? live : live;
  const isLive = !!scene && scene.id === live?.id;
  const [selected, setSelected] = useState<string | null>(null);
  const ctx = useTokenContext({ heroes, npcs, combatants, encounter, isMaster, tokens: st.tokens });

  if (st.missing) {
    return (
      <section className="fv-panel fv-stage fv-stage-empty">
        <div className="fv-label">Palco</div>
        <p className="fv-live-hint">
          {isMaster
            ? 'O banco ainda não tem o palco (mapas, cenas e handouts). No Supabase: SQL Editor → aba nova → cole supabase/palco.sql → Run. Depois recarregue esta página.'
            : 'O mestre ainda precisa atualizar o banco da mesa para usar mapas e cenas.'}
        </p>
      </section>
    );
  }

  return (
    <section className={'fv-panel fv-stage' + (scene ? ` is-${scene.kind}` : ' fv-stage-empty')}>
      <header className="fv-stage-head">
        <div className="fv-stage-title">
          {scene ? (
            <>
              <span className={'fv-stage-badge' + (isLive ? ' is-live' : '')}>{isLive ? 'No ar' : 'Só você vê'}</span>
              <b>{scene.name}</b>
              <small>{KIND_LABEL[scene.kind]}</small>
            </>
          ) : (
            <b>{isMaster ? 'Nada no ar' : 'Palco'}</b>
          )}
        </div>
        {isMaster && (
          <div className="fv-stage-actions">
            {st.scenes.length > 0 && (
              <select className="fv-input" value={scene?.id ?? ''} onChange={(e) => st.viewScene(e.target.value || null)} aria-label="Cena no seu palco">
                {!scene && <option value="">Escolha uma cena…</option>}
                {st.scenes.map((s) => (
                  <option key={s.id} value={s.id} style={{ color: '#111' }}>
                    {s.id === live?.id ? '● ' : ''}{s.name} · {KIND_LABEL[s.kind]}
                  </option>
                ))}
              </select>
            )}
            {scene && !isLive && (
              <button type="button" className="fv-btn-gold" disabled={st.busy} onClick={() => void st.goLive(scene.id)}>Pôr no ar</button>
            )}
            {live && (
              <button type="button" className="fv-btn-ghost" disabled={st.busy} onClick={() => void st.goLive(null)}>Tirar do ar</button>
            )}
          </div>
        )}
      </header>

      {st.error && (
        <div className="fv-live-error" role="alert">
          {st.error}
          <button type="button" onClick={st.clearError} aria-label="Fechar">×</button>
        </div>
      )}

      {!scene && (
        <div className="fv-stage-idle">
          {isMaster ? (
            <>
              <p>Prepare mapas, ambientes e cutscenes em <b>Cenas</b> e ponha no ar quando a história pedir — a tela de todos muda junto.</p>
              {onOpenLibrary && <button type="button" className="fv-btn-gold" onClick={onOpenLibrary}>Abrir cenas</button>}
            </>
          ) : (
            <p>Quando o mestre mostrar um mapa ou uma cena, ela aparece aqui.</p>
          )}
        </div>
      )}

      {scene?.kind === 'map' && (
        <>
          {isMaster && selected && <TokenBar token={st.tokens.find((t) => t.id === selected) ?? null} onClose={() => setSelected(null)} />}
          <StageMap
            scene={scene}
            tokens={st.tokens}
            isMaster={isMaster}
            canMove={(t) => isMaster || (t.ownerId === userId && !t.hidden)}
            faceFor={ctx.faceFor}
            speedFor={ctx.speedFor}
            hpFor={isMaster ? ctx.hpFor : undefined}
            activeIds={ctx.activeIds(st.tokens)}
            drags={st.drags}
            pings={st.pings}
            selectedId={isMaster ? selected : null}
            onSelect={isMaster ? setSelected : undefined}
            onMove={(id, x, y) => void st.moveToken(id, x, y)}
            onDrag={st.dragPreview}
            onPing={st.ping}
          />
          {isMaster && <TokenTray scene={scene} tokens={st.tokens} heroes={heroes} npcs={npcs} combatants={combatants} />}
        </>
      )}

      {scene?.kind === 'image' && <StageImage scene={scene} />}

      {scene?.kind === 'cutscene' && (
        <div className="fv-stage-cut">
          <CutsceneThumb scene={scene} beat={isLive ? st.stage?.beat ?? 0 : 0} />
          <div>
            <b>{isLive ? `Quadro ${Math.min((st.stage?.beat ?? 0) + 1, scene.beats.length)} de ${scene.beats.length}` : `${scene.beats.length} quadro(s)`}</b>
            <p className="fv-live-hint">{isLive ? 'A cutscene está passando na tela de todos.' : 'Ponha no ar para passar na tela de todos.'}</p>
            {isLive && (
              <button type="button" className="fv-btn-gold" onClick={() => st.dismissCutscene(null)}>
                {isMaster ? 'Abrir controles da cutscene' : 'Assistir'}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function StageImage({ scene }: { scene: Scene }) {
  const { url, error } = useMediaUrl(scene.imagePath);
  return (
    <figure className="fv-stage-image">
      {url ? <img src={url} alt={scene.name} /> : <div className="fv-map-loading">{error ?? (scene.imagePath ? 'Carregando…' : 'Cena sem imagem')}</div>}
      <figcaption>{scene.name}</figcaption>
    </figure>
  );
}

function CutsceneThumb({ scene, beat }: { scene: Scene; beat: number }) {
  const b = scene.beats[Math.min(beat, scene.beats.length - 1)];
  const { url } = useMediaUrl(b?.path ?? null);
  return <div className="fv-stage-cut-thumb" style={url ? { backgroundImage: `url("${url}")` } : undefined} aria-hidden />;
}

/** Mestre: peão selecionado — tamanho, esconder, tirar do mapa. */
function TokenBar({ token, onClose }: { token: Token | null; onClose: () => void }) {
  const st = useStageStore();
  const [busy, setBusy] = useState(false);
  if (!token) return null;
  const sizes = [0.5, 1, 2, 3, 4];
  // mesmo monstro (ou mesmo nome sem o "#2"): o retrato vale para todos
  const key = artKey(token.monsterRef, token.label);
  const same = st.tokens.filter((t) => t.kind === token.kind && artKey(t.monsterRef, t.label) === key);
  const setArt = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const { path } = await mediaService.upload(token.campaignId, file, 360);
      rememberArt(token.campaignId, key, path);
      await st.updateTokens(same.map((t) => t.id), { imagePath: path });
    } catch (e) {
      useStageStore.setState({ error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fv-tokenbar" role="toolbar" aria-label={`Peão ${token.label}`}>
      <b>{token.label || 'Peão'}</b>
      <span className="fv-live-seg" role="group" aria-label="Tamanho">
        {sizes.map((n) => (
          <button key={n} type="button" className={token.size === n ? 'is-on' : ''} onClick={() => void st.updateToken(token.id, { size: n })} title={SIZE_NAME[n]}>
            {n === 0.5 ? '½' : n}
          </button>
        ))}
      </span>
      <label className="fv-btn-ghost fv-tokenbar-art" title={same.length > 1 ? `Vale para os ${same.length} peões iguais` : 'Retrato do peão'}>
        <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy} onChange={(e) => { void setArt(e.target.files?.[0]); e.target.value = ''; }} />
        {busy ? 'Enviando…' : token.imagePath ? 'Trocar retrato' : same.length > 1 ? `Retrato (${same.length})` : 'Retrato'}
      </label>
      {token.imagePath && (
        <button type="button" className="fv-btn-ghost" onClick={() => { forgetArt(token.campaignId, key); void st.updateTokens(same.map((t) => t.id), { imagePath: null }); }}>
          Sem retrato
        </button>
      )}
      <button type="button" className="fv-btn-ghost" onClick={() => void st.updateToken(token.id, { hidden: !token.hidden })}>
        {token.hidden ? 'Revelar' : 'Esconder'}
      </button>
      <button type="button" className="fv-btn-ghost is-danger" onClick={() => { void st.removeToken(token.id); onClose(); }}>Tirar</button>
      <button type="button" className="fv-tokenbar-x" onClick={onClose} aria-label="Fechar">×</button>
    </div>
  );
}

/** Chave do retrato: o monstro do bestiário ou o nome sem numeração ("Goblin #2" → "goblin"). */
function artKey(monsterRef: string | null, label: string): string {
  return monsterRef ? `m:${monsterRef}` : `n:${label.replace(/\s*#?\d+$/, '').trim().toLowerCase()}`;
}
const artStore = (cid: string) => `fv-token-art-${cid}`;
/** Retratos que o mestre já escolheu nesta mesa (próximos Goblins já entram com rosto). */
function tokenArt(cid: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(artStore(cid)) ?? '{}');
  } catch {
    return {};
  }
}
function rememberArt(cid: string, key: string, path: string) {
  try {
    localStorage.setItem(artStore(cid), JSON.stringify({ ...tokenArt(cid), [key]: path }));
  } catch {
    /* ignora */
  }
}
function forgetArt(cid: string, key: string) {
  const all = tokenArt(cid);
  delete all[key];
  try {
    localStorage.setItem(artStore(cid), JSON.stringify(all));
  } catch {
    /* ignora */
  }
}

const SIZE_NAME: Record<number, string> = { 0.5: 'Miúdo', 1: 'Pequeno/Médio', 2: 'Grande', 3: 'Enorme', 4: 'Imenso' };
const SIZE_FROM_TEXT: Record<string, number> = { Miúdo: 0.5, Pequeno: 1, Médio: 1, Grande: 2, Enorme: 3, Imenso: 4 };
const MARKER_COLORS = ['#f5c542', '#ff5a5f', '#5cc8ff', '#7dff9b', '#c49bff'];

/** Mestre: põe no mapa heróis, NPCs, o encontro atual ou um marcador. */
function TokenTray({ scene, tokens, heroes, npcs, combatants }: { scene: Scene; tokens: Token[]; heroes: SharedHero[]; npcs: CampaignNpc[]; combatants: Combatant[] }) {
  const st = useStageStore();
  const [marker, setMarker] = useState('');
  const onMap = (pred: (t: Token) => boolean) => tokens.some(pred);

  // próximas casas livres a partir do canto (o mestre arrasta depois)
  const place = (list: Omit<NewToken, 'x' | 'y' | 'sceneId'>[]): NewToken[] => {
    const busy = new Set(tokens.map((t) => `${Math.round(t.x)},${Math.round(t.y)}`));
    const out: NewToken[] = [];
    let x = 1, y = 1;
    for (const item of list) {
      while (busy.has(`${x},${y}`)) {
        x += 1;
        if (x > 12) { x = 1; y += 1; }
      }
      busy.add(`${x},${y}`);
      out.push({ ...item, sceneId: scene.id, x, y });
    }
    return out;
  };

  const base = { sheetId: null, ownerId: null, npcId: null, combatantId: null, monsterRef: null, color: null, imagePath: null, size: 1, hidden: false } as const;
  const remembered = tokenArt(scene.campaignId);
  const heroesOff = heroes.filter((h) => !onMap((t) => t.sheetId === h.share.sheetId));
  const npcsOff = npcs.filter((n) => !onMap((t) => t.npcId === n.id));
  const combOff = combatants.filter((c) => !onMap((t) => t.combatantId === c.id || (!!c.sheetId && t.sheetId === c.sheetId)));

  const addEncounter = () =>
    void st.addTokens(place(combOff.map((c) => {
      const m = c.monsterRef ? MONSTER_BY_ID[c.monsterRef] : null;
      // NPC do encontro com o mesmo nome de um NPC da galeria → usa o retrato dele
      const npc = c.type === 'npc' ? npcs.find((n) => n.name.trim().toLowerCase() === c.name.trim().toLowerCase()) : undefined;
      return {
        ...base,
        kind: c.type === 'player' ? 'hero' : c.type === 'npc' ? 'npc' : 'monster',
        label: c.name,
        npcId: npc?.id ?? null,
        imagePath: remembered[artKey(c.monsterRef, c.name)] ?? null,
        sheetId: c.sheetId,
        ownerId: c.type === 'player' ? c.ownerId : null,
        combatantId: c.id,
        monsterRef: c.monsterRef,
        hidden: c.hidden,
        size: m ? SIZE_FROM_TEXT[m.size.split(' ')[0]] ?? 1 : 1,
      };
    })));

  return (
    <div className="fv-tray" aria-label="Pôr peões no mapa">
      <div className="fv-label">Pôr no mapa</div>
      <div className="fv-tray-row">
        {combOff.length > 0 && (
          <button type="button" className="fv-btn-gold" disabled={st.busy} onClick={addEncounter}>
            Encontro atual ({combOff.length})
          </button>
        )}
        {heroesOff.length > 1 && (
          <button
            type="button"
            className="fv-btn-ghost"
            disabled={st.busy}
            onClick={() => void st.addTokens(place(heroesOff.map((h) => ({ ...base, kind: 'hero', label: h.snapshot?.name ?? 'Herói', sheetId: h.share.sheetId, ownerId: h.share.ownerId }))))}
          >
            Todos os heróis
          </button>
        )}
        {heroesOff.map((h) => (
          <button
            key={h.share.id}
            type="button"
            className="fv-tray-chip is-hero"
            disabled={st.busy}
            onClick={() => void st.addTokens(place([{ ...base, kind: 'hero', label: h.snapshot?.name ?? 'Herói', sheetId: h.share.sheetId, ownerId: h.share.ownerId }]))}
          >
            + {h.snapshot?.name ?? 'Herói'}
          </button>
        ))}
        {npcsOff.map((n) => (
          <button
            key={n.id}
            type="button"
            className="fv-tray-chip is-npc"
            disabled={st.busy}
            onClick={() => void st.addTokens(place([{ ...base, kind: 'npc', label: n.name, npcId: n.id, hidden: !n.revealed }]))}
          >
            + {n.name}
          </button>
        ))}
      </div>
      <form
        className="fv-tray-row"
        onSubmit={(e) => {
          e.preventDefault();
          const label = marker.trim() || 'Marcador';
          const color = MARKER_COLORS[tokens.filter((t) => t.kind === 'marker').length % MARKER_COLORS.length];
          void st.addTokens(place([{ ...base, kind: 'marker', label, color }]));
          setMarker('');
        }}
      >
        <input className="fv-input" placeholder="Marcador (baú, armadilha, porta…)" value={marker} maxLength={40} onChange={(e) => setMarker(e.target.value)} />
        <button type="submit" className="fv-btn-ghost" disabled={st.busy}>+ Marcador</button>
      </form>
      <p className="fv-live-hint">Toque num peão para mudar tamanho, esconder dos jogadores ou tirar do mapa. Peões escondidos só você vê.</p>
    </div>
  );
}

/** Rosto, deslocamento, vida e turno de cada peão (a partir das fichas, NPCs e do encontro). */
function useTokenContext({ heroes, npcs, combatants, encounter, isMaster, tokens }: { heroes: SharedHero[]; npcs: CampaignNpc[]; combatants: Combatant[]; encounter: Encounter | null; isMaster: boolean; tokens: Token[] }) {
  const local = useCharacterStore((c) => c.characters);
  const art = useMediaUrls(tokens.map((t) => t.imagePath));
  const bySheet = useMemo(() => {
    const m = new Map<string, { face: TokenFace; speed: number | null }>();
    for (const h of heroes) {
      const snap = local.find((c) => c.id === h.share.sheetId) ?? h.snapshot;
      if (!snap) continue;
      let speed: number | null = null;
      try {
        speed = deriveCharacter(snap).speed;
      } catch {
        speed = null;
      }
      m.set(h.share.sheetId, { face: { url: heroAvatar(snap), style: heroFace(snap) }, speed });
    }
    return m;
  }, [heroes, local]);
  const npcById = useMemo(() => new Map(npcs.map((n) => [n.id, n])), [npcs]);
  const combFor = (t: Token) => combatants.find((c) => c.id === t.combatantId) ?? (t.sheetId ? combatants.find((c) => c.sheetId === t.sheetId) : undefined);

  return {
    faceFor: (t: Token): TokenFace | null => {
      // retrato enviado pelo mestre vence tudo
      if (t.imagePath && art[t.imagePath]) return { url: art[t.imagePath], style: { backgroundSize: 'cover', backgroundPosition: '50% 22%' } };
      if (t.sheetId && bySheet.has(t.sheetId)) return bySheet.get(t.sheetId)!.face;
      const n = t.npcId ? npcById.get(t.npcId) : null;
      if (n?.portrait) return { url: n.portrait, style: { backgroundSize: 'cover', backgroundPosition: '50% 20%' } };
      return null;
    },
    speedFor: (t: Token): number | null => {
      if (t.sheetId) return bySheet.get(t.sheetId)?.speed ?? null;
      const m = t.monsterRef ? MONSTER_BY_ID[t.monsterRef] : null;
      const n = m ? parseFloat(m.speed.replace(',', '.')) : NaN;
      return Number.isFinite(n) ? n : null;
    },
    hpFor: (t: Token) => {
      if (!isMaster) return null;
      const c = combFor(t);
      return c && c.hpMax ? { cur: c.hpCurrent ?? c.hpMax, max: c.hpMax } : null;
    },
    activeIds: (tokens: Token[]) => {
      const id = encounter?.status === 'active' ? encounter.activeCombatantId : null;
      if (!id) return new Set<string>();
      return new Set(tokens.filter((t) => combFor(t)?.id === id).map((t) => t.id));
    },
  };
}
