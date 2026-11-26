import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as RPointerEvent, ReactNode } from 'react';
import { useMediaUrl } from '@/services/mediaService';
import { boardSize, cellDistance, fitView, fmtMeters, isRevealed, markLength, metersBetween, pointInMark, rectBetween, snapCell, zoomAt } from '@/engine/grid';
import { CELL_METERS } from '@/types/stage';
import { hasStageDrop, readStageDrop } from '@/lib/stageDrop';
import type { StageDrop } from '@/lib/stageDrop';
import type { CellRect, FogConfig, LaserTrail, MapMark, MapTool, MarkKind, Scene, SceneSecret, SecretKind, StagePing, Token, Wall } from '@/types/stage';
import type { NewWall, WallPatch } from '@/services/stageService';
import { nearestWall, pathBlocked, snapHalf } from '@/engine/vision';
import { DEFAULT_REACH_M, KIND_NAME } from '@/engine/secrets';
import { ConditionIcon, hasConditionIcon } from '@/components/ui/RuleIcon';
import { InlineIcon } from '@/components/ui/Icon';
import { SECRET_COLOR } from '@/store/stageStore';
import { SecretDefs, SecretSeal } from './secretArt';
import { cellPxFor, initials } from './map/geometry';
import { HINTS, MARK_NAME, MARK_TOOLS, MASTER_TOOL_KEYS, MOVE_HINT, TOOL_GROUPS, TOOL_KEYS, groupOf } from './map/tools';
import type { ToolGroup } from './map/tools';
import { MarkShape } from './map/MarkShape';
import { useVision } from './map/useVision';
import { DoorLayer, FogLayer, ReachLayer, WallLayer } from './map/layers';
import type { DoorView, ReachRing } from './map/layers';
import { MapDock, ToolSheet, ViewTools } from './map/MapHud';

export interface TokenFace {
  /** Imagem do peão (retrato, arte do herói). */
  url?: string;
  /** Enquadramento do rosto (background-size/position). */
  style?: CSSProperties;
}

interface StageMapProps {
  scene: Scene;
  tokens: Token[];
  /** Paredes e portas da cena (scene_walls). */
  walls: Wall[];
  /** Falta rodar portas_luz.sql: paredes antigas aparecem, mas não editam. */
  wallsReadOnly?: boolean;
  isMaster: boolean;
  me: { id: string; who: string; color: string };
  canMove: (t: Token) => boolean;
  faceFor: (t: Token) => TokenFace | null;
  /** Deslocamento do peão em metros (herói/monstro), para a régua. */
  speedFor: (t: Token) => number | null;
  /** Visão no escuro do herói, em metros (0 = nenhuma). */
  darkFor?: (t: Token) => number;
  /** Vida (só o mestre vê a barra). */
  hpFor?: (t: Token) => { cur: number; max: number } | null;
  /** Condições do combatente ligado ao peão (todos veem). */
  conditionsFor?: (t: Token) => string[];
  activeIds: Set<string>;
  /** Alvo escolhido pelo mestre (mira no peão). */
  targetIds?: Set<string>;
  drags: Record<string, { x: number; y: number }>;
  pings: StagePing[];
  marks: MapMark[];
  lasers: LaserTrail[];
  focus: { x: number; y: number; z?: number; n: number } | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onPing: (x: number, y: number) => void;
  onMark: (m: MapMark) => void;
  onDropMark: (id: string) => void;
  onClearMarks: (all?: boolean) => void;
  onLaser: (points: { x: number; y: number }[]) => void;
  onFog?: (rect: CellRect, mode: 'reveal' | 'cover') => void;
  onFogAll?: (mode: 'reveal' | 'cover' | 'off') => void;
  /** Mestre: troca as chaves da névoa (ligada, visão dinâmica, escuro). */
  onFogSet?: (fog: FogConfig) => void;
  /** Mestre: paredes (criar, apagar, trancar). */
  onWallsAdd?: (list: NewWall[]) => void;
  onWallsRemove?: (ids: string[]) => void;
  onWallPatch?: (id: string, patch: WallPatch) => void;
  /** Abre/fecha uma porta (mestre qualquer uma; jogador ao lado do herói). */
  onDoor?: (wall: Wall) => void;
  /** Quantas vezes o mestre mandou esquecer o explorado nesta cena. */
  exploredResetN?: number;
  /** Mestre: os jogadores esquecem o que já exploraram nesta cena. */
  onForgetExplored?: () => void;
  /** Jogador: luz que o próprio herói carrega (no escuro). */
  myLight?: { tokenId: string; meters: number } | null;
  onMyLight?: (meters: number) => void;
  /** Mestre: todos passam a olhar para este ponto. */
  onPullView?: (x: number, y: number, z: number) => void;
  /** Mestre: algo arrastado dos bastidores/iniciativa foi solto nesta casa. */
  onDropItem?: (item: StageDrop, cell: { x: number; y: number }) => void;
  /** Mestre: segredo ligado a este peão (marcador escondido). */
  secretFor?: (t: Token) => SceneSecret | undefined;
  /** A tabela de segredos ainda não existe no banco. */
  secretsMissing?: boolean;
  /** Mestre: segredos desta cena (lista da ferramenta). */
  secrets?: SceneSecret[];
  /** Mestre: esconder um segredo nesta casa. */
  onSecretAt?: (cell: { x: number; y: number }) => void;
  /** Painéis sobre o mapa (editor do segredo, aviso de achado). */
  overlay?: ReactNode;
  /** Mapa em tela cheia (o palco cobre a tela; F alterna, Esc sai). */
  full?: boolean;
  onToggleFull?: () => void;
}

type View = { x: number; y: number; z: number };
type Pt = { x: number; y: number };
type DragState = { id: string; pointer: number; from: Pt; grab: Pt; at: Pt };
type Act =
  | { kind: 'mark'; pointer: number; mark: MapMark }
  | { kind: 'laser'; pointer: number; pts: Pt[]; last: number }
  | { kind: 'fog'; pointer: number; mode: 'reveal' | 'cover'; from: Pt; to: Pt }
  | { kind: 'wall'; pointer: number; door: boolean; from: Pt; to: Pt };

/** Distância (casas) do herói ao vão para abrir uma porta — a mesma regra do banco. */
const DOOR_REACH = 2;

/**
 * Mapa tático: imagem do mestre + grade de 1,5 m + peões, com ferramentas
 * inspiradas nas mesas virtuais mais usadas (Foundry VTT, Owlbear Rodeo,
 * Dungeon Revealer). Este componente orquestra estado, gestos e camadas;
 * as partes moram em ./map:
 * · useVision — visão dinâmica, luz e memória da névoa;
 * · layers    — névoa, paredes, portas, alcance dos segredos;
 * · MapHud    — doca, folha da ferramenta e controles de visão;
 * · tools     — grupos de ferramentas, atalhos e dicas.
 */
export function StageMap(p: StageMapProps) {
  const { scene, walls } = p;
  const g = scene.grid;
  const fog: FogConfig | undefined = g.fog;
  const px = useMemo(() => cellPxFor(g), [g]);
  const box = useRef<HTMLDivElement>(null);
  const { url: imageUrl, error: imageError } = useMediaUrl(scene.imagePath);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const board = boardSize(g, scene.imagePath ? natural : null);
  const ready = !scene.imagePath || !!natural;

  const [view, setView] = useState<View>({ x: 0, y: 0, z: 0.5 });
  const [fitted, setFitted] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [tool, setTool] = useState<MapTool>('move');
  const [drag, setDrag] = useState<DragState | null>(null);
  const [act, setAct] = useState<Act | null>(null);
  const [dropCell, setDropCell] = useState<Pt | null>(null);
  const [blocked, setBlocked] = useState(0);
  const pointers = useRef(new Map<number, Pt>());
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pinch = useRef<{ d: number; view: View; cx: number; cy: number } | null>(null);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);

  const flashBlocked = () => {
    const n = Date.now();
    setBlocked(n);
    setTimeout(() => setBlocked((b) => (b === n ? 0 : b)), 1800);
  };

  /* ---------- enquadramento e câmera ---------- */
  const fit = useCallback(() => {
    const el = box.current;
    if (el) setView(fitView(board, { w: el.clientWidth, h: el.clientHeight }));
  }, [board.w, board.h]); // eslint-disable-line react-hooks/exhaustive-deps
  // enquadra ao abrir a cena (e quando a imagem termina de carregar)
  useLayoutEffect(() => {
    const key = `${scene.id}:${board.w}x${board.h}`;
    if (!ready || fitted === key) return;
    fit();
    setFitted(key);
  }, [ready, scene.id, board.w, board.h, fitted, fit]);
  // entrou/saiu da tela cheia: o quadro mudou de tamanho, reenquadra
  const firstFull = useRef(true);
  useEffect(() => {
    if (firstFull.current) {
      firstFull.current = false;
      return;
    }
    const id = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(id);
  }, [p.full]); // eslint-disable-line react-hooks/exhaustive-deps
  const centerOn = (x: number, y: number, z?: number) => {
    const el = box.current;
    if (!el) return;
    setView((v) => {
      const zz = z ?? v.z;
      return { z: zz, x: el.clientWidth / 2 - px(x, 'x') * zz, y: el.clientHeight / 2 - px(y, 'y') * zz };
    });
  };
  // o mestre puxou a visão / seguir o turno: centraliza no ponto pedido
  useEffect(() => {
    if (p.focus) centerOn(p.focus.x, p.focus.y, p.focus.z);
  }, [p.focus?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  // roda do mouse: zoom em volta do cursor (listener não-passivo para impedir a rolagem da página)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setView((v) => zoomAt(v, e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const zoomBtn = (f: number) => {
    const el = box.current;
    if (el) setView((v) => zoomAt(v, el.clientWidth / 2, el.clientHeight / 2, f));
  };

  /* ---------- ferramentas e atalhos ---------- */
  // cada grupo lembra a última ferramenta usada (o botão do grupo volta nela)
  const lastIn = useRef<Partial<Record<ToolGroup['id'], MapTool>>>({});
  useEffect(() => {
    lastIn.current[groupOf(tool).id] = tool;
  }, [tool]);
  const keys = useRef({ tool, full: p.full, toggleFull: p.onToggleFull });
  keys.current = { tool, full: p.full, toggleFull: p.onToggleFull };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const cur = keys.current;
      const next = TOOL_KEYS[k] ?? (p.isMaster ? MASTER_TOOL_KEYS[k] : undefined);
      if (next) setTool(next);
      else if (k === 'f' && cur.toggleFull) cur.toggleFull();
      // Esc: primeiro solta a ferramenta; com "mover" já ativo, sai da tela cheia
      else if (k === 'escape') {
        if (cur.tool !== 'move') setTool('move');
        else if (cur.full && cur.toggleFull) cur.toggleFull();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p.isMaster]);

  /* ---------- visão, luz e névoa ---------- */
  const bounds = useMemo(() => ({ x0: -g.ox / g.size, y0: -g.oy / g.size, x1: (board.w - g.ox) / g.size, y1: (board.h - g.oy) / g.size }), [g.ox, g.oy, g.size, board.w, board.h]);
  const sight = useVision({
    sceneId: scene.id,
    fog,
    ready,
    isMaster: p.isMaster,
    meId: p.me.id,
    tokens: p.tokens,
    walls,
    drag: drag ? { id: drag.id, from: drag.from, at: drag.at } : null,
    drags: p.drags,
    bounds,
    darkFor: p.darkFor,
    exploredResetN: p.exploredResetN,
  });
  const { vision, dark, livePos } = sight;
  const center = (t: Token) => ({ x: t.x + t.size / 2, y: t.y + t.size / 2 });
  // jogadores não veem peões debaixo da névoa
  const visibleTokens =
    p.isMaster || !fog?.on
      ? p.tokens
      : p.tokens.filter((t) => {
          if (t.kind === 'hero' && t.ownerId === p.me.id) return true;
          const c = center(t);
          if (isRevealed(fog, c.x, c.y)) return true;
          const at = livePos(t);
          return vision && sight.inSight(at.x + t.size / 2, at.y + t.size / 2);
        });

  /* ---------- gestos ---------- */
  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  /** Tela → casa (fracionária). */
  const toCell = (sx: number, sy: number) => ({ x: ((sx - view.x) / view.z - g.ox) / g.size, y: ((sy - view.y) / view.z - g.oy) / g.size });
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };

  /** Começa a ferramenta ativa (régua, molde, laser, névoa, parede, segredo) neste ponto. */
  const startTool = (pointer: number, c: Pt) => {
    if (tool === 'laser') {
      setAct({ kind: 'laser', pointer, pts: [c], last: 0 });
      return true;
    }
    if (tool === 'secret') {
      if (!p.isMaster || !p.onSecretAt) return false;
      p.onSecretAt({ x: Math.floor(c.x), y: Math.floor(c.y) });
      return true;
    }
    if (tool === 'wall' || tool === 'door') {
      if (!p.isMaster || p.wallsReadOnly) return false;
      const at = { x: snapHalf(c.x), y: snapHalf(c.y) };
      setAct({ kind: 'wall', pointer, door: tool === 'door', from: at, to: at });
      return true;
    }
    if (tool === 'reveal' || tool === 'cover') {
      if (!p.isMaster) return false;
      setAct({ kind: 'fog', pointer, mode: tool, from: c, to: c });
      return true;
    }
    if ((MARK_TOOLS as string[]).includes(tool)) {
      const kind = tool as MarkKind;
      // régua: de centro de casa a centro de casa; moldes: a partir da quina mais próxima
      const from = kind === 'measure' ? { x: Math.floor(c.x) + 0.5, y: Math.floor(c.y) + 0.5 } : { x: Math.round(c.x), y: Math.round(c.y) };
      const id = kind === 'measure' ? `${p.me.id}-measure` : `${p.me.id}-${Date.now()}`;
      const mark: MapMark = { id, by: p.me.id, who: p.me.who, color: p.me.color, kind, from, to: from };
      setAct({ kind: 'mark', pointer, mark });
      p.onMark(mark);
      return true;
    }
    return false;
  };

  /** Soltou a parede: arrastar cria; um toque sem arrastar apaga a mais perto. */
  const finishWall = (a: { door: boolean; from: Pt; to: Pt }) => {
    if (a.from.x === a.to.x && a.from.y === a.to.y) {
      const i = nearestWall(a.from, walls, 0.6);
      const id = i >= 0 ? walls[i].id : undefined;
      if (id) p.onWallsRemove?.([id]);
      return;
    }
    p.onWallsAdd?.([{ x1: a.from.x, y1: a.from.y, x2: a.to.x, y2: a.to.y, ...(a.door ? { door: true, open: false } : {}) }]);
  };

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    const pt = local(e);
    pointers.current.set(e.pointerId, pt);
    box.current?.setPointerCapture(e.pointerId);
    if (pointers.current.size === 2) {
      cancelPress();
      pan.current = null;
      if (act?.kind === 'mark' && act.mark.kind === 'measure') p.onDropMark(act.mark.id);
      setAct(null);
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), view, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      return;
    }
    if (drag) return;
    if (tool !== 'move' && startTool(e.pointerId, toCell(pt.x, pt.y))) return;
    pan.current = { x: pt.x, y: pt.y, vx: view.x, vy: view.y };
    p.onSelect?.(null);
    if (e.pointerType !== 'mouse') {
      // segurar o dedo parado = ping
      press.current = {
        x: pt.x,
        y: pt.y,
        timer: setTimeout(() => {
          const c = toCell(pt.x, pt.y);
          p.onPing(c.x, c.y);
          pan.current = null;
          press.current = null;
        }, 550),
      };
    }
  };

  const onTokenDown = (t: Token, e: RPointerEvent<HTMLButtonElement>) => {
    // ferramenta de segredos: tocar num selo abre o segredo (não esconde outro em cima)
    if (tool === 'secret' && p.secretFor?.(t)) {
      e.stopPropagation();
      p.onSelect?.(t.id);
      return;
    }
    // com outra ferramenta, o clique passa direto para o mapa (régua/molde a partir do peão)
    if (tool !== 'move') return;
    e.stopPropagation();
    p.onSelect?.(t.id);
    if (!p.canMove(t) || pointers.current.size) return;
    const pt = local(e);
    pointers.current.set(e.pointerId, pt);
    box.current?.setPointerCapture(e.pointerId);
    const c = toCell(pt.x, pt.y);
    setDrag({ id: t.id, pointer: e.pointerId, from: { x: t.x, y: t.y }, grab: { x: c.x - t.x, y: c.y - t.y }, at: { x: t.x, y: t.y } });
  };

  const onMoveEvt = (e: RPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const pt = local(e);
    pointers.current.set(e.pointerId, pt);
    if (press.current && Math.hypot(pt.x - press.current.x, pt.y - press.current.y) > 8) cancelPress();
    if (drag && e.pointerId === drag.pointer) {
      const c = toCell(pt.x, pt.y);
      const at = { x: c.x - drag.grab.x, y: c.y - drag.grab.y };
      setDrag({ ...drag, at });
      p.onDrag(drag.id, at.x, at.y);
      return;
    }
    if (act && e.pointerId === act.pointer) {
      const c = toCell(pt.x, pt.y);
      if (act.kind === 'mark') {
        const to = act.mark.kind === 'measure' ? { x: Math.floor(c.x) + 0.5, y: Math.floor(c.y) + 0.5 } : c;
        if (to.x === act.mark.to.x && to.y === act.mark.to.y) return;
        const mark = { ...act.mark, to };
        setAct({ ...act, mark });
        p.onMark(mark);
      } else if (act.kind === 'wall') {
        const to = { x: snapHalf(c.x), y: snapHalf(c.y) };
        if (to.x !== act.to.x || to.y !== act.to.y) setAct({ ...act, to });
      } else if (act.kind === 'laser') {
        const pts = [...act.pts, c];
        const now = Date.now();
        if (now - act.last > 50) {
          p.onLaser(pts);
          setAct({ ...act, pts, last: now });
        } else setAct({ ...act, pts });
      } else {
        setAct({ ...act, to: c });
      }
      return;
    }
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const pc = pinch.current;
      const z = zoomAt(pc.view, pc.cx, pc.cy, d / Math.max(1, pc.d));
      setView({ ...z, x: z.x + ((a.x + b.x) / 2 - pc.cx), y: z.y + ((a.y + b.y) / 2 - pc.cy) });
      return;
    }
    if (pan.current) {
      const pn = pan.current;
      setView((v) => ({ ...v, x: pn.vx + (pt.x - pn.x), y: pn.vy + (pt.y - pn.y) }));
    }
  };

  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    cancelPress();
    if (drag && e.pointerId === drag.pointer) {
      const s = snapCell(drag.at.x, drag.at.y);
      const tk = p.tokens.find((t) => t.id === drag.id);
      const half = (tk?.size ?? 1) / 2;
      const through = !p.isMaster && pathBlocked({ x: drag.from.x + half, y: drag.from.y + half }, { x: s.x + half, y: s.y + half }, walls);
      if (through) flashBlocked();
      else if (s.x !== drag.from.x || s.y !== drag.from.y) p.onMove(drag.id, s.x, s.y);
      setDrag(null);
    }
    if (act && e.pointerId === act.pointer) {
      if (act.kind === 'mark') {
        // a régua some ao soltar; o molde fica na mesa até alguém limpar
        const tiny = act.mark.kind !== 'measure' && Math.hypot(act.mark.to.x - act.mark.from.x, act.mark.to.y - act.mark.from.y) < 0.4;
        if (act.mark.kind === 'measure' || tiny) p.onDropMark(act.mark.id);
      } else if (act.kind === 'laser') {
        p.onLaser(act.pts);
      } else if (act.kind === 'wall') {
        finishWall(act);
      } else if (p.onFog) {
        p.onFog(rectBetween(act.from.x, act.from.y, act.to.x, act.to.y), act.mode);
      }
      setAct(null);
    }
    if (pointers.current.size < 2) pinch.current = null;
    if (!pointers.current.size) pan.current = null;
  };

  const onDouble = (e: React.MouseEvent) => {
    const pt = local(e);
    const c = toCell(pt.x, pt.y);
    if (e.shiftKey && p.isMaster && p.onPullView) p.onPullView(c.x, c.y, view.z);
    p.onPing(c.x, c.y);
  };
  const pullHere = () => {
    const el = box.current;
    if (!el || !p.onPullView) return;
    const c = toCell(el.clientWidth / 2, el.clientHeight / 2);
    p.onPullView(c.x, c.y, view.z);
  };

  /* ---------- régua do arrasto e moldes ---------- */
  const dragged = drag ? p.tokens.find((t) => t.id === drag.id) ?? null : null;
  const ruler = useMemo(() => {
    if (!drag || !dragged) return null;
    const s = snapCell(drag.at.x, drag.at.y);
    const m = metersBetween(drag.from.x, drag.from.y, s.x, s.y);
    const speed = p.speedFor(dragged);
    const half = dragged.size / 2;
    const from = { x: drag.from.x + half, y: drag.from.y + half };
    const to = { x: s.x + half, y: s.y + half };
    const wall = !p.isMaster && pathBlocked(from, to, walls);
    return { from, to, snap: s, m, speed, wall, over: wall || (speed !== null && m > speed) };
  }, [drag, dragged, p, walls]);
  const myMark = act?.kind === 'mark' ? act.mark : null;
  const caught = myMark && myMark.kind !== 'measure' ? visibleTokens.filter((t) => pointInMark(myMark, center(t).x, center(t).y)).map((t) => t.label || 'peão') : [];

  /* ---------- descoberta: marcador que acabou de aparecer brilha ---------- */
  const [arrived, setArrived] = useState<Set<string>>(() => new Set());
  const seenIds = useRef<{ scene: string; ids: Set<string> } | null>(null);
  const visibleKey = visibleTokens.map((t) => t.id).sort().join(',');
  useEffect(() => {
    const now = new Set(visibleKey ? visibleKey.split(',') : []);
    const prev = seenIds.current;
    seenIds.current = { scene: scene.id, ids: now };
    // cena nova (ou primeira carga): nada "acabou de aparecer"
    if (!prev || prev.scene !== scene.id) return;
    const fresh = [...now].filter((id) => !prev.ids.has(id) && p.tokens.find((t) => t.id === id)?.kind === 'marker');
    if (!fresh.length) return;
    setArrived((a) => new Set([...a, ...fresh]));
    const timer = setTimeout(() => setArrived((a) => new Set([...a].filter((id) => !fresh.includes(id)))), 2600);
    return () => clearTimeout(timer);
  }, [visibleKey, scene.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- segredos (selo e alcance) ---------- */
  // selo: segredo (mestre) ou marcador de achado revelado (todos: a cor diz o tipo)
  const sealOf = (t: Token): SecretKind | null => {
    const sc = p.secretFor?.(t);
    if (sc) return sc.kind;
    if (t.kind !== 'marker' || !t.color) return null;
    return (Object.keys(SECRET_COLOR) as SecretKind[]).find((k) => SECRET_COLOR[k] === t.color) ?? null;
  };
  const rings: ReachRing[] = p.isMaster
    ? (p.secrets ?? []).flatMap((sc) => {
        const tk = p.tokens.find((t) => t.id === sc.tokenId);
        if (!tk || sc.foundAt || !(tool === 'secret' || p.selectedId === tk.id)) return [];
        const m = sc.rules.near ?? (sc.rules.passive || sc.rules.check ? DEFAULT_REACH_M : 0);
        if (!m) return [];
        const at = livePos(tk);
        return [{ id: sc.id, kind: sc.kind, x: at.x + tk.size / 2, y: at.y + tk.size / 2, cells: m / CELL_METERS + 0.5, label: `${KIND_NAME[sc.kind]} · ${m.toLocaleString('pt-BR')} m` }];
      })
    : [];

  /* ---------- portas ---------- */
  const myHeroes = p.tokens.filter((t) => t.kind === 'hero' && t.ownerId === p.me.id && !t.hidden);
  const lockMode = p.isMaster && tool === 'door';
  const doors: DoorView[] =
    p.onDoor && ready && (tool === 'move' || lockMode)
      ? walls.flatMap((w) => {
          if (!w.door) return [];
          const mx = (w.x1 + w.x2) / 2;
          const my = (w.y1 + w.y2) / 2;
          // jogador só vê a porta que o herói enxerga (ou já explorou); ela fica na
          // linha da parede, então olha um pouco para cada lado
          if (!p.isMaster && fog?.on) {
            const sides = [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]].map(([dx, dy]) => ({ x: mx + dx, y: my + dy }));
            if (!sides.some((q) => isRevealed(fog, q.x, q.y) || (vision && (sight.inSight(q.x, q.y) || sight.wasSeen(q.x, q.y))))) return [];
          }
          const near = p.isMaster || myHeroes.some((t) => Math.abs(t.x + t.size / 2 - mx) <= DOOR_REACH && Math.abs(t.y + t.size / 2 - my) <= DOOR_REACH);
          const can = lockMode || (near && (p.isMaster || !w.locked));
          const label = lockMode
            ? w.locked ? 'Destrancar a porta' : 'Trancar a porta'
            : w.locked && !p.isMaster
              ? 'Porta trancada'
              : !near
                ? 'Chegue perto da porta para abrir'
                : w.open ? 'Fechar a porta' : 'Abrir a porta';
          return [{ wall: w, label, can, lockMode }];
        })
      : [];
  const actOnDoor = (d: DoorView) => {
    if (!d.can) return;
    const w = d.wall;
    if (d.lockMode) {
      if (w.id) p.onWallPatch?.(w.id, { locked: !w.locked, open: w.locked ? w.open : false });
    } else p.onDoor?.(w);
  };

  /* ---------- HUD ---------- */
  const groups = TOOL_GROUPS.filter((x) => !x.master || p.isMaster);
  const active = groupOf(tool);
  const iconFor = (gr: ToolGroup) => {
    const t = gr.id === active.id ? tool : lastIn.current[gr.id] ?? gr.tools[0].t;
    return gr.tools.find((x) => x.t === t)?.icon ?? gr.tools[0].icon;
  };
  const pickGroup = (gr: ToolGroup) => setTool(gr.id === active.id ? tool : lastIn.current[gr.id] ?? gr.tools[0].t);
  const selected = p.selectedId ? p.tokens.find((t) => t.id === p.selectedId) ?? null : null;
  const busyHint = !!selected || !!myMark || !!ruler;
  const hint = HINTS[tool] ?? (p.isMaster ? MOVE_HINT.master : MOVE_HINT.player);
  const setFogKeys = (patch: Partial<FogConfig>) => p.onFogSet?.({ on: true, reveal: fog?.reveal ?? [], ...fog, ...patch });

  const gridOn = showGrid && g.show;
  const stroke = Math.max(2, g.size / 18);
  const fontPx = Math.max(12, g.size * 0.3);

  return (
    <div className="fv-map">
      <SecretDefs />
      <div
        ref={box}
        className={'fv-map-view' + (drag ? ' is-dragging' : '') + (tool !== 'move' ? ` is-tool is-tool-${tool}` : '')}
        onPointerDown={onDown}
        onPointerMove={onMoveEvt}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={onDouble}
        onDragOver={(e) => {
          if (!p.onDropItem || !hasStageDrop(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          const pt = local(e);
          const c = toCell(pt.x, pt.y);
          const cell = { x: Math.floor(c.x), y: Math.floor(c.y) };
          setDropCell((d) => (d && d.x === cell.x && d.y === cell.y ? d : cell));
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropCell(null);
        }}
        onDrop={(e) => {
          if (!p.onDropItem) return;
          const item = readStageDrop(e);
          setDropCell(null);
          document.body.classList.remove('fv-dragging-token');
          if (!item) return;
          e.preventDefault();
          const pt = local(e);
          const c = toCell(pt.x, pt.y);
          p.onDropItem(item, { x: Math.floor(c.x), y: Math.floor(c.y) });
        }}
        role="application"
        aria-label={`Mapa tático: ${scene.name}. Ferramenta: ${active.tools.find((x) => x.t === tool)?.label ?? active.label}.`}
      >
        {scene.imagePath && !imageUrl && <div className="fv-map-loading">{imageError ?? 'Carregando o mapa…'}</div>}
        <div
          className={'fv-map-world' + (g.size * view.z < 34 ? ' is-far' : '')}
          style={{ width: board.w, height: board.h, transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, '--iz': 1 / view.z } as CSSProperties}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" draggable={false} onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
          ) : (
            !scene.imagePath && <div className="fv-map-blank" />
          )}
          {gridOn && ready && (
            <svg className="fv-map-grid" width={board.w} height={board.h} aria-hidden>
              <defs>
                <pattern id={`grid-${scene.id}`} x={g.ox} y={g.oy} width={g.size} height={g.size} patternUnits="userSpaceOnUse">
                  <path d={`M ${g.size} 0 L 0 0 0 ${g.size}`} fill="none" stroke="currentColor" strokeWidth={Math.max(1, g.size / 60)} />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#grid-${scene.id})`} />
            </svg>
          )}

          {/* moldes e réguas da mesa (abaixo dos peões) */}
          <svg className="fv-map-marks" width={board.w} height={board.h} aria-hidden>
            {p.marks.map((m) => (
              <MarkShape key={m.id} m={m} px={px} size={g.size} stroke={stroke} font={fontPx} />
            ))}
          </svg>

          {ruler && (
            <svg className="fv-map-ruler" width={board.w} height={board.h} aria-hidden>
              <rect x={px(ruler.snap.x, 'x')} y={px(ruler.snap.y, 'y')} width={g.size * (dragged?.size ?? 1)} height={g.size * (dragged?.size ?? 1)} className={ruler.over ? 'is-over' : ''} />
              <line x1={px(ruler.from.x, 'x')} y1={px(ruler.from.y, 'y')} x2={px(ruler.to.x, 'x')} y2={px(ruler.to.y, 'y')} className={ruler.over ? 'is-over' : ''} strokeWidth={Math.max(3, g.size / 12)} />
            </svg>
          )}

          {rings.length > 0 && <ReachLayer rings={rings} board={board} size={g.size} px={px} />}

          {visibleTokens.map((t) => {
            const live = drag?.id === t.id ? drag.at : p.drags[t.id] ?? { x: t.x, y: t.y };
            const face = p.faceFor(t);
            const hp = p.hpFor?.(t) ?? null;
            const conds = p.conditionsFor?.(t) ?? [];
            const size = g.size * t.size;
            const seal = sealOf(t);
            const inMark = myMark && myMark.kind !== 'measure' && pointInMark(myMark, center(t).x, center(t).y);
            const cls = [
              'fv-token',
              `is-${t.kind}`,
              t.hidden ? 'is-hidden' : '',
              p.activeIds.has(t.id) ? 'is-active' : '',
              p.targetIds?.has(t.id) ? 'is-target' : '',
              p.selectedId === t.id ? 'is-selected' : '',
              drag?.id === t.id ? 'is-grabbed' : p.drags[t.id] ? 'is-remote' : '',
              p.canMove(t) && tool === 'move' ? 'is-movable' : '',
              hp && hp.cur <= 0 ? 'is-down' : '',
              inMark ? 'is-caught' : '',
              seal ? `fv-secret-pin is-${seal}` : '',
              p.secretFor?.(t)?.foundAt ? 'is-found' : '',
              arrived.has(t.id) ? 'is-arrived' : '',
            ].join(' ');
            return (
              <button
                key={t.id}
                type="button"
                className={cls}
                style={{ left: px(live.x, 'x'), top: px(live.y, 'y'), width: size, height: size, '--tk': t.color ?? undefined, fontSize: Math.max(10, g.size * 0.3) } as CSSProperties}
                onPointerDown={(e) => onTokenDown(t, e)}
                onDoubleClick={(e) => tool === 'move' && e.stopPropagation()}
                aria-label={`${t.label || 'Peão'}${t.hidden ? ' (escondido)' : ''}${conds.length ? ` — ${conds.join(', ')}` : ''}`}
              >
                {seal ? (
                  <SecretSeal kind={seal} found={p.isMaster && !!p.secretFor?.(t)?.foundAt} />
                ) : (
                  <span className="fv-token-disc" style={face?.url ? { backgroundImage: `url("${face.url}")`, ...face.style } : undefined}>
                    {!face?.url && (t.kind === 'marker' ? <InlineIcon name="sparkle" /> : initials(t.label))}
                  </span>
                )}
                {hp && hp.max > 0 && (
                  <span className="fv-token-hp" aria-hidden>
                    <i style={{ width: `${Math.max(0, Math.min(100, (hp.cur / hp.max) * 100))}%` }} />
                  </span>
                )}
                {conds.length > 0 && (
                  <span className="fv-token-conds" aria-hidden>
                    {conds.slice(0, 3).map((c) => <i key={c} title={c}>{hasConditionIcon(c) ? <ConditionIcon id={c} size={11} /> : c.slice(0, 2)}</i>)}
                    {conds.length > 3 && <i>+{conds.length - 3}</i>}
                  </span>
                )}
                {t.label && <span className="fv-token-label">{t.label}</span>}
              </button>
            );
          })}

          {fog?.on && ready && (
            <FogLayer sceneId={scene.id} fog={fog} isMaster={p.isMaster} board={board} size={g.size} px={px} viewers={sight.viewers} lights={sight.lights} dark={dark} exploredRuns={sight.exploredRuns} />
          )}
          {p.isMaster && ready && (walls.length > 0 || act?.kind === 'wall') && (
            <WallLayer walls={walls} draft={act?.kind === 'wall' ? act : null} editing={tool === 'wall' || tool === 'door'} board={board} size={g.size} px={px} />
          )}
          {doors.length > 0 && <DoorLayer doors={doors} size={g.size} px={px} onAct={actOnDoor} />}
          {act?.kind === 'fog' && (() => {
            const r = rectBetween(act.from.x, act.from.y, act.to.x, act.to.y);
            return <span className={`fv-map-fogsel is-${act.mode}`} style={{ left: px(r.x, 'x'), top: px(r.y, 'y'), width: r.w * g.size, height: r.h * g.size }} />;
          })()}

          {/* caneta-laser */}
          <svg className="fv-map-laser" width={board.w} height={board.h} aria-hidden>
            {[...p.lasers, ...(act?.kind === 'laser' ? [{ by: 'me-live', color: p.me.color, points: act.pts, at: 0 }] : [])].map((l) => (
              <polyline key={l.by} points={l.points.map((q) => `${px(q.x, 'x')},${px(q.y, 'y')}`).join(' ')} stroke={l.color} strokeWidth={Math.max(4, g.size / 10)} className={l.at ? 'is-fading' : ''} />
            ))}
          </svg>

          {dropCell && <span className="fv-map-dropcell" style={{ left: px(dropCell.x, 'x'), top: px(dropCell.y, 'y'), width: g.size, height: g.size }} aria-hidden />}

          {p.pings.map((pg) => (
            <span key={pg.id} className="fv-map-ping" style={{ left: px(pg.x, 'x'), top: px(pg.y, 'y'), '--ping': pg.color, width: g.size * 2, height: g.size * 2 } as CSSProperties} aria-hidden>
              <b style={{ fontSize: Math.max(12, g.size * 0.32) }}>{pg.who}</b>
            </span>
          ))}
        </div>

        {ruler && (
          <div className={'fv-map-meter' + (ruler.over ? ' is-over' : '')} role="status">
            {fmtMeters(ruler.m)}
            {ruler.speed !== null && <small> de {fmtMeters(ruler.speed)}</small>}
            {ruler.wall ? <small> · uma parede no caminho</small> : ruler.over && <small> · passou do deslocamento</small>}
          </div>
        )}
        {blocked > 0 && !ruler && (
          <div className="fv-map-meter is-over" role="status">
            Uma parede bloqueia o caminho
          </div>
        )}
        {myMark && (
          <div className="fv-map-meter" role="status">
            {MARK_NAME[myMark.kind]} · {myMark.kind === 'measure'
              ? fmtMeters(cellDistance(myMark.from.x - 0.5, myMark.from.y - 0.5, myMark.to.x - 0.5, myMark.to.y - 0.5) * CELL_METERS)
              : fmtMeters(markLength(myMark) * CELL_METERS)}
            {caught.length > 0 && <small> · pega: {caught.join(', ')}</small>}
          </div>
        )}
      </div>

      <MapDock
        groups={groups}
        active={active}
        iconFor={iconFor}
        onPick={pickGroup}
        light={!p.isMaster && dark && p.myLight && p.onMyLight ? { meters: p.myLight.meters, onSet: p.onMyLight } : null}
        marks={p.marks.length}
        isMaster={p.isMaster}
        onClearMarks={() => p.onClearMarks(p.isMaster)}
      />

      {active.id !== 'move' && (
        <ToolSheet
          active={active}
          tool={tool}
          onTool={setTool}
          hint={busyHint ? null : hint}
          fog={p.onFogAll ? { on: !!fog?.on, vision, onAll: p.onFogAll, onForget: p.onForgetExplored } : undefined}
          walls={
            p.onFogSet
              ? {
                  vision,
                  dark: !!fog?.dark,
                  count: walls.length,
                  readOnly: !!p.wallsReadOnly,
                  onVision: () => setFogKeys({ on: true, vision: !vision }),
                  onDark: () => setFogKeys({ dark: !fog?.dark }),
                  onUndo: () => {
                    const last = walls[walls.length - 1];
                    if (last?.id) p.onWallsRemove?.([last.id]);
                  },
                  onClear: () => p.onWallsRemove?.(walls.flatMap((w) => (w.id ? [w.id] : []))),
                }
              : undefined
          }
          secrets={
            p.isMaster
              ? {
                  list: p.secrets ?? [],
                  missing: !!p.secretsMissing,
                  tokens: p.tokens,
                  selectedId: p.selectedId,
                  onOpen: (tk) => {
                    p.onSelect?.(tk.id);
                    centerOn(tk.x + tk.size / 2, tk.y + tk.size / 2);
                  },
                }
              : undefined
          }
        />
      )}

      <ViewTools
        zoom={view.z}
        onZoom={zoomBtn}
        onFit={fit}
        onPull={p.isMaster && p.onPullView ? pullHere : undefined}
        grid={g.show ? { on: showGrid, onToggle: () => setShowGrid((v) => !v) } : undefined}
        full={p.onToggleFull ? { on: !!p.full, onToggle: p.onToggleFull } : undefined}
      />
      {active.id === 'move' && !busyHint && <div className="fv-map-hint">{hint}</div>}
      {p.overlay}
    </div>
  );
}
