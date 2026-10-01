import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Palco da mesa num Postgres de verdade (PGlite): cenas secretas até irem ao
 * ar, peões escondidos, jogador movendo só o próprio peão, handouts para um
 * jogador só e imagens do Storage liberadas conforme o que cada um já pode ver.
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const mp = readFileSync(resolve(root, 'supabase/multiplayer_session.sql'), 'utf8');
const palco = readFileSync(resolve(root, 'supabase/palco.sql'), 'utf8');
const palcoMover = readFileSync(resolve(root, 'supabase/palco_mover.sql'), 'utf8');
const palcoRegras = readFileSync(resolve(root, 'supabase/palco_regras.sql'), 'utf8');
const palcoStorage = readFileSync(resolve(root, 'supabase/palco_storage.sql'), 'utf8');

describe('SQL do palco (cenas, mapa, handouts, imagens)', () => {
  it('mestre, 2 jogadores e 1 intruso', async () => {
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
    await db.exec(palco); // idempotente
    await db.exec(`drop function public.fv_media_readable(text) cascade; drop function public.fv_media_master(text) cascade;`);
    await db.exec(palcoStorage); // script avulso não depende das funções
    // cenário real: o script grande parou no meio e as tabelas ficaram SEM regras
    await db.exec(`do $$ declare r record; begin
      for r in select tablename, policyname from pg_policies where schemaname = 'public'
        and tablename in ('campaign_scenes','campaign_stage','scene_tokens','campaign_handouts','campaign_npcs','campaign_npc_secrets')
      loop execute format('drop policy %I on public.%I', r.policyname, r.tablename); end loop; end $$;`);
    await db.exec(palcoRegras); // o script curto devolve todas as regras
    await db.exec(palcoRegras); // e pode rodar de novo
    await db.exec(palcoMover); // função de mover avulsa também roda por cima
    await db.exec(`grant all on all tables in schema public to authenticated; grant all on storage.objects to authenticated; grant execute on function auth.uid() to authenticated;`);

    const U = { gm: '11111111-1111-1111-1111-111111111111', p1: '22222222-2222-2222-2222-222222222222', p2: '33333333-3333-3333-3333-333333333333', x: '44444444-4444-4444-4444-444444444444' };
    await db.exec(`insert into auth.users values ${Object.values(U).map((u) => `('${u}')`).join(',')};`);
    const as = async (who: keyof typeof U, sql: string, params: unknown[] = []) => {
      await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${U[who]}', false); set role authenticated;`);
      try { return (await db.query(sql, params)).rows as Record<string, unknown>[]; } finally { await db.exec('reset role;'); }
    };
    let ok = 0;
    const eq = (label: string, a: unknown, b: unknown) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else failures.push(`${label} → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
    const expectErr = async (label: string, re: RegExp, fn: () => Promise<unknown>) => {
      try { await fn(); failures.push(`${label} → não falhou`); } catch (e) { if (re.test((e as Error).message)) ok++; else failures.push(`${label} → ${(e as Error).message}`); }
    };

    const [camp] = await as('gm', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Mesa', 1, 1) returning id`, [U.gm]);
    const cid = camp.id as string;
    await db.query(`insert into campaign_members (campaign_id, user_id, role, joined_at) values ($1,$2,'player',1),($1,$3,'player',1)`, [cid, U.p1, U.p2]);
    eq('bucket criado', (await db.query(`select id, public from storage.buckets`)).rows, [{ id: 'campaign-media', public: false }]);

    // cena secreta
    const mapPath = `${cid}/mapa.webp`;
    const [scene] = await as('gm', `insert into campaign_scenes (campaign_id, kind, name, image_path, grid) values ($1,'map','Cripta',$2,'{"size":70}') returning id`, [cid, mapPath]);
    await as('gm', `insert into storage.objects (bucket_id, name) values ('campaign-media', $1)`, [mapPath]);
    await expectErr('jogador não sobe imagem', /row-level security/, () => as('p1', `insert into storage.objects (bucket_id, name) values ('campaign-media', $1)`, [`${cid}/hack.webp`]));
    await expectErr('intruso não sobe na pasta da mesa', /row-level security/, () => as('x', `insert into storage.objects (bucket_id, name) values ('campaign-media', $1)`, [`${cid}/hack.webp`]));
    eq('jogador não vê cena preparada', (await as('p1', `select id from campaign_scenes`)).length, 0);
    eq('jogador não baixa imagem de cena preparada', (await as('p1', `select name from storage.objects`)).length, 0);
    eq('mestre vê a cena', (await as('gm', `select id from campaign_scenes`)).length, 1);

    // peões (antes de ir ao ar)
    const [hero] = await as('gm', `insert into scene_tokens (scene_id, campaign_id, kind, label, owner_id, x, y) values ($1,$2,'hero','Kael',$3,2,3) returning id`, [scene.id, cid, U.p1]);
    const [orc] = await as('gm', `insert into scene_tokens (scene_id, campaign_id, kind, label, hidden, x, y) values ($1,$2,'monster','Orc',true,8,8) returning id`, [scene.id, cid]);
    eq('peões invisíveis antes de revelar', (await as('p1', `select id from scene_tokens`)).length, 0);

    // vai ao ar
    await as('gm', `update campaign_scenes set revealed = true where id = $1`, [scene.id]);
    await as('gm', `insert into campaign_stage (campaign_id, scene_id) values ($1,$2)`, [cid, scene.id]);
    eq('jogador vê o que está no ar', (await as('p1', `select scene_id from campaign_stage`))[0]?.scene_id, scene.id);
    eq('jogador vê a cena revelada', (await as('p2', `select name from campaign_scenes`)).map((r) => r.name), ['Cripta']);
    eq('jogador baixa a imagem da cena no ar', (await as('p2', `select name from storage.objects`)).map((r) => r.name), [mapPath]);
    eq('intruso não vê nada', [(await as('x', `select id from campaign_scenes`)).length, (await as('x', `select name from storage.objects`)).length, (await as('x', `select * from campaign_stage`)).length], [0, 0, 0]);
    await expectErr('jogador não troca a cena', /row-level security|0 rows/, async () => {
      const r = await as('p1', `update campaign_stage set scene_id = null returning 1`);
      if (!r.length) throw new Error('0 rows');
    });
    eq('jogador vê só peões visíveis', (await as('p1', `select label from scene_tokens`)).map((r) => r.label), ['Kael']);

    // movimento
    await as('p1', `select * from move_token($1, 4, 5)`, [hero.id]);
    eq('jogador move o próprio peão', (await as('gm', `select x, y from scene_tokens where id = $1`, [hero.id]))[0], { x: 4, y: 5 });
    eq('outro jogador não move meu peão', (await as('p2', `select * from move_token($1, 0, 0)`, [hero.id])).length, 0);
    eq('jogador não move monstro escondido', (await as('p1', `select * from move_token($1, 0, 0)`, [orc.id])).length, 0);
    eq('peão continua onde estava', (await as('gm', `select x, y from scene_tokens where id = $1`, [hero.id]))[0], { x: 4, y: 5 });
    await as('gm', `select * from move_token($1, 9, 9)`, [orc.id]);
    eq('mestre move o monstro', (await as('gm', `select x from scene_tokens where id = $1`, [orc.id]))[0].x, 9);
    await expectErr('jogador não edita peão direto', /0 rows/, async () => {
      const r = await as('p1', `update scene_tokens set label = 'X' returning 1`);
      if (!r.length) throw new Error('0 rows');
    });
    const before = (await as('gm', `select updated_at from campaign_stage`))[0].updated_at;
    await new Promise((r) => setTimeout(r, 5));
    await as('gm', `update scene_tokens set hidden = false where id = $1`, [orc.id]);
    eq('revelar peão cutuca o palco', (await as('gm', `select updated_at > $1 as moved from campaign_stage`, [before]))[0].moved, true);
    eq('monstro revelado aparece', (await as('p1', `select label from scene_tokens order by label`)).map((r) => r.label), ['Kael', 'Orc']);

    // retrato do peão: jogador só baixa se o peão está visível
    const orcArt = `${cid}/orc.webp`;
    await as('gm', `insert into storage.objects (bucket_id, name) values ('campaign-media', $1)`, [orcArt]);
    await as('gm', `update scene_tokens set image_path = $1, hidden = true where id = $2`, [orcArt, orc.id]);
    eq('retrato de peão escondido não baixa', (await as('p1', `select name from storage.objects where name = $1`, [orcArt])).length, 0);
    await as('gm', `update scene_tokens set hidden = false where id = $1`, [orc.id]);
    eq('retrato de peão visível baixa', (await as('p1', `select name from storage.objects where name = $1`, [orcArt])).length, 1);
    eq('intruso não baixa retrato', (await as('x', `select name from storage.objects where name = $1`, [orcArt])).length, 0);

    // handouts
    const cartaPath = `${cid}/carta.webp`;
    await as('gm', `insert into storage.objects (bucket_id, name) values ('campaign-media', $1)`, [cartaPath]);
    const [carta] = await as('gm', `insert into campaign_handouts (campaign_id, title, body, image_path, recipients) values ($1,'Carta selada','Não confie no barão.',$2, array[$3::uuid]) returning id`, [cid, cartaPath, U.p1]);
    eq('handout na gaveta: ninguém vê', (await as('p1', `select id from campaign_handouts`)).length, 0);
    await as('gm', `update campaign_handouts set shown_at = now() where id = $1`, [carta.id]);
    eq('destinatário vê o handout', (await as('p1', `select title from campaign_handouts`)).map((r) => r.title), ['Carta selada']);
    eq('outro jogador não vê', (await as('p2', `select id from campaign_handouts`)).length, 0);
    eq('destinatário baixa a imagem', (await as('p1', `select name from storage.objects where name = $1`, [cartaPath])).length, 1);
    eq('outro jogador não baixa a imagem', (await as('p2', `select name from storage.objects where name = $1`, [cartaPath])).length, 0);
    await expectErr('jogador não cria handout', /row-level security/, () => as('p1', `insert into campaign_handouts (campaign_id, title) values ($1,'x')`, [cid]));

    expect(failures).toEqual([]);
    expect(ok).toBeGreaterThan(20);
  }, 60_000);
});
