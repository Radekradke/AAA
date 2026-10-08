import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast, toastDuration, useFeedback } from '../feedbackStore';

const ids = () => useFeedback.getState().toasts.map((t) => t.message);

describe('avisos (toasts)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useFeedback.getState().toasts.forEach((t) => useFeedback.getState().dismiss(t.id));
  });
  afterEach(() => vi.useRealTimers());

  it('o tempo na tela acompanha o peso da mensagem', () => {
    expect(toastDuration('ok', false)).toBeLessThan(toastDuration('info', false));
    expect(toastDuration('info', false)).toBeLessThan(toastDuration('danger', false));
    expect(toastDuration('ok', true)).toBe(8000); // com "Desfazer" dá tempo de mudar de ideia
  });

  it('confirmação some sozinha; com Desfazer fica mais', () => {
    toast('Salvo');
    toast('Excluído', { action: { label: 'Desfazer', run: () => undefined } });
    vi.advanceTimersByTime(3300);
    expect(ids()).toEqual(['Excluído']);
    vi.advanceTimersByTime(4800);
    expect(ids()).toEqual([]);
  });

  it('mouse em cima segura o aviso; ao sair, o tempo que faltava continua', () => {
    toast('Excluído', { action: { label: 'Desfazer', run: () => undefined } });
    const id = useFeedback.getState().toasts[0].id;
    vi.advanceTimersByTime(5000);
    useFeedback.getState().pause(id);
    vi.advanceTimersByTime(60_000);
    expect(ids()).toEqual(['Excluído']);
    useFeedback.getState().resume(id);
    vi.advanceTimersByTime(2900);
    expect(ids()).toEqual(['Excluído']);
    vi.advanceTimersByTime(200);
    expect(ids()).toEqual([]);
  });

  it('no máximo 3 na tela: o mais antigo sai (e o relógio dele é limpo)', () => {
    ['a', 'b', 'c', 'd'].forEach((m) => toast(m));
    expect(ids()).toEqual(['b', 'c', 'd']);
    vi.advanceTimersByTime(4000);
    expect(ids()).toEqual([]);
  });
});
