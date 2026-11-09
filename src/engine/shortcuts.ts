import type { AbilityKey } from '@/types/dnd';

/**
 * Atalhos de teclado da ficha (PC): a tecla vira uma ação de rolagem. Puro,
 * sem DOM — quem liga no navegador é `useRollShortcuts`.
 */
export type ShortcutAction =
  | { kind: 'initiative' }
  | { kind: 'attack' }
  | { kind: 'check'; ability: AbilityKey }
  | { kind: 'save'; ability: AbilityKey }
  | { kind: 'skill'; skill: 'perception' | 'stealth' }
  | { kind: 'd20' }
  | { kind: 'help' };

export interface ShortcutKey {
  key: string;
  code: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  repeat?: boolean;
}

const ORDER: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** Número 1–6 pela tecla física (Alt+1 no Mac vira "¡" em `key`, então lê `code`). */
function digit(code: string): number | null {
  const m = code.match(/^(?:Digit|Numpad)([1-6])$/);
  return m ? Number(m[1]) : null;
}

/** A tecla e a vantagem (Shift segurado). Ctrl/⌘ ficam com o navegador. */
export function shortcutFor(e: ShortcutKey): { action: ShortcutAction; advantage: boolean } | null {
  if (e.ctrlKey || e.metaKey || e.repeat) return null;
  if (e.key === '?') return { action: { kind: 'help' }, advantage: false };
  const advantage = e.shiftKey;
  const n = digit(e.code);
  if (n) {
    const ability = ORDER[n - 1];
    return { action: e.altKey ? { kind: 'save', ability } : { kind: 'check', ability }, advantage };
  }
  if (e.altKey) return null;
  switch (e.code) {
    case 'KeyI': return { action: { kind: 'initiative' }, advantage };
    case 'KeyA': return { action: { kind: 'attack' }, advantage };
    case 'KeyP': return { action: { kind: 'skill', skill: 'perception' }, advantage };
    case 'KeyF': return { action: { kind: 'skill', skill: 'stealth' }, advantage };
    case 'KeyD': return { action: { kind: 'd20' }, advantage };
    default: return null;
  }
}

/** Foco num lugar de digitar: atalho não dispara. */
export function isTypingTarget(el: { tagName?: string; isContentEditable?: boolean; closest?: (s: string) => unknown } | null): boolean {
  if (!el) return false;
  const tag = (el.tagName ?? '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return !!el.closest?.('[contenteditable=""], [contenteditable="true"], [role="textbox"]');
}

/** Lista mostrada no painel "?" e em Configurações. */
export const SHORTCUT_HELP: { keys: string; what: string }[] = [
  { keys: 'I', what: 'Rolar iniciativa' },
  { keys: 'A', what: 'Atacar com a arma principal' },
  { keys: '1 – 6', what: 'Teste de FOR, DES, CON, INT, SAB, CAR' },
  { keys: 'Alt + 1 – 6', what: 'Salvaguarda do mesmo atributo' },
  { keys: 'P', what: 'Percepção' },
  { keys: 'F', what: 'Furtividade' },
  { keys: 'D', what: 'd20 livre' },
  { keys: 'Shift + tecla', what: 'Rola com vantagem' },
  { keys: '?', what: 'Mostra esta lista' },
];
