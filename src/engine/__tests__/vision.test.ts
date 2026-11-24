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

describe('movimento, luz e explorado', () => {
  it('a parede barra o caminho; porta aberta deixa passar', async () => {
    const { pathBlocked } = await import('../vision');
    const walls: Wall[] = [{ x1: 5, y1: 0, x2: 5, y2: 3 }, { x1: 5, y1: 3, x2: 5, y2: 4, door: true, open: false }];
    expect(pathBlocked({ x: 3.5, y: 1.5 }, { x: 6.5, y: 1.5 }, walls)).toBe(true);
    expect(pathBlocked({ x: 3.5, y: 3.5 }, { x: 6.5, y: 3.5 }, walls)).toBe(true);
    walls[1].open = true;
    expect(pathBlocked({ x: 3.5, y: 3.5 }, { x: 6.5, y: 3.5 }, walls)).toBe(false);
    expect(pathBlocked({ x: 3.5, y: 6.5 }, { x: 6.5, y: 6.5 }, walls)).toBe(false);
  });

  it('no escuro só vê o que a luz ou a visão no escuro alcançam', async () => {
    const { seen } = await import('../vision');
    const poly = visibilityPolygon({ x: 1.5, y: 5 }, [], B);
    const blind = [{ at: { x: 1.5, y: 5 }, poly, dark: 0 }];
    expect(seen({ x: 8, y: 5 }, blind, [], false)).toBe(true);
    expect(seen({ x: 8, y: 5 }, blind, [], true)).toBe(false);
    const elf = [{ at: { x: 1.5, y: 5 }, poly, dark: 12 }];
    expect(seen({ x: 8, y: 5 }, elf, [], true)).toBe(true);
    const torch = [{ at: { x: 8, y: 5 }, poly: visibilityPolygon({ x: 8, y: 5 }, [], B), r: 2 }];
    expect(seen({ x: 8.5, y: 5 }, blind, torch, true)).toBe(true);
    expect(seen({ x: 4, y: 5 }, blind, torch, true)).toBe(false);
  });

  it('casas vistas viram faixas', async () => {
    const { cellsSeen, cellRuns } = await import('../vision');
    const keys = cellsSeen({ x0: 0, y0: 0, x1: 4, y1: 2 }, (p) => p.x < 2 || p.x > 3);
    expect(keys).toEqual(['0,0', '1,0', '3,0', '0,1', '1,1', '3,1']);
    expect(cellRuns(keys)).toEqual([
      { x: 0, y: 0, w: 2 },
      { x: 3, y: 0, w: 1 },
      { x: 0, y: 1, w: 2 },
      { x: 3, y: 1, w: 1 },
    ]);
  });
});
