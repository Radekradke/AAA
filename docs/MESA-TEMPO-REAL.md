# Mesa ao vivo: arquitetura do tempo real

Como o palco (mapa, peões, paredes, névoa, segredos) fica igual na tela de
todo mundo, com o mínimo de tráfego no plano grátis do Supabase.

## Dados

| O quê | Onde | Quem grava |
|---|---|---|
| Cena, névoa (revelado, visão dinâmica, escuro) | `campaign_scenes.grid` | mestre |
| Peões (posição, tamanho, escondido, luz) | `scene_tokens` | mestre; jogador move o próprio (`move_token`) e acende a própria luz (`set_token_light`) |
| Paredes e portas | `scene_walls` (uma linha cada) | mestre; jogador abre/fecha porta ao lado do herói (`toggle_door`) |
| Segredos | `scene_secrets` (só o mestre lê) | mestre |
| O que está no ar | `campaign_stage` | mestre |

Regra: **o que muda com frequência ou é escrito por mais de uma pessoa mora
em linha própria**. Assim nenhuma gravação regrava o trabalho de outro (o
mestre revelando a névoa não desfaz a porta que o jogador abriu — há teste
SQL provando isso em `supabase/__tests__/portas_luz.sql.test.ts`).

Toda regra de permissão está no banco (RLS e funções `security definer`).
O app repete a regra só para a interface (porta "longe" apagada), nunca
para decidir.

## Leitura: incremental, não recarga

`src/store/stageStore.ts` assina o Realtime do palco num canal por campanha:

- **Incremental** — `scene_tokens`, `scene_walls`, `campaign_scenes` (UPDATE)
  e `scene_secrets`: cada evento é aplicado direto na memória por
  `applyRowChange` (`src/lib/realtimeRows.ts`, puro e testado). Ignora
  evento atrasado (compara `updated_at`), tira da lista o que deixou de
  pertencer (peão de outra cena) e devolve a mesma lista quando nada mudou
  (o React não redesenha à toa).
- **Recarga curta** (debounce de 120 ms) — `campaign_stage`,
  `campaign_handouts`, cena nova/apagada. O gatilho
  `_fv_token_visibility_touch` cutuca `campaign_stage` quando um peão é
  escondido/revelado, porque o RLS não manda ao jogador o UPDATE de uma
  linha que ele deixou de enxergar.
- Ao conectar, reconectar ou o aparelho acordar (`onWake`), recarrega tudo
  uma vez.

Efêmero (não vai ao banco): arrasto ao vivo, ping, régua/moldes, laser,
"esqueçam o explorado" — `broadcast` no mesmo canal.

## Escrita: otimista

Ações do dia a dia (`addTokens`, `updateToken`, `addWalls`, `patchWall`,
`toggleDoor`, `setLight`, `saveFog`) mudam a tela na hora e gravam com
`write()`: se o banco recusar, mostra o erro e recarrega para voltar ao
estado real. Ids são gerados no cliente (`crypto.randomUUID`), então o
evento do banco que volta só confirma a mesma linha.

## Mapa

`src/components/stage/StageMap.tsx` orquestra estado, gestos e camadas.
As partes ficam em `src/components/stage/map/`:

- `useVision.ts` — visão dinâmica, luz, memória da névoa (por cena, no aparelho);
- `layers.tsx` — névoa, paredes, portas, alcance dos segredos;
- `MapHud.tsx` — doca, folha da ferramenta, controles de visão;
- `tools.tsx`, `icons.tsx`, `geometry.ts`, `MarkShape.tsx`.

A matemática fica em `src/engine/` (`vision.ts`, `secrets.ts`, `grid.ts`),
pura e com testes.

## Testes

- SQL em Postgres de verdade (PGlite): `supabase/__tests__/*.sql.test.ts`.
- Unidade: `src/lib/__tests__/realtimeRows.test.ts`, `src/engine/__tests__/`.
- **Multiplayer** (`e2e/mesa-multiplayer.e2e.ts`): mestre e jogador em duas
  janelas dividindo o mesmo banco e o mesmo Realtime do mock
  (`installSupabase(page, who, { shared })`). O mock repassa
  `postgres_changes` (com o RLS do jogador) e `broadcast` — inclusive o
  formato binário do cliente e o envio por HTTP — entre as janelas.
