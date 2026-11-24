import { describe, expect, it } from 'vitest';
import { blockingWalls, nearestWall, pointInPolygon, snapHalf, visibilityPolygon } from '../vision';
import { coverArea, revealArea } from '../grid';
import type { Wall } from '@/types/stage';

const B = { x0: 0, y0: 0, x1: 10, y1: 10 };

describe('visão dinâmica', () => {
  it('sem paredes, vê o tabuleiro inteiro', () => {
    const poly = visibilityPolygon({ x: 5, y: 5 }, [], B);
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, poly)).toBe(true);
    expect(pointInPolygon({ x: 9.5, y: 9.5 }, poly)).toBe(true);
  });

  it('uma parede esconde o que está atrás dela', () => {
    const wall: Wall = { x1: 6, y1: 0, x2: 6, y2: 10 };
    const poly = visibilityPolygon({ x: 2.5, y: 5 }, [wall], B);
    expect(pointInPolygon({ x: 4, y: 5 }, poly)).toBe(true);
    expect(pointInPolygon({ x: 8, y: 5 }, poly)).toBe(false);
    expect(pointInPolygon({ x: 8, y: 1 }, poly)).toBe(false);
  });

  it('vê pela porta aberta e pelo vão da parede', () => {
    const walls: Wall[] = [
      { x1: 6, y1: 0, x2: 6, y2: 4 },
      { x1: 6, y1: 4, x2: 6, y2: 6, door: true, open: false },
      { x1: 6, y1: 6, x2: 6, y2: 10 },
    ];
    const closed = visibilityPolygon({ x: 2.5, y: 5 }, blockingWalls(walls), B);
    expect(pointInPolygon({ x: 8, y: 5 }, closed)).toBe(false);
    walls[1].open = true;
    const open = visibilityPolygon({ x: 2.5, y: 5 }, blockingWalls(walls), B);
    expect(pointInPolygon({ x: 8, y: 5 }, open)).toBe(true);
    // pelo vão só se vê em frente, não o canto escondido
    expect(pointInPolygon({ x: 9.5, y: 0.5 }, open)).toBe(false);
  });

  it('acha a parede perto do clique e encaixa em meia casa', () => {
    const walls: Wall[] = [{ x1: 0, y1: 0, x2: 4, y2: 0 }, { x1: 0, y1: 3, x2: 4, y2: 3 }];
    expect(nearestWall({ x: 2, y: 2.9 }, walls)).toBe(1);
    expect(nearestWall({ x: 2, y: 1.5 }, walls)).toBe(-1);
    expect(snapHalf(2.3)).toBe(2.5);
    expect(snapHalf(2.2)).toBe(2);
  });

  it('revelar e cobrir área mantêm paredes e visão', () => {
    const fog = { on: true, reveal: [], walls: [{ x1: 0, y1: 0, x2: 1, y2: 0 }], vision: true };
    const r = revealArea(fog, { x: 0, y: 0, w: 2, h: 2 });
    expect(r.walls).toHaveLength(1);
    expect(r.vision).toBe(true);
    expect(coverArea(r, { x: 0, y: 0, w: 1, h: 1 }).walls).toHaveLength(1);
  });
});
