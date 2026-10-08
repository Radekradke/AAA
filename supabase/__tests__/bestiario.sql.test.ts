import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * supabase/bestiario.sql num Postgres de verdade: o mestre personaliza as
 * criaturas da mesa (foto e nome que todos veem, notas só dele).
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const bestiario = readFileSync(resolve(root, 'supabase/bestiario.sql'), 'utf8');

const U = {
  gm: '11111111-1111-1111-1111-111111111111',
  p1: '22222222-2222-2222-2222-222222222222',
  x: '44444444-4444-4444-4444-444444444444',
};
const IMG = 'data:image/webp;base64,AAAA';

describe('SQL do bestiário da mesa', () => {
  it('mestre personaliza; mesa vê a aparência; notas só do mestre', async () => {
    const failures: string[] = [];
    const db = new PGlite();
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create publication supabase_realtime;
      grant usage on schema public, auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
    `);
    for (const f of [base, bestiario, bestiario]) await db.exec(f); // idempotente
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

    eq('passo registrado', (await db.query(`select step from app_schema_steps where step = 'bestiario'`)).rows.length, 1);
    const [camp] = await as('gm', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Mesa', 1, 1) returning id`, [U.gm]);
    const [other] = await as('x', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Outra', 1, 1) returning id`, [U.x]);
    await db.exec(`insert into campaign_members (campaign_id, user_id, role, joined_at) values ('${camp.id}', '${U.p1}', 'player', 1);`);

    // aparência
    await as('gm', `insert into campaign_monsters (campaign_id, monster_ref, name, portrait) values ($1, 'goblin', 'Batedor Garra-Negra', $2)`, [camp.id, IMG]);
    eq('jogador vê nome e foto', (await as('p1', `select monster_ref, name, portrait from campaign_monsters`)), [{ monster_ref: 'goblin', name: 'Batedor Garra-Negra', portrait: IMG }]);
    eq('autor gravado', (await db.query(`select updated_by from campaign_monsters`)).rows, [{ updated_by: U.gm }]);
    eq('estranho não vê', (await as('x', `select * from campaign_monsters where campaign_id = $1`, [camp.id])).length, 0);
    eq('anônimo não vê', await as('anon', `select count(*)::int as n from campaign_monsters`).then((r) => (r[0].n ? 'viu' : 'nada')).catch(() => 'nada'), 'nada');
    await err('jogador não personaliza', /row-level security|violates/, () => as('p1', `insert into campaign_monsters (campaign_id, monster_ref, name) values ($1, 'orc', 'x')`, [camp.id]));
    eq('jogador não edita (0 linhas)', (await as('p1', `update campaign_monsters set name = 'Hack' returning 1`)).length, 0);
    eq('jogador não apaga (0 linhas)', (await as('p1', `delete from campaign_monsters returning 1`)).length, 0);
    await err('mestre não mexe na mesa dos outros', /row-level security|violates/, () => as('gm', `insert into campaign_monsters (campaign_id, monster_ref, name) values ($1, 'orc', 'x')`, [other.id]));
    await err('foto precisa ser imagem', /check/, () => as('gm', `insert into campaign_monsters (campaign_id, monster_ref, portrait) values ($1, 'orc', 'javascript:alert(1)')`, [camp.id]));
    await err('foto gigante recusada', /check/, () => as('gm', `insert into campaign_monsters (campaign_id, monster_ref, portrait) values ($1, 'orc', 'data:image/png;base64,' || repeat('A', 400100))`, [camp.id]));
    await as('gm', `insert into campaign_monsters (campaign_id, monster_ref, name) values ($1, 'goblin', 'Goblin Rei') on conflict (campaign_id, monster_ref) do update set name = excluded.name`, [camp.id]);
    eq('upsert troca o nome', (await db.query(`select name from campaign_monsters`)).rows, [{ name: 'Goblin Rei' }]);
    await as('gm', `insert into campaign_monsters (campaign_id, monster_ref, name) values ($1, 'hb:1b2c', 'Criatura própria')`, [camp.id]);
    eq('aceita id de homebrew', (await db.query(`select count(*)::int as n from campaign_monsters where monster_ref like 'hb:%'`)).rows, [{ n: 1 }]);

    // notas do mestre
    await as('gm', `insert into campaign_monster_notes (campaign_id, monster_ref, notes) values ($1, 'goblin', 'Foge com 3 PV')`, [camp.id]);
    eq('mestre lê as notas', (await as('gm', `select notes from campaign_monster_notes`)), [{ notes: 'Foge com 3 PV' }]);
    eq('jogador não lê as notas', (await as('p1', `select * from campaign_monster_notes`)).length, 0);
    await err('jogador não escreve notas', /row-level security|violates/, () => as('p1', `insert into campaign_monster_notes (campaign_id, monster_ref, notes) values ($1, 'orc', 'x')`, [camp.id]));

    // restaurar o padrão
    await as('gm', `delete from campaign_monsters where campaign_id = $1 and monster_ref = 'goblin'`, [camp.id]);
    eq('mestre restaura o padrão', (await as('p1', `select monster_ref from campaign_monsters order by 1`)).map((r) => r.monster_ref), ['hb:1b2c']);
    await db.exec(`delete from campaigns where id = '${camp.id}'`);
    eq('apagar a mesa leva tudo junto', (await db.query(`select (select count(*) from campaign_monsters)::int + (select count(*) from campaign_monster_notes)::int as n`)).rows, [{ n: 0 }]);

    expect(failures).toEqual([]);
    expect(ok).toBeGreaterThan(15);
  }, 60_000);
});
