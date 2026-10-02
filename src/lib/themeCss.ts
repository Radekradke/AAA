import type { ThemeName } from '@/types/dnd';
import fixesUrl from '@/styles/fixes.css?url';
import astral from '@/styles/themes/astral.css?url';
import frio from '@/styles/themes/noite.css?url';
import brasa from '@/styles/themes/forja.css?url';
import verdejante from '@/styles/themes/bosque.css?url';
import carmesim from '@/styles/themes/corte.css?url';
import ouro from '@/styles/themes/ouro.css?url';
import eclipse from '@/styles/themes/eclipse.css?url';
import rubra from '@/styles/themes/rubra.css?url';

/**
 * CSS do tema sob demanda: cada pessoa baixa só o tema que usa (~40% do CSS
 * inicial era dos 8 temas). A ordem da cascata continua a de antes:
 *   CSS base (globals) → TEMA → ajustes (modo, polimento, contraste) → telas lazy
 * O <link> do tema entra logo ANTES do link dos ajustes, então trocar de tema
 * (ou a ficha ilustrada usar outro) nunca passa por cima das correções.
 */
const URLS: Record<ThemeName, string> = { astral, frio, brasa, verdejante, carmesim, ouro, eclipse, rubra };

const loaded = new Map<string, Promise<void>>();

function addLink(href: string, before: Element | null, key: string): Promise<void> {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.css = key;
  const done = new Promise<void>((resolve) => {
    // erro (offline sem cache) não trava a tela: segue sem o tema
    link.onload = link.onerror = () => resolve();
  });
  document.head.insertBefore(link, before);
  return done;
}

function fixesLink(): Element | null {
  return document.head.querySelector('link[data-css="fixes"]');
}

/** Ajustes gerais: entram uma vez, no fim do <head> na partida. */
export function loadFixesCss(): Promise<void> {
  if (!loaded.has('fixes')) loaded.set('fixes', addLink(fixesUrl, null, 'fixes'));
  return loaded.get('fixes')!;
}

/** Garante o CSS de um tema (idempotente). Resolve quando a folha carregou. */
export function loadThemeCss(theme: ThemeName): Promise<void> {
  const href = URLS[theme] ?? URLS.astral;
  if (!loaded.has(theme)) {
    void loadFixesCss();
    loaded.set(theme, addLink(href, fixesLink(), `theme-${theme}`));
  }
  return loaded.get(theme)!;
}

/** Todos os temas (o seletor de temas mostra todos de uma vez). */
export function loadAllThemesCss(): Promise<void> {
  return Promise.all((Object.keys(URLS) as ThemeName[]).map(loadThemeCss)).then(() => undefined);
}

/** Tema salvo (antes da store hidratar): para carregar o CSS antes da 1ª pintura. */
export function savedTheme(): ThemeName {
  try {
    const t = JSON.parse(localStorage.getItem('fv-ui') ?? 'null')?.state?.theme;
    if (t && t in URLS) return t as ThemeName;
  } catch {
    /* sem localStorage */
  }
  return 'astral';
}
