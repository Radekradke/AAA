import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * supabase/discord.sql num Postgres de verdade: o webhook do Discord da mesa
 * só existe para o mestre — jogador, estranho e anônimo não leem nem gravam.
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const discord = readFileSync(resolve(root, 'supabase/discord.sql'), 'utf8');

async function boot() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create publication supabase_realtime;
    grant usage on schema public, auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  return db;
}

const U = {
  gm: '11111111-1111-1111-1111-111111111111',
  p1: '22222222-2222-2222-2222-222222222222',
  p2: '33333333-3333-3333-3333-333333333333',
  x: '44444444-4444-4444-4444-444444444444',
};

describe('SQL do Discord da mesa', () => {
  it('só o mestre lê e grava o webhook; endereço inválido é recusado', async () => {
    const failures: string[] = [];
    const db = await boot();
    for (const f of [base, discord, discord]) await db.exec(f); // idempotente
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

    eq('passo registrado', (await db.query(`select step from app_schema_steps where step = 'discord'`)).rows.length, 1);
    const [camp] = await as('gm', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Mesa', 1, 1) returning id`, [U.gm]);
    const [other] = await as('x', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Outra', 1, 1) returning id`, [U.x]);
    await db.exec(`insert into campaign_members (campaign_id, user_id, role, joined_at) values ('${camp.id}', '${U.p1}', 'player', 1);`);
    const hook = 'https://discord.com/api/webhooks/123456/abc_DEF-9';

    await as('gm', `insert into campaign_discord (campaign_id, webhook_url) values ($1, $2)`, [camp.id, hook]);
    eq('mestre lê o próprio webhook', (await as('gm', `select webhook_url from campaign_discord`)).map((r) => r.webhook_url), [hook]);
    eq('jogador da mesa não lê', (await as('p1', `select * from campaign_discord`)).length, 0);
    eq('estranho não lê', (await as('x', `select * from campaign_discord where campaign_id = $1`, [camp.id])).length, 0);
    eq('anônimo não lê', await as('anon', `select count(*)::int as n from campaign_discord`).then((r) => (r[0].n ? 'viu' : 'nada')).catch(() => 'nada'), 'nada');
    await err('jogador não grava', /row-level security|violates/, () => as('p1', `insert into campaign_discord (campaign_id, webhook_url) values ($1, $2) on conflict (campaign_id) do update set webhook_url = excluded.webhook_url`, [camp.id, hook]));
    eq('jogador não troca (0 linhas)', (await as('p1', `update campaign_discord set enabled = false returning campaign_id`)).length, 0);
    eq('jogador não apaga (0 linhas)', (await as('p1', `delete from campaign_discord returning campaign_id`)).length, 0);
    await err('mestre não grava na mesa dos outros', /row-level security|violates/, () => as('gm', `insert into campaign_discord (campaign_id, webhook_url) values ($1, $2)`, [other.id, hook]));
    await err('endereço que não é webhook do Discord', /check/, () => as('gm', `update campaign_discord set webhook_url = 'https://evil.example/api/webhooks/1/x' where campaign_id = $1`, [camp.id]));
    await err('http sem s', /check/, () => as('gm', `update campaign_discord set webhook_url = 'http://discord.com/api/webhooks/1/x' where campaign_id = $1`, [camp.id]));
    eq('mestre desliga', (await as('gm', `update campaign_discord set enabled = false returning enabled`)).map((r) => r.enabled), [false]);
    eq('mestre apaga', (await as('gm', `delete from campaign_discord returning campaign_id`)).length, 1);

    expect(failures).toEqual([]);
    expect(ok).toBeGreaterThan(10);
  });
});
