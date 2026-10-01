import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUiStore } from '@/store/uiStore';
import { TOURS } from './tours';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const TIP_W = 320;

/** Primeiro elemento visível entre os seletores (ou nada). */
function findTarget(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') return el;
    }
  }
  return null;
}

/**
 * Tour guiado: escurece a tela, abre um "holofote" sobre o elemento real e
 * explica num balão. Segue o elemento ao rolar/redimensionar; passos sem
 * alvo visível são pulados. ←/→ trocam o passo, Esc encerra.
 */
export function GuidedTour() {
  const tourId = useUiStore((s) => s.tour);
  const endTour = useUiStore((s) => s.endTour);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [vw, setVw] = useState(() => window.innerWidth);
  const [vh, setVh] = useState(() => window.innerHeight);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  // só os passos com alvo na tela agora (PC e celular têm elementos diferentes)
  const steps = useMemo(() => (tourId ? TOURS[tourId].filter((s) => findTarget(s.target)) : []), [tourId]);
  const step = steps[i];

  useEffect(() => setI(0), [tourId]);

  // traz o alvo para a tela ao trocar de passo
  useEffect(() => {
    if (!step) return;
    findTarget(step.target)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    nextRef.current?.focus({ preventScroll: true });
  }, [step]);

  // acompanha a posição do alvo (rolagem suave, resize, conteúdo que muda)
  useLayoutEffect(() => {
    if (!step) return;
    let raf = 0;
    const tick = () => {
      const el = findTarget(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        setBox((b) =>
          b && Math.abs(b.top - r.top) < 0.5 && Math.abs(b.left - r.left) < 0.5 && Math.abs(b.width - r.width) < 0.5 && Math.abs(b.height - r.height) < 0.5
            ? b
            : { top: r.top, left: r.left, width: r.width, height: r.height },
        );
      }
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [step]);

  useEffect(() => {
    if (!tourId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour();
      else if (e.key === 'ArrowRight') setI((n) => (n + 1 < steps.length ? n + 1 : n));
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tourId, steps.length, endTour]);

  // nada a mostrar (nenhum alvo nesta tela): encerra sem travar a tela
  useEffect(() => {
    if (tourId && steps.length === 0) endTour();
  }, [tourId, steps.length, endTour]);

  if (!tourId || !step || !box) return null;

  const last = i === steps.length - 1;
  const hole = { top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 };
  // balão embaixo do alvo se couber; senão em cima; alvo enorme: dentro, no rodapé da tela
  const tipW = Math.min(TIP_W, vw - 24);
  const below = hole.top + hole.height + 14;
  const tipH = 190;
  let top: number;
  let arrow: 'up' | 'down' | 'none';
  if (below + tipH < vh) {
    top = below;
    arrow = 'up';
  } else if (hole.top - 14 - tipH > 0) {
    top = hole.top - 14 - tipH;
    arrow = 'down';
  } else {
    top = vh - tipH - 16;
    arrow = 'none';
  }
  const center = hole.left + hole.width / 2;
  const left = Math.max(12, Math.min(vw - tipW - 12, center - tipW / 2));
  const arrowX = Math.max(18, Math.min(tipW - 18, center - left));

  return createPortal(
    <div className="fv-tour" role="dialog" aria-modal="true" aria-labelledby="fv-tour-title">
      {/* bloqueia cliques na tela durante o tour; clicar fora não fecha (evita sair sem querer) */}
      <div className="fv-tour-block" />
      <div className="fv-tour-hole" style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }} aria-hidden />
      <div
        className={'fv-tour-tip' + (arrow !== 'none' ? ` has-arrow-${arrow}` : '')}
        // em cima do alvo, ancora pela base (a altura do balão varia com o texto)
        style={{ ...(arrow === 'down' ? { bottom: vh - (hole.top - 14) } : { top }), left, width: tipW, ['--arrow-x' as string]: `${arrowX}px` }}
      >
        <div className="fv-tour-count">
          {i + 1} de {steps.length}
        </div>
        <h3 id="fv-tour-title">{step.title}</h3>
        <p>{step.body}</p>
        <div className="fv-tour-actions">
          <button type="button" className="fv-tour-skip" onClick={endTour}>
            {last ? 'Fechar' : 'Pular tour'}
          </button>
          {i > 0 && (
            <button type="button" className="fv-btn-ghost fv-tour-btn" onClick={() => setI(i - 1)}>
              Voltar
            </button>
          )}
          <button ref={nextRef} type="button" className="fv-btn-gold fv-tour-btn" onClick={() => (last ? endTour() : setI(i + 1))}>
            {last ? 'Concluir' : 'Próximo ›'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
