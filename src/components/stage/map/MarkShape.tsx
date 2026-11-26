import type { CSSProperties } from 'react';
import { cellDistance, conePoints, fmtMeters, markLength } from '@/engine/grid';
import { CELL_METERS } from '@/types/stage';
import type { MapMark } from '@/types/stage';
import type { CellPx } from './geometry';

/** Desenho de uma régua ou molde de área (esfera, cone, linha, cubo). */
export function MarkShape({ m, px, size, stroke, font }: { m: MapMark; px: CellPx; size: number; stroke: number; font: number }) {
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
