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
