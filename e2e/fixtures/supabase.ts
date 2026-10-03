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
    app_schema_steps: ['base', 'multiplayer', 'npcs_bestiario', 'palco', 'mestre_console', 'agenda', 'recursos_extras'].map((step) => ({ step })),
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
    case 'start_session':
    case 'start_planned_session':
    case 'plan_session':
      return db.tables.sessions[0];
    default:
      return db.tables.encounters[0] ?? null;
  }
}

async function handle(route: Route, db: MockDb) {
  const req = route.request();
  const url = new URL(req.url());
  const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  if (url.pathname.startsWith('/auth/v1/user')) return json({ id: db.me, aud: 'authenticated', email: 'teste@exemplo.com', app_metadata: {}, user_metadata: {} });
  if (url.pathname.startsWith('/auth/v1/')) return json({});
  if (url.pathname.includes('/storage/v1/object')) return route.fulfill({ status: 200, contentType: 'image/png', body: IMAGE });

  const m = url.pathname.match(/\/rest\/v1\/(rpc\/)?([a-z_]+)/);
  if (!m) return json({}, 404);
  const [, isRpc, name] = m;
  const method = req.method();
  const payload = req.postData() ? JSON.parse(req.postData()!) : {};

  if (isRpc) return json(rpc(name, payload, db));

  let rows = db.tables[name] ?? [];
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
  } else if (method === 'PATCH') {
    rows.forEach((r) => Object.assign(r, payload));
    db.writes.push(`PATCH ${name}`);
  } else if (method === 'DELETE') {
    db.tables[name] = (db.tables[name] ?? []).filter((r) => !rows.includes(r));
    db.writes.push(`DELETE ${name}`);
  }

  const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
  return json(single ? (rows[0] ?? null) : rows);
}

/** Liga o mock na página. Chame antes do primeiro goto. */
export async function installSupabase(page: Page, who: Who): Promise<MockDb> {
  const db: MockDb = { tables: seed(who), writes: [], me: who === 'master' ? M : P };
  await page.route(`${MOCK_URL}/**`, (route) => handle(route, db));
  await page.routeWebSocket(/mock\.supa\.test/, (ws) => {
    ws.onMessage((raw) => {
      let msg: unknown;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      // Realtime v2 manda arrays [join_ref, ref, topic, event, payload]; v1 manda objetos
      const arr = Array.isArray(msg);
      const o = msg as { join_ref?: string; ref?: string; topic: string; event: string; payload: { config?: { postgres_changes?: Row[] } } };
      const [jr, ref, topic, event, pl] = arr ? (msg as [string, string, string, string, typeof o.payload]) : [o.join_ref, o.ref, o.topic, o.event, o.payload];
      const send = (ev: string, payload: unknown, r: string | null = ref ?? null, j: string | null = jr ?? null) =>
        ws.send(JSON.stringify(arr ? [j, r, topic, ev, payload] : { topic, event: ev, payload, ref: r }));
      if (event === 'phx_join') {
        const pc = (pl?.config?.postgres_changes ?? []).map((x, i) => ({ ...x, id: i + 1 }));
        send('phx_reply', { status: 'ok', response: { postgres_changes: pc } });
      } else if (event === 'heartbeat' || event === 'presence' || event === 'access_token') {
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
export async function signIn(page: Page, who: Who | 'guest', opts: { characters?: Row[] } = {}) {
  const me = who === 'master' ? M : who === 'player' ? P : 'guest';
  await page.addInitScript(
    ([me, guest, chars]) => {
      if (sessionStorage.getItem('fv-e2e-seeded')) return; // só no primeiro carregamento
      sessionStorage.setItem('fv-e2e-seeded', '1');
      localStorage.setItem('fv-auth', JSON.stringify({ state: { user: { id: me, name: guest ? 'Convidado' : 'André', email: guest ? null : 'teste@exemplo.com', guest }, accounts: [] }, version: 0 }));
      localStorage.setItem('fv-ui', JSON.stringify({ state: { theme: 'astral', onboarded: true, dice3d: false, toursSeen: { sheet: true, creator: true } }, version: 0 }));
      if (chars) localStorage.setItem('fv-characters', JSON.stringify({ state: { characters: chars, currentId: null, pendingDeletes: [] }, version: 3 }));
      if (!guest) {
        const exp = Math.floor(Date.now() / 1000) + 36000;
        localStorage.setItem('sb-mock-auth-token', JSON.stringify({ access_token: 'x.y.z', refresh_token: 'r', token_type: 'bearer', expires_in: 36000, expires_at: exp, user: { id: me, aud: 'authenticated', email: 'teste@exemplo.com', app_metadata: {}, user_metadata: {} } }));
      }
    },
    [me, who === 'guest', opts.characters ?? null] as const,
  );
}
