import type { CSSProperties } from 'react';
import type { DiceSkin } from '@/data/diceSkins';
import '@/styles/diechip.css';

/** Dado (d20 em hexágono) pintado com uma skin: seletor, aviso da mesa. */
export function DieChip({ skin, size = 34, face = 20, locked }: { skin: DiceSkin; size?: number; face?: number | string; locked?: boolean }) {
  const style = {
    '--die-body': skin.body[0],
    '--die-ink': skin.ink[0],
    '--die-line': skin.outline[0] === 'none' ? 'transparent' : skin.outline[0],
    width: size,
    height: size,
    fontSize: Math.round(size * 0.36),
  } as CSSProperties;
  return (
    <span className={`fv-diechip tex-${skin.texture}` + (locked ? ' is-locked' : '')} style={style} aria-hidden>
      <b>{locked ? '?' : face}</b>
    </span>
  );
}
