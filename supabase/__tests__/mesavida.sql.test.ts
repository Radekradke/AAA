import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * supabase/mesa_vida.sql num Postgres de verdade: o jogador manda PV e
 * condições do PRÓPRIO herói para o encontro — e só isso.
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const mp = readFileSync(resolve(root, 'supabase/multiplayer_session.sql'), 'utf8');
const vida = readFileSync(resolve(root, 'supabase/mesa_vida.sql'), 'utf8');

const U = {
  gm: '11111111-1111-1111-1111-111111111111',
  p1: '22222222-2222-2222-2222-222222222222',
  p2: '33333333-3333-3333-3333-333333333333',
  x: '44444444-4444-4444-4444-444444444444',
};

describe('SQL: PV do herói igual para mestre e jogador', () => {
  it('dono atualiza PV e condições; ninguém mais; nada além disso', async () => {
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
      create publication supabase_realtime;
      grant usage on schema public, auth, realtime to authenticated, anon;
    `);
    for (const f of [base, mp, vida, vida]) await db.exec(f); // idempotente
    await db.exec(`grant all on all tables in schema public to authenticated; grant execute on function auth.uid() to authenticated;`);
    await db.exec(`insert into auth.users values ${Object.values(U).map((u) => `('${u}')`).join(',')};`);

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

    eq('passo registrado', (await db.query(`select step from app_schema_steps where step = 'mesa_vida'`)).rows.length, 1);

    const [camp] = await as('gm', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Mesa', 1, 1) returning id`, [U.gm]);
    await db.query(`insert into campaign_members (campaign_id, user_id, role, joined_at) values ($1,$2,'player',1),($1,$3,'player',1)`, [camp.id, U.p1, U.p2]);
    for (const [u, sid] of [[U.p1, 's-kael'], [U.p2, 's-ivar']]) {
      await db.query(`insert into sheets (id, user_id, title, character_name, class_id, race_id, snapshot, created_at, updated_at) values ($1,$2,$1,$1,'wizard','elf','{}',1,1)`, [sid, u]);
      await db.query(`insert into shared_sheets (campaign_id, sheet_id, owner_id, shared_at) values ($1,$2,$3,1)`, [camp.id, sid, u]);
    }
    const [ses] = await as('gm', `select * from start_session($1,'S1')`, [camp.id]);
    const [enc] = await as('gm', `select * from create_encounter($1,'Luta')`, [ses.id]);
    const [kael] = await as('gm', `select * from add_combatant($1,'player','Kael','s-kael',4,38,42,15)`, [enc.id]);
    const [gob] = await as('gm', `select * from add_combatant($1,'monster','Goblin',null,2,7,7,15)`, [enc.id]);

    const [after] = await as('p1', `select * from update_own_combatant($1, '{"hp_current": 20, "conditions": ["Caído"]}')`, [kael.id]);
    eq('dono atualiza o PV do próprio herói', after.hp_current, 20);
    eq('…e as condições', after.conditions, ['Caído']);
    eq('nome, CA e máximo ficam como estavam', [after.name, after.armor_class, after.hp_max], ['Kael', 15, 42]);
    eq('mestre vê o PV novo', (await as('gm', `select hp_current from combatants where id=$1`, [kael.id]))[0].hp_current, 20);

    const [clamped] = await as('p1', `select * from update_own_combatant($1, '{"hp_current": 999}')`, [kael.id]);
    eq('PV não passa do máximo', clamped.hp_current, 42);
    const [floor] = await as('p1', `select * from update_own_combatant($1, '{"hp_current": -8}')`, [kael.id]);
    eq('PV não fica negativo', floor.hp_current, 0);
    const [grown] = await as('p1', `select * from update_own_combatant($1, '{"hp_max": 50, "hp_current": 50}')`, [kael.id]);
    eq('subiu de nível: máximo e atual novos', [grown.hp_max, grown.hp_current], [50, 50]);
    const [sneaky] = await as('p1', `select * from update_own_combatant($1, '{"name": "Deus", "armor_class": 30, "hidden": true}')`, [kael.id]);
    eq('campos do mestre são ignorados', [sneaky.name, sneaky.armor_class, sneaky.hidden], ['Kael', 15, false]);

    await err('outro jogador não mexe no seu herói', /próprio herói/, () => as('p2', `select * from update_own_combatant($1, '{"hp_current": 1}')`, [kael.id]));
    await err('intruso não mexe', /próprio herói/, () => as('x', `select * from update_own_combatant($1, '{"hp_current": 1}')`, [kael.id]));
    await err('jogador não mexe em monstro', /próprio herói/, () => as('p1', `select * from update_own_combatant($1, '{"hp_current": 0}')`, [gob.id]));

    expect(failures).toEqual([]);
    expect(ok).toBeGreaterThanOrEqual(12);
  }, 60000);
});
