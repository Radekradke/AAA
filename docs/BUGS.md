# Registro de bugs

Lista viva usada pelas etapas do `docs/PLANO-PROFISSIONAL.md`. Todo bug encontrado entra aqui antes de ser corrigido. Quando for corrigido, ganha um teste e muda para **Corrigido**, com o PR.

## Como registrar

Copie o modelo para a seção certa, com o próximo número livre:

```md
### B-000 · Título curto do que acontece
- **Prioridade:** P1
- **Área:** Ficha › Magias
- **Passos:** 1. … 2. … 3. …
- **Esperado:** …
- **Acontece:** …
- **Status:** Aberto · Corrigido em #PR (teste: arquivo)
```

### Prioridades
| | Quando usar | Prazo |
|---|---|---|
| **P0** | Perde dados, trava o app ou bloqueia uma sessão de jogo | Corrigir já, antes de outro item |
| **P1** | Regra errada, conta errada ou função principal quebrada | Na etapa atual |
| **P2** | Algo funciona, mas confunde ou atrapalha; visual quebrado | Na etapa da área |
| **P3** | Detalhe, texto ou polimento | Quando passar pela tela |

## Abertos

### B-002 · Alertas de segurança só nas ferramentas de desenvolvimento
- **Prioridade:** P3
- **Área:** Dependências
- **Passos:** `npm audit` (sem `--omit=dev`).
- **Esperado:** zero alertas.
- **Acontece:** 2 alertas moderados, que não vão para o app publicado:
  - `vitest` (via `@vitest/mocker`): corrigido no 4.1.11 ou mais novo.
  - `esbuild` do `vite`: corrigido no vite 8, que é uma versão maior.
- **Status:** Aberto. Subir junto com a etapa 4, testando build e testes.

### B-003 · Memorizações das abas Magias e Retrato ignoram parte da ficha
- **Prioridade:** P3
- **Área:** Ficha › Magias, Retrato
- **Passos:** `npm run lint` mostra 4 avisos `react-hooks/exhaustive-deps`:
  - `TabMagias.tsx` linhas 75, 85 e 104;
  - `TabRetrato.tsx` linha 94.
- **Esperado:** dependências completas ou o motivo escrito na linha.
- **Acontece:** os `useMemo` dependem só de campos escolhidos da ficha, de propósito, para não recalcular a cada mudança. Se outro campo usado lá dentro mudar, a tela pode mostrar um valor antigo.
- **Status:** Aberto. Revisar na migração dessas telas (3.6).

## Corrigidos

### B-007 · Mapa: Esc e logo F não voltava para tela cheia
- **Prioridade:** P3
- **Área:** Mesa ao vivo › Mapa
- **Passos:** 1. Mestre abre o mapa em tela cheia. 2. Esc sai. 3. Logo em seguida, F.
- **Esperado:** o mapa volta para a tela cheia.
- **Acontece:** a saída da tela cheia do navegador é assíncrona. O aviso dela chegava depois do novo pedido, e o palco voltava ao normal sozinho. O teste `mesa.e2e.ts` › "mapa em tela cheia e volta" falhava 3 em 4 vezes. No CI passava só por causa da nova tentativa automática.
- **Status:** Corrigido: `useMapFullscreen` (`StageView.tsx`) guarda o que pediu por último ao navegador e ignora o aviso atrasado. O teste existente passa 5 em 5.

### B-006 · Corte Carmesim escuro: texto branco sobre o coral com contraste 2,96:1
- **Prioridade:** P3
- **Área:** Temas › Corte Carmesim (escuro)
- **Passos:** tema Corte Carmesim no modo escuro. Ver o número de pendências no botão "Herói" da criação (celular) ou os selos hexagonais do Retrato.
- **Esperado:** texto sobre a cor de ação com pelo menos 4,5:1 (WCAG AA).
- **Acontece:** branco sobre `#FE5F71` dava 2,96:1.
- **Status:** Corrigido: `--on-acc` do tema escuro passou a `#12060b` (6,71:1). Teste: `src/styles/__tests__/tokens.test.ts` confere todos os temas e modos.

### B-005 · Sem internet, pedaço do app que não baixou fazia a página sumir
- **Prioridade:** P2
- **Área:** Offline
- **Passos:** 1. Abrir a ficha num aparelho sem o app em cache: primeira visita, aba anônima ou cache limpo pelo celular. 2. Ficar sem internet antes de um pedaço do app terminar de baixar. Exemplos: a anotação rápida, ou uma página ainda não aberta.
- **Esperado:** a ficha continua na tela e o app avisa que está sem conexão.
- **Acontece:** o app tratava a falha como "versão nova" e recarregava a página. Sem rede, caía na tela "sem conexão" do navegador e o app sumia. Na tela de erro, a mensagem dizia "O app foi atualizado".
- **Status:** Corrigido:
  - `reloadOnceForStaleChunk` não recarrega sem rede;
  - a tela de erro diz "Sem internet" e recarrega sozinha quando a conexão volta;
  - a anotação rápida fica numa guarda silenciosa.
  - Testes: `e2e/offline.e2e.ts` e `errorReporter.test.ts` › "pedaço de código que não baixou".

### B-004 · Criação: opções de Especialização do Ladino sem nome de grupo
- **Prioridade:** P3
- **Área:** Criação › Perícias
- **Passos:** 1. Criar um Ladino. 2. Etapa Perícias. 3. Navegar com leitor de tela até "Especialização".
- **Esperado:** as opções formam um grupo com nome, como as outras escolhas da criação.
- **Acontece:** os botões de Especialização ficavam soltos. O leitor de tela não dizia a que eles pertenciam.
- **Status:** Corrigido: `role="group"` com nome "Especialização" em `StepSkills.tsx`. Teste: `e2e/criacao.e2e.ts` › "Ladino: Especialização é um grupo com nome…".

### B-001 · Patrulheiro: ficha cobrava idioma de inimigo favorito que não fala
- **Prioridade:** P1
- **Área:** Ficha › Evoluir
- **Passos:** 1. Patrulheiro nível 13. 2. Evoluir para o 14. 3. Ver as escolhas do nível.
- **Esperado:** pedir o idioma que acompanha o novo inimigo favorito (`favoredLanguage`), como no 1º e no 6º.
- **Acontece:** o Evoluir só pede o idioma quando o inimigo novo fala, o que está certo. Mas a conta das escolhas devidas exigia um idioma por nível (1º, 6º e 14º) sempre que algum inimigo falasse. Com dragões, gigantes e feras, a ficha ficava devendo um terceiro idioma depois de subir.
- **Status:** Corrigido: a conta passa a exigir um idioma por inimigo favorito que fala (`capByRequirement` em `src/engine/classChoices.ts`). Teste: `classChoices.test.ts` › "escolhas condicionais que se repetem".
