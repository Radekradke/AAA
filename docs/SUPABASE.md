# Ficha Viva — Nuvem (Supabase)

O app é **offline-first**: as fichas vivem no IndexedDB do aparelho e continuam
editáveis sem internet. Com o Supabase configurado, cada usuário ganha login
real (Supabase Auth) e as fichas sincronizam entre dispositivos.

## 1. Configurar

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Copie `.env.example` para `.env` e preencha:
   - `VITE_SUPABASE_URL` — URL do projeto;
   - `VITE_SUPABASE_ANON_KEY` — chave pública (anon). **Nunca** use a service key no front.
3. Rode o SQL abaixo no SQL Editor do Supabase.
4. Em Authentication → Providers, habilite Email (desative "Confirm email"
   para testar mais rápido, se preferir).

Sem `.env`, o app roda normalmente no modo offline/local.

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

-- exemplos de políticas (refinar ao implementar):
create policy "campaigns_member_read" on public.campaigns for select using (
  auth.uid() = master_id or exists (
    select 1 from public.campaign_members m
    where m.campaign_id = id and m.user_id = auth.uid()
  )
);
create policy "campaigns_master_write" on public.campaigns
  for all using (auth.uid() = master_id);
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
