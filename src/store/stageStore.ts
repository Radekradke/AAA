import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '@/services/supabaseClient';
import { stageService } from '@/services/stageService';
import type { NewToken, TokenPatch } from '@/services/stageService';
import { PalcoSetupError } from '@/services/stageService';
import type { Handout, Scene, StagePing, StageState, Token } from '@/types/stage';

/**
 * Espelho do PALCO da mesa (cena no ar, peões, handouts). Como a sessão: a
 * verdade está no banco; cada mudança chega pelo Realtime e dispara um
 * refetch curto. Arrasto de peão e "ping" viajam por broadcast (efêmero) —
 * todos veem o peão deslizando antes de o dono soltar.
 */
interface StageStore {
  campaignId: string | null;
  isMaster: boolean;
  userId: string | null;
  who: string;
  scenes: Scene[];
  stage: StageState | null;
  /** Mestre pode abrir uma cena sem pôr no ar (preparar peões, calibrar). */
  viewSceneId: string | null;
  tokens: Token[];
  handouts: Handout[];
  /** Handout recém-entregue a mim (aviso na tela do jogador). */
  incoming: Handout | null;
  /** Posições provisórias enquanto alguém arrasta. */
  drags: Record<string, { x: number; y: number }>;
  pings: StagePing[];
  /** Cutscene que o jogador minimizou (volta ao mudar de quadro). */
  hiddenCutscene: string | null;
  missing: boolean;
  /** Erro original do banco quando o palco parece faltando (diagnóstico). */
  missingDetail: string | null;
  error: string | null;
  busy: boolean;

  open: (campaignId: string, opts: { isMaster: boolean; userId: string; who: string }) => void;
  close: () => void;
  refresh: () => Promise<void>;
  clearError: () => void;
  run: (fn: () => Promise<unknown>) => Promise<boolean>;

  viewScene: (id: string | null) => void;
  goLive: (sceneId: string | null) => Promise<void>;
  setBeat: (beat: number) => Promise<void>;
  saveScene: (scene: Partial<Scene> & { id?: string }) => Promise<Scene | null>;
  removeScene: (scene: Scene) => Promise<void>;

  addTokens: (list: NewToken[]) => Promise<void>;
  updateToken: (id: string, patch: TokenPatch) => Promise<void>;
  /** Mesmo patch em vários peões (ex.: retrato de todos os Goblins). */
  updateTokens: (ids: string[], patch: TokenPatch) => Promise<void>;
  removeToken: (id: string) => Promise<void>;
  moveToken: (id: string, x: number, y: number) => Promise<void>;
  dragPreview: (id: string, x: number, y: number) => void;
  ping: (x: number, y: number) => void;

  showHandout: (id: string, recipients: string[] | null) => Promise<void>;
  dismissIncoming: () => void;
  dismissCutscene: (key: string | null) => void;
}

let channel: RealtimeChannel | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;
let lastDrag = 0;
const PING_COLORS = ['#f5c542', '#5cc8ff', '#ff7a90', '#7dff9b', '#c49bff', '#ffa45c'];

const seenKey = (cid: string) => `fv-handouts-seen-${cid}`;
function seenHandouts(cid: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(seenKey(cid)) ?? '[]');
  } catch {
    return [];
  }
}
function markSeen(cid: string, ids: string[]) {
  try {
    localStorage.setItem(seenKey(cid), JSON.stringify([...new Set([...seenHandouts(cid), ...ids])].slice(-200)));
  } catch {
    /* ignora */
  }
}

function colorFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return PING_COLORS[Math.abs(h) % PING_COLORS.length];
}

export const useStageStore = create<StageStore>()((set, get) => {
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void get().refresh(), 120);
  };

  const addPing = (p: StagePing) => {
    set((s) => ({ pings: [...s.pings.filter((x) => x.id !== p.id), p] }));
    setTimeout(() => set((s) => ({ pings: s.pings.filter((x) => x.id !== p.id) })), 2600);
  };

  const subscribe = (campaignId: string) => {
    const client = getSupabase();
    if (!client) return;
    const filter = `campaign_id=eq.${campaignId}`;
    // o tópico precisa ser o mesmo para todos (broadcast); se um canal antigo
    // ainda está saindo, usa um nome novo — o banco segue ao vivo, só o arrasto
    // em tempo real espera a próxima entrada
    const topic = `stage-${campaignId}`;
    const busyTopic = client.getChannels().some((c) => c.topic === `realtime:${topic}`);
    channel = client
      .channel(busyTopic ? `${topic}-${Date.now()}` : topic, { config: { broadcast: { self: false } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_stage', filter }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_scenes', filter }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scene_tokens', filter }, schedule)
      // DELETE não respeita filtro no Realtime: chega sem campaign_id
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'scene_tokens' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_handouts', filter }, schedule)
      .on('broadcast', { event: 'drag' }, ({ payload }) => {
        const p = payload as { id: string; x: number; y: number; end?: boolean };
        set((s) => {
          const drags = { ...s.drags };
          if (p.end) delete drags[p.id];
          else drags[p.id] = { x: p.x, y: p.y };
          return { drags };
        });
        if (p.end) schedule();
      })
      .on('broadcast', { event: 'ping' }, ({ payload }) => addPing(payload as StagePing))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') schedule();
      });
  };

  return {
    campaignId: null,
    isMaster: false,
    userId: null,
    who: '',
    scenes: [],
    stage: null,
    viewSceneId: null,
    tokens: [],
    handouts: [],
    incoming: null,
    drags: {},
    pings: [],
    hiddenCutscene: null,
    missing: false,
    missingDetail: null,
    error: null,
    busy: false,

    open(campaignId, { isMaster, userId, who }) {
      const cur = get();
      if (cur.campaignId === campaignId && cur.userId === userId) {
        set({ isMaster, who });
        return void get().refresh();
      }
      get().close();
      set({ campaignId, isMaster, userId, who });
      subscribe(campaignId);
      void get().refresh();
    },

    close() {
      const client = getSupabase();
      if (channel && client) void client.removeChannel(channel);
      channel = null;
      if (timer) clearTimeout(timer);
      set({ campaignId: null, scenes: [], stage: null, viewSceneId: null, tokens: [], handouts: [], incoming: null, drags: {}, pings: [], missing: false, error: null });
    },

    async refresh() {
      const { campaignId, isMaster } = get();
      if (!campaignId) return;
      const mine = ++seq;
      try {
        const [scenes, stage, handouts] = await Promise.all([
          stageService.scenes(campaignId),
          stageService.stage(campaignId),
          stageService.handouts(campaignId),
        ]);
        const view = isMaster ? get().viewSceneId ?? stage?.sceneId ?? null : stage?.sceneId ?? null;
        const viewScene = scenes.find((s) => s.id === view) ?? null;
        const tokens = viewScene?.kind === 'map' ? await stageService.tokens(viewScene.id) : [];
        if (mine !== seq || get().campaignId !== campaignId) return;

        // handout novo para mim: aviso na tela (uma vez)
        let incoming = get().incoming;
        if (!isMaster) {
          const seen = seenHandouts(campaignId);
          const fresh = handouts.filter((h) => h.shownAt && !seen.includes(h.id));
          const firstLoad = !get().handouts.length && !get().scenes.length && !get().stage;
          // primeira carga: só avisa o que foi entregue nos últimos minutos
          const recent = fresh.filter((h) => !firstLoad || Date.now() - Date.parse(h.shownAt!) < 5 * 60_000);
          if (firstLoad) markSeen(campaignId, fresh.filter((h) => !recent.includes(h)).map((h) => h.id));
          if (recent.length && !incoming) incoming = recent[0];
        }
        set({ scenes, stage, handouts, tokens, incoming, missing: false, missingDetail: null, viewSceneId: isMaster ? view : null });
      } catch (e) {
        if (mine !== seq) return;
        set(e instanceof PalcoSetupError ? { missing: true, missingDetail: e.detail, error: null } : { error: (e as Error).message });
      }
    },

    clearError: () => set({ error: null }),

    async run(fn) {
      set({ busy: true, error: null });
      try {
        await fn();
        await get().refresh();
        return true;
      } catch (e) {
        set(e instanceof PalcoSetupError ? { missing: true, missingDetail: e.detail } : { error: (e as Error).message });
        return false;
      } finally {
        set({ busy: false });
      }
    },

    viewScene(id) {
      set({ viewSceneId: id, tokens: [] });
      void get().refresh();
    },

    goLive: (sceneId) => {
      // o palco do mestre acompanha a cena que foi ao ar (peões certos no refetch)
      if (sceneId) set({ viewSceneId: sceneId, hiddenCutscene: null });
      return get().run(() => stageService.goLive(get().campaignId!, sceneId)).then(() => undefined);
    },

    setBeat: (beat) => get().run(() => stageService.setBeat(get().campaignId!, Math.max(0, beat))).then(() => undefined),

    async saveScene(scene) {
      let saved: Scene | null = null;
      await get().run(async () => {
        saved = await stageService.saveScene(get().campaignId!, scene);
      });
      return saved;
    },

    removeScene: (scene) =>
      get()
        .run(async () => {
          await stageService.removeScene(scene);
          if (get().viewSceneId === scene.id) set({ viewSceneId: null });
        })
        .then(() => undefined),

    addTokens: (list) => get().run(() => stageService.addTokens(get().campaignId!, list)).then(() => undefined),
    updateToken: (id, patch) => {
      set((s) => ({ tokens: s.tokens.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      return get().run(() => stageService.updateToken(id, patch)).then(() => undefined);
    },
    updateTokens: (ids, patch) => {
      set((s) => ({ tokens: s.tokens.map((t) => (ids.includes(t.id) ? { ...t, ...patch } : t)) }));
      return get()
        .run(async () => {
          for (const id of ids) await stageService.updateToken(id, patch);
        })
        .then(() => undefined);
    },
    removeToken: (id) => {
      set((s) => ({ tokens: s.tokens.filter((t) => t.id !== id) }));
      return get().run(() => stageService.removeToken(id)).then(() => undefined);
    },

    async moveToken(id, x, y) {
      // otimista: o peão fica onde soltou; se o banco recusar, o refetch devolve
      set((s) => ({ tokens: s.tokens.map((t) => (t.id === id ? { ...t, x, y } : t)) }));
      const t = get().tokens.find((k) => k.id === id);
      if (t && !t.hidden) void channel?.send({ type: 'broadcast', event: 'drag', payload: { id, x, y, end: true } });
      try {
        await stageService.moveToken(id, x, y);
      } catch (e) {
        set({ error: (e as Error).message });
        await get().refresh();
      }
    },

    dragPreview(id, x, y) {
      const now = Date.now();
      if (now - lastDrag < 70) return;
      lastDrag = now;
      const t = get().tokens.find((k) => k.id === id);
      // peão escondido nunca vaza por broadcast
      if (!t || t.hidden) return;
      void channel?.send({ type: 'broadcast', event: 'drag', payload: { id, x, y } });
    },

    ping(x, y) {
      const { userId, who } = get();
      const p: StagePing = { id: `${userId}-${Date.now()}`, x, y, color: colorFor(userId ?? who), who };
      addPing(p);
      void channel?.send({ type: 'broadcast', event: 'ping', payload: p });
    },

    showHandout: (id, recipients) => get().run(() => stageService.showHandout(id, recipients)).then(() => undefined),

    dismissIncoming() {
      const { incoming, campaignId, handouts } = get();
      if (!incoming || !campaignId) return set({ incoming: null });
      markSeen(campaignId, [incoming.id]);
      const seen = seenHandouts(campaignId);
      const next = handouts.find((h) => h.shownAt && !seen.includes(h.id) && Date.now() - Date.parse(h.shownAt) < 5 * 60_000) ?? null;
      set({ incoming: next });
    },

    dismissCutscene: (key) => set({ hiddenCutscene: key }),
  };
});

/** Cena que está na tela de todos agora. */
export function liveScene(s: Pick<StageStore, 'scenes' | 'stage'>): Scene | null {
  return s.stage?.sceneId ? s.scenes.find((x) => x.id === s.stage!.sceneId) ?? null : null;
}
