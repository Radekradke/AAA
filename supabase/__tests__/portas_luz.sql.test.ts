import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Paredes, portas e luz (supabase/portas_luz.sql) num Postgres de verdade:
 * migração do formato antigo sem duplicar, leitura só de cena no ar, porta
 * aberta só ao lado do próprio herói (trancada: só o mestre) e luz só do
 * próprio herói. E a prova da corrida: o mestre mexendo na névoa não
 * desfaz a porta que o jogador abriu.
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const read = (f: string) => readFileSync(resolve(root, 'supabase', f), 'utf8');

describe('SQL de paredes, portas e luz', () => {
  it('migra, protege e não deixa um atropelar o outro', async () => {
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
    await db.exec(`grant all on all tables in schema public to authenticated; grant execute on function auth.uid() to authenticated;`);

    const U = { gm: '11111111-1111-1111-1111-111111111111', p1: '22222222-2222-2222-2222-222222222222', p2: '33333333-3333-3333-3333-333333333333', x: '44444444-4444-4444-4444-444444444444' };
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

    // cena no formato ANTIGO: paredes e luzes dentro do JSON
    const [scene] = await as('gm', `insert into campaign_scenes (campaign_id, kind, name, grid, revealed) values ($1,'map','Cripta','{}', true) returning id`, [cid]);
    const [k1] = await as('gm', `insert into scene_tokens (scene_id, campaign_id, kind, label, owner_id, x, y) values ($1,$2,'hero','Kael',$3,3,3) returning id`, [scene.id, cid, U.p1]);
    const [k2] = await as('gm', `insert into scene_tokens (scene_id, campaign_id, kind, label, owner_id, x, y) values ($1,$2,'hero','Lyra',$3,14,3) returning id`, [scene.id, cid, U.p2]);
    const old = { size: 70, fog: { on: true, reveal: [], vision: true, lights: { [k1.id as string]: 12 }, walls: [
      { x1: 5, y1: 3, x2: 5, y2: 4, door: true, open: false },
      { x1: 9, y1: 3, x2: 9, y2: 4, door: true, open: false, locked: true },
      { x1: 0, y1: 0, x2: 5, y2: 0 },
      { x1: 2, y1: 2, x2: 2, y2: 2 },
    ] } };
    await as('gm', `update campaign_scenes set grid = $1 where id = $2`, [JSON.stringify(old), scene.id]);

    await db.exec(read('portas_luz.sql'));
    await db.exec(read('portas_luz.sql')); // de novo: não duplica nada
    await db.exec(`grant all on all tables in schema public to authenticated;`);

    eq('paredes migradas (o ponto solto fica de fora)', (await as('gm', `select count(*)::int as n from scene_walls`))[0].n, 3);
    eq('luz migrada para o peão', (await as('gm', `select light from scene_tokens where id = $1`, [k1.id]))[0].light, 12);
    eq('o JSON da cena ficou limpo', (await as('gm', `select grid->'fog' ?| array['walls','lights'] as has from campaign_scenes`))[0].has, false);
    eq('o resto da névoa ficou', (await as('gm', `select grid->'fog'->>'vision' as v from campaign_scenes`))[0].v, 'true');

    const wall = async (x: number) => (await as('gm', `select id, open, locked from scene_walls where x1 = $1 and door`, [x]))[0];
    const d0 = await wall(5);
    const d1 = await wall(9);

    eq('jogador vê as paredes da cena no ar', (await as('p1', `select count(*)::int as n from scene_walls`))[0].n, 3);
    eq('intruso não vê', (await as('x', `select count(*)::int as n from scene_walls`))[0].n, 0);
    eq('jogador não cria parede', (await as('p1', `insert into scene_walls (scene_id, campaign_id, x1, y1, x2, y2) select $1, $2, 0, 0, 1, 0 where false returning 1`, [scene.id, cid])).length, 0);
    let denied = false;
    try { await as('p1', `insert into scene_walls (scene_id, campaign_id, x1, y1, x2, y2) values ($1, $2, 0, 0, 1, 0)`, [scene.id, cid]); } catch { denied = true; }
    eq('inserção direta do jogador barrada', denied, true);
    eq('jogador não edita parede direto', (await as('p1', `update scene_walls set open = true returning 1`)).length, 0);

    eq('jogador longe não abre', (await as('p2', `select id from toggle_door($1)`, [d0.id])).length, 0);
    eq('jogador ao lado abre', (await as('p1', `select open from toggle_door($1)`, [d0.id])).map((r) => r.open), [true]);

    // A CORRIDA: o mestre mexe na névoa (revela uma área) depois que o jogador abriu
    await as('gm', `update campaign_scenes set grid = jsonb_set(grid, '{fog,reveal}', '[{"x":0,"y":0,"w":3,"h":3}]') where id = $1`, [scene.id]);
    eq('a porta que o jogador abriu continua aberta', (await wall(5)).open, true);

    await as('gm', `update scene_tokens set x = 8 where id = $1`, [k1.id]);
    eq('trancada: jogador não abre nem ao lado', (await as('p1', `select id from toggle_door($1)`, [d1.id])).length, 0);
    eq('trancada: mestre abre', (await as('gm', `select open from toggle_door($1)`, [d1.id])).map((r) => r.open), [true]);

    eq('jogador acende a própria tocha', (await as('p1', `select light from set_token_light($1, 12)`, [k1.id])).map((r) => r.light), [12]);
    eq('não acende a luz do outro', (await as('p1', `select id from set_token_light($1, 12)`, [k2.id])).length, 0);
    eq('luz tem teto', (await as('gm', `select light from set_token_light($1, 99)`, [k2.id])).map((r) => r.light), [36]);
    eq('apaga a própria', (await as('p1', `select light from set_token_light($1, 0)`, [k1.id])).map((r) => r.light), [0]);

    await as('gm', `update campaign_scenes set revealed = false`);
    eq('fora do ar: jogador não abre', (await as('p1', `select id from toggle_door($1)`, [d0.id])).length, 0);
    eq('fora do ar: jogador não vê paredes', (await as('p1', `select count(*)::int as n from scene_walls`))[0].n, 0);

    await as('gm', `delete from campaign_scenes where id = $1`, [scene.id]);
    eq('apagar a cena leva as paredes', (await as('gm', `select count(*)::int as n from scene_walls`))[0].n, 0);

    expect(failures).toEqual([]);
    expect(ok).toBeGreaterThan(20);
  });
});
