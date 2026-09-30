import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMediaUrl } from '@/services/mediaService';
import { liveScene, useStageStore } from '@/store/stageStore';

/**
 * Cutscene no ar: tela cheia, imagem com zoom lento de cinema e a narração
 * aparecendo letra por letra. O mestre passa os quadros; cada jogador pode
 * minimizar (volta sozinha no próximo quadro).
 */
export function CutsceneOverlay({ isMaster }: { isMaster: boolean }) {
  const st = useStageStore();
  const scene = liveScene(st);
  const beatIndex = st.stage?.beat ?? 0;
  const key = scene ? `${scene.id}:${beatIndex}` : null;

  // fecha com Esc (só na tela de quem apertou)
  useEffect(() => {
    if (!key) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') st.dismissCutscene(key);
      if (isMaster && e.key === 'ArrowRight') void st.setBeat(beatIndex + 1);
      if (isMaster && e.key === 'ArrowLeft') void st.setBeat(beatIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, isMaster, beatIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!scene || scene.kind !== 'cutscene' || !scene.beats.length || st.hiddenCutscene === key) return null;
  const i = Math.min(beatIndex, scene.beats.length - 1);
  const beat = scene.beats[i];
  const last = i >= scene.beats.length - 1;

  return createPortal(
    <div className="fv-cut" role="dialog" aria-modal="true" aria-label={`Cutscene: ${scene.name}`}>
      <BeatImage key={`${scene.id}-${i}`} path={beat.path} />
      <div className="fv-cut-bars" aria-hidden />
      <div className="fv-cut-top">
        <span>{scene.name}</span>
        <button type="button" onClick={() => st.dismissCutscene(key)}>{isMaster ? 'Minimizar' : 'Minimizar ✕'}</button>
      </div>
      <div className="fv-cut-text">
        <Typewriter key={`${scene.id}-${i}`} text={beat.text} />
      </div>
      <div className="fv-cut-foot">
        <div className="fv-cut-dots" aria-label={`Quadro ${i + 1} de ${scene.beats.length}`}>
          {scene.beats.map((_, j) => <i key={j} className={j === i ? 'is-on' : j < i ? 'is-past' : ''} />)}
        </div>
        {isMaster ? (
          <div className="fv-cut-ctl">
            <button type="button" className="fv-btn-ghost" disabled={i === 0 || st.busy} onClick={() => void st.setBeat(i - 1)}>◀</button>
            {last ? (
              <button type="button" className="fv-btn-gold" disabled={st.busy} onClick={() => void st.goLive(null)}>Encerrar cutscene</button>
            ) : (
              <button type="button" className="fv-btn-gold" disabled={st.busy} onClick={() => void st.setBeat(i + 1)}>Próximo quadro ▶</button>
            )}
          </div>
        ) : (
          <span className="fv-cut-wait">{last ? 'Fim' : 'O mestre passa os quadros'}</span>
        )}
      </div>
    </div>,
    document.body,
  );
}

function BeatImage({ path }: { path: string | null }) {
  const { url } = useMediaUrl(path);
  return <div className={'fv-cut-img' + (url ? ' is-ready' : '')} style={url ? { backgroundImage: `url("${url}")` } : undefined} aria-hidden />;
}

function Typewriter({ text }: { text: string }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setN((v) => Math.min(text.length, v + 1)), text[n] === '.' || text[n] === ',' ? 160 : 32);
    return () => clearTimeout(t);
  }, [n, text]);
  return (
    <p onClick={() => setN(text.length)} aria-live="polite">
      {text.slice(0, n)}
      {n < text.length && <span className="fv-cut-caret" aria-hidden />}
    </p>
  );
}
