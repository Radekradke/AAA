import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeName } from '@/types/dnd';
import type { RollResult } from '@/engine/dice';
import { setSfxEnabled, playDice } from '@/lib/sfx';
import { THEME_ORDER } from '@/data/themes';

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

interface UiState {
  theme: ThemeName;
  toggleTheme: () => void;
  setTheme: (t: ThemeName) => void;

  /** Vantagem/desvantagem aplicada a testes de d20. */
  rollMode: RollMode;
  setRollMode: (m: RollMode) => void;

  /** Efeitos sonoros opcionais (sessão; ativados por gesto do usuário). */
  sound: boolean;
  toggleSound: () => void;

  /** Sinal de intensidade para o sistema de partículas (incrementa a cada ação). */
  bumpSignal: number;
  bumpAmount: number;
  bump: (amount?: number) => void;

  /** Rolagem atual em destaque (overlay cinematográfico). */
  currentRoll: RollResult | null;
  history: RollResult[];
  pushRoll: (r: RollResult) => void;
  clearRoll: () => void;
}

let _rollTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'frio',
      toggleTheme() {
        // cicla pelos climas na ordem definida (frio → brasa → verdejante → …)
        set((s) => {
          const i = THEME_ORDER.indexOf(s.theme);
          return { theme: THEME_ORDER[(i + 1) % THEME_ORDER.length] };
        });
        get().bump(0.7);
      },
      setTheme(t) {
        set({ theme: t });
      },

      rollMode: 'normal',
      setRollMode(m) {
        set({ rollMode: m });
      },

      sound: false,
      toggleSound() {
        const next = !get().sound;
        setSfxEnabled(next);
        set({ sound: next });
      },

      bumpSignal: 0,
      bumpAmount: 0,
      bump(amount = 1) {
        set((s) => ({ bumpSignal: s.bumpSignal + 1, bumpAmount: amount }));
      },

      currentRoll: null,
      history: [],
      pushRoll(r) {
        // mantém apenas as 5 últimas rolagens (histórico curto na aba Mesa)
        set((s) => ({ currentRoll: r, history: [r, ...s.history].slice(0, 5) }));
        get().bump(r.crit ? 1.7 : 1.3);
        if (get().sound) playDice(r.crit);
        if (_rollTimer) clearTimeout(_rollTimer);
        // tempo para LER o resultado: 7 s; crítico/falha crítica merecem 9,5 s
        _rollTimer = setTimeout(() => set({ currentRoll: null }), r.crit || r.fail ? 9500 : 7000);
      },
      clearRoll() {
        if (_rollTimer) clearTimeout(_rollTimer);
        set({ currentRoll: null });
      },
    }),
    {
      name: 'fv-ui',
      // não persistimos rolagem/partículas, apenas tema
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
);
