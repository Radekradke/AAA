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

O canal do palco (`stage-{campanha}`) mora em `src/services/stageChannel.ts`;
`src/store/stageStore.ts` só recebe o que ele entrega:

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
"esqueçam o explorado" — `broadcast` no mesmo canal. Arrasto de quem caiu
no meio some sozinho em 4 s; réguas de quem saiu da mesa somem com a
presença.

## Conexão e presença

- **Estado** (`connection`: conectando, ao vivo, reconectando, sem
  conexão) e **presença** (`online`) vêm do canal do palco e do canal da
  sessão; `useTableLink` (`src/hooks/`) mostra o pior dos dois e junta as
  duas listas (`src/lib/tableLink.ts`, puro e testado). O cabeçalho do
  jogador e o do mestre usam isso, com ou sem sessão aberta.
- **Reconexão**: erro e tempo esgotado o realtime-js refaz sozinho; canal
  fechado pelo servidor é refeito com espera crescente (1 s, 2 s, 5 s,
  10 s); `wake()` (aba visível ou rede de volta) reconstrói na hora um
  canal que morreu calado. Toda (re)entrada relê o palco inteiro uma vez.
  O tópico é sempre o mesmo — o broadcast só chega a quem está nele —,
  então sobras do canal antigo são removidas antes de criar o novo.
- **Herói ausente**: peão de herói cujo dono não está na presença fica
  apagado no mapa (`is-away`, "fora da mesa").

## Escrita: otimista

Ações do dia a dia (`addTokens`, `updateToken`, `addWalls`, `patchWall`,
`toggleDoor`, `setLight`, `saveFog`) mudam a tela na hora e gravam com
`write()`: se o banco recusar, mostra o erro e recarrega para voltar ao
estado real. Ids são gerados no cliente (`crypto.randomUUID`), então o
evento do banco que volta só confirma a mesma linha.

## Sem rede: fila de jogadas

`write(fn, key)` no `stageStore`: se a gravação falhar por **rede**
(`isNetworkError`), ela espera numa fila (`src/lib/outbox.ts`, pura e
testada) em vez de desfazer a jogada. Só entra o que é idempotente — mover
peão (`move:{id}`), luz (`light:{id}`), editar peão (`token:{id}:{campos}`) e
névoa (`fog:{cena}`); a mesma chave guarda só a última versão. Porta fica
de fora (é alternância: repetida, daria o contrário). Ao reconectar, a fila
sai **antes** da releitura do palco (senão a releitura desfaria a jogada);
o que o banco recusar sai da fila, aparece na tela e vai para o registro de
erros. O cabeçalho mostra "· N jogadas na fila". A fila vive só na aba:
sair da mesa descarta.

## Registro de erros

`src/lib/errorReporter.ts` já guarda os erros no aparelho (Diagnóstico) e
manda para `client_errors` (`recursos_extras.sql`). Gravações do palco que
o banco recusa também entram (`scope: 'palco'`). No banco, um gatilho
limita a 60 por pessoa por hora e apaga o que passar de 90 dias, para o
plano grátis não encher.

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
  formato binário do cliente e o envio por HTTP — entre as janelas, e
  emula presença (`presence_state`/`presence_diff`) e queda de conexão
  (`hub.sockets[i].close()`).
