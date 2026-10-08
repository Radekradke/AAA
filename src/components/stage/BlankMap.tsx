import { useState } from 'react';
import { useStageStore } from '@/store/stageStore';
import { DEFAULT_GRID } from '@/types/stage';
import type { Scene } from '@/types/stage';

/** Tamanhos prontos do tabuleiro em branco (em casas de 1,5 m). */
export const BLANK_SIZES = [
  { id: 'p', label: 'Pequeno', cols: 16, rows: 12 },
  { id: 'm', label: 'Médio', cols: 24, rows: 16 },
  { id: 'g', label: 'Grande', cols: 34, rows: 22 },
] as const;

/** Cena de mapa sem arte: só a grade (para um roleplay rápido, sem preparar nada). */
export function blankMapScene(cols: number, rows: number, sort: number): Partial<Scene> {
  return {
    kind: 'map',
    name: `Mapa em branco ${cols}×${rows}`,
    imagePath: null,
    grid: { ...DEFAULT_GRID, ox: 0, oy: 0, show: true, cols, rows },
    beats: [],
    sort,
  };
}

/**
 * "Mapa em branco": um toque cria o tabuleiro quadriculado e já abre no
 * palco do mestre (opcionalmente já no ar para todos).
 */
export function BlankMapButton({ compact, onDone }: { compact?: boolean; onDone?: () => void }) {
  const [size, setSize] = useState<(typeof BLANK_SIZES)[number]['id']>('m');
  const busy = useStageStore((s) => s.busy);
  const create = async (live: boolean) => {
    const st = useStageStore.getState();
    const s = BLANK_SIZES.find((x) => x.id === size)!;
    const saved = await st.saveScene(blankMapScene(s.cols, s.rows, st.scenes.length));
    if (!saved) return;
    st.viewScene(saved.id);
    if (live) await useStageStore.getState().goLive(saved.id);
    onDone?.();
  };
  return (
    <div className={'fv-blankmap' + (compact ? ' is-compact' : '')}>
      <div className="fv-blankmap-head">
        <span className="fv-blankmap-ico" aria-hidden />
        <span>
          <b>Mapa em branco</b>
          <small>Só a grade, para jogar na hora.</small>
        </span>
      </div>
      <div className="fv-seg" role="radiogroup" aria-label="Tamanho do mapa">
        {BLANK_SIZES.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={size === s.id} className={size === s.id ? 'is-on' : ''} onClick={() => setSize(s.id)} title={`${s.cols} × ${s.rows} casas`}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="fv-blankmap-acts">
        <button type="button" className="fv-btn-ghost" disabled={busy} onClick={() => void create(false)}>
          Criar e ver
        </button>
        <button type="button" className="fv-btn-gold" disabled={busy} onClick={() => void create(true)}>
          Criar e pôr no ar
        </button>
      </div>
    </div>
  );
}
