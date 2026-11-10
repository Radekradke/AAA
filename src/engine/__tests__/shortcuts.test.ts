import { describe, expect, it } from 'vitest';
import { isTypingTarget, shortcutFor } from '../shortcuts';

const key = (code: string, extra: Partial<{ key: string; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean; repeat: boolean }> = {}) => ({
  key: extra.key ?? code.replace(/^Key|^Digit/, '').toLowerCase(),
  code,
  shiftKey: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  ...extra,
});

describe('atalhos de teclado', () => {
  it('cada tecla vira a rolagem certa', () => {
    expect(shortcutFor(key('KeyI'))?.action).toEqual({ kind: 'initiative' });
    expect(shortcutFor(key('KeyA'))?.action).toEqual({ kind: 'attack' });
    expect(shortcutFor(key('Digit1'))?.action).toEqual({ kind: 'check', ability: 'str' });
    expect(shortcutFor(key('Numpad6'))?.action).toEqual({ kind: 'check', ability: 'cha' });
    expect(shortcutFor(key('KeyP'))?.action).toEqual({ kind: 'skill', skill: 'perception' });
    expect(shortcutFor(key('KeyF'))?.action).toEqual({ kind: 'skill', skill: 'stealth' });
    expect(shortcutFor(key('KeyD'))?.action).toEqual({ kind: 'd20' });
  });

  it('Alt + número é salvaguarda (lido pela tecla física: no Mac Alt+3 vira "£")', () => {
    expect(shortcutFor(key('Digit3', { altKey: true, key: '£' }))?.action).toEqual({ kind: 'save', ability: 'con' });
    expect(shortcutFor(key('KeyI', { altKey: true }))).toBeNull();
  });

  it('Shift dá vantagem; "?" abre a ajuda sem vantagem', () => {
    expect(shortcutFor(key('Digit2', { shiftKey: true, key: '@' }))).toEqual({ action: { kind: 'check', ability: 'dex' }, advantage: true });
    expect(shortcutFor(key('KeyA', { shiftKey: true, key: 'A' }))?.advantage).toBe(true);
    expect(shortcutFor(key('Slash', { shiftKey: true, key: '?' }))).toEqual({ action: { kind: 'help' }, advantage: false });
  });

  it('Ctrl/⌘ ficam com o navegador; tecla segurada não repete a rolagem', () => {
    expect(shortcutFor(key('Digit1', { ctrlKey: true }))).toBeNull();
    expect(shortcutFor(key('KeyA', { metaKey: true }))).toBeNull();
    expect(shortcutFor(key('KeyI', { repeat: true }))).toBeNull();
    expect(shortcutFor(key('KeyZ'))).toBeNull();
    expect(shortcutFor(key('Digit7'))).toBeNull();
  });

  it('não dispara com o foco num campo de digitar', () => {
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'textarea' })).toBe(true);
    expect(isTypingTarget({ tagName: 'SELECT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: 'BUTTON', closest: () => null })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
