import { useEffect, useRef, useState } from 'react';
import { music, useMusic } from '@/lib/music';
import { MOODS } from '@/data/soundtrack';

/** Controle da trilha sonora na barra do topo: tocar/pausar, ambiente, próxima e volume. */
export function MusicControl() {
  const m = useMusic();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="fv-music">
      <button
        type="button"
        className={'fv-topbar-icon fv-music-btn' + (m.playing ? ' is-on' : '')}
        onClick={() => setOpen((o) => !o)}
        aria-label={m.playing ? `Trilha sonora tocando: ${m.track?.title ?? ''}` : 'Trilha sonora'}
        aria-expanded={open}
        title="Trilha sonora"
      >
        <span aria-hidden className="fv-music-glyph">♫</span>
        {m.playing && (
          <span aria-hidden className="fv-music-eq">
            <i />
            <i />
            <i />
          </span>
        )}
      </button>
      {open && (
        <div className="fv-music-pop fv-panel" role="dialog" aria-label="Trilha sonora">
          <div className="fv-music-now">
            <button type="button" className="fv-music-play" onClick={() => music.toggle()} aria-label={m.playing ? 'Pausar' : 'Tocar'}>
              {m.playing ? '❚❚' : '▶'}
            </button>
            <div className="fv-music-title">
              <b>{m.track?.title ?? 'Trilha sonora'}</b>
              <small>{m.track ? `${m.track.author} · CC0` : 'Música medieval livre (CC0)'}</small>
            </div>
            <button type="button" className="fv-music-next" onClick={() => music.next()} aria-label="Próxima faixa" title="Próxima faixa">
              ⏭
            </button>
          </div>
          <div className="fv-music-moods" role="group" aria-label="Ambiente">
            {MOODS.map((md) => (
              <button
                key={md.id}
                type="button"
                aria-pressed={m.mood === md.id}
                className={'fv-music-mood' + (m.mood === md.id ? ' is-on' : '')}
                onClick={() => {
                  music.setMood(md.id);
                  if (!m.playing) music.play();
                }}
                title={md.hint}
              >
                <span aria-hidden>{md.icon}</span> {md.label}
              </button>
            ))}
          </div>
          <label className="fv-music-vol">
            <span>Volume</span>
            <input type="range" min={0} max={1} step={0.05} value={m.volume} onChange={(e) => music.setVolume(Number(e.target.value))} />
            <b>{Math.round(m.volume * 100)}%</b>
          </label>
          <p className="fv-music-credit">
            Músicas de RandomMind (OpenGameArt), domínio público. Ao rolar iniciativa com a música ligada, entra a trilha de combate.
          </p>
        </div>
      )}
    </div>
  );
}
