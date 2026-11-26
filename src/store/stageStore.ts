import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '@/services/supabaseClient';
import { stageService } from '@/services/stageService';
import type { NewToken, NewWall, TokenPatch, WallPatch } from '@/services/stageService';
import { PalcoSetupError, mapScene, mapSecret, mapToken, mapWall } from '@/services/stageService';
import { applyRowChange } from '@/lib/realtimeRows';
import type { RowChange } from '@/lib/realtimeRows';
import type { FogConfig, Handout, LaserTrail, MapMark, Scene, SceneSecret, SecretKind, StagePing, StageState, Token, Wall } from '@/types/stage';
import { KIND_NAME } from '@/engine/secrets';
import { onWake } from '@/lib/onWake';

/**
 * Espelho do PALCO da mesa (cena no ar, peões, paredes, handouts). A verdade
 * está no banco e chega pelo Realtime de dois jeitos:
 * · incremental — peões, paredes, cenas e segredos: cada evento é aplicado
 *   direto na memória (applyRowChange), sem buscar tudo de novo. É o que
 *   acontece a cada passo do combate, então é o caminho barato;
 * · recarga curta — o que muda a estrutura (palco no ar, pistas, cena nova
 *   ou que acabou de aparecer): um refetch com debounce.
 * Ao (re)conectar ou o aparelho acordar, recarrega tudo uma vez.
 * Arrasto de peão, ping, réguas e laser viajam por broadcast (efêmero).
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
  /** Réguas e moldes de área de quem está na mesa (efêmeros). */
  marks: Record<string, MapMark>;
  /** Rastro da caneta-laser de cada um (some sozinho). */
  lasers: Record<string, LaserTrail>;
  /** Pedido para centralizar o mapa (mestre puxou a visão / seguir turno). */
  focus: { x: number; y: number; z?: number; n: number } | null;
  /** Cutscene que o jogador minimizou (volta ao mudar de quadro). */
  hiddenCutscene: string | null;
  missing: boolean;
  /** Erro original do banco quando o palco parece faltando (diagnóstico). */
  missingDetail: string | null;
  error: string | null;
  busy: boolean;
  /** Segredos do mapa (só o mestre carrega). */
  secrets: SceneSecret[];
  /** A tabela de segredos ainda não existe no banco (falta rodar segredos.sql). */
  secretsMissing: boolean;

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
  myColor: () => string;
  /** Mostra/atualiza (e manda para a mesa) uma régua ou molde; null apaga. */
  putMark: (mark: MapMark) => void;
  dropMark: (id: string) => void;
  clearMarks: (all?: boolean) => void;
  laser: (points: { x: number; y: number }[]) => void;
  /** Mestre: todo mundo olha para este ponto (em casas). */
  pullView: (x: number, y: number, z?: number) => void;
  focusOn: (x: number, y: number) => void;
  saveFog: (scene: Scene, fog: FogConfig) => Promise<void>;
  /** Paredes e portas da cena aberta (scene_walls). */
  walls: Wall[];
  /** Falta rodar portas_luz.sql: paredes vêm só do formato antigo (somente leitura). */
  wallsMissing: boolean;
  addWalls: (sceneId: string, list: NewWall[]) => Promise<void>;
  patchWall: (id: string, patch: WallPatch) => Promise<void>;
  removeWalls: (ids: string[]) => Promise<void>;
  /** Abre/fecha a porta (mestre direto; jogador pelo banco, ao lado do herói). */
  toggleDoor: (wall: Wall) => Promise<void>;
  /** Luz que o peão carrega, em metros (0 apaga). Jogador: só o próprio herói. */
  setLight: (tokenId: string, meters: number) => Promise<void>;
  /** "Esqueçam o explorado": cada cena guarda quantas vezes o mestre pediu. */
  exploredReset: Record<string, number>;
  forgetExplored: (sceneId: string) => void;

  showHandout: (id: string, recipients: string[] | null) => Promise<void>;
  /** Jogador: pega o loot da pista; devolve false se já foi pego. */
  claimLoot: (id: string) => Promise<boolean>;

  /** Mestre: novo segredo nesta casa (marcador escondido + segredo); devolve o id do peão. */
  createSecret: (sceneId: string, x: number, y: number, kind?: SecretKind) => Promise<string | null>;
  saveSecret: (secret: SceneSecret) => Promise<void>;
  removeSecret: (secret: SceneSecret) => Promise<void>;
  /** Revela: peão aparece, segredo marcado como achado e a pista com o loot vai para quem achou. */
  revealSecret: (secret: SceneSecret, finder: { name: string; ownerId: string | null } | null) => Promise<void>;
  /** Volta a esconder (achado por engano). */
  hideSecret: (secret: SceneSecret) => Promise<void>;
  dismissIncoming: () => void;
  dismissCutscene: (key: string | null) => void;
}

let channel: RealtimeChannel | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let stopWake: (() => void) | null = null;
let seq = 0;
let lastDrag = 0;
/** Cor do marcador de cada tipo de segredo (é o que a mesa vê quando acha). */
export const SECRET_COLOR: Record<SecretKind, string> = { chest: '#d9a441', trap: '#e0524f', door: '#8fa6b8', clue: '#6fc2b0', item: '#b48ef0' };
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

  const addLaser = (t: LaserTrail) => {
    set((s) => ({ lasers: { ...s.lasers, [t.by]: t } }));
    setTimeout(() => set((s) => (s.lasers[t.by]?.at === t.at ? { lasers: Object.fromEntries(Object.entries(s.lasers).filter(([k]) => k !== t.by)) } : {})), 1400);
  };
  const send = (event: string, payload: Record<string, unknown>) => void channel?.send({ type: 'broadcast', event, payload });

  /**
   * Gravação do dia a dia (peão, parede, névoa): a tela já mudou (otimista) e
   * o evento do banco confirma — só recarrega tudo se der erro, para voltar
   * ao que o banco tem.
   */
  const write = async (fn: () => Promise<unknown>): Promise<void> => {
    try {
      await fn();
    } catch (e) {
      set(e instanceof PalcoSetupError ? { missing: true, missingDetail: e.detail } : { error: (e as Error).message });
      await get().refresh();
    }
  };

  /** Cena aberta no mapa agora (é dela que guardamos peões e paredes). */
  const openSceneId = () => {
    const s = get();
    return s.isMaster ? s.viewSceneId ?? s.stage?.sceneId ?? null : s.stage?.sceneId ?? null;
  };
  const onToken = (c: RowChange) => {
    const sceneId = openSceneId();
    const { isMaster } = get();
    set((s) => {
      const tokens = applyRowChange(s.tokens, c, mapToken, (t) => t.sceneId === sceneId && (isMaster || !t.hidden));
      return tokens === s.tokens ? {} : { tokens };
    });
  };
  const onWall = (c: RowChange) => {
    if (get().wallsMissing) return;
    const sceneId = openSceneId();
    set((s) => {
      const walls = applyRowChange(s.walls as (Wall & { id: string })[], c, (r) => mapWall(r) as Wall & { id: string }, (w) => w.sceneId === sceneId);
      return walls === s.walls ? {} : { walls };
    });
  };
  const onScene = (c: RowChange) => {
    // cena nova, apagada ou que acabou de aparecer para o jogador: estrutura muda — recarrega
    const id = String((c.eventType === 'DELETE' ? c.old : c.new)?.id ?? '');
    if (c.eventType !== 'UPDATE' || !get().scenes.some((x) => x.id === id)) return schedule();
    set((s) => ({ scenes: s.scenes.map((x) => (x.id === id ? { ...mapScene(c.new), updatedAt: String(c.new.updated_at ?? x.updatedAt) } : x)) }));
  };
  const onSecret = (c: RowChange) => {
    if (!get().isMaster) return;
    set((s) => {
      const secrets = applyRowChange(s.secrets, c, mapSecret);
      return secrets === s.secrets ? {} : { secrets };
    });
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
      // estrutura: recarga curta
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_stage', filter }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_handouts', filter }, schedule)
      // o dia a dia do jogo: aplica o evento direto
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_scenes', filter }, (c) => onScene(c as unknown as RowChange))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scene_tokens', filter }, (c) => onToken(c as unknown as RowChange))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scene_walls', filter }, (c) => onWall(c as unknown as RowChange))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scene_secrets', filter }, (c) => onSecret(c as unknown as RowChange))
      // DELETE não respeita filtro no Realtime: chega só com o id (sumir um id que não temos não faz nada)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'scene_tokens' }, (c) => onToken(c as unknown as RowChange))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'scene_walls' }, (c) => onWall(c as unknown as RowChange))
      .on('broadcast', { event: 'drag' }, ({ payload }) => {
        const p = payload as { id: string; x: number; y: number; end?: boolean };
        set((s) => {
          const drags = { ...s.drags };
          if (p.end) delete drags[p.id];
          else drags[p.id] = { x: p.x, y: p.y };
          return { drags };
        });
        // a posição final chega pelo evento do banco (scene_tokens)
      })
      .on('broadcast', { event: 'ping' }, ({ payload }) => addPing(payload as StagePing))
      .on('broadcast', { event: 'mark' }, ({ payload }) => {
        const p = payload as { mark?: MapMark; drop?: string; clearBy?: string; clearAll?: boolean };
        set((s) => {
          const marks = { ...s.marks };
          if (p.mark) marks[p.mark.id] = p.mark;
          if (p.drop) delete marks[p.drop];
          if (p.clearAll) return { marks: {} };
          if (p.clearBy) for (const k of Object.keys(marks)) if (marks[k].by === p.clearBy) delete marks[k];
          return { marks };
        });
      })
      .on('broadcast', { event: 'laser' }, ({ payload }) => addLaser(payload as LaserTrail))
      .on('broadcast', { event: 'explored-reset' }, ({ payload }) => {
        const id = String((payload as { sceneId?: string }).sceneId ?? '');
        if (id) set((s) => ({ exploredReset: { ...s.exploredReset, [id]: (s.exploredReset[id] ?? 0) + 1 } }));
      })
      .on('broadcast', { event: 'focus' }, ({ payload }) => {
        const p = payload as { x: number; y: number; z?: number };
        set((s) => ({ focus: { ...p, n: (s.focus?.n ?? 0) + 1 } }));
      })
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
    marks: {},
    lasers: {},
    focus: null,
    hiddenCutscene: null,
    missing: false,
    missingDetail: null,
    error: null,
    busy: false,
    secrets: [],
    secretsMissing: false,
    exploredReset: {},
    walls: [],
    wallsMissing: false,

    open(campaignId, { isMaster, userId, who }) {
      const cur = get();
      if (cur.campaignId === campaignId && cur.userId === userId) {
        set({ isMaster, who });
        return void get().refresh();
      }
      get().close();
      set({ campaignId, isMaster, userId, who });
      subscribe(campaignId);
      // celular voltou do bolso / rede voltou: o canal pode ter caído calado
      stopWake = onWake(schedule);
      void get().refresh();
    },

    close() {
      const client = getSupabase();
      if (channel && client) void client.removeChannel(channel);
      channel = null;
      stopWake?.();
      stopWake = null;
      if (timer) clearTimeout(timer);
      set({ campaignId: null, scenes: [], stage: null, viewSceneId: null, tokens: [], handouts: [], incoming: null, drags: {}, pings: [], marks: {}, lasers: {}, focus: null, missing: false, error: null, secrets: [], secretsMissing: false, walls: [], wallsMissing: false });
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
        const isMap = viewScene?.kind === 'map';
        const [tokens, wallRows] = isMap ? await Promise.all([stageService.tokens(viewScene.id), stageService.walls(viewScene.id)]) : [[], []];
        // sem a tabela (falta portas_luz.sql): mostra as paredes do formato antigo, só leitura
        const wallsMissing = isMap && wallRows === null;
        const walls = wallsMissing ? viewScene?.grid.fog?.walls ?? [] : wallRows ?? [];
        // segredos: só o mestre; sem a tabela, o resto do palco segue normal
        let secrets = get().secrets;
        let secretsMissing = false;
        if (isMaster) {
          try {
            secrets = await stageService.secrets(campaignId);
          } catch {
            secrets = [];
            secretsMissing = true;
          }
        }
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
        set({ scenes, stage, handouts, tokens, walls, wallsMissing, incoming, secrets, secretsMissing, missing: false, missingDetail: null, viewSceneId: isMaster ? view : null });
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

    addTokens: (list) => {
      const campaignId = get().campaignId;
      if (!campaignId || !list.length) return Promise.resolve();
      // id gerado aqui: o peão aparece na hora e o evento do banco só confirma (mesmo id)
      const rows = list.map((t) => ({ ...t, id: t.id ?? crypto.randomUUID() }));
      const sceneId = openSceneId();
      set((s) => ({ tokens: [...s.tokens, ...rows.filter((t) => t.sceneId === sceneId).map((t) => ({ ...t, campaignId, light: t.light ?? 0 }))] }));
      return write(() => stageService.addTokens(campaignId, rows));
    },
    updateToken: (id, patch) => {
      set((s) => ({ tokens: s.tokens.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      return write(() => stageService.updateToken(id, patch));
    },
    updateTokens: (ids, patch) => {
      set((s) => ({ tokens: s.tokens.map((t) => (ids.includes(t.id) ? { ...t, ...patch } : t)) }));
      return write(() => Promise.all(ids.map((id) => stageService.updateToken(id, patch))));
    },
    removeToken: (id) => {
      set((s) => ({ tokens: s.tokens.filter((t) => t.id !== id) }));
      return write(() => stageService.removeToken(id));
    },

    async moveToken(id, x, y) {
      // otimista: o peão fica onde soltou; se o banco recusar, o refetch devolve
      set((s) => ({ tokens: s.tokens.map((t) => (t.id === id ? { ...t, x, y } : t)) }));
      const t = get().tokens.find((k) => k.id === id);
      if (t && !t.hidden) void channel?.send({ type: 'broadcast', event: 'drag', payload: { id, x, y, end: true } });
      try {
        await stageService.moveToken(id, x, y, get().isMaster);
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

    myColor: () => colorFor(get().userId ?? get().who),

    putMark(mark) {
      set((s) => ({ marks: { ...s.marks, [mark.id]: mark } }));
      send('mark', { mark });
    },
    dropMark(id) {
      set((s) => {
        const marks = { ...s.marks };
        delete marks[id];
        return { marks };
      });
      send('mark', { drop: id });
    },
    clearMarks(all) {
      const me = get().userId ?? '';
      if (all) {
        set({ marks: {} });
        send('mark', { clearAll: true });
      } else {
        set((s) => ({ marks: Object.fromEntries(Object.entries(s.marks).filter(([, m]) => m.by !== me)) }));
        send('mark', { clearBy: me });
      }
    },
    laser(points) {
      const t: LaserTrail = { by: get().userId ?? 'eu', color: get().myColor(), points: points.slice(-80), at: Date.now() };
      addLaser(t);
      send('laser', t as unknown as Record<string, unknown>);
    },
    pullView(x, y, z) {
      send('focus', { x, y, z });
    },
    focusOn(x, y) {
      set((s) => ({ focus: { x, y, n: (s.focus?.n ?? 0) + 1 } }));
    },
    addWalls(sceneId, list) {
      const campaignId = get().campaignId;
      if (!campaignId || !list.length) return Promise.resolve();
      const rows = list.map((w) => ({ ...w, id: crypto.randomUUID() }));
      // otimista: a parede aparece na hora; o evento do banco confirma (mesmo id)
      set((s) => ({ walls: [...s.walls, ...rows.map((w) => ({ ...w, sceneId }))] }));
      return write(() => stageService.addWalls(campaignId, sceneId, rows));
    },

    patchWall(id, patch) {
      set((s) => ({ walls: s.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
      return write(() => stageService.updateWall(id, patch));
    },

    removeWalls(ids) {
      if (!ids.length) return Promise.resolve();
      set((s) => ({ walls: s.walls.filter((w) => !w.id || !ids.includes(w.id)) }));
      return write(() => stageService.removeWalls(ids));
    },

    async toggleDoor(wall) {
      if (!wall.id || !wall.door) return;
      if (get().isMaster) return get().patchWall(wall.id, { open: !wall.open });
      // jogador: otimista; se o banco recusar (longe, trancada), volta como estava
      set((s) => ({ walls: s.walls.map((w) => (w.id === wall.id ? { ...w, open: !wall.open } : w)) }));
      try {
        if (!(await stageService.toggleDoor(wall.id))) {
          set((s) => ({ walls: s.walls.map((w) => (w.id === wall.id ? { ...w, open: wall.open } : w)), error: wall.locked ? 'A porta está trancada.' : 'Chegue mais perto da porta para abrir.' }));
        }
      } catch (e) {
        set((s) => ({ walls: s.walls.map((w) => (w.id === wall.id ? { ...w, open: wall.open } : w)), error: (e as Error).message }));
      }
    },

    async setLight(tokenId, meters) {
      const m = Math.max(0, Math.min(36, meters));
      if (get().isMaster) return get().updateToken(tokenId, { light: m });
      const before = get().tokens.find((t) => t.id === tokenId)?.light ?? 0;
      set((s) => ({ tokens: s.tokens.map((t) => (t.id === tokenId ? { ...t, light: m } : t)) }));
      try {
        if (!(await stageService.setTokenLight(tokenId, m))) set((s) => ({ tokens: s.tokens.map((t) => (t.id === tokenId ? { ...t, light: before } : t)) }));
      } catch (e) {
        set((s) => ({ tokens: s.tokens.map((t) => (t.id === tokenId ? { ...t, light: before } : t)), error: (e as Error).message }));
      }
    },

    forgetExplored(sceneId) {
      send('explored-reset', { sceneId });
      set((s) => ({ exploredReset: { ...s.exploredReset, [sceneId]: (s.exploredReset[sceneId] ?? 0) + 1 } }));
    },

    async saveFog(scene, fog) {
      // otimista: a névoa muda na hora para o mestre
      set((s) => ({ scenes: s.scenes.map((x) => (x.id === scene.id ? { ...x, grid: { ...x.grid, fog } } : x)) }));
      await write(() => stageService.saveScene(scene.campaignId, { id: scene.id, grid: { ...scene.grid, fog } }));
    },

    showHandout: (id, recipients) => get().run(() => stageService.showHandout(id, recipients)).then(() => undefined),

    async claimLoot(id) {
      try {
        const ok = await stageService.claimLoot(id);
        set((s) => ({ handouts: s.handouts.map((h) => (h.id === id ? { ...h, claimedBy: get().userId } : h)) }));
        return ok;
      } catch (e) {
        set({ error: (e as Error).message });
        return false;
      }
    },

    async createSecret(sceneId, x, y, kind = 'chest') {
      const campaignId = get().campaignId;
      if (!campaignId) return null;
      const tokenId = crypto.randomUUID();
      const title = KIND_NAME[kind];
      const ok = await get().run(async () => {
        await stageService.addTokens(campaignId, [
          { id: tokenId, sceneId, kind: 'marker', label: title, sheetId: null, ownerId: null, npcId: null, combatantId: null, monsterRef: null, color: SECRET_COLOR[kind], imagePath: null, x, y, size: 1, hidden: true },
        ]);
        await stageService.saveSecret({ campaignId, sceneId, tokenId, kind, title, rules: { mode: 'any', near: 3, to: 'finder' } });
      });
      return ok ? tokenId : null;
    },

    async saveSecret(secret) {
      // otimista: o editor salva enquanto o mestre digita
      set((s) => ({ secrets: s.secrets.map((x) => (x.id === secret.id ? secret : x)) }));
      const tok = secret.tokenId ? get().tokens.find((t) => t.id === secret.tokenId) : null;
      try {
        await stageService.saveSecret(secret);
        // o marcador acompanha o nome e o tipo (é o que a mesa vê quando acha)
        if (tok && (tok.label !== secret.title || tok.color !== SECRET_COLOR[secret.kind])) {
          set((s) => ({ tokens: s.tokens.map((t) => (t.id === tok.id ? { ...t, label: secret.title, color: SECRET_COLOR[secret.kind] } : t)) }));
          await stageService.updateToken(tok.id, { label: secret.title.slice(0, 60), color: SECRET_COLOR[secret.kind] });
        }
      } catch (e) {
        set({ error: (e as Error).message });
      }
    },

    removeSecret: (secret) => {
      set((s) => ({ secrets: s.secrets.filter((x) => x.id !== secret.id), tokens: s.tokens.filter((t) => t.id !== secret.tokenId) }));
      return get()
        .run(async () => {
          if (secret.tokenId) await stageService.removeToken(secret.tokenId);
          await stageService.removeSecret(secret.id);
        })
        .then(() => undefined);
    },

    revealSecret: (secret, finder) => {
      const campaignId = get().campaignId!;
      const now = new Date().toISOString();
      const found = { ...secret, foundBy: finder?.name ?? 'Mestre', foundAt: now };
      set((s) => ({
        secrets: s.secrets.map((x) => (x.id === secret.id ? found : x)),
        tokens: s.tokens.map((t) => (t.id === secret.tokenId ? { ...t, hidden: false } : t)),
      }));
      const hasLoot = secret.loot.length > 0 || Object.values(secret.coins).some((n) => (n ?? 0) > 0);
      const recipients = secret.rules.to === 'all' || !finder?.ownerId ? null : [finder.ownerId];
      return get()
        .run(async () => {
          if (secret.tokenId) await stageService.updateToken(secret.tokenId, { hidden: false });
          await stageService.saveSecret({ ...found });
          if (secret.revealText.trim() || hasLoot) {
            await stageService.saveHandout(campaignId, {
              title: `${KIND_NAME[secret.kind]}: ${secret.title}`.slice(0, 80),
              body: secret.revealText,
              recipients,
              shownAt: now,
              ...(hasLoot ? { loot: { items: secret.loot, coins: secret.coins } } : {}),
            });
          }
        })
        .then(() => undefined);
    },

    hideSecret: (secret) => {
      const back = { ...secret, foundBy: null, foundAt: null };
      set((s) => ({
        secrets: s.secrets.map((x) => (x.id === secret.id ? back : x)),
        tokens: s.tokens.map((t) => (t.id === secret.tokenId ? { ...t, hidden: true } : t)),
      }));
      return get()
        .run(async () => {
          if (secret.tokenId) await stageService.updateToken(secret.tokenId, { hidden: true });
          await stageService.saveSecret(back);
        })
        .then(() => undefined);
    },

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
