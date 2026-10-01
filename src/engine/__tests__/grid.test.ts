import { describe, expect, it } from 'vitest';
import { boardSize, cellDistance, cellToPx, fitView, fmtMeters, gridFromColumns, metersBetween, pxToCell, zoomAt } from '../grid';

const g = { size: 50, ox: 10, oy: 20, show: true };

describe('grade do mapa tático', () => {
  it('diagonal conta como 1 casa (Livro do Jogador)', () => {
    expect(cellDistance(0, 0, 3, 3)).toBe(3);
    expect(cellDistance(0, 0, 4, 1)).toBe(4);
    expect(metersBetween(2, 2, 8, 5)).toBe(9);
    expect(fmtMeters(4.5)).toBe('4,5 m');
  });

  it('pixel ↔ casa respeitam tamanho e deslocamento', () => {
    expect(cellToPx(g, 2, 3)).toEqual({ x: 110, y: 170 });
    expect(pxToCell(g, 110, 170)).toEqual({ x: 2, y: 3 });
  });

  it('calibra pela quantidade de quadrados na largura', () => {
    expect(gridFromColumns(2100, 30, g)).toMatchObject({ size: 70, ox: 0, oy: 0 });
  });

  it('tabuleiro em branco usa colunas × linhas', () => {
    expect(boardSize({ size: 70, ox: 0, oy: 0, show: true }, null)).toEqual({ w: 2100, h: 1400 });
    expect(boardSize(g, { w: 800, h: 600 })).toEqual({ w: 800, h: 600 });
  });

  it('enquadra e dá zoom sem mover o ponto sob o cursor', () => {
    const v = fitView({ w: 1000, h: 500 }, { w: 532, h: 532 });
    expect(v.z).toBeCloseTo(0.5);
    const z = zoomAt(v, 200, 200, 2);
    // o ponto do mundo sob (200,200) continua lá
    const before = { x: (200 - v.x) / v.z, y: (200 - v.y) / v.z };
    const after = { x: (200 - z.x) / z.z, y: (200 - z.y) / z.z };
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
});

import { coverArea, isRevealed, markLength, pointInMark, rectBetween, revealArea, subtractRect } from '../grid';
import type { MapMark } from '@/types/stage';

const mark = (kind: MapMark['kind'], to: { x: number; y: number }): MapMark => ({ id: 'm', by: 'u', who: 'u', color: '#fff', kind, from: { x: 5, y: 5 }, to });

describe('moldes de área', () => {
  it('círculo de 6 m (4 casas) pega quem está a até 4 casas do centro', () => {
    const c = mark('circle', { x: 9, y: 5 });
    expect(markLength(c)).toBe(4);
    expect(pointInMark(c, 8.5, 5.5)).toBe(true);
    expect(pointInMark(c, 9.6, 8.5)).toBe(false);
  });
  it('cone de 4,5 m abre para a frente, não para trás', () => {
    const c = mark('cone', { x: 8, y: 5 });
    expect(pointInMark(c, 7.5, 5.2)).toBe(true);
    expect(pointInMark(c, 7.9, 6.4)).toBe(true); // a 2,9 casas a meia-largura é 1,45
    expect(pointInMark(c, 6.5, 6.5)).toBe(false); // perto da origem o cone é estreito
    expect(pointInMark(c, 3.5, 5)).toBe(false);
  });
  it('linha tem 1 casa de largura', () => {
    const l = mark('line', { x: 5, y: 11 });
    expect(pointInMark(l, 5.3, 9)).toBe(true);
    expect(pointInMark(l, 6.2, 9)).toBe(false);
  });
});

describe('névoa de guerra', () => {
  it('retângulo entre duas casas é inclusivo e normalizado', () => {
    expect(rectBetween(4.7, 6.2, 2.1, 3.9)).toEqual({ x: 2, y: 3, w: 3, h: 4 });
  });
  it('subtrair divide em pedaços sem sobreposição', () => {
    const parts = subtractRect({ x: 0, y: 0, w: 4, h: 4 }, { x: 1, y: 1, w: 2, h: 2 });
    expect(parts.reduce((a, r) => a + r.w * r.h, 0)).toBe(12);
  });
  it('revelar e cobrir de novo', () => {
    let fog = { on: true, reveal: [] as { x: number; y: number; w: number; h: number }[] };
    expect(isRevealed(fog, 2.5, 2.5)).toBe(false);
    fog = revealArea(fog, { x: 0, y: 0, w: 5, h: 5 });
    expect(isRevealed(fog, 2.5, 2.5)).toBe(true);
    fog = coverArea(fog, { x: 2, y: 2, w: 1, h: 1 });
    expect(isRevealed(fog, 2.5, 2.5)).toBe(false);
    expect(isRevealed(fog, 1.5, 1.5)).toBe(true);
    expect(isRevealed({ on: false, reveal: [] }, 99, 99)).toBe(true);
  });
});
