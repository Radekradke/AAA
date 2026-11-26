import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page, Route } from '@playwright/test';

/**
 * Supabase de mentira para os testes de ponta a ponta: o app aponta para
 * http://mock.supa.test (ver playwright.config.ts) e cada página recebe um
 * "banco" em memória com uma campanha em andamento — mestre, jogador,
 * encontro, mapa com peões, NPCs, convite com código e uma ficha.
 *
 * Responde ao PostgREST (filtros eq/neq/in/gte/is.null, POST/PATCH/DELETE e
 * upsert com on_conflict), ao
 * Storage (imagens) e ao Realtime (WebSocket: join, presença, heartbeat).
 */

export const MOCK_URL = 'http://mock.supa.test';
export const C = '11111111-1111-4111-8111-111111111111'; // campanha
export const M = '22222222-2222-4222-8222-222222222222'; // mestre
export const P = '33333333-3333-4333-8333-333333333333'; // jogador
const S = '44444444-4444-4444-8444-444444444444'; // sessão
const E = '55555555-5555-4555-8555-555555555555'; // encontro
const SC = '66666666-6666-4666-8666-666666666666'; // cena (mapa)
export const EV = '77777777-7777-4777-8777-777777777777'; // sessão marcada na agenda
export const INVITE_CODE = 'K7Q42MXP';
export const SHARE_TOKEN = 'TestToken234567890abcdefg';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export const WIZARD = JSON.parse(readFileSync(here('./wizard.json'), 'utf8'))[0] as Record<string, unknown>;
const IMAGE = readFileSync(here('../../public/icons/icon-512.png'));

type Row = Record<string, unknown>;
export type Who = 'master' | 'player';

export interface MockDb {
  tables: Record<string, Row[]>;
  /** Escritas recebidas, ex.: "POST sheet_shares". */
  writes: string[];
  me: string;
  /** user_metadata da conta (o app guarda ali, p.ex., o tutorial já visto). */
  meta: Record<string, unknown>;
  /** Conexões de tempo real de todas as janelas que dividem este banco. */
  hub: RealtimeHub;
  /** Esta janela sem internet: as chamadas HTTP dela falham como na vida real. */
  offline?: boolean;
  /** Manda um evento postgres_changes para quem assina a tabela (como o Realtime). */
  emit?: (table: string, type: 'INSERT' | 'UPDATE' | 'DELETE', row: Row) => void;
}

/** Tabelas do palco que o Realtime transmite (as outras seguem só com refetch). */
const REALTIME_TABLES = new Set(['scene_tokens', 'scene_walls', 'campaign_scenes', 'campaign_stage', 'campaign_handouts', 'scene_secrets']);
/** Só o mestre lê: o Realtime respeita o RLS e não manda para o jogador. */
const MASTER_ONLY = new Set(['scene_secrets']);

interface RtChannel {
  joinRef: string | null;
  /** Formato do protocolo (v2 = arrays). */
  arr: boolean;
  /** Assinaturas postgres_changes do canal, com o id que o servidor devolveu. */
  changes: (Row & { id: number })[];
  /** Chave de presença (config.presence.key do join) e o que esta janela anunciou. */
  presenceKey: string;
  presence: Row | null;
}
interface RtSocket {
  me: string;
  send: (data: string) => void;
  /** Derruba a conexão (rede caiu): o realtime-js reconecta sozinho. */
  close: () => void;
  topics: Map<string, RtChannel>;
}
export interface RealtimeHub {
  sockets: RtSocket[];
}

/** "campaign_id=eq.<id>" casa com a linha? (sem filtro = tudo) */
function filterMatches(filter: unknown, row: Row): boolean {
  if (typeof filter !== 'string' || !filter) return true;
  const m = filter.match(/^([a-z_]+)=eq\.(.+)$/);
  return !m || String(row[m[1]]) === m[2];
}

/**
 * Broadcast do usuário em binário (realtime-js, "userBroadcastPush" = 3):
 * [tipo, len(joinRef), len(ref), len(tópico), len(evento), len(meta), codificação, …textos, payload].
 */
function decodeBroadcastPush(raw: Buffer): { topic: string; event: string; payload: unknown } | null {
  if (raw.length < 7 || raw[0] !== 3) return null;
  const [jr, rf, tp, ev, md, enc] = [raw[1], raw[2], raw[3], raw[4], raw[5], raw[6]];
  let o = 7 + jr + rf;
  const topic = raw.subarray(o, o + tp).toString('utf8');
  o += tp;
  const event = raw.subarray(o, o + ev).toString('utf8');
  o += ev + md;
  const body = raw.subarray(o);
  return { topic, event, payload: enc === 1 ? JSON.parse(body.toString('utf8') || 'null') : body };
}

function frame(ch: RtChannel, topic: string, event: string, payload: unknown): string {
  return JSON.stringify(ch.arr ? [ch.joinRef, null, topic, event, payload] : { topic, event, payload, ref: null });
}

function seed(who: Who): Record<string, Row[]> {
  const now = new Date().toISOString();
  const master = who === 'master';
  const cb = (id: string, p: Row): Row => ({ id, encounter_id: E, session_id: S, campaign_id: C, monster_instance_id: null, conditions: [], hidden: false, group_key: null, initiative_bonus: 0, hp_current: 10, hp_max: 10, armor_class: 12, sheet_id: null, owner_id: null, ...p });
  const combatants = [
    cb('c1', { type: 'player', name: 'Kael Venturo', sheet_id: 'k', owner_id: P, initiative: 21, turn_order: 1, hp_current: 31, hp_max: 38, armor_class: 17 }),
    cb('c2', { type: 'monster', name: 'Goblin #1', monster_ref: 'goblin', initiative: 18, turn_order: 2, hp_current: 7, hp_max: 7, armor_class: 15 }),
    cb('c3', { type: 'npc', name: 'Espião do Barão', initiative: null, turn_order: 3, hidden: true, hp_current: 27, hp_max: 27 }),
  ].filter((c) => master || !c.hidden);
  const session = { id: S, campaign_id: C, name: 'Sessão 4 — A Estrada Real', status: 'active', started_at: now, ended_at: null, created_by: M, created_at: now, updated_at: now };
  // daqui a 3 dias, 19h30 (hora do navegador): "Próxima sessão em 3 dias"
  const when = new Date(Date.now() + 3 * 86_400_000);
  when.setHours(19, 30, 0, 0);
  const tokens = [
    { id: 't1', scene_id: SC, campaign_id: C, kind: 'hero', label: 'Kael Venturo', sheet_id: 'k', owner_id: P, combatant_id: 'c1', x: 3, y: 3, size: 1, hidden: false },
    { id: 't2', scene_id: SC, campaign_id: C, kind: 'monster', label: 'Goblin #1', monster_ref: 'goblin', combatant_id: 'c2', x: 8, y: 3, size: 1, hidden: false },
    { id: 't3', scene_id: SC, campaign_id: C, kind: 'npc', label: 'Espião do Barão', combatant_id: 'c3', x: 10, y: 1, size: 1, hidden: true },
  ].filter((t) => master || !t.hidden);
  return {
    campaigns: [{ id: C, master_id: M, name: 'A Coroa de Cinzas', created_at: 1, updated_at: 1 }],
    sessions: [session],
    encounters: [{ id: E, session_id: S, campaign_id: C, name: 'Emboscada na Estrada Real', status: 'active', round: 3, active_combatant_id: master ? 'c2' : 'c1', revision: 12, started_at: now, ended_at: null, created_at: now, updated_at: now }],
    combatants,
    session_events: [{ id: 'ev1', session_id: S, campaign_id: C, type: 'session_started', actor_id: M, target_id: null, payload: { name: session.name }, visibility: 'public', created_at: now }],
    campaign_scenes: [{ id: SC, campaign_id: C, kind: 'map', name: 'Cripta do Barão', image_path: `${C}/map.png`, grid: { size: 70, ox: 0, oy: 0, show: true }, beats: [], revealed: true, sort: 0, updated_at: now }],
    campaign_stage: [{ campaign_id: C, scene_id: SC, beat: 0, updated_at: now }],
    scene_tokens: tokens,
    campaign_handouts: [],
    campaign_npcs: [{ id: 'n1', campaign_id: C, name: 'Velha Odra', role: 'Estalajadeira', summary: 'Sabe de tudo que passa pela estrada.', portrait: null, revealed: true, improvised_in: null, updated_at: now }],
    campaign_npc_secrets: [],
    campaign_notes: [],
    session_prep: [],
    campaign_events: [{ id: EV, campaign_id: C, starts_at: when.toISOString(), duration_min: 240, title: 'Sessão 5 — O Baile de Máscaras', place: 'Casa do Léo', note: null, canceled: false, created_by: M, created_at: now, updated_at: now }],
    campaign_rsvps: [{ event_id: EV, user_id: M, campaign_id: C, status: 'yes', display_name: 'Rui', hero_name: null, updated_at: now }],
    campaign_monsters: [],
    campaign_monster_notes: [],
    campaign_discord: [],
    app_schema_steps: ['base', 'multiplayer', 'npcs_bestiario', 'palco', 'mestre_console', 'agenda', 'bestiario', 'recursos_extras', 'diario_privado', 'mesa_vida', 'discord'].map((step) => ({ step })),
    invite_links: [{ id: 'inv1', campaign_id: C, token: 'abcdefghijklm', created_by: M, expires_at: null, max_uses: null, uses: 0, code: INVITE_CODE }],
    sheets: [{ id: 'k', user_id: P, snapshot: { ...WIZARD, id: 'k', name: 'Kael Venturo' }, updated_at: 1000 }],
    shared_sheets: [{ id: 'sh1', campaign_id: C, sheet_id: 'k', owner_id: P, permissions: {}, shared_at: 1 }],
    sheet_shares: [],
    client_errors: [],
  };
}

/** RPCs que os testes usam; as demais devolvem o encontro (suficiente para o console). */
function rpc(name: string, body: Row, db: MockDb): unknown {
  switch (name) {
    case 'join_campaign_code':
      return String(body.p_code ?? '').replace(/[^A-Z0-9]/gi, '').toUpperCase() === INVITE_CODE ? C : null;
    case 'shared_sheet':
      return body.p_token === SHARE_TOKEN ? [{ snapshot: { ...WIZARD, id: 'k', name: 'Kael Venturo' }, updated_at: Date.now() }] : [];
    case 'move_token': {
      // jogador move só o próprio peão (visível); o mestre, qualquer um
      const tok = (db.tables.scene_tokens ?? []).find((t) => t.id === body.p_token);
      if (!tok || (db.me !== M && (tok.owner_id !== db.me || tok.hidden))) return [];
      Object.assign(tok, { x: Number(body.p_x), y: Number(body.p_y), updated_at: new Date().toISOString() });
      db.writes.push('RPC move_token');
      db.emit?.('scene_tokens', 'UPDATE', tok);
      return [tok];
    }
    case 'toggle_door': {
      // mesma regra do banco: mestre qualquer porta; jogador destrancada e com o herói a até 2 casas
      const w = (db.tables.scene_walls ?? []).find((r) => r.id === body.p_wall);
      if (!w?.door) return [];
      const mx = (Number(w.x1) + Number(w.x2)) / 2;
      const my = (Number(w.y1) + Number(w.y2)) / 2;
      const near = (db.tables.scene_tokens ?? []).some((t) => t.owner_id === db.me && !t.hidden && Math.abs(Number(t.x) + Number(t.size ?? 1) / 2 - mx) <= 2 && Math.abs(Number(t.y) + Number(t.size ?? 1) / 2 - my) <= 2);
      if (db.me !== M && (w.locked || !near)) return [];
      w.open = !w.open;
      w.updated_at = new Date().toISOString();
      db.writes.push('RPC toggle_door');
      db.emit?.('scene_walls', 'UPDATE', w);
      return [w];
    }
    case 'set_token_light': {
      const tok = (db.tables.scene_tokens ?? []).find((t) => t.id === body.p_token);
      if (!tok || (db.me !== M && tok.owner_id !== db.me)) return [];
      tok.light = Math.max(0, Math.min(36, Number(body.p_meters) || 0));
      tok.updated_at = new Date().toISOString();
      db.writes.push('RPC set_token_light');
      db.emit?.('scene_tokens', 'UPDATE', tok);
      return [tok];
    }
    case 'claim_handout_loot': {
      const h = (db.tables.campaign_handouts ?? []).find((r) => r.id === body.p_handout);
      if (!h || h.claimed_by) return [];
      h.claimed_by = db.me;
      db.writes.push('RPC claim_handout_loot');
      return [h];
    }
    case 'start_session':
    case 'start_planned_session':
    case 'plan_session':
      return db.tables.sessions[0];
    default:
      return db.tables.encounters[0] ?? null;
  }
}

async function handle(route: Route, db: MockDb) {
  if (db.offline) return route.abort('internetdisconnected');
  const req = route.request();
  const url = new URL(req.url());
  const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  if (url.pathname.startsWith('/auth/v1/user')) {
    // updateUser({ data }) → PUT com os metadados novos
    if (req.method() === 'PUT') {
      const body = req.postData() ? JSON.parse(req.postData()!) : {};
      Object.assign(db.meta, body.data ?? {});
      db.writes.push('PUT auth.user');
    }
    return json({ id: db.me, aud: 'authenticated', email: 'teste@exemplo.com', app_metadata: {}, user_metadata: db.meta });
  }
  if (url.pathname.startsWith('/auth/v1/')) return json({});
  if (url.pathname.includes('/storage/v1/object')) return route.fulfill({ status: 200, contentType: 'image/png', body: IMAGE });
  // broadcast por HTTP (o cliente usa quando o canal ainda não entrou): repassa às janelas no tópico
  if (url.pathname.endsWith('/realtime/v1/api/broadcast')) {
    const body = req.postData() ? JSON.parse(req.postData()!) : { messages: [] };
    for (const m of (body.messages ?? []) as { topic: string; event: string; payload: unknown }[]) {
      const topic = m.topic.startsWith('realtime:') ? m.topic : `realtime:${m.topic}`;
      for (const sock of db.hub.sockets) {
        if (sock.me === db.me) continue;
        const ch = sock.topics.get(topic);
        if (ch) sock.send(frame(ch, topic, 'broadcast', { type: 'broadcast', event: m.event, payload: m.payload }));
      }
    }
    return route.fulfill({ status: 202, body: '' });
  }

  const m = url.pathname.match(/\/rest\/v1\/(rpc\/)?([a-z_]+)/);
  if (!m) return json({}, 404);
  const [, isRpc, name] = m;
  const method = req.method();
  const payload = req.postData() ? JSON.parse(req.postData()!) : {};

  if (isRpc) return json(rpc(name, payload, db));

  let rows = db.tables[name] ?? [];
  // RLS do jogador (importa quando mestre e jogador dividem o banco)
  if (db.me !== M && method === 'GET') {
    if (MASTER_ONLY.has(name)) rows = [];
    else if (name === 'scene_tokens' || name === 'combatants') rows = rows.filter((r) => !r.hidden);
  }
  for (const [k, v] of url.searchParams) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
    if (v.startsWith('eq.')) rows = rows.filter((r) => String(r[k]) === v.slice(3));
    else if (v.startsWith('neq.')) rows = rows.filter((r) => String(r[k]) !== v.slice(4));
    else if (v.startsWith('in.(')) {
      const set = v.slice(4, -1).split(',').map((x) => x.replace(/"/g, ''));
      rows = rows.filter((r) => set.includes(String(r[k])));
    } else if (v.startsWith('gte.')) rows = rows.filter((r) => String(r[k]) >= v.slice(4));
    else if (v === 'is.null') rows = rows.filter((r) => r[k] == null);
  }

  if (method === 'POST') {
    const conflict = url.searchParams.get('on_conflict')?.split(',');
    const table = (db.tables[name] ??= []);
    const list = (Array.isArray(payload) ? payload : [payload]).map((x: Row) => {
      // upsert: a linha com a mesma chave é atualizada, não duplicada
      const hit = conflict && table.find((r) => conflict.every((c) => r[c] === x[c]));
      if (hit) return Object.assign(hit, x);
      const row = { id: `new-${Math.random().toString(36).slice(2, 8)}`, created_at: Date.now(), ...x };
      table.push(row);
      return row;
    });
    db.writes.push(`POST ${name}`);
    rows = list;
    rows.forEach((r) => db.emit?.(name, 'INSERT', r));
  } else if (method === 'PATCH') {
    // gatilho _fv_token_visibility_touch: esconder/revelar peão cutuca o palco (o jogador recarrega)
    const visibility = name === 'scene_tokens' && 'hidden' in payload && rows.some((r) => r.hidden !== payload.hidden);
    rows.forEach((r) => Object.assign(r, payload));
    db.writes.push(`PATCH ${name}`);
    rows.forEach((r) => db.emit?.(name, 'UPDATE', r));
    if (visibility) for (const st of db.tables.campaign_stage ?? []) db.emit?.('campaign_stage', 'UPDATE', Object.assign(st, { updated_at: new Date().toISOString() }));
  } else if (method === 'DELETE') {
    db.tables[name] = (db.tables[name] ?? []).filter((r) => !rows.includes(r));
    db.writes.push(`DELETE ${name}`);
    rows.forEach((r) => db.emit?.(name, 'DELETE', r));
    if (name === 'scene_tokens' && rows.length) for (const st of db.tables.campaign_stage ?? []) db.emit?.('campaign_stage', 'UPDATE', Object.assign(st, { updated_at: new Date().toISOString() }));
  }

  const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
  return json(single ? (rows[0] ?? null) : rows);
}

/**
 * Liga o mock na página. Chame antes do primeiro goto.
 * Multiplayer: passe `shared` (o banco de outra janela) e as duas janelas
 * dividem as mesmas tabelas e o mesmo Realtime — o que um grava, o outro
 * recebe como evento postgres_changes, e o broadcast (arrasto, ping, laser)
 * vai de uma para a outra, como no Supabase de verdade.
 */
export async function installSupabase(page: Page, who: Who, opts: { shared?: MockDb } = {}): Promise<MockDb> {
  const me = who === 'master' ? M : P;
  const hub: RealtimeHub = opts.shared?.hub ?? { sockets: [] };
  const db: MockDb = { tables: opts.shared?.tables ?? seed(who), writes: opts.shared?.writes ?? [], me, meta: {}, hub };
  db.emit = (table, type, row) => {
    if (!REALTIME_TABLES.has(table)) return;
    for (const sock of hub.sockets) {
      if (MASTER_ONLY.has(table) && sock.me !== M) continue;
      // peão escondido não chega ao jogador (RLS)
      if (table === 'scene_tokens' && row.hidden && sock.me !== M && type !== 'DELETE') continue;
      for (const [topic, ch] of sock.topics) {
        const ids = ch.changes.filter((c) => (c.table === table || c.table === '*') && (c.event === '*' || c.event === type) && (type === 'DELETE' || filterMatches(c.filter, row))).map((c) => c.id);
        if (!ids.length) continue;
        const data = { schema: 'public', table, commit_timestamp: new Date().toISOString(), type, columns: [], errors: null, record: type === 'DELETE' ? {} : { ...row }, old_record: type === 'INSERT' ? {} : type === 'DELETE' ? { id: row.id } : { id: row.id } };
        sock.send(frame(ch, topic, 'postgres_changes', { ids, data }));
      }
    }
  };
  await page.route(`${MOCK_URL}/**`, (route) => handle(route, db));
  await page.routeWebSocket(/mock\.supa\.test/, (ws) => {
    const sock: RtSocket = { me, send: (d) => ws.send(d), close: () => void ws.close({ code: 1006, reason: 'queda' }).catch(() => undefined), topics: new Map() };
    hub.sockets.push(sock);
    /** presence_diff para todas as janelas no tópico (inclusive esta, como o Phoenix). */
    const presenceDiff = (topic: string, key: string, meta: Row, kind: 'joins' | 'leaves') => {
      for (const other of hub.sockets) {
        const ch = other.topics.get(topic);
        if (ch) other.send(frame(ch, topic, 'presence_diff', { joins: kind === 'joins' ? { [key]: { metas: [meta] } } : {}, leaves: kind === 'leaves' ? { [key]: { metas: [meta] } } : {} }));
      }
    };
    const dropPresence = (topic: string, ch: RtChannel) => {
      if (ch.presence) presenceDiff(topic, ch.presenceKey, ch.presence, 'leaves');
      ch.presence = null;
    };
    ws.onClose(() => {
      hub.sockets = hub.sockets.filter((x) => x !== sock);
      for (const [topic, ch] of sock.topics) dropPresence(topic, ch);
    });
    /** Repassa um broadcast às outras janelas no mesmo tópico (self: false). */
    const relay = (topic: string, payload: unknown) => {
      for (const other of hub.sockets) {
        if (other === sock) continue;
        const ch = other.topics.get(topic);
        if (ch) other.send(frame(ch, topic, 'broadcast', payload));
      }
    };
    ws.onMessage((raw) => {
      // o cliente manda o broadcast do usuário em binário (protocolo 2.0)
      if (typeof raw !== 'string') {
        const b = decodeBroadcastPush(raw);
        if (b) relay(b.topic, { type: 'broadcast', event: b.event, payload: b.payload });
        return;
      }
      let msg: unknown;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      // Realtime v2 manda arrays [join_ref, ref, topic, event, payload]; v1 manda objetos
      const arr = Array.isArray(msg);
      const o = msg as { join_ref?: string; ref?: string; topic: string; event: string; payload: { config?: { postgres_changes?: Row[]; presence?: { key?: string } } } & Row };
      const [jr, ref, topic, event, pl] = arr ? (msg as [string, string, string, string, typeof o.payload]) : [o.join_ref, o.ref, o.topic, o.event, o.payload];
      const send = (ev: string, payload: unknown, r: string | null = ref ?? null, j: string | null = jr ?? null) =>
        ws.send(JSON.stringify(arr ? [j, r, topic, ev, payload] : { topic, event: ev, payload, ref: r }));
      if (event === 'phx_join') {
        const pc = (pl?.config?.postgres_changes ?? []).map((x, i) => ({ ...x, id: i + 1 }));
        const prev = sock.topics.get(topic);
        if (prev) dropPresence(topic, prev);
        const ch: RtChannel = { joinRef: jr ?? null, arr, changes: pc, presenceKey: pl?.config?.presence?.key || `anon-${Math.random().toString(36).slice(2)}`, presence: null };
        sock.topics.set(topic, ch);
        send('phx_reply', { status: 'ok', response: { postgres_changes: pc } });
        // estado inicial da presença: quem já está no tópico (o Phoenix manda logo após entrar)
        const state: Row = {};
        for (const other of hub.sockets) {
          const och = other.topics.get(topic);
          if (och?.presence) state[och.presenceKey] = { metas: [...((state[och.presenceKey] as { metas: Row[] } | undefined)?.metas ?? []), och.presence] };
        }
        sock.send(frame(ch, topic, 'presence_state', state));
      } else if (event === 'phx_leave') {
        const ch = sock.topics.get(topic);
        if (ch) dropPresence(topic, ch);
        sock.topics.delete(topic);
        send('phx_reply', { status: 'ok', response: {} });
      } else if (event === 'presence') {
        const ch = sock.topics.get(topic);
        const p = pl as { event?: string; payload?: Row };
        if (ch && p.event === 'track') {
          if (ch.presence) dropPresence(topic, ch);
          ch.presence = { ...(p.payload ?? {}), phx_ref: Math.random().toString(36).slice(2) };
          presenceDiff(topic, ch.presenceKey, ch.presence, 'joins');
        } else if (ch && p.event === 'untrack') dropPresence(topic, ch);
        send('phx_reply', { status: 'ok', response: {} });
      } else if (event === 'broadcast') {
        relay(topic, pl);
        send('phx_reply', { status: 'ok', response: {} });
      } else if (event === 'heartbeat' || event === 'access_token') {
        send('phx_reply', { status: 'ok', response: {} });
      }
    });
  });
  return db;
}

/**
 * Sessão logada (ou convidado) + tema e onboarding prontos, antes do app
 * carregar. `characters` entra no armazenamento antigo (localStorage), que
 * o app migra sozinho para o IndexedDB na primeira leitura.
 */
export async function signIn(page: Page, who: Who | 'guest', opts: { characters?: Row[]; ui?: Row } = {}) {
  const me = who === 'master' ? M : who === 'player' ? P : 'guest';
  await page.addInitScript(
    ([me, guest, chars, ui]) => {
      if (sessionStorage.getItem('fv-e2e-seeded')) return; // só no primeiro carregamento
      sessionStorage.setItem('fv-e2e-seeded', '1');
      localStorage.setItem('fv-auth', JSON.stringify({ state: { user: { id: me, name: guest ? 'Convidado' : 'André', email: guest ? null : 'teste@exemplo.com', guest }, accounts: [] }, version: 0 }));
      localStorage.setItem('fv-ui', JSON.stringify({ state: { theme: 'astral', onboarded: true, dice3d: false, toursSeen: { sheet: true, creator: true }, ...ui }, version: 0 }));
      if (chars) localStorage.setItem('fv-characters', JSON.stringify({ state: { characters: chars, currentId: null, pendingDeletes: [] }, version: 3 }));
      if (!guest) {
        const exp = Math.floor(Date.now() / 1000) + 36000;
        localStorage.setItem('sb-mock-auth-token', JSON.stringify({ access_token: 'x.y.z', refresh_token: 'r', token_type: 'bearer', expires_in: 36000, expires_at: exp, user: { id: me, aud: 'authenticated', email: 'teste@exemplo.com', app_metadata: {}, user_metadata: {} } }));
      }
    },
    [me, who === 'guest', opts.characters ?? null, opts.ui ?? {}] as const,
  );
}
