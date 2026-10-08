import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * supabase/recursos_extras.sql num Postgres de verdade: versão do banco,
 * registro de erros, convite por código e ficha compartilhada por link —
 * com as permissões (RLS) de cada papel.
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const read = (f: string) => readFileSync(resolve(root, 'supabase', f), 'utf8');
const extras = read('recursos_extras.sql');

async function boot() {
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
    grant execute on function auth.uid() to authenticated, anon;
  `);
  return db;
}

const U = { gm: '11111111-1111-1111-1111-111111111111', p1: '22222222-2222-2222-2222-222222222222', x: '44444444-4444-4444-4444-444444444444' };

describe('SQL dos recursos extras', () => {
  it('banco só com o script base: reconhece o que já existe', async () => {
    const db = await boot();
    await db.exec(base);
    await db.exec(extras);
    const steps = (await db.query(`select step from app_schema_steps order by step`)).rows.map((r) => (r as { step: string }).step);
    expect(steps).toEqual(['base', 'recursos_extras']);
  }, 60_000);

  it('versão, erros, convite por código e ficha compartilhada', async () => {
    const failures: string[] = [];
    const db = await boot();
    for (const f of [base, read('multiplayer_session.sql'), read('atualizacao_npcs_bestiario.sql'), read('palco.sql'), read('mestre_console.sql'), extras, extras]) await db.exec(f);
    await db.exec(base); // rodar o base de novo não desliga o código de convite
    await db.exec(`grant all on all tables in schema public to authenticated;`);
    await db.exec(`insert into auth.users values ${Object.values(U).map((u) => `('${u}')`).join(',')};`);

    const as = async (who: keyof typeof U | 'anon', sql: string, params: unknown[] = []) => {
      await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${who === 'anon' ? '' : U[who]}', false); set role ${who === 'anon' ? 'anon' : 'authenticated'};`);
      try {
        return (await db.query(sql, params)).rows as Record<string, unknown>[];
      } finally {
        await db.exec('reset role;');
      }
    };
    let ok = 0;
    const eq = (label: string, a: unknown, b: unknown) => {
      if (JSON.stringify(a) === JSON.stringify(b)) ok++;
      else failures.push(`${label} → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
    };
    const err = async (label: string, re: RegExp, fn: () => Promise<unknown>) => {
      try {
        await fn();
        failures.push(`${label} → não falhou`);
      } catch (e) {
        if (re.test((e as Error).message)) ok++;
        else failures.push(`${label} → ${(e as Error).message}`);
      }
    };

    // --- 1) versão do banco ---
    const steps = (await as('p1', `select step from app_schema_steps order by step`)).map((r) => r.step);
    eq('todos os passos registrados', steps, ['base', 'mestre_console', 'multiplayer', 'npcs_bestiario', 'palco', 'recursos_extras']);

    // --- 2) registro de erros ---
    await as('p1', `insert into client_errors (message, route, kind) values ('quebrou', '/ficha/x', 'render')`);
    eq('erro gravado com o dono', (await db.query(`select user_id from client_errors`)).rows, [{ user_id: U.p1 }]);
    await err('não grava erro em nome de outro', /row-level security|violates/, () => as('p1', `insert into client_errors (message, user_id) values ('x', $1)`, [U.gm]));
    eq('ninguém lê os erros pelo app', (await as('p1', `select * from client_errors`)).length, 0);
    await err('anônimo não grava erro', /permission|row-level/, () => as('anon', `insert into client_errors (message) values ('x')`));
    await err('mensagem gigante recusada', /check/, () => as('p1', `insert into client_errors (message) values (repeat('a', 700))`));

    // --- 3) convite por código ---
    const [camp] = await as('gm', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Mesa', 1, 1) returning id`, [U.gm]);
    await as('gm', `insert into invite_links (campaign_id, token, created_by, uses, code) values ($1, 'tok123456789ab', $2, 0, 'K7Q42MXP')`, [camp.id, U.gm]);
    const [joined] = await as('p1', `select join_campaign_code('k7q4-2mxp') as id`);
    eq('entra pelo código (minúsculo, com hífen)', joined.id, camp.id);
    eq('virou jogador da mesa', (await db.query(`select role from campaign_members where campaign_id = $1 and user_id = $2`, [camp.id, U.p1])).rows, [{ role: 'player' }]);
    await err('código errado', /Convite inválido/, () => as('x', `select join_campaign_code('AAAA-BBBB')`));
    await err('anônimo não entra', /permission|login/i, () => as('anon', `select join_campaign_code('K7Q4-2MXP')`));
    await as('gm', `update invite_links set code = 'NEWC0DE2' where campaign_id = $1`, [camp.id]);
    await err('código antigo para de valer', /Convite inválido/, () => as('x', `select join_campaign_code('K7Q4-2MXP')`));
    await err('código repetido entre mesas é recusado', /duplicate|unique/, async () => {
      const [c2] = await as('x', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Outra', 1, 1) returning id`, [U.x]);
      return as('x', `insert into invite_links (campaign_id, token, created_by, uses, code) values ($1, 'tokzzzzzzzzzz', $2, 0, 'NEWC0DE2')`, [c2.id, U.x]);
    });

    // --- 4) ficha compartilhada ---
    await as('p1', `insert into sheets (id, user_id, title, character_name, class_id, race_id, level, sheet_version, snapshot, created_at, updated_at) values ('s1', $1, 'Kael', 'Kael', 'wizard', 'elf', 5, 3, '{"name":"Kael"}', 1, 2)`, [U.p1]);
    await as('x', `insert into sheets (id, user_id, title, character_name, class_id, race_id, level, sheet_version, snapshot, created_at, updated_at) values ('s9', $1, 'Outro', 'Outro', 'fighter', 'human', 1, 3, '{}', 1, 1)`, [U.x]);
    const TOKEN = 'abcdefghijklmnop1234';
    await as('p1', `insert into sheet_shares (token, sheet_id) values ($1, 's1')`, [TOKEN]);
    await err('não compartilha ficha dos outros', /row-level security|violates/, () => as('p1', `insert into sheet_shares (token, sheet_id) values ('zzzzzzzzzzzzzzzzzz', 's9')`));
    await err('token curto recusado', /check/, () => as('p1', `insert into sheet_shares (token, sheet_id) values ('curto', 's1')`));
    const [pub] = await as('anon', `select * from shared_sheet($1)`, [TOKEN]);
    eq('anônimo lê pelo link', [pub.character_name, (pub.snapshot as { name: string }).name], ['Kael', 'Kael']);
    eq('token errado não mostra nada', (await as('anon', `select * from shared_sheet('naoexisteeeeeeeeee')`)).length, 0);
    eq('outro usuário não lista os links', (await as('x', `select * from sheet_shares`)).length, 0);
    eq('anônimo não lista a tabela', await as('anon', `select count(*)::int as n from sheet_shares`).then((r) => r[0].n).catch(() => 'negado'), 'negado');
    await as('p1', `update sheet_shares set revoked_at = 99 where token = $1`, [TOKEN]);
    eq('revogado: o link para de mostrar', (await as('anon', `select * from shared_sheet($1)`, [TOKEN])).length, 0);

    expect(failures).toEqual([]);
    expect(ok).toBeGreaterThan(15);
  }, 60_000);
});
