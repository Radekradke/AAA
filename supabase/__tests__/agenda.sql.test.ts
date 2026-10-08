import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * supabase/agenda.sql num Postgres de verdade: o mestre marca a sessão,
 * a mesa confirma presença — com as permissões (RLS) de cada papel.
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const agenda = readFileSync(resolve(root, 'supabase/agenda.sql'), 'utf8');

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

describe('SQL da agenda da campanha', () => {
  it('mestre marca, mesa confirma, estranho não vê nada', async () => {
    const failures: string[] = [];
    const db = await boot();
    for (const f of [base, agenda, agenda]) await db.exec(f); // idempotente
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

    eq('passo registrado', (await db.query(`select step from app_schema_steps where step = 'agenda'`)).rows.length, 1);

    const [camp] = await as('gm', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Mesa', 1, 1) returning id`, [U.gm]);
    const [other] = await as('x', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Outra', 1, 1) returning id`, [U.x]);
    await db.exec(`insert into campaign_members (campaign_id, user_id, role, joined_at) values ('${camp.id}', '${U.p1}', 'player', 1), ('${camp.id}', '${U.p2}', 'player', 1);`);

    // --- encontros ---
    const [ev] = await as('gm', `insert into campaign_events (campaign_id, starts_at, title, place) values ($1, now() + interval '3 days', 'Sessão 5', 'Casa do Léo') returning id, created_by, duration_min`, [camp.id]);
    eq('mestre marca (autor e duração padrão)', [ev.created_by, ev.duration_min], [U.gm, 240]);
    await err('jogador não marca sessão', /row-level security|violates/, () => as('p1', `insert into campaign_events (campaign_id, starts_at) values ($1, now())`, [camp.id]));
    await err('mestre não marca na mesa dos outros', /row-level security|violates/, () => as('gm', `insert into campaign_events (campaign_id, starts_at) values ($1, now())`, [other.id]));
    eq('jogador vê a data', (await as('p1', `select title from campaign_events`)).map((r) => r.title), ['Sessão 5']);
    eq('estranho não vê', (await as('x', `select * from campaign_events where campaign_id = $1`, [camp.id])).length, 0);
    eq('anônimo não vê', await as('anon', `select count(*)::int as n from campaign_events`).then((r) => (r[0].n ? 'viu' : 'nada')).catch(() => 'nada'), 'nada');
    eq('jogador não edita (0 linhas)', (await as('p1', `update campaign_events set title = 'Hack' returning id`)).length, 0);
    eq('jogador não apaga (0 linhas)', (await as('p1', `delete from campaign_events returning id`)).length, 0);
    await err('título gigante recusado', /check/, () => as('gm', `update campaign_events set title = repeat('a', 90) where id = $1`, [ev.id]));
    await err('duração absurda recusada', /check/, () => as('gm', `update campaign_events set duration_min = 5 where id = $1`, [ev.id]));

    // --- presença ---
    await as('p1', `insert into campaign_rsvps (event_id, campaign_id, status, display_name, hero_name) values ($1, $2, 'yes', 'Ana', 'Kael')`, [ev.id, camp.id]);
    await as('p2', `insert into campaign_rsvps (event_id, campaign_id, status, display_name) values ($1, $2, 'maybe', 'Bia')`, [ev.id, camp.id]);
    await as('gm', `insert into campaign_rsvps (event_id, campaign_id, status, display_name) values ($1, $2, 'yes', 'Mestre')`, [ev.id, camp.id]);
    eq('dono da resposta gravado', (await db.query(`select user_id from campaign_rsvps where display_name = 'Ana'`)).rows, [{ user_id: U.p1 }]);
    eq('todos da mesa veem as respostas', (await as('p2', `select display_name, status from campaign_rsvps order by display_name`)).map((r) => `${r.display_name}:${r.status}`), ['Ana:yes', 'Bia:maybe', 'Mestre:yes']);
    await as('p1', `insert into campaign_rsvps (event_id, campaign_id, status) values ($1, $2, 'no') on conflict (event_id, user_id) do update set status = excluded.status, updated_at = now()`, [ev.id, camp.id]);
    eq('trocar a resposta (upsert)', (await db.query(`select status from campaign_rsvps where user_id = $1`, [U.p1])).rows, [{ status: 'no' }]);
    await err('não responde por outro', /row-level security|violates/, () => as('p1', `insert into campaign_rsvps (event_id, user_id, campaign_id, status) values ($1, $2, $3, 'no')`, [ev.id, U.x, camp.id]));
    eq('não altera a resposta dos outros (0 linhas)', (await as('p1', `update campaign_rsvps set status = 'no' where user_id = $1 returning 1`, [U.p2])).length, 0);
    await err('estranho não responde', /row-level security|violates/, () => as('x', `insert into campaign_rsvps (event_id, campaign_id, status) values ($1, $2, 'yes')`, [ev.id, camp.id]));
    await err('estranho não burla trocando a mesa', /row-level security|violates/, () => as('x', `insert into campaign_rsvps (event_id, campaign_id, status) values ($1, $2, 'yes')`, [ev.id, other.id]));
    await err('status inválido recusado', /check/, () => as('p2', `update campaign_rsvps set status = 'talvez' where user_id = $1`, [U.p2]));
    eq('estranho não lê as respostas', (await as('x', `select * from campaign_rsvps`)).length, 0);

    // --- cancelar ---
    await as('gm', `update campaign_events set canceled = true where id = $1`, [ev.id]);
    await err('encontro cancelado não aceita resposta nova', /row-level security|violates/, () => as('p2', `update campaign_rsvps set status = 'yes' where user_id = $1`, [U.p2]));
    await as('gm', `delete from campaign_events where id = $1`, [ev.id]);
    eq('apagar leva as respostas junto', (await db.query(`select count(*)::int as n from campaign_rsvps`)).rows, [{ n: 0 }]);

    expect(failures).toEqual([]);
    expect(ok).toBeGreaterThan(20);
  }, 60_000);
});
