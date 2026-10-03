import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StageMap } from './StageMap';
import { BlankMapButton } from './BlankMap';
import type { TokenFace } from './StageMap';
import { mediaService, useMediaUrl, useMediaUrls } from '@/services/mediaService';
import { liveScene, useStageStore } from '@/store/stageStore';
import { useCharacterStore } from '@/store/characterStore';
import { deriveCharacter } from '@/engine/dndRules';
import { heroAvatar, heroFace } from '@/lib/summary';
import { MONSTER_BY_ID } from '@/data/bestiary';
import { monsterLook } from '@/lib/monsterArt';
import { useBestiaryStore } from '@/services/bestiaryService';
import { coverArea, revealArea } from '@/engine/grid';
import { useSessionStore } from '@/store/sessionStore';
import type { SharedHero } from '@/components/session/MasterDeck';
import type { CampaignNpc } from '@/types/npc';
import type { Combatant, Encounter } from '@/types/session';
import type { NewToken } from '@/services/stageService';
import { stageDragProps } from '@/lib/stageDrop';
import type { StageDrop } from '@/lib/stageDrop';
import type { Scene, Token } from '@/types/stage';
import '@/styles/stage.css';

interface StageViewProps {
  isMaster: boolean;
  userId: string;
  heroes: SharedHero[];
  npcs: CampaignNpc[];
  combatants: Combatant[];
  encounter: Encounter | null;
  /** Mestre: abre a aba de cenas. */
  onOpenLibrary?: () => void;
  /** Mestre: avisa o console qual peão foi tocado (abre o inspetor). */
  onSelectToken?: (token: Token | null) => void;
  /**
   * Mestre: uma criatura do bestiário foi solta no mapa — põe no encontro
   * (abrindo um se precisar) e devolve os combatentes novos para virar peão.
   */
  onDropMonster?: (ref: string, qty: number) => Promise<Combatant[]>;
}

const KIND_LABEL: Record<Scene['kind'], string> = { map: 'Mapa tático', image: 'Ambiente', cutscene: 'Cutscene' };

/**
 * O PALCO: o que a mesa está vendo. Jogador vê a cena no ar; o mestre vê
 * a cena que escolher (pode preparar uma sem mostrar) e tem as ferramentas.
 */
export function StageView({ isMaster, userId, heroes, npcs, combatants, encounter, onOpenLibrary, onSelectToken, onDropMonster }: StageViewProps) {
  const st = useStageStore();
  const live = liveScene(st);
  const scene = isMaster ? st.scenes.find((s) => s.id === st.viewSceneId) ?? live : live;
  const isLive = !!scene && scene.id === live?.id;
  const [selected, setSelected] = useState<string | null>(null);
  const [fullOn, toggleFull] = useMapFullscreen();
  const full = fullOn && scene?.kind === 'map';
  // a cena trocou para algo que não é mapa: sai da tela cheia (destrava a página)
  useEffect(() => {
    if (fullOn && scene?.kind !== 'map') toggleFull();
  }, [scene?.kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const ctx = useTokenContext({ heroes, npcs, combatants, encounter, isMaster, tokens: st.tokens });
  const canMove = (t: Token) => isMaster || (t.ownerId === userId && !t.hidden);
  const [follow, setFollow] = useState(() => {
    try {
      return localStorage.getItem('fv-follow-turn') === '1';
    } catch {
      return false;
    }
  });
  const activeIds = ctx.activeIds(st.tokens);
  const session = useSessionStore();
  const targetIds = useMemo(
    () => new Set(st.tokens.filter((t) => session.targetId && ctx.combFor(t)?.id === session.targetId).map((t) => t.id)),
    [st.tokens, session.targetId, combatants], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // mestre: tocar num peão que não é o da vez escolhe o alvo do próximo ataque
  const select = (id: string | null) => {
    setSelected(id);
    if (isMaster) onSelectToken?.(id ? st.tokens.find((k) => k.id === id) ?? null : null);
    if (!isMaster || !id) return;
    const t = st.tokens.find((k) => k.id === id);
    const c = t ? ctx.combFor(t) : undefined;
    if (c && !activeIds.has(id)) session.setTarget(c.id);
  };
  const activeToken = st.tokens.find((t) => activeIds.has(t.id)) ?? null;

  // mestre: soltar no mapa o que veio arrastado dos bastidores / da iniciativa
  const dropOnMap = async (item: StageDrop, cell: { x: number; y: number }) => {
    if (!scene || scene.kind !== 'map') return;
    const tokens = useStageStore.getState().tokens;
    const existing = (pred: (t: Token) => boolean) => tokens.find(pred);
    const putOne = async (tk: Omit<NewToken, 'x' | 'y' | 'sceneId'>, already?: Token) => {
      // já está no mapa: só leva até a casa
      if (already) return st.moveToken(already.id, cell.x, cell.y);
      const [at] = freeCellsAround(cell, 1, tokens, scene);
      return st.addTokens([{ ...tk, sceneId: scene.id, ...at }]);
    };
    if (item.kind === 'npc') {
      const n = npcs.find((x) => x.id === item.id);
      if (n) await putOne({ ...TOKEN_BASE, kind: 'npc', label: n.name, npcId: n.id, hidden: !n.revealed }, existing((t) => t.npcId === n.id));
    } else if (item.kind === 'hero') {
      const h = heroes.find((x) => x.share.sheetId === item.sheetId);
      if (h) await putOne({ ...TOKEN_BASE, kind: 'hero', label: h.snapshot?.name ?? 'Herói', sheetId: h.share.sheetId, ownerId: h.share.ownerId }, existing((t) => t.sheetId === h.share.sheetId));
    } else if (item.kind === 'combatant') {
      const c = combatants.find((x) => x.id === item.id);
      if (c) await putOne(tokenForCombatant(c, npcs, scene.campaignId), existing((t) => t.combatantId === c.id || (!!c.sheetId && t.sheetId === c.sheetId)));
    } else if (item.kind === 'monster' && onDropMonster) {
      const added = await onDropMonster(item.ref, item.qty ?? 1);
      if (!added.length) return;
      const cells = freeCellsAround(cell, added.length, useStageStore.getState().tokens, scene);
      await st.addTokens(added.map((c, i) => ({ ...tokenForCombatant(c, npcs, scene.campaignId), sceneId: scene.id, ...cells[i] })));
    }
  };

  // seguir o turno: o mapa vai até o peão da vez quando o turno muda
  useEffect(() => {
    if (follow && activeToken) st.focusOn(activeToken.x + activeToken.size / 2, activeToken.y + activeToken.size / 2);
  }, [follow, activeToken?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // atalhos no peão selecionado: setas andam 1 casa; mestre: H esconde, Delete tira
  const sel = selected ? st.tokens.find((t) => t.id === selected) ?? null : null;
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      const d: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (d[e.key] && canMove(sel)) {
        e.preventDefault();
        void st.moveToken(sel.id, Math.round(sel.x) + d[e.key][0], Math.round(sel.y) + d[e.key][1]);
      } else if (isMaster && e.key.toLowerCase() === 'h') {
        void st.updateToken(sel.id, { hidden: !sel.hidden });
      } else if (isMaster && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        void st.removeToken(sel.id);
        setSelected(null);
      } else if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, isMaster]); // eslint-disable-line react-hooks/exhaustive-deps

  if (st.missing) {
    return (
      <section className="fv-panel fv-stage fv-stage-empty">
        <div className="fv-label">Palco</div>
        <p className="fv-live-hint">
          {isMaster
            ? 'O banco ainda não tem o palco (mapas, cenas e handouts). No Supabase: SQL Editor → aba nova → cole supabase/palco.sql → Run. Depois recarregue esta página.'
            : 'O mestre ainda precisa atualizar o banco da mesa para usar mapas e cenas.'}
        </p>
        {isMaster && st.missingDetail && <p className="fv-stage-diag">Resposta do banco: <code>{st.missingDetail}</code></p>}
        <button type="button" className="fv-btn-ghost" onClick={() => void st.refresh()}>Verificar de novo</button>
      </section>
    );
  }

  return (
    <section className={'fv-panel fv-stage' + (scene ? ` is-${scene.kind}` : ' fv-stage-empty') + (full ? ' is-full' : '')}>
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
              <BlankMapButton />
            </>
          ) : (
            <p>Quando o mestre mostrar um mapa ou uma cena, ela aparece aqui.</p>
          )}
        </div>
      )}

      {scene?.kind === 'map' && (
        <>
          {isMaster && sel && <TokenBar token={sel} combatant={ctx.combFor(sel) ?? null} onClose={() => setSelected(null)} />}
          {activeToken && (
            <div className="fv-stage-turn">
              <span>Vez de <b>{activeToken.label}</b>{isMaster && session.targetId && (() => {
                const tg = combatants.find((c) => c.id === session.targetId);
                return tg ? <> → alvo <b className="is-target">{tg.name}</b></> : null;
              })()}</span>
              <button type="button" onClick={() => st.focusOn(activeToken.x + activeToken.size / 2, activeToken.y + activeToken.size / 2)}>Ver no mapa</button>
              {/* em tela cheia a iniciativa fica escondida: o mestre passa a vez daqui */}
              {full && isMaster && encounter?.status === 'active' && (
                <button type="button" className="fv-stage-next" disabled={session.busy} onClick={() => void session.nextTurn()}>
                  Próximo ▶
                </button>
              )}
              <label>
                <input
                  type="checkbox"
                  checked={follow}
                  onChange={(e) => {
                    setFollow(e.target.checked);
                    try {
                      localStorage.setItem('fv-follow-turn', e.target.checked ? '1' : '0');
                    } catch {
                      /* ignora */
                    }
                  }}
                />{' '}
                Seguir o turno
              </label>
            </div>
          )}
          <StageMap
            scene={scene}
            tokens={st.tokens}
            isMaster={isMaster}
            me={{ id: userId, who: st.who || (isMaster ? 'Mestre' : 'Jogador'), color: st.myColor() }}
            canMove={canMove}
            faceFor={ctx.faceFor}
            speedFor={ctx.speedFor}
            hpFor={isMaster ? ctx.hpFor : undefined}
            conditionsFor={ctx.conditionsFor}
            activeIds={activeIds}
            targetIds={isMaster ? targetIds : undefined}
            drags={st.drags}
            pings={st.pings}
            marks={Object.values(st.marks)}
            lasers={Object.values(st.lasers)}
            focus={st.focus}
            selectedId={selected}
            onSelect={select}
            onMove={(id, x, y) => void st.moveToken(id, x, y)}
            onDrag={st.dragPreview}
            onPing={st.ping}
            onMark={st.putMark}
            onDropMark={st.dropMark}
            onClearMarks={st.clearMarks}
            onLaser={st.laser}
            onFog={isMaster ? (r, mode) => void st.saveFog(scene, mode === 'reveal' ? revealArea(scene.grid.fog ?? { on: true, reveal: [] }, r) : coverArea(scene.grid.fog ?? { on: true, reveal: [] }, r)) : undefined}
            onFogAll={isMaster ? (mode) => void st.saveFog(scene, mode === 'cover' ? { on: true, reveal: [] } : { on: false, reveal: mode === 'off' ? scene.grid.fog?.reveal ?? [] : [] }) : undefined}
            onPullView={isMaster && isLive ? st.pullView : undefined}
            onDropItem={isMaster ? (item, cell) => void dropOnMap(item, cell) : undefined}
            full={full}
            onToggleFull={toggleFull}
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
function TokenBar({ token, combatant, onClose }: { token: Token | null; combatant: Combatant | null; onClose: () => void }) {
  const st = useStageStore();
  const session = useSessionStore();
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState('');
  if (!token) return null;
  // PV direto do peão (como o Token HUD do Foundry): herói recebe na ficha, monstro no encontro
  const hit = (sign: 1 | -1) => {
    const n = Math.abs(parseInt(amount, 10));
    if (!combatant || !n) return;
    if (combatant.type === 'player' && combatant.sheetId) void session.sendHeroHp(combatant, sign * n);
    else {
      const max = combatant.hpMax ?? Infinity;
      const cur = combatant.hpCurrent ?? combatant.hpMax ?? 0;
      void session.updateCombatant(combatant.id, { hp_current: Math.max(0, Math.min(max, cur + sign * n)) });
    }
    setAmount('');
  };
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
      {combatant && (
        <form className="fv-tokenbar-hp" onSubmit={(e) => { e.preventDefault(); hit(-1); }}>
          <span>PV {combatant.hpCurrent ?? '—'}{combatant.hpMax ? `/${combatant.hpMax}` : ''}</span>
          <input className="fv-input" inputMode="numeric" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 4))} aria-label="Quantidade" />
          <button type="submit" className="fv-btn-ghost is-danger" disabled={!amount}>Dano</button>
          <button type="button" className="fv-btn-ghost" disabled={!amount} onClick={() => hit(1)}>Cura</button>
        </form>
      )}
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

const TOKEN_BASE = { sheetId: null, ownerId: null, npcId: null, combatantId: null, monsterRef: null, color: null, imagePath: null, size: 1, hidden: false } as const;

/** Peão de um combatente do encontro (herói, NPC ou criatura), com o retrato já lembrado. */
function tokenForCombatant(c: Combatant, npcs: CampaignNpc[], campaignId: string): Omit<NewToken, 'x' | 'y' | 'sceneId'> {
  const m = c.monsterRef ? MONSTER_BY_ID[c.monsterRef] : null;
  // NPC do encontro com o mesmo nome de um NPC da galeria → usa o retrato dele
  const npc = c.type === 'npc' ? npcs.find((n) => n.name.trim().toLowerCase() === c.name.trim().toLowerCase()) : undefined;
  return {
    ...TOKEN_BASE,
    kind: c.type === 'player' ? 'hero' : c.type === 'npc' ? 'npc' : 'monster',
    label: c.name,
    npcId: npc?.id ?? null,
    imagePath: tokenArt(campaignId)[artKey(c.monsterRef, c.name)] ?? null,
    sheetId: c.sheetId,
    ownerId: c.type === 'player' ? c.ownerId : null,
    combatantId: c.id,
    monsterRef: c.monsterRef,
    hidden: c.hidden,
    size: m ? SIZE_FROM_TEXT[m.size.split(' ')[0]] ?? 1 : 1,
  };
}

/** Casas livres mais perto de onde soltou (em espiral), dentro do tabuleiro. */
export function freeCellsAround(cell: { x: number; y: number }, n: number, tokens: Token[], scene: Scene): { x: number; y: number }[] {
  const busy = new Set(tokens.filter((t) => t.sceneId === scene.id).map((t) => `${Math.round(t.x)},${Math.round(t.y)}`));
  const maxX = scene.grid.cols ?? 200;
  const maxY = scene.grid.rows ?? 200;
  const out: { x: number; y: number }[] = [];
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < maxX && y < maxY;
  for (let r = 0; out.length < n && r < 40; r++) {
    for (let dy = -r; dy <= r && out.length < n; dy++) {
      for (let dx = -r; dx <= r && out.length < n; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // só o anel deste raio
        const x = cell.x + dx;
        const y = cell.y + dy;
        if (!inside(x, y) || busy.has(`${x},${y}`)) continue;
        busy.add(`${x},${y}`);
        out.push({ x, y });
      }
    }
  }
  while (out.length < n) out.push({ ...cell });
  return out;
}

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

  const base = TOKEN_BASE;
  const heroesOff = heroes.filter((h) => !onMap((t) => t.sheetId === h.share.sheetId));
  const npcsOff = npcs.filter((n) => !onMap((t) => t.npcId === n.id));
  const combOff = combatants.filter((c) => !onMap((t) => t.combatantId === c.id || (!!c.sheetId && t.sheetId === c.sheetId)));

  const addEncounter = () => void st.addTokens(place(combOff.map((c) => tokenForCombatant(c, npcs, scene.campaignId))));

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
            {...stageDragProps({ kind: 'hero', sheetId: h.share.sheetId }, h.snapshot?.name ?? 'Herói')}
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
            {...stageDragProps({ kind: 'npc', id: n.id }, n.name)}
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
  const customs = useBestiaryStore((b) => b.customs);
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
    combFor,
    conditionsFor: (t: Token): string[] => {
      const c = combFor(t);
      return c && (!c.hidden || isMaster) ? c.conditions : [];
    },
    faceFor: (t: Token): TokenFace | null => {
      // retrato enviado pelo mestre vence tudo
      if (t.imagePath && art[t.imagePath]) return { url: art[t.imagePath], style: { backgroundSize: 'cover', backgroundPosition: '50% 22%' } };
      if (t.sheetId && bySheet.has(t.sheetId)) return bySheet.get(t.sheetId)!.face;
      const n = t.npcId ? npcById.get(t.npcId) : null;
      if (n?.portrait) return { url: n.portrait, style: { backgroundSize: 'cover', backgroundPosition: '50% 20%' } };
      // criatura do bestiário: foto da mesa ou arte oficial (emblema não vira peão: fica a inicial)
      const m = t.monsterRef ? MONSTER_BY_ID[t.monsterRef] : null;
      const look = m ? monsterLook(m, customs[m.id]) : null;
      if (look?.art) return { url: look.art, style: { backgroundSize: 'cover', backgroundPosition: '50% 18%' } };
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

/**
 * Mapa em tela cheia: o palco cobre a janela (CSS) e, onde o navegador deixa,
 * a página entra em tela cheia de verdade (some a barra do navegador). É o
 * documento inteiro que vai para tela cheia — não só o palco — para que
 * avisos, rolagens e janelas (que abrem no <body>) continuem aparecendo.
 */
function useMapFullscreen(): [boolean, () => void] {
  const [full, setFull] = useState(false);
  const fullRef = useRef(full);
  fullRef.current = full;

  // saiu pelo navegador (Esc, gesto, F11): o palco volta junto
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // trava a rolagem da página por baixo e sinaliza o modo para o resto da tela
  useEffect(() => {
    if (!full) return;
    document.body.classList.add('fv-map-full');
    return () => document.body.classList.remove('fv-map-full');
  }, [full]);

  // saiu da mesa com o mapa em tela cheia: devolve a janela ao normal
  useEffect(
    () => () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    },
    [],
  );

  const toggle = useCallback(() => {
    const next = !fullRef.current;
    setFull(next);
    if (next) {
      // iPhone e alguns navegadores não têm a API: fica só a tela cheia do app
      void document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => undefined);
    } else if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  return [full, toggle];
}
