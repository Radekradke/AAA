import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Portas e luz pelo jogador (supabase/portas_luz.sql) num Postgres de verdade:
 * abre a porta só ao lado do próprio herói, trancada só o mestre, e acende a
 * luz só do próprio herói.
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const read = (f: string) => readFileSync(resolve(root, 'supabase', f), 'utf8');

describe('SQL de portas e luz do jogador', () => {
  it('perto abre, longe não, trancada só o mestre; luz só do próprio herói', async () => {
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
    await db.exec(read('multiplayer_session.sql'));
    await db.exec(read('palco.sql'));
    await db.exec(read('portas_luz.sql'));
    await db.exec(read('portas_luz.sql')); // idempotente
    await db.exec(`grant all on all tables in schema public to authenticated; grant execute on function auth.uid() to authenticated;`);

    const U = { gm: '11111111-1111-1111-1111-111111111111', p1: '22222222-2222-2222-2222-222222222222', p2: '33333333-3333-3333-3333-333333333333' };
    await db.exec(`insert into auth.users values ${Object.values(U).map((u) => `('${u}')`).join(',')};`);
    const as = async (who: keyof typeof U, sql: string, params: unknown[] = []) => {
      await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${U[who]}', false); set role authenticated;`);
      try { return (await db.query(sql, params)).rows as Record<string, unknown>[]; } finally { await db.exec('reset role;'); }
    };
    let ok = 0;
    const eq = (label: string, a: unknown, b: unknown) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else failures.push(`${label} → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };

    const [camp] = await as('gm', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Mesa', 1, 1) returning id`, [U.gm]);
    const cid = camp.id as string;
    await db.query(`insert into campaign_members (campaign_id, user_id, role, joined_at) values ($1,$2,'player',1),($1,$3,'player',1)`, [cid, U.p1, U.p2]);
    // porta 0 em x=5 (de y 3 a 4), porta 1 trancada mais longe
    const grid = { size: 70, fog: { on: true, reveal: [], vision: true, walls: [{ x1: 5, y1: 3, x2: 5, y2: 4, door: true, open: false }, { x1: 9, y1: 3, x2: 9, y2: 4, door: true, open: false, locked: true }, { x1: 0, y1: 0, x2: 5, y2: 0 }] } };
    const [scene] = await as('gm', `insert into campaign_scenes (campaign_id, kind, name, grid, revealed) values ($1,'map','Cripta',$2, true) returning id`, [cid, JSON.stringify(grid)]);
    const [k1] = await as('gm', `insert into scene_tokens (scene_id, campaign_id, kind, label, owner_id, x, y) values ($1,$2,'hero','Kael',$3,3,3) returning id`, [scene.id, cid, U.p1]);
    const [k2] = await as('gm', `insert into scene_tokens (scene_id, campaign_id, kind, label, owner_id, x, y) values ($1,$2,'hero','Lyra',$3,14,3) returning id`, [scene.id, cid, U.p2]);
    const door = async (i: number) => ((await as('gm', `select grid->'fog'->'walls'->$1::int->>'open' as o from campaign_scenes`, [i]))[0].o);

    eq('jogador longe não abre', (await as('p2', `select id from toggle_door($1, 0)`, [scene.id])).length, 0);
    eq('porta continua fechada', await door(0), 'false');
    eq('jogador ao lado abre', (await as('p1', `select id from toggle_door($1, 0)`, [scene.id])).length, 1);
    eq('porta aberta', await door(0), 'true');
    eq('e fecha de novo', (await as('p1', `select id from toggle_door($1, 0)`, [scene.id])).length, 1);
    eq('parede comum não vira porta', (await as('gm', `select id from toggle_door($1, 2)`, [scene.id])).length, 0);
    await as('gm', `update scene_tokens set x = 8 where id = $1`, [k1.id]);
    eq('trancada: jogador não abre nem ao lado', (await as('p1', `select id from toggle_door($1, 1)`, [scene.id])).length, 0);
    eq('trancada: mestre abre', (await as('gm', `select id from toggle_door($1, 1)`, [scene.id])).length, 1);
    eq('porta trancada aberta pelo mestre', await door(1), 'true');

    eq('jogador acende a própria tocha', (await as('p1', `select id from set_token_light($1, 12)`, [k1.id])).length, 1);
    eq('luz gravada', (await as('gm', `select grid->'fog'->'lights'->>$1 as m from campaign_scenes`, [k1.id]))[0].m, '12');
    eq('não acende a luz do outro', (await as('p1', `select id from set_token_light($1, 12)`, [k2.id])).length, 0);
    eq('apaga a própria', (await as('p1', `select id from set_token_light($1, 0)`, [k1.id])).length, 1);
    eq('luz apagada', (await as('gm', `select grid->'fog'->'lights' ? $1 as has from campaign_scenes`, [k1.id]))[0].has, false);
    eq('paredes intactas', (await as('gm', `select jsonb_array_length(grid->'fog'->'walls') as n from campaign_scenes`))[0].n, 3);

    // cena fora do ar: jogador não mexe
    await as('gm', `update campaign_scenes set revealed = false`);
    eq('fora do ar: jogador não abre', (await as('p1', `select id from toggle_door($1, 1)`, [scene.id])).length, 0);

    expect(failures).toEqual([]);
    expect(ok).toBeGreaterThan(14);
  });
});
