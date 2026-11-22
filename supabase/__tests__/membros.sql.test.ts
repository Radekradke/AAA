import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * supabase/mesa_membros.sql num Postgres de verdade: o jogador sai da mesa,
 * o mestre remove quem deixou o grupo e só ele vê a lista com nomes.
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const mp = readFileSync(resolve(root, 'supabase/multiplayer_session.sql'), 'utf8');
const membros = readFileSync(resolve(root, 'supabase/mesa_membros.sql'), 'utf8');

const U = {
  gm: '11111111-1111-1111-1111-111111111111',
  p1: '22222222-2222-2222-2222-222222222222',
  p2: '33333333-3333-3333-3333-333333333333',
  x: '44444444-4444-4444-4444-444444444444',
};

describe('SQL: membros da mesa', () => {
  it('sair, remover e listar — cada um só no seu papel', async () => {
    const failures: string[] = [];
    const db = new PGlite();
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth; create table auth.users (id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create schema realtime;
      create table realtime.messages (id bigserial primary key, topic text, extension text, payload jsonb);
      create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;
      alter table realtime.messages enable row level security;
      create publication supabase_realtime;
      grant usage on schema public, auth, realtime to authenticated, anon;
    `);
    for (const f of [base, mp, membros, membros]) await db.exec(f); // idempotente
    await db.exec(`grant all on all tables in schema public to authenticated; grant execute on function auth.uid() to authenticated;`);
    await db.query(`insert into auth.users (id, raw_user_meta_data) values ($1, '{"full_name":"Mestra Ana"}'), ($2, '{"full_name":"Bruno"}'), ($3, '{"name":"Carla"}'), ($4, '{}')`, [U.gm, U.p1, U.p2, U.x]);

    const as = async (who: keyof typeof U, sql: string, params: unknown[] = []) => {
      await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${U[who]}', false); set role authenticated;`);
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
    const members = async () => (await db.query(`select user_id from campaign_members order by user_id`)).rows.map((r) => (r as { user_id: string }).user_id);
    const shared = async () => (await db.query(`select sheet_id from shared_sheets order by sheet_id`)).rows.map((r) => (r as { sheet_id: string }).sheet_id);

    const [camp] = await as('gm', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Mesa', 1, 1) returning id`, [U.gm]);
    await db.query(`insert into campaign_members (campaign_id, user_id, role, joined_at) values ($1,$2,'player',1),($1,$3,'player',2)`, [camp.id, U.p1, U.p2]);
    for (const [u, sid] of [[U.p1, 's-kael'], [U.p2, 's-ivar']]) {
      await db.query(`insert into sheets (id, user_id, title, character_name, class_id, race_id, snapshot, created_at, updated_at) values ($1,$2,$1,$1,'wizard','elf','{}',1,1)`, [sid, u]);
      await db.query(`insert into shared_sheets (campaign_id, sheet_id, owner_id, shared_at) values ($1,$2,$3,1)`, [camp.id, sid, u]);
    }

    // lista: só o mestre, com o nome da conta (nunca e-mail) e quantos heróis vinculou
    const roster = await as('gm', `select user_id, display_name, heroes from campaign_roster($1)`, [camp.id]);
    eq('mestre vê os jogadores na ordem de entrada', roster.map((r) => [r.display_name, r.heroes]), [['Bruno', 1], ['Carla', 1]]);
    await err('jogador não lê a lista', /Só o mestre/, () => as('p1', `select * from campaign_roster($1)`, [camp.id]));
    await err('intruso não lê a lista', /Só o mestre/, () => as('x', `select * from campaign_roster($1)`, [camp.id]));

    // ninguém apaga direto na tabela (só pelas funções)
    await as('p2', `delete from campaign_members where campaign_id = $1`, [camp.id]);
    eq('delete direto não passa pelo RLS', await members(), [U.p1, U.p2]);

    // jogador sai: membro e ficha vinculada saem juntos
    await as('p1', `select leave_campaign($1)`, [camp.id]);
    eq('quem saiu não é mais membro', await members(), [U.p2]);
    eq('a ficha de quem saiu deixa a mesa', await shared(), ['s-ivar']);
    await err('sair de novo avisa', /não faz parte/, () => as('p1', `select leave_campaign($1)`, [camp.id]));
    await err('mestre não sai da própria mesa', /mestre não sai/, () => as('gm', `select leave_campaign($1)`, [camp.id]));
    eq('quem saiu não vê mais a campanha', (await as('p1', `select id from campaigns where id = $1`, [camp.id])).length, 0);

    // mestre remove: só ele, nunca a si mesmo
    await err('jogador não remove outro', /Só o mestre/, () => as('p2', `select remove_campaign_member($1, $2)`, [camp.id, U.p2]));
    await err('mestre não se remove', /mestre não sai/, () => as('gm', `select remove_campaign_member($1, $2)`, [camp.id, U.gm]));
    await as('gm', `select remove_campaign_member($1, $2)`, [camp.id, U.p2]);
    eq('removido sai com a ficha', [await members(), await shared()], [[], []]);
    eq('lista vazia depois', (await as('gm', `select * from campaign_roster($1)`, [camp.id])).length, 0);

    const idx = await db.query(`select indexname from pg_indexes where indexname = 'session_events_campaign_type_idx'`);
    eq('índice de eventos por campanha + tipo', idx.rows.length, 1);
    const step = await db.query(`select step from app_schema_steps where step = 'mesa_membros'`);
    eq('versão do banco registrada', step.rows.length, 1);

    expect(failures).toEqual([]);
    expect(ok).toBeGreaterThanOrEqual(15);
  }, 60000);
});
