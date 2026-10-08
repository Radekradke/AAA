/**
 * Inclinação 3D das cartas (herói, aliados, coleção, caçadas, itens): um
 * único ouvinte no documento acha a carta sob o ponteiro (qualquer elemento
 * com o reflexo `.fv-metal` dentro) e escreve nela --mx/--my (luz) e
 * --rx/--ry (giro). O CSS faz o resto: a carta gira para o cursor, sobe um
 * pouco e o reflexo metálico desliza junto. Ao sair, volta macio ao lugar.
 * Só com mouse/caneta — no toque, o dedo cobre a carta.
 */
const CARD = '.fv-metal';
const MAX_X = 10; // graus no eixo X (cima/baixo)
const MAX_Y = 13; // graus no eixo Y (lados)

let current: HTMLElement | null = null;
let frame = 0;
let last: PointerEvent | null = null;

function cardOf(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  // sobe até o elemento que contém o reflexo como filho direto
  let el: Element | null = target;
  while (el && el !== document.body) {
    for (const child of Array.from(el.children)) if (child.matches(CARD)) return el as HTMLElement;
    el = el.parentElement;
  }
  return null;
}

function release(el: HTMLElement) {
  el.classList.remove('is-tilting');
  for (const v of ['--mx', '--my', '--rx', '--ry', '--hue']) el.style.removeProperty(v);
}

function paint() {
  frame = 0;
  const e = last;
  if (!e) return;
  const card = cardOf(e.target);
  if (card !== current) {
    if (current) release(current);
    current = card;
  }
  if (!card) return;
  const r = card.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  const depth = Number(card.dataset.tiltDepth ?? 1) || 1;
  const s = card.style;
  card.classList.add('fv-tilt', 'is-tilting');
  s.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
  s.setProperty('--my', `${(y * 100).toFixed(1)}%`);
  s.setProperty('--rx', `${((0.5 - y) * 2 * MAX_X * depth).toFixed(2)}deg`);
  s.setProperty('--ry', `${((x - 0.5) * 2 * MAX_Y * depth).toFixed(2)}deg`);
  s.setProperty('--hue', `${Math.round(x * 220 + y * 140)}deg`);
}

/** Liga a inclinação das cartas no app inteiro (chamar uma vez). */
export function installCardTilt() {
  if (typeof window === 'undefined' || (window as unknown as { __fvTilt?: boolean }).__fvTilt) return;
  (window as unknown as { __fvTilt?: boolean }).__fvTilt = true;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch' || reduce?.matches) return;
      last = e;
      if (!frame) frame = requestAnimationFrame(paint);
    },
    { passive: true },
  );
  // ponteiro saiu da janela/rolou para fora: devolve a carta
  const reset = () => {
    if (current) release(current);
    current = null;
    last = null;
  };
  document.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);
  // a página rolou por baixo do cursor parado: confere se ainda está sobre a carta
  document.addEventListener(
    'scroll',
    () => {
      if (!current || !last) return;
      const under = cardOf(document.elementFromPoint(last.clientX, last.clientY));
      if (under !== current) reset();
    },
    { passive: true, capture: true },
  );
}
