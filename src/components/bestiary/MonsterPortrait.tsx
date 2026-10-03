import type { CSSProperties } from 'react';
import type { Monster } from '@/data/bestiary';
import type { MonsterLook, MonsterTypeKey } from '@/lib/monsterArt';
import { MONSTER_ICONS } from './monsterIcons';
import '@/styles/bestiary.css';

/** Emblema do tipo de criatura (game-icons.net), na cor do texto. */
export function MonsterIcon({ type, size = 18 }: { type: MonsterTypeKey; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor" aria-hidden style={{ flex: 'none' }}>
      {MONSTER_ICONS[type].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/**
 * Rosto da criatura: a foto (da mesa ou oficial) ou, sem foto, o emblema do
 * tipo sobre um brilho da cor do tipo. `round` para avatares pequenos.
 */
export function MonsterPortrait({ look, size, round, className }: { look: MonsterLook; size?: number; round?: boolean; className?: string }) {
  const style = { '--mc': look.color, ...(size ? { width: size, height: round ? size : Math.round(size * 1.25) } : null) } as CSSProperties;
  return (
    <span className={'fv-mport' + (round ? ' is-round' : '') + (look.art ? '' : ' is-emblem') + (className ? ` ${className}` : '')} style={style} aria-hidden>
      {look.art ? <img src={look.art} alt="" loading="lazy" decoding="async" /> : <MonsterIcon type={look.type} size={size ? Math.round(size * (round ? 0.58 : 0.5)) : 64} />}
    </span>
  );
}

/** Carta da criatura: arte em destaque, selo de ND, tipo e CA/PV/XP. */
export function MonsterCard({ m, look, onOpen, selected }: { m: Monster; look: MonsterLook; onOpen?: () => void; selected?: boolean }) {
  const style = { '--mc': look.color } as CSSProperties;
  return (
    <button type="button" className={'fv-mcard' + (selected ? ' is-selected' : '')} style={style} onClick={onOpen} aria-label={`${look.name}, ND ${m.cr}, ${m.type}`}>
      <span className="fv-mcard-art">
        <MonsterPortrait look={look} />
        <span className="fv-mcard-cr" aria-hidden>
          <small>ND</small>
          {m.cr}
        </span>
        {look.artSource === 'custom' && <span className="fv-mcard-custom" aria-hidden>da mesa</span>}
      </span>
      <span className="fv-mcard-body">
        <b>{look.name}</b>
        <small>
          {m.size} · {m.type}
        </small>
        <span className="fv-mcard-stats">
          <span>
            CA <b>{m.ac}</b>
          </span>
          <span>
            PV <b>{m.hp}</b>
          </span>
          <span>
            XP <b>{m.xp.toLocaleString('pt-BR')}</b>
          </span>
        </span>
      </span>
    </button>
  );
}
