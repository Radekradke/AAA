import { afterEach, describe, expect, it, vi } from 'vitest';

// ambiente node: um document e um window mínimos, com eventos
const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState });
const win = new EventTarget();
vi.stubGlobal('document', doc);
vi.stubGlobal('window', win);
const { onWake } = await import('../onWake');

afterEach(() => vi.useRealTimers());

describe('onWake: refaz a leitura ao voltar', () => {
  it('aba visível de novo ou internet de volta chamam; aba escondida não', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const stop = onWake(fn, 1000);
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(fn).not.toHaveBeenCalled();
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(fn).toHaveBeenCalledTimes(1);
    // os dois sinais juntos contam uma vez só
    win.dispatchEvent(new Event('online'));
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1500);
    win.dispatchEvent(new Event('online'));
    expect(fn).toHaveBeenCalledTimes(2);
    stop();
    vi.advanceTimersByTime(1500);
    win.dispatchEvent(new Event('online'));
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
