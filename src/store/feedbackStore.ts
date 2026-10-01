import { create } from 'zustand';

/** Aviso rápido no rodapé ("Herói duplicado", "Grom excluído · Desfazer"). */
export interface Toast {
  id: number;
  message: string;
  tone: 'ok' | 'info' | 'danger';
  action?: { label: string; run: () => void };
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
}

let seq = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const useFeedback = create<FeedbackState>()((set) => ({
  toasts: [],
  confirm: null,
  dismiss(id) {
    clearTimeout(timers.get(id));
    timers.delete(id);
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Mostra um aviso; com ação (ex.: Desfazer) fica mais tempo na tela. */
export function toast(message: string, opts: { tone?: Toast['tone']; action?: Toast['action']; ms?: number } = {}): void {
  const id = ++seq;
  const t: Toast = { id, message, tone: opts.tone ?? 'ok', action: opts.action };
  // no máximo 3 na tela: o mais antigo sai
  useFeedback.setState((s) => ({ toasts: [...s.toasts.slice(-2), t] }));
  timers.set(
    id,
    setTimeout(() => useFeedback.getState().dismiss(id), opts.ms ?? (opts.action ? 8000 : 3800)),
  );
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
