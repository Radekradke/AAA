import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error script .mjs sem tipos
import { buildTudo } from '../../scripts/supabase-tudo.mjs';

/**
 * supabase/TUDO.sql: o arquivo único que o dono roda no Supabase. Precisa
 * estar em dia com os arquivos de supabase/ e rodar inteiro, duas vezes,
 * num Postgres limpo (sem apagar nada na segunda).
 */
const root = resolve(__dirname, '../..');

describe('TUDO.sql (todo o SQL num arquivo só)', () => {
  it('está em dia com os arquivos (npm run sql:tudo)', () => {
    expect(readFileSync(resolve(root, 'supabase/TUDO.sql'), 'utf8').replace(/\r\n/g, '\n')).toBe(buildTudo());
  });

  it('roda inteiro num banco limpo e de novo por cima', async () => {
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
    const sql = buildTudo();
    await db.exec(sql);
    await db.exec(sql);
    const tables = (await db.query<{ t: string }>(`select table_name as t from information_schema.tables where table_schema = 'public' order by 1`)).rows.map((r) => r.t);
    const gm = '11111111-1111-4111-8111-111111111111';
    const p1 = '22222222-2222-4222-8222-222222222222';
    const p2 = '33333333-3333-4333-8333-333333333333';
    await db.exec(`grant all on all tables in schema public to authenticated;
      insert into auth.users values ('${gm}'), ('${p1}'), ('${p2}');`);
    async function as(who: string, query: string, args: unknown[] = []) {
      await db.exec(`select set_config('request.jwt.claim.sub', '${who}', false); set role authenticated;`);
      try { return (await db.query(query, args)).rows; } finally { await db.exec('reset role'); }
    }
    const campaign = (await as(gm, "insert into campaigns (master_id,name,created_at,updated_at) values ($1,'Ensaio',1,1) returning id", [gm]))[0].id;
    await db.query("insert into campaign_members (campaign_id,user_id,role,joined_at) values ($1,$2,'player',1),($1,$3,'player',1)", [campaign, p1, p2]);
    await db.query("insert into sheets (id,user_id,title,character_name,class_id,race_id,snapshot,created_at,updated_at) values ('hero',$1,'Hero','Hero','wizard','elf','{}',1,1)", [p1]);
    await db.query("insert into shared_sheets (campaign_id,sheet_id,owner_id,shared_at,permissions) values ($1,'hero',$2,1,'{}')", [campaign, p1]);
    const session = (await as(gm, "select id from start_session($1,'Ensaio')", [campaign]))[0].id;
    const encounter = (await as(gm, "select id from create_encounter($1,'Ensaio')", [session]))[0].id;
    const hero = (await as(gm, "select id from add_combatant($1,'player','Hero','hero',0,8,16,12)", [encounter]))[0].id;
    await as(p1, `select * from update_own_combatant($1, '{"hp_current":9}')`, [hero]);
    expect((await as(gm, "select hp_current from combatants where id=$1", [hero]))[0].hp_current).toBe(9);
    const order = (await as(gm, `insert into session_events (session_id,campaign_id,actor_id,type,target_id,payload) values ($1,$2,$3,'hero_hp_correction',$4,'{"sheetId":"hero"}') returning id`, [session, campaign, gm, hero]))[0].id;
    await as(p1, 'select * from update_own_combatant($1,$2::jsonb)', [hero, JSON.stringify({ hp_current: 7, hp_event_id: order })]);
    expect((await as(gm, 'select hp_current, hp_event_id from combatants where id=$1', [hero]))[0]).toEqual({ hp_current: 7, hp_event_id: order });
    const item = `insert into session_events (session_id,campaign_id,actor_id,type,payload) values ($1,$2,$3,'hero_item','{"sheetId":"hero"}')`;
    await expect(as(gm, item, [session, campaign, gm])).rejects.toThrow(/row-level security/);
    await as(p1, `update shared_sheets set permissions = '{"editInventory":true}' where sheet_id='hero'`);
    await expect(as(gm, item, [session, campaign, gm])).resolves.toEqual([]);
    await expect(as(p2, item, [session, campaign, p2])).rejects.toThrow(/row-level security/);
    await as(gm, "insert into campaign_handouts (campaign_id,title,shown_at,recipients) values ($1,'Pública',now(),null), ($1,'Dirigida',now(),array[$2]::uuid[]), ($1,'Gaveta',null,null)", [campaign, p1]);
    expect(await as(p1, 'select title from campaign_handouts order by title')).toEqual([{ title: 'Dirigida' }, { title: 'Pública' }]);
    expect(await as(p2, 'select title from campaign_handouts')).toEqual([{ title: 'Pública' }]);
    expect(await as(gm, 'select title from campaign_handouts')).toHaveLength(3);
    for (const t of ['campaigns', 'sessions', 'encounters', 'campaign_scenes', 'scene_tokens', 'campaign_handouts', 'campaign_events', 'scene_secrets']) expect(tables).toContain(t);
  }, 60_000);
});
