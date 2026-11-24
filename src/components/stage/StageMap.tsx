import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as RPointerEvent, ReactNode } from 'react';
import { useMediaUrl } from '@/services/mediaService';
import { boardSize, cellDistance, conePoints, fitView, fmtMeters, isRevealed, markLength, metersBetween, pointInMark, rectBetween, snapCell, zoomAt } from '@/engine/grid';
import { CELL_METERS } from '@/types/stage';
import { hasStageDrop, readStageDrop } from '@/lib/stageDrop';
import type { StageDrop } from '@/lib/stageDrop';
import type { CellRect, FogConfig, LaserTrail, MapMark, MapTool, MarkKind, Scene, StagePing, Token, Wall } from '@/types/stage';
import { blockingWalls, cellRuns, cellsSeen, nearestWall, pathBlocked, seen, snapHalf, visibilityPolygon, visionOn } from '@/engine/vision';
import type { LightSource, Viewer } from '@/engine/vision';
import { ConditionIcon, hasConditionIcon } from '@/components/ui/RuleIcon';
import { InlineIcon } from '@/components/ui/Icon';

export interface TokenFace {
  /** Imagem do peão (retrato, arte do herói). */
  url?: string;
  /** Enquadramento do rosto (background-size/position). */
  style?: CSSProperties;
}

interface StageMapProps {
  scene: Scene;
  tokens: Token[];
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
  /** Mestre: troca a névoa inteira (paredes, portas, visão dinâmica). */
  onFogSet?: (fog: FogConfig) => void;
  /** Mestre: todos passam a olhar para este ponto. */
  onPullView?: (x: number, y: number, z: number) => void;
  /** Mestre: algo arrastado dos bastidores/iniciativa foi solto nesta casa. */
  onDropItem?: (item: StageDrop, cell: { x: number; y: number }) => void;
  /** Mapa em tela cheia (o palco cobre a tela; F alterna, Esc sai). */
  full?: boolean;
  onToggleFull?: () => void;
}

type View = { x: number; y: number; z: number };
type DragState = { id: string; pointer: number; from: { x: number; y: number }; grab: { x: number; y: number }; at: { x: number; y: number } };
type Act =
  | { kind: 'mark'; pointer: number; mark: MapMark }
  | { kind: 'laser'; pointer: number; pts: { x: number; y: number }[]; last: number }
  | { kind: 'fog'; pointer: number; mode: 'reveal' | 'cover'; from: { x: number; y: number }; to: { x: number; y: number } }
  | { kind: 'wall'; pointer: number; door: boolean; from: { x: number; y: number }; to: { x: number; y: number } };

const MARK_TOOLS: MarkKind[] = ['measure', 'circle', 'cone', 'line', 'square'];
const MARK_NAME: Record<MarkKind, string> = { measure: 'Régua', circle: 'Esfera / raio', cone: 'Cone', line: 'Linha', square: 'Cubo' };

/**
 * Mapa tático: imagem do mestre + grade de 1,5 m + peões, com ferramentas
 * inspiradas nas mesas virtuais mais usadas (Foundry VTT, Owlbear Rodeo,
 * Dungeon Revealer):
 * · Mover: arrasta o mapa / o próprio peão (régua contra o deslocamento);
 * · Régua e moldes de área (esfera, cone, linha, cubo) — todos veem, e o
 *   molde lista quem está dentro;
 * · Caneta-laser: risco que some, para apontar caminhos;
 * · Névoa (mestre): revela/cobre áreas; jogadores só veem o revelado;
 * · Paredes e portas (mestre) + visão dinâmica: cada herói vê até onde as
 *   paredes deixam, e o mestre abre/fecha portas com um toque;
 * · Duplo clique = ping; Shift + duplo clique (mestre) = puxa a visão de todos.
 */
export function StageMap(p: StageMapProps) {
  const { scene } = p;
  const g = scene.grid;
  const fog: FogConfig | undefined = g.fog;
  const box = useRef<HTMLDivElement>(null);
  const { url: imageUrl, error: imageError } = useMediaUrl(scene.imagePath);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const board = boardSize(g, scene.imagePath ? natural : null);
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 0.5 });
  const [fitted, setFitted] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [tool, setTool] = useState<MapTool>('move');
  const [drag, setDrag] = useState<DragState | null>(null);
  const [act, setAct] = useState<Act | null>(null);
  const [dropCell, setDropCell] = useState<{ x: number; y: number } | null>(null);
  const [blocked, setBlocked] = useState(0);
  const flashBlocked = () => {
    const n = Date.now();
    setBlocked(n);
    setTimeout(() => setBlocked((b) => (b === n ? 0 : b)), 1800);
  };
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pinch = useRef<{ d: number; view: View; cx: number; cy: number } | null>(null);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);

  const ready = !scene.imagePath || !!natural;
  const cellPx = (c: number, axis: 'x' | 'y') => (axis === 'x' ? g.ox : g.oy) + c * g.size;
  const polyPts = (poly: { x: number; y: number }[]) => poly.map((q) => `${cellPx(q.x, 'x')},${cellPx(q.y, 'y')}`).join(' ');

  // enquadra ao abrir a cena (e quando a imagem termina de carregar)
  const fit = useCallback(() => {
    const el = box.current;
    if (!el) return;
    setView(fitView(board, { w: el.clientWidth, h: el.clientHeight }));
  }, [board.w, board.h]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const key = `${scene.id}:${board.w}x${board.h}`;
    if (!ready || fitted === key) return;
    fit();
    setFitted(key);
  }, [ready, scene.id, board.w, board.h, fitted, fit]);

  // altura útil do mapa: decide quantas ferramentas cabem por coluna na caixa
  const [viewH, setViewH] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setViewH(Math.round(e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // o mestre puxou a visão / seguir o turno: centraliza no ponto pedido
  useEffect(() => {
    const el = box.current;
    if (!p.focus || !el) return;
    setView((v) => {
      const z = p.focus!.z ?? v.z;
      return { z, x: el.clientWidth / 2 - cellPx(p.focus!.x, 'x') * z, y: el.clientHeight / 2 - cellPx(p.focus!.y, 'y') * z };
    });
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

  // atalhos das ferramentas (fora de campos de texto)
  const keys = useRef({ tool, full: p.full, toggleFull: p.onToggleFull });
  keys.current = { tool, full: p.full, toggleFull: p.onToggleFull };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const map: Record<string, MapTool> = { v: 'move', r: 'measure', c: 'circle', o: 'cone', l: 'line', q: 'square', p: 'laser' };
      const cur = keys.current;
      if (map[k]) setTool(map[k]);
      else if (p.isMaster && k === 'n') setTool('reveal');
      else if (p.isMaster && k === 'w') setTool('wall');
      else if (p.isMaster && k === 'd') setTool('door');
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

  /** Começa a ferramenta ativa (régua, molde, laser, névoa) neste ponto. */
  const startTool = (pointer: number, c: { x: number; y: number }) => {
    if (tool === 'laser') {
      setAct({ kind: 'laser', pointer, pts: [c], last: 0 });
      return true;
    }
    if (tool === 'wall' || tool === 'door') {
      if (!p.isMaster) return false;
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

  const zoomBtn = (f: number) => {
    const el = box.current;
    if (el) setView((v) => zoomAt(v, el.clientWidth / 2, el.clientHeight / 2, f));
  };
  const pullHere = () => {
    const el = box.current;
    if (!el || !p.onPullView) return;
    const c = toCell(el.clientWidth / 2, el.clientHeight / 2);
    p.onPullView(c.x, c.y, view.z);
  };

  // paredes: arrastar desenha; um toque sem arrastar apaga a parede mais perto
  const walls: Wall[] = useMemo(() => fog?.walls ?? [], [fog?.walls]);
  const saveWalls = (next: Wall[], extra: Partial<FogConfig> = {}) =>
    p.onFogSet?.({ on: true, reveal: fog?.reveal ?? [], ...fog, ...extra, walls: next });
  const finishWall = (a: { door: boolean; from: { x: number; y: number }; to: { x: number; y: number } }) => {
    if (a.from.x === a.to.x && a.from.y === a.to.y) {
      const i = nearestWall(a.from, walls, 0.6);
      if (i >= 0) saveWalls(walls.filter((_, k) => k !== i));
      return;
    }
    saveWalls([...walls, { x1: a.from.x, y1: a.from.y, x2: a.to.x, y2: a.to.y, ...(a.door ? { door: true, open: false } : {}) }].slice(-1000));
  };
  const toggleDoor = (i: number) => saveWalls(walls.map((w, k) => (k === i ? { ...w, open: !w.open } : w)));

  // visão dinâmica: de onde cada herói está (posição ao vivo, inclusive no arrasto)
  const vision = visionOn(fog);
  const livePos = (t: Token) => (drag?.id === t.id ? drag.at : p.drags[t.id] ?? { x: t.x, y: t.y });
  const dark = vision && !!fog?.dark;
  const bounds = useMemo(
    () => ({ x0: -g.ox / g.size, y0: -g.oy / g.size, x1: (board.w - g.ox) / g.size, y1: (board.h - g.oy) / g.size }),
    [g.ox, g.oy, g.size, board.w, board.h],
  );
  const { viewers, lights } = useMemo<{ viewers: Viewer[]; lights: LightSource[] }>(() => {
    if (!vision || !ready) return { viewers: [], lights: [] };
    const heroes = p.tokens.filter((t) => t.kind === 'hero' && !t.hidden);
    const mine = p.isMaster ? heroes : heroes.filter((t) => t.ownerId === p.me.id);
    const from = mine.length ? mine : heroes;
    const block = blockingWalls(walls);
    const mid = (t: Token) => {
      const at = livePos(t);
      return { x: at.x + t.size / 2, y: at.y + t.size / 2 };
    };
    return {
      viewers: from.map((t) => {
        const at = mid(t);
        return { at, poly: visibilityPolygon(at, block, bounds), dark: (p.darkFor?.(t) ?? 0) / CELL_METERS };
      }),
      lights: !dark
        ? []
        : p.tokens
            .filter((t) => (fog?.lights?.[t.id] ?? 0) > 0)
            .map((t) => {
              const at = mid(t);
              return { at, poly: visibilityPolygon(at, block, bounds), r: fog!.lights![t.id] / CELL_METERS };
            }),
    };
  }, [vision, dark, ready, p.tokens, p.isMaster, p.me.id, walls, fog?.lights, drag, p.drags, bounds, p.darkFor]); // eslint-disable-line react-hooks/exhaustive-deps
  const inSight = (x: number, y: number) => seen({ x, y }, viewers, lights, dark);

  // lembrança do explorado (jogador): o que o herói já viu fica na penumbra, guardado neste aparelho
  const exploredKey = `fv-explored-${scene.id}`;
  const [explored, setExplored] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    try {
      setExplored(new Set(JSON.parse(localStorage.getItem(exploredKey) ?? '[]') as string[]));
    } catch {
      setExplored(new Set());
    }
  }, [exploredKey]);
  useEffect(() => {
    if (p.isMaster || !viewers.length) return;
    const now = cellsSeen(bounds, (q) => seen(q, viewers, lights, dark));
    setExplored((prev) => {
      if (now.every((k) => prev.has(k))) return prev;
      const next = new Set(prev);
      for (const k of now) next.add(k);
      try {
        localStorage.setItem(exploredKey, JSON.stringify([...next].slice(-6000)));
      } catch {
        /* armazenamento cheio: a lembrança vale só nesta sessão */
      }
      return next;
    });
  }, [viewers, lights, dark, bounds, p.isMaster, exploredKey]);
  const exploredRuns = useMemo(() => (p.isMaster || !vision ? [] : cellRuns(explored)), [explored, p.isMaster, vision]);

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

  // jogadores não veem peões debaixo da névoa
  const center = (t: Token) => ({ x: t.x + t.size / 2, y: t.y + t.size / 2 });
  const visibleTokens =
    p.isMaster || !fog?.on
      ? p.tokens
      : p.tokens.filter((t) => (t.kind === 'hero' && t.ownerId === p.me.id) || isRevealed(fog, center(t).x, center(t).y) || (vision && inSight(livePos(t).x + t.size / 2, livePos(t).y + t.size / 2)));

  // quem está dentro do molde que estou desenhando
  const myMark = act?.kind === 'mark' ? act.mark : null;
  const caught = myMark && myMark.kind !== 'measure' ? visibleTokens.filter((t) => pointInMark(myMark, center(t).x, center(t).y)).map((t) => t.label || 'peão') : [];

  const gridOn = showGrid && g.show;
  const selected = p.selectedId ? p.tokens.find((t) => t.id === p.selectedId) ?? null : null;
  const stroke = Math.max(2, g.size / 18);
  const fontPx = Math.max(12, g.size * 0.3);

  const tools: { t: MapTool; label: string; key: string; icon: ReactNode; master?: boolean }[] = [
    { t: 'move', label: 'Mover (V)', key: 'V', icon: <IcoMove /> },
    { t: 'measure', label: 'Régua (R)', key: 'R', icon: <IcoRuler /> },
    { t: 'circle', label: 'Esfera / raio (C)', key: 'C', icon: <IcoCircle /> },
    { t: 'cone', label: 'Cone (O)', key: 'O', icon: <IcoCone /> },
    { t: 'line', label: 'Linha (L)', key: 'L', icon: <IcoLine /> },
    { t: 'square', label: 'Cubo (Q)', key: 'Q', icon: <IcoSquare /> },
    { t: 'laser', label: 'Caneta-laser (P)', key: 'P', icon: <IcoLaser /> },
    { t: 'reveal', label: 'Revelar área (N)', key: 'N', icon: <IcoEye />, master: true },
    { t: 'cover', label: 'Cobrir área', key: '', icon: <IcoEyeOff />, master: true },
    { t: 'wall', label: 'Paredes (W)', key: 'W', icon: <IcoWall />, master: true },
    { t: 'door', label: 'Portas (D)', key: 'D', icon: <IcoDoor />, master: true },
  ];

  return (
    <div className="fv-map">
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
        aria-label={`Mapa tático: ${scene.name}. Ferramenta: ${tools.find((x) => x.t === tool)?.label}.`}
      >
        {scene.imagePath && !imageUrl && <div className="fv-map-loading">{imageError ?? 'Carregando o mapa…'}</div>}
        <div className="fv-map-world" style={{ width: board.w, height: board.h, transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
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
              <MarkShape key={m.id} m={m} px={cellPx} size={g.size} stroke={stroke} font={fontPx} />
            ))}
          </svg>

          {ruler && (
            <svg className="fv-map-ruler" width={board.w} height={board.h} aria-hidden>
              <rect x={cellPx(ruler.snap.x, 'x')} y={cellPx(ruler.snap.y, 'y')} width={g.size * (dragged?.size ?? 1)} height={g.size * (dragged?.size ?? 1)} className={ruler.over ? 'is-over' : ''} />
              <line x1={cellPx(ruler.from.x, 'x')} y1={cellPx(ruler.from.y, 'y')} x2={cellPx(ruler.to.x, 'x')} y2={cellPx(ruler.to.y, 'y')} className={ruler.over ? 'is-over' : ''} strokeWidth={Math.max(3, g.size / 12)} />
            </svg>
          )}

          {visibleTokens.map((t) => {
            const live = drag?.id === t.id ? drag.at : p.drags[t.id] ?? { x: t.x, y: t.y };
            const face = p.faceFor(t);
            const hp = p.hpFor?.(t) ?? null;
            const conds = p.conditionsFor?.(t) ?? [];
            const px = g.size * t.size;
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
            ].join(' ');
            return (
              <button
                key={t.id}
                type="button"
                className={cls}
                style={{ left: cellPx(live.x, 'x'), top: cellPx(live.y, 'y'), width: px, height: px, '--tk': t.color ?? undefined, fontSize: Math.max(10, g.size * 0.3) } as CSSProperties}
                onPointerDown={(e) => onTokenDown(t, e)}
                onDoubleClick={(e) => tool === 'move' && e.stopPropagation()}
                aria-label={`${t.label || 'Peão'}${t.hidden ? ' (escondido)' : ''}${conds.length ? ` — ${conds.join(', ')}` : ''}`}
              >
                <span className="fv-token-disc" style={face?.url ? { backgroundImage: `url("${face.url}")`, ...face.style } : undefined}>
                  {!face?.url && (t.kind === 'marker' ? <InlineIcon name="sparkle" /> : initials(t.label))}
                </span>
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

          {/* névoa: jogador vê breu fora do revelado; mestre vê um véu */}
          {fog?.on && ready && (
            <svg className={'fv-map-fog' + (p.isMaster ? ' is-master' : '')} width={board.w} height={board.h} aria-hidden>
              <defs>
                {dark &&
                  viewers.map((v, i) => (
                    <clipPath key={`c${i}`} id={`los-${scene.id}-${i}`}>
                      <polygon points={polyPts(v.poly)} />
                    </clipPath>
                  ))}
                {dark &&
                  lights.map((l, k) => (
                    <clipPath key={`l${k}`} id={`lit-${scene.id}-${k}`}>
                      <polygon points={polyPts(l.poly)} />
                    </clipPath>
                  ))}
                <mask id={`fog-${scene.id}`}>
                  <rect width="100%" height="100%" fill="white" />
                  {fog.reveal.map((r, i) => (
                    <rect key={i} x={cellPx(r.x, 'x')} y={cellPx(r.y, 'y')} width={r.w * g.size} height={r.h * g.size} fill="black" />
                  ))}
                  {exploredRuns.map((r) => (
                    <rect key={`e${r.x},${r.y}`} x={cellPx(r.x, 'x')} y={cellPx(r.y, 'y')} width={r.w * g.size} height={g.size} fill="dimgray" />
                  ))}
                  {!dark &&
                    viewers.map((v, i) => <polygon key={`v${i}`} points={polyPts(v.poly)} fill="black" />)}
                  {dark &&
                    viewers.map((v, i) => (
                      <g key={`v${i}`} clipPath={`url(#los-${scene.id}-${i})`}>
                        {v.dark > 0 && <circle cx={cellPx(v.at.x, 'x')} cy={cellPx(v.at.y, 'y')} r={v.dark * g.size} fill="black" />}
                        {lights.map((l, k) => (
                          <circle key={k} cx={cellPx(l.at.x, 'x')} cy={cellPx(l.at.y, 'y')} r={l.r * g.size} fill="black" clipPath={`url(#lit-${scene.id}-${k})`} />
                        ))}
                      </g>
                    ))}
                </mask>
              </defs>
              <rect width="100%" height="100%" mask={`url(#fog-${scene.id})`} className="fv-map-fog-fill" />
            </svg>
          )}
          {/* paredes e portas: só o mestre vê o traçado; portas abrem com um toque */}
          {p.isMaster && ready && (walls.length > 0 || act?.kind === 'wall') && (
            <svg className={'fv-map-walls' + (tool === 'wall' || tool === 'door' ? ' is-editing' : '')} width={board.w} height={board.h} aria-hidden>
              {walls.map((w, i) => (
                <line key={i} x1={cellPx(w.x1, 'x')} y1={cellPx(w.y1, 'y')} x2={cellPx(w.x2, 'x')} y2={cellPx(w.y2, 'y')} className={w.door ? (w.open ? 'is-door is-open' : 'is-door') : ''} strokeWidth={Math.max(3, g.size / 10)} />
              ))}
              {act?.kind === 'wall' && (
                <line x1={cellPx(act.from.x, 'x')} y1={cellPx(act.from.y, 'y')} x2={cellPx(act.to.x, 'x')} y2={cellPx(act.to.y, 'y')} className={'is-draft' + (act.door ? ' is-door' : '')} strokeWidth={Math.max(3, g.size / 10)} />
              )}
            </svg>
          )}
          {p.isMaster && p.onFogSet && tool === 'move' &&
            walls.map((w, i) =>
              w.door ? (
                <button
                  key={`d${i}`}
                  type="button"
                  className={'fv-map-door' + (w.open ? ' is-open' : '')}
                  style={at(cellPx((w.x1 + w.x2) / 2, 'x'), cellPx((w.y1 + w.y2) / 2, 'y'), Math.max(12, g.size * 0.35))}
                  // abre já no toque: soltar o painel lateral pode mexer o mapa antes do clique
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleDoor(i);
                  }}
                  onClick={(e) => e.detail === 0 && toggleDoor(i)}
                  aria-label={w.open ? 'Fechar a porta' : 'Abrir a porta'}
                  title={w.open ? 'Fechar a porta' : 'Abrir a porta'}
                >
                  <InlineIcon name={w.open ? 'unlock' : 'lock'} />
                </button>
              ) : null,
            )}
          {act?.kind === 'fog' && (() => {
            const r = rectBetween(act.from.x, act.from.y, act.to.x, act.to.y);
            return <span className={`fv-map-fogsel is-${act.mode}`} style={{ left: cellPx(r.x, 'x'), top: cellPx(r.y, 'y'), width: r.w * g.size, height: r.h * g.size }} />;
          })()}

          {/* caneta-laser */}
          <svg className="fv-map-laser" width={board.w} height={board.h} aria-hidden>
            {[...p.lasers, ...(act?.kind === 'laser' ? [{ by: 'me-live', color: p.me.color, points: act.pts, at: 0 }] : [])].map((l) => (
              <polyline
                key={l.by}
                points={l.points.map((q) => `${cellPx(q.x, 'x')},${cellPx(q.y, 'y')}`).join(' ')}
                stroke={l.color}
                strokeWidth={Math.max(4, g.size / 10)}
                className={l.at ? 'is-fading' : ''}
              />
            ))}
          </svg>

          {dropCell && <span className="fv-map-dropcell" style={{ left: cellPx(dropCell.x, 'x'), top: cellPx(dropCell.y, 'y'), width: g.size, height: g.size }} aria-hidden />}

          {p.pings.map((pg) => (
            <span
              key={pg.id}
              className="fv-map-ping"
              style={{ left: cellPx(pg.x, 'x'), top: cellPx(pg.y, 'y'), '--ping': pg.color, width: g.size * 2, height: g.size * 2 } as CSSProperties}
              aria-hidden
            >
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

      {/* ferramentas (esquerda): colunas explícitas — quebra em mais colunas quando o mapa é baixo */}
      <div className="fv-map-toolbox" role="toolbar" aria-label="Ferramentas do mapa" style={toolboxGrid(tools.filter((x) => !x.master || p.isMaster).length + (p.marks.length > 0 ? 1 : 0), viewH)}>
        {tools.filter((x) => !x.master || p.isMaster).map((x) => (
          <button key={x.t} type="button" className={tool === x.t ? 'is-on' : ''} onClick={() => setTool(x.t)} aria-pressed={tool === x.t} title={x.label} aria-label={x.label}>
            {x.icon}
          </button>
        ))}
        {p.marks.length > 0 && (
          <button type="button" className="is-clear" onClick={() => p.onClearMarks(p.isMaster)} title={p.isMaster ? 'Apagar todos os moldes' : 'Apagar meus moldes'} aria-label="Apagar moldes">
            <IcoTrash />
          </button>
        )}
      </div>

      {/* névoa: atalhos do mestre */}
      {p.isMaster && (tool === 'reveal' || tool === 'cover') && p.onFogAll && (
        <div className="fv-map-fogbar" role="toolbar" aria-label="Névoa de guerra">
          <span>{tool === 'reveal' ? 'Arraste para revelar' : 'Arraste para cobrir'}</span>
          <button type="button" onClick={() => p.onFogAll!('cover')}>Cobrir tudo</button>
          <button type="button" onClick={() => p.onFogAll!('reveal')}>Revelar tudo</button>
          {fog?.on && <button type="button" onClick={() => p.onFogAll!('off')}>Desligar névoa</button>}
        </div>
      )}

      {/* paredes, portas e visão dinâmica: atalhos do mestre */}
      {p.isMaster && (tool === 'wall' || tool === 'door') && p.onFogSet && (
        <div className="fv-map-fogbar" role="toolbar" aria-label="Paredes e visão">
          <span>{tool === 'wall' ? 'Arraste de quina a quina · toque numa parede apaga' : 'Arraste sobre o vão da porta · toque apaga'}</span>
          <button type="button" className={vision ? 'is-on' : ''} aria-pressed={vision} onClick={() => saveWalls(walls, { on: true, vision: !vision })}>
            Visão dinâmica: {vision ? 'ligada' : 'desligada'}
          </button>
          {vision && (
            <button type="button" className={fog?.dark ? 'is-on' : ''} aria-pressed={!!fog?.dark} onClick={() => saveWalls(walls, { dark: !fog?.dark })}>
              Cena {fog?.dark ? 'no escuro' : 'iluminada'}
            </button>
          )}
          {walls.length > 0 && <button type="button" onClick={() => saveWalls(walls.slice(0, -1))}>Desfazer última</button>}
          {walls.length > 0 && <button type="button" onClick={() => saveWalls([])}>Apagar todas</button>}
        </div>
      )}

      <div className="fv-map-tools" role="toolbar" aria-label="Zoom do mapa">
        {p.isMaster && p.onPullView && (
          <button type="button" onClick={pullHere} aria-label="Trazer todos para a minha visão" title="Trazer todos para a minha visão (ou Shift + duplo clique)">
            <IcoPull />
          </button>
        )}
        <button type="button" onClick={() => zoomBtn(1.25)} aria-label="Aproximar">+</button>
        <button type="button" onClick={() => zoomBtn(0.8)} aria-label="Afastar">−</button>
        <button type="button" onClick={fit} aria-label="Enquadrar o mapa" title="Enquadrar o mapa"><InlineIcon name="expand" /></button>
        {p.onToggleFull && (
          <button
            type="button"
            className={'fv-map-fullbtn' + (p.full ? ' is-on' : '')}
            onClick={p.onToggleFull}
            aria-pressed={!!p.full}
            aria-label={p.full ? 'Sair da tela cheia' : 'Mapa em tela cheia'}
            title={p.full ? 'Sair da tela cheia (Esc)' : 'Mapa em tela cheia (F)'}
          >
            {p.full ? <IcoShrink /> : <IcoExpand />}
          </button>
        )}
        {g.show && (
          <button type="button" className={showGrid ? 'is-on' : ''} onClick={() => setShowGrid((v) => !v)} aria-pressed={showGrid} aria-label="Mostrar grade">
            #
          </button>
        )}
      </div>
      {!selected && !myMark && !ruler && (
        <div className="fv-map-hint">
          {tool === 'move'
            ? p.isMaster
              ? 'Arraste NPCs e criaturas da lateral para cá · duplo clique aponta'
              : 'Arraste o seu peão · duplo clique (ou segure o dedo) aponta um lugar'
            : tool === 'laser'
              ? 'Risque o caminho — some sozinho'
              : tool === 'reveal' || tool === 'cover'
                ? 'Arraste um retângulo sobre o mapa'
                : tool === 'wall' || tool === 'door'
                  ? 'Só você vê as paredes; os jogadores veem o que os heróis enxergam'
                  : 'Arraste a partir da origem — todos veem o molde'}
        </div>
      )}
    </div>
  );
}

/** Desenho de uma régua ou molde de área. */
function MarkShape({ m, px, size, stroke, font }: { m: MapMark; px: (c: number, a: 'x' | 'y') => number; size: number; stroke: number; font: number }) {
  const L = markLength(m);
  const fx = px(m.from.x, 'x'), fy = px(m.from.y, 'y');
  const tx = px(m.to.x, 'x'), ty = px(m.to.y, 'y');
  const style = { '--mk': m.color } as CSSProperties;
  const label = (x: number, y: number, text: string) => (
    <g className="fv-mark-label">
      <rect x={x - font * 2.6} y={y - font * 1.9} width={font * 5.2} height={font * 1.4} rx={font * 0.3} />
      <text x={x} y={y - font * 0.85} fontSize={font} textAnchor="middle">{text}</text>
    </g>
  );
  if (m.kind === 'measure') {
    const meters = cellDistance(m.from.x - 0.5, m.from.y - 0.5, m.to.x - 0.5, m.to.y - 0.5) * CELL_METERS;
    return (
      <g className="fv-mark is-measure" style={style}>
        <line x1={fx} y1={fy} x2={tx} y2={ty} strokeWidth={stroke * 1.4} />
        <circle cx={fx} cy={fy} r={stroke * 2} />
        <circle cx={tx} cy={ty} r={stroke * 2.4} />
        {label(tx, ty, fmtMeters(meters))}
      </g>
    );
  }
  const meters = fmtMeters(L * CELL_METERS);
  if (m.kind === 'circle') {
    return (
      <g className="fv-mark" style={style}>
        <circle cx={fx} cy={fy} r={L * size} strokeWidth={stroke} />
        <line x1={fx} y1={fy} x2={tx} y2={ty} strokeWidth={stroke * 0.6} strokeDasharray={`${stroke * 2} ${stroke * 2}`} />
        {label(fx, fy - L * size * 0.35, `${meters} raio`)}
      </g>
    );
  }
  if (m.kind === 'square') {
    const sx = Math.sign(m.to.x - m.from.x) || 1, sy = Math.sign(m.to.y - m.from.y) || 1;
    const x = sx > 0 ? fx : fx - L * size, y = sy > 0 ? fy : fy - L * size;
    return (
      <g className="fv-mark" style={style}>
        <rect x={x} y={y} width={L * size} height={L * size} strokeWidth={stroke} />
        {label(x + (L * size) / 2, y + (L * size) / 2 + font, meters)}
      </g>
    );
  }
  if (m.kind === 'line') {
    const ang = Math.atan2(m.to.y - m.from.y, m.to.x - m.from.x);
    const ex = fx + Math.cos(ang) * L * size, ey = fy + Math.sin(ang) * L * size;
    const nx = -Math.sin(ang) * size * 0.5, ny = Math.cos(ang) * size * 0.5;
    return (
      <g className="fv-mark" style={style}>
        <polygon points={`${fx + nx},${fy + ny} ${ex + nx},${ey + ny} ${ex - nx},${ey - ny} ${fx - nx},${fy - ny}`} strokeWidth={stroke} />
        {label(ex, ey, meters)}
      </g>
    );
  }
  const pts = conePoints(m).map((q) => `${px(q.x, 'x')},${px(q.y, 'y')}`).join(' ');
  return (
    <g className="fv-mark" style={style}>
      <polygon points={pts} strokeWidth={stroke} />
      {label(tx, ty, meters)}
    </g>
  );
}

/** Posição absoluta de um botão sobre o mapa (portas). */
function at(left: number, top: number, fontSize: number): CSSProperties {
  return { left, top, fontSize };
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const num = label.match(/\d+$/)?.[0];
  return (parts[0][0] + (num ?? parts[1]?.[0] ?? '')).toUpperCase();
}

/* ícones de traço (24×24), currentColor */
const S = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const IcoMove = () => <svg {...S}><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" /></svg>;
const IcoRuler = () => <svg {...S}><path d="M3 17 17 3l4 4L7 21z" /><path d="M7 13l2 2M10 10l2 2M13 7l2 2" /></svg>;
const IcoCircle = () => <svg {...S}><circle cx="12" cy="12" r="8" /><path d="M12 12h8" strokeDasharray="2 2" /></svg>;
const IcoCone = () => <svg {...S}><path d="M4 12 20 4v16z" /></svg>;
const IcoLine = () => <svg {...S}><path d="M4 18 18 4l2 2L6 20z" /></svg>;
const IcoSquare = () => <svg {...S}><rect x="4" y="4" width="16" height="16" rx="1" /></svg>;
const IcoLaser = () => <svg {...S}><path d="M4 20c4-1 4-6 8-7s5-5 8-9" /><circle cx="20" cy="4" r="1.5" fill="currentColor" /></svg>;
const IcoEye = () => <svg {...S}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
const IcoEyeOff = () => <svg {...S}><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.3 6.3C3.6 8.1 2 12 2 12s4 7 10 7c1.8 0 3.4-.6 4.7-1.4" /></svg>;
const IcoWall = () => <svg {...S}><path d="M3 5h18v14H3zM3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19" /></svg>;
const IcoDoor = () => <svg {...S}><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18" /><circle cx="15" cy="12" r="1" fill="currentColor" /></svg>;
const IcoTrash = () => <svg {...S}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
/** Caixa de ferramentas: quantas casas de 36 px cabem na altura do mapa (com folga para as bordas). */
function toolboxGrid(n: number, viewH: number): CSSProperties | undefined {
  if (!viewH) return undefined;
  const rows = Math.max(1, Math.min(n, Math.floor((viewH - 28) / 40)));
  const cols = Math.ceil(n / rows);
  return { gridTemplateRows: `repeat(${rows}, 36px)`, gridTemplateColumns: `repeat(${cols}, 36px)` };
}

const IcoExpand = () => <svg {...S}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>;
const IcoShrink = () => <svg {...S}><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>;
const IcoPull = () => <svg {...S}><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>;
