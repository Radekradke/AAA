# Ficha Viva — Nuvem (Supabase)

> **Deu "already exists"?** Use o **script único re-executável** da seção 5 —
> ele cria só o que falta e pode ser rodado quantas vezes quiser.
>
> **Erro 500 ao sincronizar fichas ou criar/abrir sala?** As policies antigas
> de `campaigns` e `campaign_members` se referenciavam em ciclo (recursão
> infinita no RLS), o que estoura **500** em qualquer leitura de `campaigns` e,
> por tabela, também de `sheets`. **Re-execute o script da seção 5** (agora com
> as funções `is_campaign_master`/`is_campaign_member` em `SECURITY DEFINER`,
> que quebram o ciclo) para corrigir. Nada de dado é perdido.

O app é **offline-first**: as fichas vivem no IndexedDB do aparelho e continuam
editáveis sem internet. Com o Supabase configurado, cada usuário ganha login
real (Supabase Auth) e as fichas sincronizam entre dispositivos.

## 1. Configurar — passo a passo para quem nunca usou o Supabase

**Parte A — criar o projeto (2 min)**
1. Acesse [supabase.com](https://supabase.com) → **Start your project** →
   entre com sua conta GitHub ou Google (grátis).
2. Clique em **New project**. Dê um nome (ex.: `ficha-viva`), crie uma senha
   de banco qualquer (guarde-a, mas o app não usa ela) e escolha a região
   **South America (São Paulo)**. Clique em **Create new project** e aguarde
   ~2 minutos até o painel abrir.

**Parte B — pegar as 2 chaves (1 min)**
3. No menu lateral, clique na engrenagem **Project Settings** → **API**.
4. Copie dois valores:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`);
   - **anon public** key (um texto longo começando com `eyJ...`).
   Use SOMENTE a anon — nunca a `service_role`.

**Parte C — criar a tabela de fichas (1 min)**
5. No menu lateral, clique em **SQL Editor** → **New query**.
6. Cole TODO o bloco SQL da seção 2 abaixo e clique em **Run**. Deve
   aparecer "Success. No rows returned".

**Parte D — ligar o login por e-mail (30 s)**
7. Menu **Authentication** → **Sign In / Providers**: confirme que **Email**
   está habilitado. Para testar sem confirmação de e-mail, desligue
   "Confirm email" nessa mesma tela.

**Parte E — colocar as chaves no site (na Vercel)**
8. Em [vercel.com](https://vercel.com) abra o projeto `aaa` →
   **Settings** → **Environment Variables** e adicione:
   - `VITE_SUPABASE_URL` = a Project URL da Parte B;
   - `VITE_SUPABASE_ANON_KEY` = a anon key da Parte B.
9. Vá em **Deployments** → menu `⋯` do último deploy → **Redeploy** (as
   variáveis só valem para builds novos). Pronto: a tela de entrar passa a
   usar a nuvem.

Para rodar localmente, copie `.env.example` para `.env` com os mesmos
valores. Sem `.env`, o app continua funcionando offline/local normalmente.

**Parte F (opcional) — Entrar com Google**
10. No Supabase: **Authentication → Sign In / Providers → Google** → habilite.
    A tela mostra a **Callback URL** (ex.:
    `https://abcdefgh.supabase.co/auth/v1/callback`) — copie-a.
11. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
    crie um projeto → **Create Credentials → OAuth client ID** → tipo
    **Web application** → em *Authorized redirect URIs* cole a Callback URL
    do passo 10. Copie o **Client ID** e o **Client Secret** gerados e cole
    no Supabase (tela do passo 10) → **Save**.
12. Em **Authentication → URL Configuration**, adicione a URL do seu site
    (ex.: `https://aaa-....vercel.app`) em *Site URL* e *Redirect URLs*.
    O botão "Entrar com Google" do app já está pronto e aparece sozinho.

## 2. Tabela de fichas + RLS

A ficha inteira (snapshot completo: PV atual, inventário, equipados, magias e
slots gastos, evolução, recursos, condições, diário, anotações) vai no campo
JSONB `snapshot`. Campos normalizados servem só para listagem.

```sql
create table public.sheets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  character_name text not null,
  class_id text not null,
  race_id text not null,
  level int not null default 1,
  sheet_version int not null default 3,
  snapshot jsonb not null,
  created_at bigint not null,
  updated_at bigint not null,
  last_played_at bigint
);

alter table public.sheets enable row level security;

-- cada usuário só enxerga e altera as próprias fichas
create policy "sheets_select_own" on public.sheets
  for select using (auth.uid() = user_id);
create policy "sheets_insert_own" on public.sheets
  for insert with check (auth.uid() = user_id);
create policy "sheets_update_own" on public.sheets
  for update using (auth.uid() = user_id);
create policy "sheets_delete_own" on public.sheets
  for delete using (auth.uid() = user_id);

create index sheets_user_idx on public.sheets (user_id, updated_at desc);
```

## 3. Como a sincronização funciona

- Salvamento local: autosave com debounce (~0,9 s) no IndexedDB.
- Nuvem: 4 s após a última edição (e ao logar/reconectar), o app compara
  `updatedAt` local × `updated_at` remoto contra `lastSyncedAt`:
  - só local mudou → **push** (local vence);
  - só a nuvem mudou → **pull**;
  - os dois mudaram → **conflito** — o topo mostra "Conflito" e o usuário
    escolhe *Manter esta versão* ou *Usar a da nuvem*;
  - exclusões offline entram numa fila (`pendingDeletes`) e são aplicadas
    na próxima sincronização.
- O indicador no topo mostra: Salvando… · Salvo neste aparelho ·
  Sincronizando… · Nuvem em dia · Offline (pendências) · Conflito.
- **Diário privado** (com `supabase/diario_privado.sql`, seção 12): o diário
  NÃO vai no `snapshot` da ficha — vai para `sheet_diaries`, com a mesma
  versão (`updated_at`) da ficha; a decisão acima vale para os dois juntos.

## 4. Futuro: Modo Mestre / Sala (fundação)

Os tipos já existem em `src/types/models.ts` (`Campaign`, `CampaignMember`,
`InviteLink`, `MasterPermission`, `SharedCharacterSheet`). SQL preparado:

```sql
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at bigint not null,
  updated_at bigint not null
);

create table public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('master', 'player')),
  joined_at bigint not null,
  unique (campaign_id, user_id)
);

create table public.invite_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users (id),
  expires_at bigint,
  max_uses int,
  uses int not null default 0
);

-- ficha compartilhada na sala: o jogador controla; o mestre vê/edita
-- conforme as permissões concedidas (jsonb espelha MasterPermission)
create table public.shared_sheets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  sheet_id text not null references public.sheets (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  permissions jsonb not null default '{"view":true,"editInventory":false,"editCampaignNotes":true,"editProgression":false}',
  shared_at bigint not null,
  unique (campaign_id, sheet_id)
);

alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.invite_links enable row level security;
alter table public.shared_sheets enable row level security;

-- helpers SECURITY DEFINER: ignoram o RLS das tabelas que consultam e por
-- isso evitam a recursão infinita entre as policies de campaigns/members
-- (que geraria erro 500 em qualquer leitura de campaigns e de sheets).
create or replace function public.is_campaign_master(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from campaigns where id = cid and master_id = auth.uid());
$$;
create or replace function public.is_campaign_member(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from campaign_members where campaign_id = cid and user_id = auth.uid());
$$;
grant execute on function public.is_campaign_master(uuid) to authenticated;
grant execute on function public.is_campaign_member(uuid) to authenticated;

-- campanhas: mestre gerencia; membros leem
create policy "campaigns_member_read" on public.campaigns for select using (
  auth.uid() = master_id or public.is_campaign_member(id)
);
create policy "campaigns_master_write" on public.campaigns
  for all using (auth.uid() = master_id) with check (auth.uid() = master_id);

-- membros: cada um vê a si; o mestre vê todos os da própria mesa
create policy "members_read" on public.campaign_members for select using (
  user_id = auth.uid() or public.is_campaign_master(campaign_id)
);

-- convites: só o mestre da campanha gerencia (entrada é via RPC abaixo)
create policy "invites_master_all" on public.invite_links for all
  using (public.is_campaign_master(campaign_id))
  with check (public.is_campaign_master(campaign_id));

-- fichas compartilhadas: o dono gerencia; o mestre da mesa lê
create policy "shared_owner_all" on public.shared_sheets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "shared_master_read" on public.shared_sheets for select
  using (public.is_campaign_master(campaign_id));

-- o MESTRE pode ler o snapshot das fichas compartilhadas com permissão de ver
create policy "sheets_master_read_shared" on public.sheets for select using (
  exists (
    select 1 from public.shared_sheets ss
    where ss.sheet_id = sheets.id
      and public.is_campaign_master(ss.campaign_id)
      and coalesce((ss.permissions->>'view')::boolean, false)
  )
);

-- entrada na sala pelo token do convite (segura: valida validade/limite)
create or replace function public.join_campaign(invite_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare inv record;
begin
  if auth.uid() is null then
    raise exception 'Faça login para entrar na sala.';
  end if;
  select * into inv from invite_links where token = invite_token;
  if inv is null then
    raise exception 'Convite inválido.';
  end if;
  if inv.expires_at is not null and inv.expires_at < (extract(epoch from now()) * 1000) then
    raise exception 'Convite expirado.';
  end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then
    raise exception 'Convite esgotado.';
  end if;
  insert into campaign_members (campaign_id, user_id, role, joined_at)
  values (inv.campaign_id, auth.uid(), 'player', extract(epoch from now()) * 1000)
  on conflict (campaign_id, user_id) do nothing;
  update invite_links set uses = uses + 1 where id = inv.id;
  return inv.campaign_id;
end $$;

grant execute on function public.join_campaign(text) to authenticated;

-- crônica da mesa: notas, NPCs e missões (mestre escreve, membros leem)
create table public.campaign_notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('nota', 'npc', 'missao')),
  title text not null,
  body text not null default '',
  created_at bigint not null
);
alter table public.campaign_notes enable row level security;
create policy "notes_member_read" on public.campaign_notes for select using (
  public.is_campaign_master(campaign_id) or public.is_campaign_member(campaign_id)
);
create policy "notes_master_write" on public.campaign_notes for all using (
  public.is_campaign_master(campaign_id)
) with check (
  public.is_campaign_master(campaign_id)
);

-- REALTIME: o painel do mestre atualiza sozinho (PV, vínculos, crônica)
alter publication supabase_realtime add table public.sheets;
alter publication supabase_realtime add table public.shared_sheets;
alter publication supabase_realtime add table public.campaign_notes;
```

Passos de implementação (quando chegar a hora):
1. `services/campaignService.ts` — criar sala, gerar `invite_links.token`
   (rota `/sala/:token` entra na campanha), listar fichas compartilhadas.
2. Política extra em `sheets`: mestre lê fichas compartilhadas via
   `shared_sheets` quando `permissions->>'view' = 'true'`.
3. Supabase **Realtime** no canal da campanha para o mestre ver PV/recursos
   ao vivo (o gancho está comentado em `offlineSyncService.ts`).
4. UI: aba "Mesa do Mestre" listando os cards dos jogadores (reutilizar os
   componentes da aba Mesa em modo somente leitura).

## 5. Script único — re-executável (recomendado)

Cria/completa TUDO (fichas, campanhas, crônica, políticas, função e
realtime) sem dar erro se algo já existir. Cole inteiro e Run.

```sql
-- ===== FICHAS =====
create table if not exists public.sheets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  character_name text not null,
  class_id text not null,
  race_id text not null,
  level int not null default 1,
  sheet_version int not null default 3,
  snapshot jsonb not null,
  created_at bigint not null,
  updated_at bigint not null,
  last_played_at bigint
);
alter table public.sheets enable row level security;
drop policy if exists "sheets_select_own" on public.sheets;
create policy "sheets_select_own" on public.sheets for select using (auth.uid() = user_id);
drop policy if exists "sheets_insert_own" on public.sheets;
create policy "sheets_insert_own" on public.sheets for insert with check (auth.uid() = user_id);
drop policy if exists "sheets_update_own" on public.sheets;
create policy "sheets_update_own" on public.sheets for update using (auth.uid() = user_id);
drop policy if exists "sheets_delete_own" on public.sheets;
create policy "sheets_delete_own" on public.sheets for delete using (auth.uid() = user_id);
create index if not exists sheets_user_idx on public.sheets (user_id, updated_at desc);

-- ===== CAMPANHAS =====
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at bigint not null,
  updated_at bigint not null
);
create table if not exists public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('master', 'player')),
  joined_at bigint not null,
  unique (campaign_id, user_id)
);
create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users (id),
  expires_at bigint,
  max_uses int,
  uses int not null default 0
);
create table if not exists public.shared_sheets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  sheet_id text not null references public.sheets (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  permissions jsonb not null default '{"view":true,"editInventory":false,"editCampaignNotes":true,"editProgression":false}',
  shared_at bigint not null,
  unique (campaign_id, sheet_id)
);
create table if not exists public.campaign_notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('nota', 'npc', 'missao')),
  title text not null,
  body text not null default '',
  created_at bigint not null
);
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.invite_links enable row level security;
alter table public.shared_sheets enable row level security;
alter table public.campaign_notes enable row level security;

-- Funções auxiliares SECURITY DEFINER: rodam como DONO da função, então
-- IGNORAM o RLS das tabelas que consultam. Isto quebra a recursão infinita:
-- sem elas, a policy de `campaigns` consultava `campaign_members` e a de
-- `campaign_members` consultava `campaigns` — cada uma disparando a outra,
-- gerando "infinite recursion detected in policy" (erro 500 em QUALQUER
-- leitura de campaigns e, por tabela, também de `sheets`, quebrando a sync).
create or replace function public.is_campaign_master(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from campaigns where id = cid and master_id = auth.uid());
$$;
create or replace function public.is_campaign_member(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from campaign_members where campaign_id = cid and user_id = auth.uid());
$$;
grant execute on function public.is_campaign_master(uuid) to authenticated;
grant execute on function public.is_campaign_member(uuid) to authenticated;

drop policy if exists "campaigns_member_read" on public.campaigns;
create policy "campaigns_member_read" on public.campaigns for select using (
  auth.uid() = master_id or public.is_campaign_member(id)
);
drop policy if exists "campaigns_master_write" on public.campaigns;
create policy "campaigns_master_write" on public.campaigns
  for all using (auth.uid() = master_id) with check (auth.uid() = master_id);

drop policy if exists "members_read" on public.campaign_members;
create policy "members_read" on public.campaign_members for select using (
  user_id = auth.uid() or public.is_campaign_master(campaign_id)
);

drop policy if exists "invites_master_all" on public.invite_links;
create policy "invites_master_all" on public.invite_links for all
  using (public.is_campaign_master(campaign_id))
  with check (public.is_campaign_master(campaign_id));

drop policy if exists "shared_owner_all" on public.shared_sheets;
create policy "shared_owner_all" on public.shared_sheets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "shared_master_read" on public.shared_sheets;
create policy "shared_master_read" on public.shared_sheets for select
  using (public.is_campaign_master(campaign_id));

drop policy if exists "sheets_master_read_shared" on public.sheets;
create policy "sheets_master_read_shared" on public.sheets for select using (
  exists (
    select 1 from public.shared_sheets ss
    where ss.sheet_id = sheets.id
      and public.is_campaign_master(ss.campaign_id)
      and coalesce((ss.permissions->>'view')::boolean, false)
  )
);

-- notas com visibility = 'master' são o caderno privado do mestre (console do mestre)
alter table public.campaign_notes add column if not exists visibility text not null default 'shared';
drop policy if exists "notes_member_read" on public.campaign_notes;
create policy "notes_member_read" on public.campaign_notes for select using (
  public.is_campaign_master(campaign_id)
  or (public.is_campaign_member(campaign_id) and visibility = 'shared')
);
drop policy if exists "notes_master_write" on public.campaign_notes;
create policy "notes_master_write" on public.campaign_notes for all
  using (public.is_campaign_master(campaign_id))
  with check (public.is_campaign_master(campaign_id));

create or replace function public.join_campaign(invite_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare inv record;
begin
  if auth.uid() is null then raise exception 'Faça login para entrar na sala.'; end if;
  select * into inv from invite_links where token = invite_token;
  if inv is null then raise exception 'Convite inválido.'; end if;
  if inv.expires_at is not null and inv.expires_at < (extract(epoch from now()) * 1000) then
    raise exception 'Convite expirado.';
  end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then
    raise exception 'Convite esgotado.';
  end if;
  insert into campaign_members (campaign_id, user_id, role, joined_at)
  values (inv.campaign_id, auth.uid(), 'player', extract(epoch from now()) * 1000)
  on conflict (campaign_id, user_id) do nothing;
  update invite_links set uses = uses + 1 where id = inv.id;
  return inv.campaign_id;
end $$;
grant execute on function public.join_campaign(text) to authenticated;

-- ===== REALTIME (ignora se já adicionado) =====
do $$ begin
  alter publication supabase_realtime add table public.sheets;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.shared_sheets;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.campaign_notes;
exception when duplicate_object then null; end $$;
-- ---------------------------------------------------------------------
-- versão do banco: registra que este script rodou (o app avisa o mestre
-- do que falta). Idempotente.
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (step text primary key, applied_at timestamptz not null default now());
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('base') on conflict (step) do update set applied_at = now();
```

## 6. Mesa ao vivo — sessão, encontro e iniciativa (multiplayer)

Script: **`supabase/multiplayer_session.sql`** (re-executável). Rode **depois** da
seção 5, no SQL Editor do Supabase (cole o arquivo inteiro → *Run*).

O que ele cria:

| Tabela | Para quê |
|---|---|
| `sessions` | Uma noite de jogo. No máximo **uma** ativa/pausada por campanha. |
| `encounters` | Um combate dentro da sessão: `round`, `active_combatant_id`, `revision`. |
| `combatants` | Heróis (ligados a `sheets` pelo vínculo em `shared_sheets`), monstros e NPCs. |
| `session_events` | Crônica da sessão, com visibilidade `public` / `master` / `private`. |

Regras de segurança (valem no banco, não na interface):

- **Ninguém escreve direto** em `sessions`, `encounters` e `combatants`: não há
  policy de insert/update/delete. Toda mudança passa por funções RPC
  `security definer` que conferem quem chama:
  `start_session`, `set_session_status`, `create_encounter`, `add_combatant`,
  `remove_combatant`, `set_initiative`, `set_initiatives`, `update_combatant`,
  `start_combat`, `advance_turn`, `set_encounter_status`.
- Só o **mestre** da campanha abre sessão, monta o encontro e passa turno.
  O **jogador** só consegue rolar a iniciativa do combatente cujo `owner_id` é
  ele (o dono vem do vínculo da ficha, nunca do navegador).
- **Turno à prova de corrida:** `advance_turn`/`start_combat`/`set_encounter_status`
  recebem a `revision` que o cliente viu e travam a linha (`for update`). Se
  outro aparelho mexeu antes, volta `STALE_REVISION` e a tela recarrega — dois
  cliques em dois navegadores nunca pulam dois turnos.
- A ordem (`turn_order`) e a rodada são calculadas **no banco**: iniciativa ↓,
  bônus ↓, grupo junto; monstros com 0 PV são pulados; virar a ordem soma a rodada.
- Combatente `hidden` (emboscada) só aparece para o mestre (RLS).
- Quem não é da campanha não lê nada (RLS com `is_campaign_participant`).
- A ficha **não** é escrita pelo mestre: o encontro só lê o snapshot para
  bônus de iniciativa, PV e CA iniciais.

### Realtime

O script coloca as 4 tabelas na publication `supabase_realtime` e cria as
policies de **canal privado** em `realtime.messages` (tópico
`campaign:{campaignId}:session:{sessionId}` — só membros da campanha entram).

Para usar canais privados (recomendado): *Project Settings → Realtime →*
desmarque **“Allow public access”**. Se o projeto não tiver isso, o app cai
sozinho para um canal comum — os dados continuam protegidos pelo RLS; só a
lista de presença (quem está online) fica menos blindada.

### Testar o SQL sem Supabase

`npm test` roda `supabase/__tests__/multiplayer.sql.test.ts`, que sobe um
Postgres em memória (PGlite), aplica a seção 5 + este script e percorre o
cenário completo: permissões, RLS, ordem, grupos, rodada, corrida de turno e
visibilidade dos eventos.

## 7. Palco da mesa — mapas, cenas, cutscenes e handouts

Rode `supabase/palco.sql` (depois do `multiplayer_session.sql` e de `supabase/atualizacao_npcs_bestiario.sql`), numa aba nova do SQL Editor, sem nada selecionado. Pode rodar de novo sem problema.

O script cria:

- `campaign_scenes` — cenas preparadas pelo mestre (mapa tático, ambiente, cutscene). Jogadores só enxergam depois que a cena vai ao ar pela primeira vez.
- `campaign_stage` — o que está na tela de todos agora (uma linha por campanha).
- `scene_tokens` — peões do mapa. Peão escondido só o mestre vê; jogador move **só o próprio** peão pela RPC `move_token`.
- `campaign_handouts` — cartas e pistas, para todos ou para jogadores escolhidos.
- Bucket privado `campaign-media` no Storage (máx. 10 MB por arquivo, só imagens). O mestre envia para a pasta da campanha; cada jogador só baixa imagens de cenas reveladas ou de handouts entregues a ele (`fv_media_readable`).

As imagens são comprimidas no aparelho do mestre antes de subir (WebP; mapas até 3072 px) e ficam guardadas no aparelho de cada jogador depois do primeiro download, para poupar a franquia de tráfego do plano grátis.

## 8. Console do mestre — preparação, notas privadas e improviso

Rode `supabase/mestre_console.sql` (depois do `multiplayer_session.sql`; se o palco já existir, ele também marca as pistas). Numa aba nova do SQL Editor, cole **tudo** e clique em Run sem nada selecionado. Pode rodar de novo sem problema e não apaga dados.

O script:

- **Sessão preparada** — reaproveita `sessions.status = 'planned'`. RPCs `plan_session`, `start_planned_session` (recusa se já houver sessão ao vivo), `rename_session` e `discard_planned_session` (só apaga sessão que ainda não começou). A política `sessions_participant_read` passa a esconder sessões preparadas dos jogadores — o nome pode ser spoiler.
- **`session_prep`** — a "bandeja da sessão" (atalhos de NPCs, cenas, pistas e criaturas que o mestre separou). Tabela própria, porque a linha da sessão é lida pelos jogadores; RLS `session_prep_master`: só o mestre lê e escreve. Não é roteiro: sem ordem, nada obrigatório.
- **Notas privadas** — `campaign_notes` ganha `visibility` (`'shared'` padrão ou `'master'`), `session_id` e `updated_at`. A política `notes_member_read` só devolve ao jogador notas `'shared'`: a nota privada **não chega** ao aparelho dele (não é só escondida na tela).
- **Improviso** — `campaign_npcs.improvised_in` e `campaign_handouts.improvised_in` marcam o que nasceu durante uma sessão. "Guardar na campanha" limpa a marca. Nada é apagado sozinho.

Os scripts antigos (§5 e `multiplayer_session.sql`) foram atualizados com as mesmas políticas: rodá-los de novo **não reabre** notas privadas nem sessões preparadas. O teste `supabase/__tests__/mestre.sql.test.ts` (PGlite) cobre isso.

Sem esse SQL, o console continua funcionando para a sessão ao vivo; bandeja, notas privadas e "preparar para depois" mostram um aviso pedindo para rodar o script.

## 9. Recursos extras — convite por código, ficha compartilhada e registro de erros

Rode `supabase/recursos_extras.sql` (depois do SQL base da seção 5). Pode rodar de novo sem problema.

- **Versão do banco** (`app_schema_steps`): cada script registra que rodou. Na sala, o mestre vê um aviso dizendo exatamente qual arquivo falta. Quem já rodou os scripts antigos não precisa rodá-los de novo: este script reconhece o que já existe.
- **Convite por código**: `invite_links.code` (8 caracteres sem 0/O/1/I/L, mostrado como `XXXX-XXXX`) + a função `join_campaign_code`. O jogador entra em **Mesas → Entrar com código** ou apontando a câmera para o QR. O mestre pode gerar um código novo (o antigo para de valer).
- **Ficha compartilhada** (`sheet_shares` + `shared_sheet`): link `/f/<token>` só de leitura, sem conta; o dono revoga quando quiser.
- **Registro de erros** (`client_errors`): erros do app de quem está logado. Ninguém lê pelo app; veja no painel do Supabase → Table Editor → `client_errors`.

`npm test` roda `supabase/__tests__/extras.sql.test.ts` num Postgres em memória (PGlite) com todas as permissões.

## 10. Agenda da campanha — próxima sessão e presença

Rode `supabase/agenda.sql` (depois do SQL base da seção 5). Pode rodar de novo sem problema e não apaga dados.

- **`campaign_events`** — os encontros marcados: dia e hora (`starts_at`), duração, título, lugar, recado e `canceled`. RLS: todos da mesa (mestre e jogadores) leem; só o mestre marca, edita, cancela e apaga.
- **`campaign_rsvps`** — uma resposta por pessoa por encontro (`yes` / `maybe` / `no`), com o nome de quem respondeu e o herói vinculado (o app não tem tabela de perfis). Cada um grava só a própria resposta, só em encontro da própria mesa e que não foi cancelado. Apagar o encontro leva as respostas junto.
- É separado de `sessions` de propósito: a sessão **preparada** do console do mestre pode ter nome de spoiler e o jogador não a vê; a agenda é pública para a mesa.
- As duas tabelas entram na publication `supabase_realtime`: a data e as confirmações aparecem sem recarregar.

No app: a sala da mesa mostra a próxima sessão (com **Vou / Talvez / Não vou**, quem já respondeu, **Adicionar ao calendário** em `.ics` e **Google Agenda**); o mestre marca a sessão — o formulário já sugere uma semana depois da última, na mesma hora. A tela inicial mostra a próxima sessão de qualquer mesa sua e se você já confirmou. Sem esse SQL, nada disso aparece (o mestre vê o aviso de script faltando).

`npm test` roda `supabase/__tests__/agenda.sql.test.ts` num Postgres em memória (PGlite) com as permissões de mestre, jogador e estranho.

## 11. Bestiário da mesa — foto, nome e notas das criaturas

Rode `supabase/bestiario.sql` (depois do SQL base da seção 5). Pode rodar de novo sem problema e não apaga dados.

- **`campaign_monsters`** — a aparência que o mestre deu a uma criatura nesta campanha: `name` e `portrait` (imagem leve em data URL, até ~400 KB, só `data:image/…`). Todos da mesa leem, porque a foto e o nome aparecem na iniciativa e nos peões do mapa; só o mestre grava. Apagar a linha volta ao padrão.
- **`campaign_monster_notes`** — notas do mestre por criatura (táticas, ganchos). Só o mestre lê e grava: o jogador não recebe nem a linha.
- `monster_ref` é o id da criatura no bestiário do app (`goblin`, `young-red-dragon`). Já aceita ids `hb:<uuid>`, reservados para as criaturas próprias do mestre (bestiário do mestre, valendo para todas as mesas dele), que virão num script à parte.
- `campaign_monsters` entra na publication `supabase_realtime`: trocou a foto, a mesa de todos atualiza.

No app: a sala da mesa mostra ao mestre o **Bestiário da mesa** (cartas com arte, filtros por tipo e ND, ficha completa e **Personalizar**). A arte padrão vem de `src/assets/bestiario/<id>.webp` (guia com um prompt por criatura em `docs/ARTE-BESTIARIO.md`); sem arquivo, aparece o emblema do tipo. Sem esse SQL, as cartas e a arte funcionam, só o **Personalizar** pede para rodar o script.

`npm test` roda `supabase/__tests__/bestiario.sql.test.ts` num Postgres em memória (PGlite) com as permissões de mestre, jogador e estranho.

## 12. Diário privado — só o jogador lê

Rode `supabase/diario_privado.sql` (depois do SQL base da seção 5). Pode rodar de novo sem problema e não apaga dados.

**Por quê:** o mestre lê o `snapshot` das fichas compartilhadas com a mesa (`sheets_master_read_shared`) e o link de compartilhamento entrega o `snapshot` inteiro. Com o diário dentro dele, o mestre e quem tivesse o link conseguiam ler rabiscos, crônica, pistas e opiniões sobre NPCs — mesmo sem a tela mostrar.

- **`sheet_diaries`** — uma linha por ficha: `data` (diário, crônica e notas) e `updated_at` (a mesma versão da ficha). RLS: **só o dono** lê e grava, e só em ficha dele. O mestre e o link continuam lendo a ficha, sem o diário.
- **Bucket `diario`** (privado, até 2 MB por arquivo): imagens das pistas, na pasta `<id do jogador>/`. Cada um só lê e grava na própria pasta. No aparelho, as imagens ficam no IndexedDB (funcionam offline); a nuvem é a cópia para os outros aparelhos do jogador.
- **Migração no próprio script:** copia o diário que já estava dentro das fichas para `sheet_diaries` (com a mesma versão) e limpa o `snapshot`, **sem mudar `updated_at`** — nenhum aparelho vê "mudança", não há conflito.

No app (`services/diaryCloud.ts`, `services/offlineSyncService.ts`):
- a ficha sobe sem o diário (`withoutDiary`) e, logo depois, o diário vai para `sheet_diaries` com a mesma versão;
- ao baixar, o diário certo é o da linha privada da mesma versão; uma ficha antiga (diário ainda no `snapshot`, gravada por um app desatualizado) é limpa na próxima sincronização;
- se o envio do diário falhar depois do da ficha, a próxima rodada vê "mesma versão dos dois lados" e reenvia — sem conflito;
- um aparelho com o diário vazio nunca apaga o da nuvem: traz de volta;
- **sem este SQL**, nada muda: o diário segue dentro da ficha (como antes) e as imagens das pistas ficam só no aparelho.

`npm test` roda `supabase/__tests__/diario.sql.test.ts` num Postgres em memória (PGlite): migração, mestre sem acesso ao diário, estranho/anônimo sem acesso e pastas de imagem por jogador.
