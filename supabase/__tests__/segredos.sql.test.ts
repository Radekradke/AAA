import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Segredos do mapa num Postgres de verdade (PGlite): só o mestre lê o loot e
 * as condições; a pista do achado leva o loot e cada um pega uma vez só.
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const mp = readFileSync(resolve(root, 'supabase/multiplayer_session.sql'), 'utf8');
const palco = readFileSync(resolve(root, 'supabase/palco.sql'), 'utf8');
const segredos = readFileSync(resolve(root, 'supabase/segredos.sql'), 'utf8');

describe('SQL dos segredos do mapa', () => {
  it('mestre guarda, jogador não lê, loot pego uma vez', async () => {
    const failures: string[] = [];
    const db = new PGlite();
    await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema realtime;
    create table realtime.messages (id bigserial primary key, topic text, extension text, payload jsonb);
    create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;
    alter table realtime.messages enable row level security;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create publication supabase_realtime;
    grant usage on schema public, auth, realtime, storage to authenticated, anon;
    `);
    await db.exec(base);
    await db.exec(mp);
    await db.exec(palco);
    await db.exec(segredos);
    await db.exec(segredos); // idempotente
    await db.exec(`grant all on all tables in schema public to authenticated; grant execute on function auth.uid() to authenticated;`);

    const U = { gm: '11111111-1111-1111-1111-111111111111', p1: '22222222-2222-2222-2222-222222222222', p2: '33333333-3333-3333-3333-333333333333', x: '44444444-4444-4444-4444-444444444444' };
    await db.exec(`insert into auth.users values ${Object.values(U).map((u) => `('${u}')`).join(',')};`);
    const as = async (who: keyof typeof U, sql: string, params: unknown[] = []) => {
      await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${U[who]}', false); set role authenticated;`);
      try { return (await db.query(sql, params)).rows as Record<string, unknown>[]; } finally { await db.exec('reset role;'); }
    };
    let ok = 0;
    const eq = (label: string, a: unknown, b: unknown) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else failures.push(`${label} → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
    const expectErr = async (label: string, re: RegExp, fn: () => Promise<unknown>) => {
      try { await fn(); failures.push(`${label} → não falhou`); } catch (e) { if (re.test((e as Error).message)) ok++; else failures.push(`${label} → ${(e as Error).message}`); }
    };

    const [camp] = await as('gm', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Mesa', 1, 1) returning id`, [U.gm]);
    const cid = camp.id as string;
    await db.query(`insert into campaign_members (campaign_id, user_id, role, joined_at) values ($1,$2,'player',1),($1,$3,'player',1)`, [cid, U.p1, U.p2]);
    const [scene] = await as('gm', `insert into campaign_scenes (campaign_id, kind, name, grid, revealed) values ($1,'map','Cripta','{"size":70}', true) returning id`, [cid]);
    const [pin] = await as('gm', `insert into scene_tokens (scene_id, campaign_id, kind, label, hidden, x, y) values ($1,$2,'marker','Baú',true,5,5) returning id`, [scene.id, cid]);

    const [sec] = await as('gm', `insert into scene_secrets (campaign_id, scene_id, token_id, kind, title, reveal_text, notes, loot, coins, rules)
      values ($1,$2,$3,'chest','Baú do Barão','Um baú de carvalho.','Mímico se abrirem com força','[{"name":"Chave de prata","qty":1}]','{"gp":40}','{"mode":"any","near":3,"passive":{"skill":"perception","dc":14}}') returning id`, [cid, scene.id, pin.id]);
    eq('mestre lê o segredo', (await as('gm', `select title, loot from scene_secrets`)).map((r) => r.title), ['Baú do Barão']);
    eq('jogador não lê segredo nenhum', (await as('p1', `select * from scene_secrets`)).length, 0);
    eq('intruso também não', (await as('x', `select * from scene_secrets`)).length, 0);
    eq('jogador não vê o marcador escondido', (await as('p1', `select * from scene_tokens where id = $1`, [pin.id])).length, 0);
    await expectErr('jogador não cria segredo', /row-level security/, () => as('p1', `insert into scene_secrets (campaign_id, scene_id, title) values ($1,$2,'X')`, [cid, scene.id]));
    eq('jogador não muda segredo', (await as('p1', `update scene_secrets set found_by = 'eu' returning 1`)).length, 0);
    await expectErr('tipo inválido barrado', /check/, () => as('gm', `update scene_secrets set kind = 'nuke' where id = $1`, [sec.id]));

    // achado: o mestre revela o marcador e entrega a pista com o loot só para quem achou
    await as('gm', `update scene_tokens set hidden = false where id = $1`, [pin.id]);
    await as('gm', `update scene_secrets set found_by = 'Kael', found_at = now() where id = $1`, [sec.id]);
    const [h] = await as('gm', `insert into campaign_handouts (campaign_id, title, body, recipients, shown_at, loot) values ($1,'Achado: Baú do Barão','Um baú de carvalho.',array[$2]::uuid[], now(), '{"items":[{"name":"Chave de prata","qty":1}],"coins":{"gp":40}}') returning id`, [cid, U.p1]);
    eq('jogador vê o marcador revelado', (await as('p1', `select label from scene_tokens where id = $1`, [pin.id])).map((r) => r.label), ['Baú']);
    eq('quem achou recebe a pista com loot', (await as('p1', `select loot->'coins'->>'gp' as gp from campaign_handouts`)).map((r) => r.gp), ['40']);
    eq('o outro jogador não recebe', (await as('p2', `select id from campaign_handouts`)).length, 0);
    eq('outro jogador não pega o loot alheio', (await as('p2', `select * from claim_handout_loot($1)`, [h.id])).length, 0);
    eq('quem achou pega', (await as('p1', `select claimed_by from claim_handout_loot($1)`, [h.id])).map((r) => r.claimed_by), [U.p1]);
    eq('não pega duas vezes', (await as('p1', `select * from claim_handout_loot($1)`, [h.id])).length, 0);
    eq('mestre vê quem pegou', (await as('gm', `select claimed_by from campaign_handouts where id = $1`, [h.id]))[0].claimed_by, U.p1);

    // apagar o marcador não apaga o segredo (só solta o vínculo)
    await as('gm', `delete from scene_tokens where id = $1`, [pin.id]);
    eq('segredo fica sem marcador', (await as('gm', `select token_id from scene_secrets where id = $1`, [sec.id]))[0].token_id, null);

    expect(failures).toEqual([]);
    expect(ok).toBeGreaterThan(14);
  }, 60_000);
});
