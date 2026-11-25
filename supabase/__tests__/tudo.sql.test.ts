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
    expect(readFileSync(resolve(root, 'supabase/TUDO.sql'), 'utf8')).toBe(buildTudo());
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
    for (const t of ['campaigns', 'sessions', 'encounters', 'campaign_scenes', 'scene_tokens', 'campaign_handouts', 'campaign_events', 'scene_secrets']) expect(tables).toContain(t);
  }, 60_000);
});
