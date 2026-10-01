import { create } from 'zustand';

/** Aviso rápido no rodapé ("Herói duplicado", "Grom excluído · Desfazer"). */
export interface Toast {
  id: number;
  message: string;
  tone: 'ok' | 'info' | 'danger';
  action?: { label: string; run: () => void };
  /** Quanto tempo fica na tela (a barra do "Desfazer" mostra isso). */
  ms: number;
}

/** Pedido de confirmação (substitui o window.confirm, que ignora o tema). */
export interface ConfirmRequest {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

interface FeedbackState {
  toasts: Toast[];
  confirm: ConfirmRequest | null;
  dismiss: (id: number) => void;
  /** Mouse/foco em cima do aviso: o tempo para (dá para ler e decidir). */
  pause: (id: number) => void;
  resume: (id: number) => void;
}

let seq = 0;
/** Relógio de cada aviso: quanto falta e desde quando está correndo. */
const timers = new Map<number, { handle: ReturnType<typeof setTimeout> | null; left: number; since: number }>();

function arm(id: number, ms: number) {
  timers.set(id, { handle: setTimeout(() => useFeedback.getState().dismiss(id), ms), left: ms, since: Date.now() });
}

export const useFeedback = create<FeedbackState>()((set) => ({
  toasts: [],
  confirm: null,
  dismiss(id) {
    const t = timers.get(id);
    if (t?.handle) clearTimeout(t.handle);
    timers.delete(id);
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },
  pause(id) {
    const t = timers.get(id);
    if (!t?.handle) return;
    clearTimeout(t.handle);
    timers.set(id, { handle: null, left: Math.max(600, t.left - (Date.now() - t.since)), since: Date.now() });
  },
  resume(id) {
    const t = timers.get(id);
    if (t && !t.handle) arm(id, t.left);
  },
}));

/**
 * Tempo na tela conforme o peso da mensagem: confirmação some rápido,
 * aviso fica mais, e quem tem "Desfazer" dá tempo de mudar de ideia.
 */
export function toastDuration(tone: Toast['tone'], hasAction: boolean): number {
  if (hasAction) return 8000;
  return tone === 'danger' ? 6000 : tone === 'info' ? 4500 : 3200;
}

/** Mostra um aviso (no máximo 3 na tela: o mais antigo sai). */
export function toast(message: string, opts: { tone?: Toast['tone']; action?: Toast['action']; ms?: number } = {}): void {
  const id = ++seq;
  const tone = opts.tone ?? 'ok';
  const ms = opts.ms ?? toastDuration(tone, !!opts.action);
  const t: Toast = { id, message, tone, action: opts.action, ms };
  const drop = useFeedback.getState().toasts.slice(0, -2);
  drop.forEach((x) => useFeedback.getState().dismiss(x.id));
  useFeedback.setState((s) => ({ toasts: [...s.toasts, t] }));
  arm(id, ms);
}

/** Pergunta com a janela do tema; resolve true se confirmar. */
export function confirmAction(req: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    // um pedido anterior sem resposta conta como cancelado
    useFeedback.getState().confirm?.resolve(false);
    useFeedback.setState({
      confirm: {
        ...req,
        resolve: (ok) => {
          useFeedback.setState({ confirm: null });
          resolve(ok);
        },
      },
    });
  });
}
