import { create } from 'zustand';
import { masterService, EMPTY_TRAY, toggleTray } from '@/services/masterService';
import type { MasterNote, SessionTray } from '@/services/masterService';
import type { GameSession } from '@/types/session';

/**
 * Estado LOCAL do console do mestre (o que está selecionado, painéis abertos)
 * + espelho da preparação (bandeja, notas privadas, sessões planejadas).
 * O estado de jogo (sessão, encontro, palco) continua nos stores de sempre —
 * aqui não há segunda fonte da verdade.
 */
export type Selection =
  | { kind: 'combatant'; id: string }
  | { kind: 'hero'; sheetId: string }
  | { kind: 'npc'; id: string }
  | { kind: 'handout'; id: string }
  | { kind: 'token'; id: string }
  | { kind: 'scene'; id: string }
  | { kind: 'monster'; ref: string };

export type BackstagePanel = 'sessao' | 'npcs' | 'criaturas' | 'encontro' | 'cenas' | 'pistas' | 'notas';
export type QuickKind = 'npc' | 'criatura' | 'pista' | 'item' | 'encontro' | 'nota';

interface MasterState {
  campaignId: string | null;
  selection: Selection | null;
  select: (s: Selection | null) => void;

  panel: BackstagePanel;
  setPanel: (p: BackstagePanel) => void;
  /** Celular/tablet: gavetas de Bastidores e Inspetor. */
  drawer: 'backstage' | 'inspector' | null;
  setDrawer: (d: 'backstage' | 'inspector' | null) => void;

  quick: QuickKind | null;
  /** Destino já escolhido (ex.: "Dar item" aberto pelo inspetor de um herói). */
  quickSheetId: string | null;
  openQuick: (k: QuickKind | null, opts?: { sheetId?: string }) => void;

  /** Sessão cuja bandeja está sendo vista/editada (a ao vivo ou uma preparada). */
  traySessionId: string | null;
  tray: SessionTray;
  loadTray: (sessionId: string | null) => Promise<void>;
  toggleTray: (kind: keyof SessionTray, id: string) => Promise<void>;

  planned: GameSession[];
  loadPlanned: () => Promise<void>;

  notes: MasterNote[];
  notesError: string | null;
  loadNotes: () => Promise<void>;
  addNote: (text: string, sessionId: string | null) => Promise<void>;
  updateNote: (id: string, text: string) => Promise<void>;
  removeNote: (id: string) => Promise<void>;

  error: string | null;
  clearError: () => void;
  /** Liga o console a uma campanha (zera a seleção ao trocar de mesa). */
  bind: (campaignId: string) => void;
}

export const useMasterStore = create<MasterState>()((set, get) => {
  const fail = (e: unknown) => set({ error: (e as Error).message });
  return {
    campaignId: null,
    selection: null,
    select(s) {
      // celular/tablet: tocar em algo já abre o inspetor (as colunas viram gavetas)
      const narrow = typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 1179.98px)').matches;
      set((st) => ({ selection: s, drawer: s && (narrow || st.drawer !== null) ? 'inspector' : st.drawer }));
    },

    panel: 'sessao',
    setPanel: (p) => set({ panel: p }),
    drawer: null,
    setDrawer: (d) => set({ drawer: d }),

    quick: null,
    quickSheetId: null,
    openQuick: (k, opts) => set({ quick: k, quickSheetId: opts?.sheetId ?? null }),

    traySessionId: null,
    tray: { ...EMPTY_TRAY },
    async loadTray(sessionId) {
      set({ traySessionId: sessionId, tray: { ...EMPTY_TRAY } });
      if (!sessionId) return;
      try {
        const tray = await masterService.tray(sessionId);
        if (get().traySessionId === sessionId) set({ tray });
      } catch (e) {
        fail(e);
      }
    },
    async toggleTray(kind, id) {
      const { traySessionId, campaignId, tray } = get();
      if (!traySessionId || !campaignId) return set({ error: 'Abra ou prepare uma sessão para usar a bandeja.' });
      const next = toggleTray(tray, kind, id);
      set({ tray: next }); // otimista: o atalho aparece na hora
      try {
        await masterService.saveTray(traySessionId, campaignId, next);
      } catch (e) {
        set({ tray });
        fail(e);
      }
    },

    planned: [],
    async loadPlanned() {
      const cid = get().campaignId;
      if (!cid) return;
      try {
        set({ planned: await masterService.planned(cid) });
      } catch {
        set({ planned: [] });
      }
    },

    notes: [],
    notesError: null,
    async loadNotes() {
      const cid = get().campaignId;
      if (!cid) return;
      try {
        set({ notes: await masterService.notes(cid), notesError: null });
      } catch (e) {
        set({ notesError: (e as Error).message });
      }
    },
    async addNote(text, sessionId) {
      const cid = get().campaignId;
      if (!cid || !text.trim()) return;
      const temp: MasterNote = { id: `tmp-${Date.now()}`, text: text.trim(), sessionId, createdAt: Date.now() };
      set((s) => ({ notes: [temp, ...s.notes] })); // aparece na hora; o banco confirma em seguida
      try {
        await masterService.addNote(cid, text, sessionId);
        await get().loadNotes();
      } catch (e) {
        set((s) => ({ notes: s.notes.filter((n) => n.id !== temp.id) }));
        fail(e);
      }
    },
    async updateNote(id, text) {
      const prev = get().notes;
      set({ notes: prev.map((n) => (n.id === id ? { ...n, text } : n)) });
      try {
        await masterService.updateNote(id, text);
      } catch (e) {
        set({ notes: prev });
        fail(e);
      }
    },
    async removeNote(id) {
      const prev = get().notes;
      set({ notes: prev.filter((n) => n.id !== id) });
      try {
        await masterService.removeNote(id);
      } catch (e) {
        set({ notes: prev });
        fail(e);
      }
    },

    error: null,
    clearError: () => set({ error: null }),
    bind(campaignId) {
      if (get().campaignId === campaignId) return;
      set({ campaignId, selection: null, drawer: null, quick: null, notes: [], planned: [], traySessionId: null, tray: { ...EMPTY_TRAY }, error: null });
    },
  };
});
