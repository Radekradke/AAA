import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode, ThemeName } from '@/types/dnd';
import type { RollResult } from '@/engine/dice';
import { setSfxEnabled, playDice } from '@/lib/sfx';
import { THEME_ORDER, nativeMode } from '@/data/themes';
import type { PackId } from '@/data/contentPacks';
import { SOURCE_PACK, setEnabledPacks } from '@/data/contentPacks';

/** Modo efetivo de um tema: o escolhido ou o de nascença. */
export function themeModeOf(theme: ThemeName, modes: Partial<Record<ThemeName, ThemeMode>>): ThemeMode {
  return modes[theme] ?? nativeMode(theme);
}

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

/** Tours guiados: a ficha e a criação de personagem. */
export type TourId = 'sheet' | 'creator';

interface UiState {
  theme: ThemeName;
  toggleTheme: () => void;
  setTheme: (t: ThemeName) => void;
  /** Claro/escuro escolhido em cada tema (sem escolha = o modo de nascença do tema). */
  modes: Partial<Record<ThemeName, ThemeMode>>;
  setThemeMode: (m: ThemeMode, t?: ThemeName) => void;
  toggleThemeMode: () => void;

  /** Vantagem/desvantagem aplicada a testes de d20. */
  rollMode: RollMode;
  setRollMode: (m: RollMode) => void;

  /** Dados 3D com física no lugar do dado 2D do overlay. */
  dice3d: boolean;
  toggleDice3d: () => void;
  /** Pacotes de conteúdo ligados (Xanathar, Tasha, raças extras). */
  packs: Record<PackId, boolean>;
  togglePack: (id: PackId) => void;

  /** Já viu o tutorial de boas-vindas (não abre sozinho de novo). */
  onboarded: boolean;
  /** Tutorial aberto agora (abre sozinho na 1ª visita ou pelo menu). */
  tutorialOpen: boolean;
  openTutorial: () => void;
  /** Fecha e marca como visto. */
  closeTutorial: () => void;

  /** Tour guiado em andamento (holofote sobre a tela real). */
  tour: TourId | null;
  /** Tours já vistos neste aparelho (não abrem sozinhos de novo). */
  toursSeen: Partial<Record<TourId, boolean>>;
  startTour: (id: TourId) => void;
  /** Encerra (concluído ou pulado) e marca como visto. */
  endTour: () => void;
  /** Esquece os tours vistos (voltam a abrir sozinhos). */
  resetTours: () => void;

  /** Efeitos sonoros opcionais (sessão; ativados por gesto do usuário). */
  sound: boolean;
  toggleSound: () => void;

  /** Sinal de intensidade para o sistema de partículas (incrementa a cada ação). */
  bumpSignal: number;
  bumpAmount: number;
  bump: (amount?: number) => void;

  /**
   * Inspiração preparada: o próximo teste d20 (ataque, perícia, resistência)
   * sai com vantagem e só então o ponto é descontado da ficha `armedCharId`.
   */
  inspirationArmed: boolean;
  armedCharId: string | null;
  armInspiration: (charId: string) => void;
  /** Desarma e devolve o modo de rolagem anterior (cancelar ou após usar). */
  disarmInspiration: () => void;

  /** Ficha aberta agora: cada rolagem é marcada com ela. */
  activeCharId: string | null;
  setActiveChar: (id: string | null) => void;

  /** Rolagem atual em destaque (overlay cinematográfico). */
  currentRoll: RollResult | null;
  /** Linha do tempo da sessão (mais recente primeiro), persistida. */
  history: RollResult[];
  pushRoll: (r: RollResult) => void;
  clearRoll: () => void;
  /** Limpa o histórico de uma ficha (ou tudo, sem id). */
  clearHistory: (charId?: string) => void;

  /** Aviso de conjuração (toda magia, inclusive truques sem rolagem). */
  castNotice: CastNotice | null;
  pushCastNotice: (n: Omit<CastNotice, 'id'>) => void;
  clearCastNotice: () => void;
}

export interface CastNotice {
  id: number;
  title: string;
  /** Linha de contexto: círculo, ação gasta, duração. */
  sub: string;
  lines: string[];
  /** Escolhas rápidas (Em mim / Em outro, Curar em mim). */
  actions?: { label: string; run: () => void; primary?: boolean }[];
  warn?: string;
  /** Sono / Leque Cromático: total de PV rolado + calculadora de quem é afetado. */
  pool?: { total: number; effect: string; immune: string };
}

let _noticeTimer: ReturnType<typeof setTimeout> | null = null;
let _noticeSeq = 0;

/** Quantas rolagens guardamos no total (todas as fichas). */
export const HISTORY_MAX = 60;

/** Rolagens de uma ficha (rolagens antigas, sem dono, aparecem em todas). */
export function historyFor(history: RollResult[], charId: string | null | undefined): RollResult[] {
  if (!charId) return history;
  return history.filter((r) => !r.charId || r.charId === charId);
}

let _rollTimer: ReturnType<typeof setTimeout> | null = null;
let _modeBeforeInspiration: RollMode = 'normal';

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      // padrão para quem chega: Véu Astral (crepúsculo); a escolha de cada um fica salva
      theme: 'astral',
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
      modes: {},
      setThemeMode(m, t) {
        set((s) => ({ modes: { ...s.modes, [t ?? s.theme]: m } }));
      },
      toggleThemeMode() {
        const s = get();
        s.setThemeMode(themeModeOf(s.theme, s.modes) === 'dark' ? 'light' : 'dark');
      },

      rollMode: 'normal',
      setRollMode(m) {
        // escolher o modo na mão encerra a inspiração preparada
        set({ rollMode: m, inspirationArmed: false, armedCharId: null });
      },

      inspirationArmed: false,
      armedCharId: null,
      armInspiration(charId) {
        const prev = get().rollMode;
        _modeBeforeInspiration = prev;
        // vantagem + desvantagem se anulam (PHB 2014)
        set({ inspirationArmed: true, armedCharId: charId, rollMode: prev === 'disadvantage' ? 'normal' : 'advantage' });
      },
      disarmInspiration() {
        if (!get().inspirationArmed) return;
        set({ inspirationArmed: false, armedCharId: null, rollMode: _modeBeforeInspiration });
      },

      // quem pediu menos animação ao sistema começa com o 3D desligado
      dice3d: !prefersReducedMotion(),
      toggleDice3d() {
        set((s) => ({ dice3d: !s.dice3d }));
      },

      packs: { xge: false, tce: false, races: false },
      togglePack(id) {
        set((s) => ({ packs: { ...s.packs, [id]: !s.packs[id] } }));
      },

      onboarded: false,
      tutorialOpen: false,
      openTutorial() {
        set({ tutorialOpen: true });
      },
      closeTutorial() {
        set({ tutorialOpen: false, onboarded: true });
      },

      tour: null,
      toursSeen: {},
      startTour(id) {
        set({ tour: id, tutorialOpen: false });
      },
      endTour() {
        const id = get().tour;
        set((s) => ({ tour: null, toursSeen: id ? { ...s.toursSeen, [id]: true } : s.toursSeen }));
      },
      resetTours() {
        set({ toursSeen: {} });
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

      activeCharId: null,
      setActiveChar(id) {
        // saiu da ficha que preparou a inspiração: desarma (o ponto não foi gasto)
        if (get().inspirationArmed && get().armedCharId !== id) get().disarmInspiration();
        set({ activeCharId: id });
      },

      castNotice: null,
      pushCastNotice(n) {
        const id = ++_noticeSeq;
        set({ castNotice: { ...n, id } });
        get().bump(1.2);
        if (_noticeTimer) clearTimeout(_noticeTimer);
        // com escolha pendente, fica mais tempo na tela
        _noticeTimer = setTimeout(() => {
          if (get().castNotice?.id === id) set({ castNotice: null });
        }, n.pool ? 45000 : n.actions?.length ? 14000 : 5200);
      },
      clearCastNotice() {
        if (_noticeTimer) clearTimeout(_noticeTimer);
        set({ castNotice: null });
      },

      currentRoll: null,
      history: [],
      pushRoll(roll) {
        const r = roll.charId || !get().activeCharId ? roll : { ...roll, charId: get().activeCharId! };
        set((s) => ({ currentRoll: r, history: [r, ...s.history].slice(0, HISTORY_MAX) }));
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
      clearHistory(charId) {
        set((s) => ({ history: charId ? s.history.filter((r) => r.charId && r.charId !== charId) : [] }));
      },
    }),
    {
      name: 'fv-ui',
      // tema + linha do tempo das rolagens (a sessão sobrevive a um F5);
      // rolagem em destaque e partículas são efêmeras
      partialize: (s) => ({ theme: s.theme, modes: s.modes, history: s.history, dice3d: s.dice3d, packs: s.packs, onboarded: s.onboarded, toursSeen: s.toursSeen }),
    },
  ),
);

/** O pacote está ligado? (fora do React: lê o estado atual) */
export function packOn(id: PackId | null | undefined): boolean {
  return !id || !!useUiStore.getState().packs?.[id];
}

/** Hook: conteúdo dessa fonte ('PHB 2014', 'XGE', 'TCE') está visível? */
export function useSourceOn(): (source: string | undefined) => boolean {
  const packs = useUiStore((s) => s.packs);
  return (source) => {
    const pack = source ? SOURCE_PACK[source] : null;
    return !pack || !!packs?.[pack];
  };
}

// mantém o registro dos pacotes em dia para o motor (listas de magias etc.)
setEnabledPacks(useUiStore.getState().packs ?? {});
useUiStore.subscribe((st, prev) => {
  if (st.packs !== prev.packs) setEnabledPacks(st.packs ?? {});
});
