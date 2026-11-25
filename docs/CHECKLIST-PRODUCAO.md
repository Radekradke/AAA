# Checklist de produção

O que conferir antes de publicar uma versão (etapa 6.3). Marque cada item no próprio PR de lançamento.

Itens com **[você]** só quem tem acesso ao painel do Supabase ou da Vercel consegue fazer. O resto o CI já confere sozinho.

## 1. Código (o CI confere)

- [ ] **CI verde no PR:** "Tipos, testes e build", os dois "Ponta a ponta (Playwright)" e "Vercel Preview".
  - Esses checks rodam typecheck, lint com 0 avisos, os testes de unidade, `npm run budget`, `npm run debt` e os testes de ponta a ponta no PC e no celular.
- [ ] **Versão subiu:** `package.json`, com o que mudou em `CHANGELOG.md` e `docs/NOTAS-DA-VERSAO.md`. O teste `changelog.test.ts` reprova se a versão não bater.
- [ ] **Desempenho:** `npm run build && npm run vitals` deu a tela inicial com LCP abaixo de 2,5 s no celular médio (`docs/DESEMPENHO.md`).
- [ ] **Bugs:** nada novo em aberto com prioridade P1 em `docs/BUGS.md`.

## 2. Supabase [você]

**Onde:** SQL Editor → aba nova → cole o arquivo inteiro → Run, sem nada selecionado. Todos podem rodar de novo sem apagar dados.

Na primeira vez rode todos, nesta ordem. Nas versões seguintes, rode só os que mudaram desde a última publicação (`git diff --stat <última tag>..HEAD -- supabase/`).

| Ordem | Arquivo | Para quê |
|---|---|---|
| 1 | script único da seção 5 de `docs/SUPABASE.md` | fichas, campanhas, crônica, políticas, realtime |
| 2 | `supabase/multiplayer_session.sql` | mesa ao vivo: sessão, encontro, iniciativa |
| 3 | `supabase/atualizacao_npcs_bestiario.sql` | NPCs e bestiário da campanha |
| 4 | `supabase/palco.sql` | palco: mapas, cenas, cutscenes, handouts e o espaço de imagens (bucket `campaign-media`) |
| 5 | `supabase/mestre_console.sql` | console do mestre |
| 6 | `supabase/recursos_extras.sql` | convite por código, ficha compartilhada, registro de erros |
| 7 | `supabase/agenda.sql` | agenda da campanha |
| 8 | `supabase/bestiario.sql` | bestiário da mesa (foto, nome, notas) |
| 9 | `supabase/diario_privado.sql` | diário que só o jogador lê |
| 10 | `supabase/mesa_vida.sql` | PV do herói igual para mestre e jogador |
| 11 | `supabase/discord.sql` | rolagens no Discord da mesa |
| 12 | `supabase/mesa_membros.sql` | sair, remover e lista de jogadores |
| 13 | `supabase/segredos.sql` | segredos do mapa (baús, armadilhas, passagens) e loot nas pistas |

Só se o app pedir (consertos para quando o `palco.sql` parou no meio):
- `supabase/palco_regras.sql`, quando aparecer "O banco recusou…" para o mestre;
- `supabase/palco_mover.sql`, quando os peões "voltam pro lugar";
- `supabase/palco_storage.sql`, quando aparecer "Falta o espaço de imagens".

Depois:
- [ ] **Authentication → URL Configuration:** o domínio de produção está em *Site URL* e em *Redirect URLs* (`https://SEU-DOMINIO/auth/callback`).
- [ ] **Database → Replication:** as tabelas da mesa ao vivo estão no realtime (o script da seção 5 e o `multiplayer_session.sql` já fazem isso; conferir se a mesa não atualiza sozinha).
- [ ] **Teste rápido** no site publicado, logado:
  - Configurações → Avançado → **Diagnóstico da nuvem**: tudo verde.
  - Crie uma mesa, entre com outra conta pelo código e veja a iniciativa mudar nas duas telas.

Os SQLs também são testados sem Supabase, num Postgres em memória (`supabase/__tests__`, 10 arquivos, no `npm test`).

## 3. Vercel [você]

**Onde:** Project → Settings → Environment Variables. Valores em *Production* (e em *Preview*, se quiser a nuvem nos previews).

| Variável | Obrigatória | O que é |
|---|---|---|
| `VITE_SUPABASE_URL` | para ter nuvem | URL do projeto (Supabase → Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | para ter nuvem | chave **anon / public** (nunca a `service_role`) |

Sem as duas, o app funciona só no aparelho (modo convidado) e esconde a mesa ao vivo.

O resto vem sozinho no build e não precisa ser criado: a versão (`package.json`), o commit (`VERCEL_GIT_COMMIT_SHA`) e a data.

- [ ] **Variáveis:** as duas estão em Production.
- [ ] **Branch de produção:** o *Production Branch* aponta para a branch que recebe os merges dos PRs.
- [ ] **Depois de publicar:**
  - `https://SEU-DOMINIO/version.json` mostra `"release": "<versão nova>"`.
  - O menu do app diz **"Versão X.Y.Z … ✓ atualizada"**.
  - `vercel.json` já cuida do cache: `/static/*` imutável, `sw.js`, `version.json` e manifesto sempre conferidos.

## 4. Backup [você]

As fichas vivem no aparelho (IndexedDB) e, com conta, também no Supabase.

- [ ] **Banco:** antes de rodar SQL novo, faça um backup (Supabase → Database → Backups, ou `pg_dump` da URL de conexão). No plano gratuito não há backup automático diário: baixe manualmente.
- [ ] **Teste de restauração**, uma vez por versão:
  - Configurações → Backup → **Baixar backup** num aparelho.
  - **Restaurar** em outro navegador.
  - Os heróis aparecem iguais (`e2e/offline.e2e.ts` cobre o fluxo; aqui é com dados reais).
- [ ] **Imagens do palco:** ficam no bucket `campaign-media`. Se forem importantes para a campanha, baixe a pasta em Storage.

## 5. Publicar

- [ ] **Merge e tag:** fazer o merge do PR de lançamento e criar a tag (`git tag v1.1.0 && git push origin v1.1.0`).
- [ ] **Versão nova no aparelho:** abrir o app num celular em que ele já estava instalado. Aparece "Nova versão disponível · atualizar", e depois de tocar o menu mostra a versão nova.
- [ ] **Conferência de uma pessoa:** os itens do fim de `docs/RODADA-MANUAL.md` (sons e visual, cerca de 5 minutos).
- [ ] **Avisar os jogadores:** usar o texto de `docs/NOTAS-DA-VERSAO.md`.

## Estado na versão 1.1.0

| Item | Estado |
|---|---|
| Código | **pronto**: CI verde em todos os PRs da rodada, versão 1.1.0 com changelog e notas, LCP da tela inicial 2,22 s, nenhum bug P1 aberto |
| Supabase, Vercel, backup e publicação | **com o André**: dependem de acesso aos painéis |
| Consertos do palco | `palco_regras`, `palco_mover` e `palco_storage` não estavam no guia; agora estão listados acima e na seção 7 de `docs/SUPABASE.md`, com quando usar cada um |
