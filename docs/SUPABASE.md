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

drop policy if exists "notes_member_read" on public.campaign_notes;
create policy "notes_member_read" on public.campaign_notes for select using (
  public.is_campaign_master(campaign_id) or public.is_campaign_member(campaign_id)
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
```
