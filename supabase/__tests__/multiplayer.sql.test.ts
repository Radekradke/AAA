import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Testa o SQL do multiplayer num Postgres de verdade (PGlite) com stubs de
 * auth.uid() e realtime do Supabase: RLS, RPCs autoritativas, ordem de
 * iniciativa, turnos, rodada, corrida entre navegadores e canal privado.
 */
const root = resolve(__dirname, '../..');
const md = readFileSync(resolve(root, 'docs/SUPABASE.md'), 'utf8');
const sec5 = md.slice(md.indexOf('## 5.'));
const base = sec5.slice(sec5.indexOf('```sql') + 6, sec5.indexOf('```', sec5.indexOf('```sql') + 6));
const mp = readFileSync(resolve(root, 'supabase/multiplayer_session.sql'), 'utf8');

describe('SQL do multiplayer (sessão, encontro, iniciativa)', () => {
  it('cenário completo: mestre, 2 jogadores e 1 intruso', async () => {
    const failures: string[] = [];
    const db = new PGlite();
    const stubs = `
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema realtime;
    create table realtime.messages (id bigserial primary key, topic text, extension text, payload jsonb);
    create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;
    alter table realtime.messages enable row level security;
    create publication supabase_realtime;
    grant usage on schema public, auth, realtime to authenticated, anon;
    `;
    await db.exec(stubs);
    await db.exec(base);
    await db.exec(mp);
    await db.exec(`grant all on all tables in schema public to authenticated; grant all on all tables in schema realtime to authenticated; grant execute on function auth.uid() to authenticated; grant execute on function realtime.topic() to authenticated; grant usage on all sequences in schema realtime to authenticated; grant select on all tables in schema public to anon;`);

    const U = { gm: '11111111-1111-1111-1111-111111111111', p1: '22222222-2222-2222-2222-222222222222', p2: '33333333-3333-3333-3333-333333333333', x: '44444444-4444-4444-4444-444444444444' };
    await db.exec(`insert into auth.users values ${Object.values(U).map((u) => `('${u}')`).join(',')};`);

    let ok = 0, fail = 0;
    const as = async (who, sql, params = []) => {
      await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${who ? U[who] : ''}', false);`);
      await db.exec(who ? 'set role authenticated;' : 'set role anon;');
      try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role;'); }
    };
    const expectOk = async (label, fn) => { try { const r = await fn(); ok++; return r; } catch (e) { fail++; failures.push(`${label} → ${e.message}`); } };
    const expectErr = async (label, re, fn) => { try { await fn(); fail++; failures.push(`${label} → não falhou`); } catch (e) { if (re.test(e.message)) { ok++; } else { fail++; failures.push(`${label} → ${e.message}`); } } };
    const eq = (label, a, b) => { const s = JSON.stringify(a) === JSON.stringify(b); s ? ok++ : fail++; if (!s) failures.push(`${label} → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };

    // campanha, membros, fichas vinculadas
    const [camp] = await as('gm', `insert into campaigns (master_id, name, created_at, updated_at) values ($1, 'Mesa', 1, 1) returning id`, [U.gm]);
    await db.query(`insert into campaign_members (campaign_id, user_id, role, joined_at) values ($1,$2,'player',1),($1,$3,'player',1)`, [camp.id, U.p1, U.p2]);
    for (const [u, sid] of [[U.p1, 's-kael'], [U.p2, 's-ivar']]) {
      await db.query(`insert into sheets (id, user_id, title, character_name, class_id, race_id, snapshot, created_at, updated_at) values ($1,$2,$1,$1,'wizard','elf','{}',1,1)`, [sid, u]);
      await db.query(`insert into shared_sheets (campaign_id, sheet_id, owner_id, shared_at) values ($1,$2,$3,1)`, [camp.id, sid, u]);
    }

    await expectErr('jogador não inicia sessão', /mestre/, () => as('p1', `select * from start_session($1,'X')`, [camp.id]));
    await expectErr('intruso não inicia sessão', /mestre/, () => as('x', `select * from start_session($1,'X')`, [camp.id]));
    const [ses] = await expectOk('mestre inicia sessão', () => as('gm', `select * from start_session($1,'A Torre do Rei')`, [camp.id]));
    const [ses2] = await as('gm', `select * from start_session($1,'outra')`, [camp.id]);
    eq('iniciar de novo devolve a mesma (idempotente)', ses2.id, ses.id);
    eq('jogador vê a sessão', (await as('p1', `select id from sessions`)).length, 1);
    eq('intruso NÃO vê a sessão (RLS)', (await as('x', `select id from sessions`)).length, 0);
    eq('anônimo NÃO vê a sessão', (await as(null, `select id from sessions`).catch(() => [])).length, 0);
    await expectErr('jogador não escreve direto em sessions', /permission|violates|policy/, () => as('p1', `update sessions set status='finished' where id=$1 returning id`, [ses.id]).then((r) => { if (!r.length) throw new Error('policy: 0 linhas'); }));

    const [enc] = await expectOk('mestre cria encontro', () => as('gm', `select * from create_encounter($1,'Emboscada')`, [ses.id]));
    await expectErr('jogador não cria encontro', /mestre/, () => as('p1', `select * from create_encounter($1,'X')`, [ses.id]));
    const [kael] = await as('gm', `select * from add_combatant($1,'player','Kael','s-kael',4,38,42,15)`, [enc.id]);
    eq('dono vem do vínculo (não do cliente)', kael.owner_id, U.p1);
    const [ivar] = await as('gm', `select * from add_combatant($1,'player','Ivar','s-ivar',1,51,51,17)`, [enc.id]);
    await expectErr('ficha não vinculada é recusada', /vinculada/, () => as('gm', `select * from add_combatant($1,'player','Z','s-nada')`, [enc.id]));
    const gobs = [];
    for (let i = 1; i <= 3; i++) gobs.push((await as('gm', `select * from add_combatant($1,'monster',$2,null,2,7,7,15,false,'goblin')`, [enc.id, `Goblin #${i}`]))[0]);
    const [ogro] = await as('gm', `select * from add_combatant($1,'monster','Ogro',null,-1,59,59,11,false,null,'ogre')`, [enc.id]);
    eq('monstro do bestiário guarda a referência', ogro.monster_ref, 'ogre');
    const [spy] = await as('gm', `select * from add_combatant($1,'npc','Espião',null,3,20,20,12,true)`, [enc.id]);
    eq('jogador não vê combatente oculto', (await as('p1', `select name from combatants where encounter_id=$1`, [enc.id])).some((r) => r.name === 'Espião'), false);
    eq('mestre vê combatente oculto', (await as('gm', `select name from combatants where encounter_id=$1`, [enc.id])).some((r) => r.name === 'Espião'), true);

    await expectOk('jogador rola a própria iniciativa', () => as('p1', `select * from set_initiative($1, 21)`, [kael.id]));
    await expectErr('jogador não rola a de outro', /seu personagem/, () => as('p1', `select * from set_initiative($1, 20)`, [ivar.id]));
    await expectErr('intruso não rola', /seu personagem/, () => as('x', `select * from set_initiative($1, 20)`, [kael.id]));
    await as('p2', `select * from set_initiative($1, 16)`, [ivar.id]);
    await expectOk('mestre rola inimigos em lote (grupo com o mesmo valor)', () => as('gm', `select set_initiatives($1, $2::jsonb)`, [enc.id, JSON.stringify([...gobs.map((g) => ({ id: g.id, value: 18 })), { id: ogro.id, value: 13 }, { id: spy.id, value: 11 }])]));
    const order = (await as('gm', `select name from combatants where encounter_id=$1 order by turn_order`, [enc.id])).map((r) => r.name);
    eq('ordem: 21 Kael, 18 Goblins, 16 Ivar, 13 Ogro, 11 Espião', order, ['Kael', 'Goblin #1', 'Goblin #2', 'Goblin #3', 'Ivar', 'Ogro', 'Espião']);

    let [e1] = await as('gm', `select * from encounters where id=$1`, [enc.id]);
    await expectErr('jogador não inicia combate', /mestre/, () => as('p1', `select * from start_combat($1,$2)`, [enc.id, e1.revision]));
    [e1] = await as('gm', `select * from start_combat($1,$2)`, [enc.id, e1.revision]);
    eq('rodada 1, vez de Kael', [e1.round, e1.active_combatant_id], [1, kael.id]);
    const name = async (id) => (await as('gm', `select name from combatants where id=$1`, [id]))[0]?.name;
    const seq = [];
    let e = e1;
    for (let i = 0; i < 5; i++) { [e] = await as('gm', `select * from advance_turn($1, 1, $2)`, [enc.id, e.revision]); seq.push(`${e.round}:${await name(e.active_combatant_id)}`); }
    eq('grupo de goblins é um turno só; rodada vira no fim', seq, ['1:Goblin #1', '1:Ivar', '1:Ogro', '1:Espião', '2:Kael']);
    [e] = await as('gm', `select * from advance_turn($1, -1, $2)`, [enc.id, e.revision]);
    eq('voltar turno volta a rodada', [e.round, await name(e.active_combatant_id)], [1, 'Espião']);
    await expectErr('revisão antiga é recusada (corrida entre dois navegadores)', /STALE_REVISION/, () => as('gm', `select * from advance_turn($1, 1, $2)`, [enc.id, e.revision - 1]));
    // derrotar o ogro: é pulado
    await as('gm', `select * from update_combatant($1, '{"hp_current":0}')`, [ogro.id]);
    [e] = await as('gm', `select * from advance_turn($1, 1, $2)`, [enc.id, e.revision]);
    [e] = await as('gm', `select * from advance_turn($1, 1, $2)`, [enc.id, e.revision]);
    [e] = await as('gm', `select * from advance_turn($1, 1, $2)`, [enc.id, e.revision]);
    eq('monstro derrotado é pulado (Kael→Goblins→Ivar→[Ogro pulado]→Espião)', await name(e.active_combatant_id), 'Ivar');
    [e] = await as('gm', `select * from advance_turn($1, 1, $2)`, [enc.id, e.revision]);
    eq('…depois de Ivar vem Espião', await name(e.active_combatant_id), 'Espião');
    // remover o ativo passa a vez
    await as('gm', `select remove_combatant($1)`, [spy.id]);
    [e] = await as('gm', `select * from encounters where id=$1`, [enc.id]);
    eq('remover o ativo passa a vez para o próximo (nova rodada)', [e.round, await name(e.active_combatant_id)], [3, 'Kael']);

    const pubEvents = (await as('p1', `select type from session_events where session_id=$1`, [ses.id])).map((r) => r.type);
    eq('jogador não vê eventos do mestre (iniciativa em lote)', pubEvents.includes('initiative_batch'), false);
    eq('jogador vê "rodada começou"', pubEvents.includes('round_started'), true);
    await expectErr('jogador não registra evento em nome de outro', /violates|policy/, () => as('p1', `insert into session_events (session_id, campaign_id, type, actor_id) values ($1,$2,'roll',$3)`, [ses.id, camp.id, U.p2]));
    await expectOk('jogador registra a própria rolagem', () => as('p1', `insert into session_events (session_id, campaign_id, type, actor_id, visibility) values ($1,$2,'roll',$3,'master')`, [ses.id, camp.id, U.p1]));
    eq('rolagem "para o mestre": p2 não vê', (await as('p2', `select id from session_events where type='roll'`)).length, 0);
    eq('rolagem "para o mestre": mestre vê', (await as('gm', `select id from session_events where type='roll'`)).length, 1);
    const topic = `campaign:${camp.id}:session:${ses.id}`;
    await db.exec(`select set_config('realtime.topic', '${topic}', false)`);
    await expectOk('membro entra no canal privado', () => as('p1', `insert into realtime.messages (topic, extension) values ($1,'presence') returning id`, [topic]));
    await expectErr('intruso não entra no canal privado', /violates|policy/, () => as('x', `insert into realtime.messages (topic, extension) values ($1,'presence')`, [topic]));

    await expectOk('mestre encerra a sessão (fecha o encontro)', () => as('gm', `select * from set_session_status($1,'finished')`, [ses.id]));
    eq('encontro fechado', (await as('gm', `select status from encounters where id=$1`, [enc.id]))[0].status, 'finished');
    const [ses3] = await as('gm', `select * from start_session($1,null)`, [camp.id]);
    eq('nova sessão ganha nome automático', ses3.name, 'Sessão 2');


    expect(failures).toEqual([]);
    expect(fail).toBe(0);
    expect(ok).toBeGreaterThan(30);
  }, 60000);
});
