import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * supabase/diario_privado.sql num Postgres de verdade: o diário sai do
 * snapshot da ficha (que o mestre lê) e vai para uma tabela que só o dono
 * lê; as imagens das pistas ficam na pasta privada de cada jogador.
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const diario = readFileSync(resolve(root, 'supabase/diario_privado.sql'), 'utf8');

const U = {
  gm: '11111111-1111-1111-1111-111111111111',
  p1: '22222222-2222-2222-2222-222222222222',
  x: '44444444-4444-4444-4444-444444444444',
};

describe('SQL do diário privado', () => {
  it('migra o diário que está nas fichas, limpa o snapshot e só o dono lê', async () => {
    const failures: string[] = [];
    const db = new PGlite();
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create schema storage;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
      create publication supabase_realtime;
      grant usage on schema public, auth, storage to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      grant select, insert, update, delete on storage.objects to authenticated;
    `);
    await db.exec(base);
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

    // antes do script: a ficha do jogador carrega o diário DENTRO do snapshot, e está compartilhada com o mestre
    const secret = { name: 'Kael', diary: { notes: [{ id: 'n', text: 'Desconfio do mestre de armas' }], quests: [], clues: [], people: {} }, journal: [{ id: 'j', body: 'Traídos na ponte' }], notes: 'nota antiga' };
    await as('p1', `insert into sheets (id, user_id, title, character_name, class_id, race_id, snapshot, created_at, updated_at) values ('k', $1, 'Kael', 'Kael', 'wizard', 'elf', $2, 1, 777)`, [U.p1, JSON.stringify(secret)]);
    await as('p1', `insert into sheets (id, user_id, title, character_name, class_id, race_id, snapshot, created_at, updated_at) values ('vazia', $1, 'V', 'V', 'wizard', 'elf', $2, 1, 5)`, [U.p1, JSON.stringify({ name: 'V', journal: [], notes: '' })]);
    const [camp] = await as('gm', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Mesa', 1, 1) returning id`, [U.gm]);
    await db.exec(`insert into campaign_members (campaign_id, user_id, role, joined_at) values ('${camp.id}', '${U.p1}', 'player', 1);`);
    await as('p1', `insert into shared_sheets (campaign_id, sheet_id, owner_id, shared_at) values ($1, 'k', $2, 1)`, [camp.id, U.p1]);
    eq('antes: o mestre lia o diário no snapshot', JSON.stringify(await as('gm', `select snapshot from sheets where id = 'k'`)).includes('Desconfio'), true);

    for (let i = 0; i < 2; i++) await db.exec(diario); // idempotente
    await db.exec(`grant all on all tables in schema public to authenticated;`);
    eq('passo registrado', (await db.query(`select step from app_schema_steps where step = 'diario_privado'`)).rows.length, 1);

    // migração
    const [mine] = await as('p1', `select data, updated_at::int as v from sheet_diaries where sheet_id = 'k'`);
    eq('diário copiado para a tabela privada', JSON.stringify(mine.data).includes('Desconfio') && JSON.stringify(mine.data).includes('Traídos na ponte') && JSON.stringify(mine.data).includes('nota antiga'), true);
    eq('com a mesma versão da ficha', mine.v, 777);
    const [snap] = await as('p1', `select snapshot, updated_at::int as v from sheets where id = 'k'`);
    eq('snapshot limpo', JSON.stringify(snap.snapshot).includes('Desconfio') || JSON.stringify(snap.snapshot).includes('Traídos'), false);
    eq('snapshot continua com journal/notes vazios', [(snap.snapshot as { journal: unknown[] }).journal, (snap.snapshot as { notes: string }).notes], [[], '']);
    eq('versão da ficha não muda (nenhum aparelho vê "mudança")', snap.v, 777);
    eq('ficha sem diário não ganha linha', (await db.query(`select 1 from sheet_diaries where sheet_id = 'vazia'`)).rows.length, 0);

    // depois: o mestre lê a ficha, mas não o diário
    eq('mestre ainda lê a ficha compartilhada', (await as('gm', `select id from sheets where id = 'k'`)).length, 1);
    eq('mestre não lê o snapshot com o diário', JSON.stringify(await as('gm', `select snapshot from sheets where id = 'k'`)).includes('Desconfio'), false);
    eq('mestre não lê o diário', (await as('gm', `select * from sheet_diaries`)).length, 0);
    eq('estranho não lê o diário', (await as('x', `select * from sheet_diaries`)).length, 0);
    eq('anônimo não lê o diário', await as('anon', `select count(*)::int as n from sheet_diaries`).then((r) => (r[0].n ? 'viu' : 'nada')).catch(() => 'nada'), 'nada');

    // escrita: só o dono, só na própria ficha
    await as('p1', `insert into sheet_diaries (sheet_id, user_id, data, updated_at) values ('vazia', $1, '{"notes":"oi","journal":[]}', 6) on conflict (sheet_id) do update set data = excluded.data, updated_at = excluded.updated_at`, [U.p1]);
    eq('dono grava o diário', (await as('p1', `select updated_at::int as v from sheet_diaries where sheet_id = 'vazia'`))[0].v, 6);
    await err('mestre não grava diário de jogador', /row-level security|violates/, () => as('gm', `insert into sheet_diaries (sheet_id, user_id, data, updated_at) values ('k', $1, '{}', 9)`, [U.gm]));
    await err('ninguém pendura diário na ficha dos outros', /row-level security|violates/, () => as('x', `insert into sheet_diaries (sheet_id, user_id, data, updated_at) values ('k', $1, '{}', 9)`, [U.x]));
    eq('mestre não apaga diário (0 linhas)', (await as('gm', `delete from sheet_diaries returning 1`)).length, 0);
    await db.query(`delete from sheets where id = 'vazia'`);
    eq('apagar a ficha apaga o diário', (await db.query(`select 1 from sheet_diaries where sheet_id = 'vazia'`)).rows.length, 0);

    // imagens das pistas: pasta privada de cada um
    eq('bucket privado', (await db.query(`select public from storage.buckets where id = 'diario'`)).rows, [{ public: false }]);
    await as('p1', `insert into storage.objects (bucket_id, name) values ('diario', $1)`, [`${U.p1}/img1`]);
    eq('dono lê a própria imagem', (await as('p1', `select name from storage.objects where bucket_id = 'diario'`)).length, 1);
    eq('mestre não lê a imagem do jogador', (await as('gm', `select name from storage.objects where bucket_id = 'diario'`)).length, 0);
    await err('ninguém grava na pasta dos outros', /row-level security|violates/, () => as('x', `insert into storage.objects (bucket_id, name) values ('diario', $1)`, [`${U.p1}/img2`]));

    expect(failures).toEqual([]);
    expect(ok).toBeGreaterThan(20);
    // Postgres em memória (PGlite): ~3 s sozinho, mais com a suíte toda em paralelo
  }, 60_000);
});
