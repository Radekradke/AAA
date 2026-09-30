import type DiceBox from '@3d-dice/dice-box-threejs';
import type { DiceBoxColorset } from '@3d-dice/dice-box-threejs';
import type { RollResult } from '@/engine/dice';
import type { ThemeName } from '@/types/dnd';
import { THEMES } from '@/data/themes';

/**
 * Dados 3D com física (three.js + cannon-es, via @3d-dice/dice-box-threejs).
 *
 * A engine continua sendo a fonte da verdade: o resultado é sorteado em
 * `engine/dice.ts` e o dado 3D só ENCENA — a notação "2d20@7,15" faz os
 * dados caírem exatamente nas faces sorteadas. Histórico, críticos e
 * testes contra a morte não dependem da animação.
 *
 * A biblioteca (~680 KB) é carregada sob demanda, uma única vez, num canvas
 * fixo sobre a tela (sem capturar toques).
 */

const CONTAINER_ID = 'fv-dice3d';
/** Faces que a biblioteca consegue forçar (o d100 dela só tem dezenas). */
const SUPPORTED = new Set([4, 6, 8, 10, 12, 20]);
/** Mais que isso vira bagunça na tela (e custa física): cai no 2D. */
const MAX_DICE = 10;

let box: DiceBox | null = null;
let loading: Promise<DiceBox | null> | null = null;
let failed = false;
let currentTheme: ThemeName | null = null;

/** Cores dos dados por atmosfera: corpo escuro translúcido, números dourados. */
const BODY: Record<ThemeName, string> = { frio: '#1A2F6B', brasa: '#5B2413', verdejante: '#0F4A38', carmesim: '#5A1025', astral: '#3B2275' };

function colorset(theme: ThemeName): DiceBoxColorset {
  const t = THEMES[theme];
  return { name: `fv-${theme}`, foreground: t.gold, background: BODY[theme], outline: '#05070A', texture: 'none', material: 'glass' };
}

/** WebGL disponível? (celulares muito antigos / navegadores travados). */
function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function ensureContainer(): HTMLElement {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    el.setAttribute('aria-hidden', 'true');
    el.className = 'fv-dice3d';
    document.body.appendChild(el);
  }
  return el;
}

/** Carrega e inicializa a caixa de dados (idempotente). null = 3D indisponível. */
export function loadDice3d(theme: ThemeName): Promise<DiceBox | null> {
  if (box) return Promise.resolve(box);
  if (failed || typeof window === 'undefined') return Promise.resolve(null);
  if (!loading) {
    loading = (async () => {
      if (!webglAvailable()) throw new Error('sem WebGL');
      ensureContainer();
      const { default: Box } = await import('@3d-dice/dice-box-threejs');
      const b = new Box(`#${CONTAINER_ID}`, {
        sounds: false, // o app já tem sfx próprio
        shadows: true,
        theme_surface: 'default',
        theme_customColorset: colorset(theme),
        light_intensity: 0.9,
        strength: 1.3,
      });
      await b.initialize();
      currentTheme = theme;
      box = b;
      return b;
    })().catch((err) => {
      console.warn('[dados 3D] indisponível, usando animação 2D:', err);
      failed = true;
      document.getElementById(CONTAINER_ID)?.remove();
      return null;
    });
  }
  return loading;
}

/** Esta rolagem pode ser encenada em 3D? */
export function canRoll3d(r: RollResult): boolean {
  return !failed && SUPPORTED.has(r.sides) && r.rolls.length > 0 && r.rolls.length <= MAX_DICE;
}

/**
 * - 'landed': os dados pararam nas faces sorteadas;
 * - 'slow': ainda rolando após `timeoutMs` (aparelho lento) — mostre o
 *   resultado mesmo assim, os dados terminam de cair sozinhos;
 * - 'unavailable': sem 3D para esta rolagem (use a animação 2D).
 */
export type Roll3dOutcome = 'landed' | 'slow' | 'unavailable';

/** Joga os dados 3D caindo nas faces de `r.rolls`. */
export async function roll3d(r: RollResult, theme: ThemeName, timeoutMs = 3500): Promise<Roll3dOutcome> {
  if (!canRoll3d(r)) return 'unavailable';
  const b = await loadDice3d(theme);
  if (!b) return 'unavailable';
  if (currentTheme !== theme) {
    currentTheme = theme;
    await b.updateConfig({ theme_customColorset: colorset(theme) });
  }
  setVisible(true);
  // vantagem/desvantagem: 1d20 com duas rolagens → dois d20 na mesa
  const notation = `${r.rolls.length}d${r.sides}@${r.rolls.join(',')}`;
  const slow = new Promise<Roll3dOutcome>((res) => setTimeout(() => res('slow'), timeoutMs));
  const landed = b.roll(notation).then((): Roll3dOutcome => 'landed', (): Roll3dOutcome => 'unavailable');
  return Promise.race([landed, slow]);
}

/** Recolhe os dados (fade e limpeza da mesa). */
export function clear3d(): void {
  if (!box) return;
  setVisible(false);
  const b = box;
  setTimeout(() => {
    // não limpa se uma nova rolagem já reexibiu a mesa
    if (!document.getElementById(CONTAINER_ID)?.classList.contains('is-visible')) b.clearDice();
  }, 320);
}

function setVisible(v: boolean) {
  document.getElementById(CONTAINER_ID)?.classList.toggle('is-visible', v);
}
