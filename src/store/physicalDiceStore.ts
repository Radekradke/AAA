import { create } from 'zustand';
import type { DiceGroup } from '@/lib/physicalDice';

/**
 * O pedido "quanto deu no dado?" que está na tela. Quem rola espera a
 * resposta (`ask` devolve uma Promise); a janela (`PhysicalDicePrompt`)
 * responde com `answer` — os valores na ordem dos grupos — ou com `cancel`.
 */
export interface DiceAsk {
  id: number;
  /** O que está sendo rolado ("Ataque · Espada longa"). */
  label: string;
  /** Bônus que a ficha vai somar (para mostrar "d20 + 7"). */
  modifier: number;
  groups: DiceGroup[];
  /** Vantagem/desvantagem: os dois d20 são digitados e a ficha escolhe. */
  mode: 'normal' | 'advantage' | 'disadvantage';
  /** Dados a mais que a regra pediu no meio (rolar de novo). */
  reroll: boolean;
}

/**
 * Resposta da janela, por grupo: um valor por dado ou só o total do grupo
 * (ver `expandAnswer`). `'app'`: desta vez o app rola. `null`: desistiu.
 */
export type DiceAnswer = number[][] | 'app' | null;

interface PhysicalDiceState {
  current: DiceAsk | null;
  ask: (req: Omit<DiceAsk, 'id'>) => Promise<DiceAnswer>;
  answer: (a: DiceAnswer) => void;
}

let seq = 0;
let resolveCurrent: ((a: DiceAnswer) => void) | null = null;

export const usePhysicalDiceStore = create<PhysicalDiceState>()((set) => ({
  current: null,
  ask(req) {
    // um pedido novo encerra o anterior sem resposta (dois toques seguidos)
    resolveCurrent?.(null);
    return new Promise<DiceAnswer>((resolve) => {
      resolveCurrent = resolve;
      set({ current: { ...req, id: ++seq } });
    });
  },
  answer(a) {
    const r = resolveCurrent;
    resolveCurrent = null;
    set({ current: null });
    r?.(a);
  },
}));
