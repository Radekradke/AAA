import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Console do mestre (supabase/mestre_console.sql) num Postgres de verdade:
 * sessão preparada, bandeja só do mestre, notas privadas que nunca chegam ao
 * jogador e marca de improviso — e que rodar os scripts antigos de novo não
 * reabre nada.
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const mp = readFileSync(resolve(root, 'supabase/multiplayer_session.sql'), 'utf8');
const palco = readFileSync(resolve(root, 'supabase/palco.sql'), 'utf8');
const mestre = readFileSync(resolve(root, 'supabase/mestre_console.sql'), 'utf8');

describe('SQL do console do mestre', () => {
  it('preparação, bandeja, notas privadas e improviso', async () => {
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
    await db.exec(mp);
    await db.exec(palco);
    await db.exec(mestre);
    await db.exec(mestre); // idempotente
    // rodar os scripts antigos de novo NÃO pode reabrir notas privadas nem sessões preparadas
    await db.exec(base);
    await db.exec(mp);
    await db.exec(`grant all on all tables in schema public to authenticated; grant all on storage.objects to authenticated; grant execute on function auth.uid() to authenticated;`);

    const U = { gm: '11111111-1111-1111-1111-111111111111', p1: '22222222-2222-2222-2222-222222222222', x: '44444444-4444-4444-4444-444444444444' };
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

    const [camp] = await as('gm', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Mesa', 1, 1) returning id`, [U.gm]);
    await db.query(`insert into campaign_members (campaign_id, user_id, role, joined_at) values ($1,$2,'player',1)`, [camp.id, U.p1]);

    // --- sessão preparada ---
    await err('jogador não prepara sessão', /mestre/, () => as('p1', `select * from plan_session($1,'X')`, [camp.id]));
    const [plan] = await as('gm', `select * from plan_session($1,'A traição de Roland')`, [camp.id]);
    eq('nasce planejada', plan.status, 'planned');
    eq('jogador NÃO vê a sessão preparada (spoiler no nome)', (await as('p1', `select id from sessions where campaign_id = $1`, [camp.id])).length, 0);
    eq('mestre vê a preparada', (await as('gm', `select id from sessions where campaign_id = $1`, [camp.id])).length, 1);
    await as('gm', `select * from rename_session($1,'Sessão 08')`, [plan.id]);

    // --- bandeja: só o mestre ---
    await as('gm', `insert into session_prep (session_id, campaign_id, tray) values ($1,$2,'{"monsters":["troll"]}')`, [plan.id, camp.id]);
    eq('jogador não lê a bandeja', (await as('p1', `select * from session_prep`)).length, 0);
    await err('jogador não escreve na bandeja', /row-level security|violates/, () => as('p1', `insert into session_prep (session_id, campaign_id, tray) values ($1,$2,'{}')`, [plan.id, camp.id]));
    await err('intruso não escreve na bandeja', /row-level security|violates/, () => as('x', `update session_prep set tray = '{}' where session_id = $1 returning 1`, [plan.id]).then((r) => { if (!r.length) throw new Error('row-level security'); }));

    // --- começar a preparada ---
    await err('jogador não começa a sessão', /mestre/, () => as('p1', `select * from start_planned_session($1)`, [plan.id]));
    const [live] = await as('gm', `select * from start_planned_session($1)`, [plan.id]);
    eq('vira ativa', live.status, 'active');
    eq('jogador passa a ver a sessão', (await as('p1', `select name from sessions where id = $1`, [plan.id])).map((r) => r.name), ['Sessão 08']);
    eq('a bandeja continua ligada à sessão', (await as('gm', `select tray from session_prep where session_id = $1`, [plan.id]))[0]?.tray, { monsters: ['troll'] });
    const [plan2] = await as('gm', `select * from plan_session($1,null)`, [camp.id]);
    await err('não começa outra com uma ao vivo', /ao vivo/, () => as('gm', `select * from start_planned_session($1)`, [plan2.id]));
    await as('gm', `select discard_planned_session($1)`, [plan2.id]);
    await err('não descarta sessão já começada', /preparação/, () => as('gm', `select discard_planned_session($1)`, [plan.id]));

    // --- notas privadas ---
    await as('gm', `insert into campaign_notes (campaign_id, author_id, kind, title, body, created_at, visibility) values ($1,$2,'nota','Crônica','O grupo chegou à vila',1,'shared')`, [camp.id, U.gm]);
    await as('gm', `insert into campaign_notes (campaign_id, author_id, kind, title, body, created_at, visibility, session_id) values ($1,$2,'nota','Roland agora odeia Finn','',2,'master',$3)`, [camp.id, U.gm, plan.id]);
    eq('jogador só lê a crônica compartilhada', (await as('p1', `select title from campaign_notes where campaign_id = $1 order by created_at`, [camp.id])).map((r) => r.title), ['Crônica']);
    eq('mestre lê as duas', (await as('gm', `select count(*)::int as n from campaign_notes where campaign_id = $1`, [camp.id]))[0].n, 2);
    eq('jogador não acha a nota privada nem pelo título', (await as('p1', `select id from campaign_notes where title like 'Roland%'`)).length, 0);
    await err('jogador não escreve nota privada', /row-level security|violates/, () => as('p1', `insert into campaign_notes (campaign_id, author_id, kind, title, body, created_at, visibility) values ($1,$2,'nota','x','',3,'master')`, [camp.id, U.p1]));
    await err('visibilidade inválida', /campaign_notes_visibility_chk|check/, () => as('gm', `insert into campaign_notes (campaign_id, author_id, kind, title, body, created_at, visibility) values ($1,$2,'nota','x','',3,'todos')`, [camp.id, U.gm]));

    // --- improviso: NPC e pista marcados com a sessão ---
    const [npc] = await as('gm', `insert into campaign_npcs (campaign_id, name, revealed, improvised_in) values ($1,'Ferreiro Maluco',true,$2) returning id, improvised_in`, [camp.id, plan.id]);
    eq('NPC improvisado guarda a sessão', npc.improvised_in, plan.id);
    await as('gm', `update campaign_npcs set improvised_in = null where id = $1`, [npc.id]);
    eq('guardar na campanha zera a marca', (await as('gm', `select improvised_in from campaign_npcs where id = $1`, [npc.id]))[0].improvised_in, null);
    await as('gm', `insert into campaign_handouts (campaign_id, title, body, improvised_in) values ($1,'Pedaço de carta','...a lua nova.',$2)`, [camp.id, plan.id]);
    eq('pista improvisada ainda na gaveta: jogador não vê', (await as('p1', `select id from campaign_handouts`)).length, 0);

    expect(failures).toEqual([]);
    expect(ok).toBeGreaterThan(18);
  }, 60000);
});
