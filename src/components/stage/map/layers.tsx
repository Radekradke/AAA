import type { CSSProperties } from 'react';
import type { FogConfig, SecretKind, Wall } from '@/types/stage';
import type { LightSource, Viewer } from '@/engine/vision';
import type { CellPx } from './geometry';
import { polyPoints } from './geometry';
import { IcoDoorOpen, IcoDoorShut, IcoLock } from './icons';

interface Board {
  w: number;
  h: number;
}

/**
 * Névoa: jogador vê breu fora do que está à vista; mestre vê um véu.
 * Máscara: branco = névoa; preto = à vista; cinza (borrado) = já explorado.
 * No escuro, cada herói vê só o que a luz ou a visão no escuro alcançam,
 * sempre dentro da própria linha de visão (clipPath).
 */
export function FogLayer(p: { sceneId: string; fog: FogConfig; isMaster: boolean; board: Board; size: number; px: CellPx; viewers: Viewer[]; lights: LightSource[]; dark: boolean; exploredRuns: { x: number; y: number; w: number }[] }) {
  const { sceneId: id, fog, px, size } = p;
  return (
    <svg className={'fv-map-fog' + (p.isMaster ? ' is-master' : '')} width={p.board.w} height={p.board.h} aria-hidden>
      <defs>
        {p.dark && p.viewers.map((v, i) => (
          <clipPath key={`c${i}`} id={`los-${id}-${i}`}>
            <polygon points={polyPoints(v.poly, px)} />
          </clipPath>
        ))}
        {p.dark && p.lights.map((l, k) => (
          <clipPath key={`l${k}`} id={`lit-${id}-${k}`}>
            <polygon points={polyPoints(l.poly, px)} />
          </clipPath>
        ))}
        <filter id={`soft-${id}`} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation={size * 0.28} />
        </filter>
        <mask id={`fog-${id}`}>
          <rect width="100%" height="100%" fill="white" />
          {fog.reveal.map((r, i) => (
            <rect key={i} x={px(r.x, 'x')} y={px(r.y, 'y')} width={r.w * size} height={r.h * size} fill="black" />
          ))}
          {p.exploredRuns.length > 0 && (
            <g filter={`url(#soft-${id})`}>
              {p.exploredRuns.map((r) => (
                <rect key={`e${r.x},${r.y}`} x={px(r.x, 'x')} y={px(r.y, 'y')} width={r.w * size} height={size} fill="dimgray" />
              ))}
            </g>
          )}
          {!p.dark && p.viewers.map((v, i) => <polygon key={`v${i}`} points={polyPoints(v.poly, px)} fill="black" />)}
          {p.dark && p.viewers.map((v, i) => (
            <g key={`v${i}`} clipPath={`url(#los-${id}-${i})`}>
              {v.dark > 0 && <circle cx={px(v.at.x, 'x')} cy={px(v.at.y, 'y')} r={v.dark * size} fill="black" />}
              {p.lights.map((l, k) => (
                <circle key={k} cx={px(l.at.x, 'x')} cy={px(l.at.y, 'y')} r={l.r * size} fill="black" clipPath={`url(#lit-${id}-${k})`} />
              ))}
            </g>
          ))}
        </mask>
      </defs>
      <rect width="100%" height="100%" mask={`url(#fog-${id})`} className="fv-map-fog-fill" />
    </svg>
  );
}

/** Traçado das paredes e portas (só o mestre vê) e a parede sendo desenhada. */
export function WallLayer(p: { walls: Wall[]; draft: { from: { x: number; y: number }; to: { x: number; y: number }; door: boolean } | null; editing: boolean; board: Board; size: number; px: CellPx }) {
  const { px } = p;
  const sw = Math.max(3, p.size / 10);
  return (
    <svg className={'fv-map-walls' + (p.editing ? ' is-editing' : '')} width={p.board.w} height={p.board.h} aria-hidden>
      {p.walls.map((w, i) => (
        <line key={w.id ?? i} x1={px(w.x1, 'x')} y1={px(w.y1, 'y')} x2={px(w.x2, 'x')} y2={px(w.y2, 'y')} className={w.door ? (w.open ? 'is-door is-open' : 'is-door') : ''} strokeWidth={sw} />
      ))}
      {p.draft && (
        <line x1={px(p.draft.from.x, 'x')} y1={px(p.draft.from.y, 'y')} x2={px(p.draft.to.x, 'x')} y2={px(p.draft.to.y, 'y')} className={'is-draft' + (p.draft.door ? ' is-door' : '')} strokeWidth={sw} />
      )}
    </svg>
  );
}

/** Maçaneta de uma porta: estado (aberta, trancada, longe) e o toque certo para cada papel. */
export interface DoorView {
  wall: Wall;
  label: string;
  /** O toque faz algo (abre/fecha, ou tranca no modo do mestre). */
  can: boolean;
  lockMode: boolean;
}

export function DoorLayer(p: { doors: DoorView[]; size: number; px: CellPx; onAct: (d: DoorView) => void }) {
  return (
    <>
      {p.doors.map((d, i) => {
        const w = d.wall;
        return (
          <button
            key={w.id ?? `d${i}`}
            type="button"
            className={'fv-map-door' + (w.open ? ' is-open' : '') + (w.locked ? ' is-locked' : '') + (d.can ? '' : ' is-far') + (d.lockMode ? ' is-lockmode' : '')}
            style={doorPos(p.px((w.x1 + w.x2) / 2, 'x'), p.px((w.y1 + w.y2) / 2, 'y'), Math.max(12, p.size * 0.35))}
            // age já no toque: soltar o painel lateral pode mexer o mapa antes do clique
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              p.onAct(d);
            }}
            onClick={(e) => e.detail === 0 && p.onAct(d)}
            aria-disabled={!d.can}
            aria-label={d.label}
            title={d.label}
          >
            {w.locked ? <IcoLock /> : w.open ? <IcoDoorOpen /> : <IcoDoorShut />}
          </button>
        );
      })}
    </>
  );
}

function doorPos(left: number, top: number, fontSize: number): CSSProperties {
  return { left, top, fontSize };
}

/** Alcance dos segredos (só o mestre): anel gravado no chão. */
export interface ReachRing {
  id: string;
  kind: SecretKind;
  x: number;
  y: number;
  cells: number;
  label: string;
}

export function ReachLayer(p: { rings: ReachRing[]; board: Board; size: number; px: CellPx }) {
  const { px, size } = p;
  return (
    <svg className="fv-map-reach" width={p.board.w} height={p.board.h} aria-hidden>
      {p.rings.map((r) => (
        <g key={r.id} className={`is-${r.kind}`}>
          <circle cx={px(r.x, 'x')} cy={px(r.y, 'y')} r={r.cells * size} className="fv-reach-fill" />
          <circle cx={px(r.x, 'x')} cy={px(r.y, 'y')} r={r.cells * size} className="fv-reach-ring" strokeWidth={Math.max(1.5, size / 28)} strokeDasharray={`${size / 5} ${size / 9}`} />
          <text x={px(r.x, 'x')} y={px(r.y, 'y') - r.cells * size - size * 0.12} fontSize={Math.max(11, size * 0.22)} textAnchor="middle">{r.label}</text>
        </g>
      ))}
    </svg>
  );
}
