import { useEffect, useMemo, useRef, useState } from 'react';
import { CELL_METERS } from '@/types/stage';
import type { FogConfig, Token, Wall } from '@/types/stage';
import { blockingWalls, cellRuns, cellsSeen, pathBlocked, seen, visibilityPolygon, visionOn } from '@/engine/vision';
import type { Bounds, LightSource, Pt, Viewer } from '@/engine/vision';

/** Arrasto do meu peão (a visão não pode espiar além da parede antes de soltar). */
export interface DragLite {
  id: string;
  from: Pt;
  at: Pt;
}

interface VisionInput {
  sceneId: string;
  fog: FogConfig | undefined;
  ready: boolean;
  isMaster: boolean;
  meId: string;
  tokens: Token[];
  walls: Wall[];
  drag: DragLite | null;
  /** Arrastos ao vivo de outros (broadcast). */
  drags: Record<string, Pt>;
  bounds: Bounds;
  /** Visão no escuro do herói, em metros. */
  darkFor?: (t: Token) => number;
  /** O mestre mandou esquecer o explorado (contador). */
  exploredResetN?: number;
}

/**
 * Visão dinâmica, luz e memória da névoa de quem está olhando o mapa:
 * · quem enxerga — o mestre vê pelos olhos de todos os heróis; o jogador,
 *   pelos do próprio herói (sem herói, pelos da mesa);
 * · luz — peões com luz acesa iluminam até onde as paredes deixam;
 * · explorado — o que o herói já viu fica na penumbra (guardado no aparelho).
 */
export function useVision(o: VisionInput) {
  const { fog, ready, isMaster, meId, tokens, walls, drag, drags, bounds } = o;
  const vision = visionOn(fog);
  const dark = vision && !!fog?.dark;

  const livePos = (t: Token): Pt => (drag?.id === t.id ? drag.at : drags[t.id] ?? { x: t.x, y: t.y });
  // luz: coluna do peão (formato antigo: dentro da névoa)
  const lightOf = (t: Token) => (t.light > 0 ? t.light : fog?.lights?.[t.id] ?? 0);

  const { viewers, lights } = useMemo<{ viewers: Viewer[]; lights: LightSource[] }>(() => {
    if (!vision || !ready) return { viewers: [], lights: [] };
    const heroes = tokens.filter((t) => t.kind === 'hero' && !t.hidden);
    const mine = isMaster ? heroes : heroes.filter((t) => t.ownerId === meId);
    const from = mine.length ? mine : heroes;
    const block = blockingWalls(walls);
    const mid = (t: Token): Pt => {
      let at = livePos(t);
      // arrastando através de uma parede: enxerga de onde saiu (não espia o outro lado antes de soltar)
      if (drag?.id === t.id && !isMaster) {
        const h = t.size / 2;
        if (pathBlocked({ x: drag.from.x + h, y: drag.from.y + h }, { x: drag.at.x + h, y: drag.at.y + h }, walls)) at = drag.from;
      }
      return { x: at.x + t.size / 2, y: at.y + t.size / 2 };
    };
    return {
      viewers: from.map((t) => {
        const at = mid(t);
        return { at, poly: visibilityPolygon(at, block, bounds), dark: (o.darkFor?.(t) ?? 0) / CELL_METERS };
      }),
      lights: !dark
        ? []
        : tokens
            .filter((t) => lightOf(t) > 0)
            .map((t) => {
              const at = mid(t);
              return { at, poly: visibilityPolygon(at, block, bounds), r: lightOf(t) / CELL_METERS };
            }),
    };
  }, [vision, dark, ready, tokens, isMaster, meId, walls, fog?.lights, drag, drags, bounds, o.darkFor]); // eslint-disable-line react-hooks/exhaustive-deps

  const inSight = (x: number, y: number) => seen({ x, y }, viewers, lights, dark);

  // memória do explorado (jogador), por cena, neste aparelho
  const key = `fv-explored-${o.sceneId}`;
  const [explored, setExplored] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    try {
      setExplored(new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[]));
    } catch {
      setExplored(new Set());
    }
  }, [key]);

  const resetSeen = useRef(o.exploredResetN ?? 0);
  useEffect(() => {
    const n = o.exploredResetN ?? 0;
    if (n === resetSeen.current) return;
    resetSeen.current = n;
    setExplored(new Set());
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignora */
    }
  }, [o.exploredResetN, key]);

  useEffect(() => {
    if (isMaster || !viewers.length) return;
    const now = cellsSeen(bounds, (q) => seen(q, viewers, lights, dark));
    setExplored((prev) => {
      if (now.every((k) => prev.has(k))) return prev;
      const next = new Set(prev);
      for (const k of now) next.add(k);
      try {
        localStorage.setItem(key, JSON.stringify([...next].slice(-6000)));
      } catch {
        /* armazenamento cheio: a lembrança vale só nesta sessão */
      }
      return next;
    });
  }, [viewers, lights, dark, bounds, isMaster, key]);

  const exploredRuns = useMemo(() => (isMaster || !vision ? [] : cellRuns(explored)), [explored, isMaster, vision]);
  /** Um ponto foi visto alguma vez (casa explorada)? */
  const wasSeen = (x: number, y: number) => explored.has(`${Math.floor(x)},${Math.floor(y)}`);

  return { vision, dark, viewers, lights, inSight, wasSeen, exploredRuns, livePos };
}
