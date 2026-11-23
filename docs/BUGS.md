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

### B-011 · Card do herói ignora o formato definido por 4 temas
- **Prioridade:** P3 (decisão de visual)
- **Área:** Seus Heróis › card do herói · Temas Véu Astral, Verdejante, Corte Carmesim, Brasa
- **Passos:** abrir Seus Heróis em um desses temas.
- **Esperado:** o card segue o formato do tema: cantos de 30 px (Véu Astral), folha (Verdejante), arco (Corte Carmesim), canto reto (Brasa).
- **Acontece:** o card sempre sai com cantos de 16 px. O estilo inline (`borderRadius: 16`) ganhava das regras `[data-theme] .fv-hero-card`, que nunca valeram.
- **Status:** Aberto, para o André decidir. A migração da 3.7 manteve o visual de hoje (16 px), usando `#fv-conteudo` no seletor. Para ligar o formato dos temas, basta tirar `border-radius` de `#fv-conteudo .fv-heroes .fv-hero-card` em `src/styles/heroes.css`.

### B-002 · Alertas de segurança só nas ferramentas de desenvolvimento
- **Prioridade:** P3
- **Área:** Dependências
- **Passos:** `npm audit` (sem `--omit=dev`).
- **Esperado:** zero alertas.
- **Acontece:** 2 alertas moderados, que não vão para o app publicado:
  - `vitest` (via `@vitest/mocker`): corrigido no 4.1.11 ou mais novo.
  - `esbuild` do `vite`: corrigido no vite 8, que é uma versão maior.
- **Status:** Aberto. Subir junto com a etapa 4, testando build e testes.

## Corrigidos

### B-012 · Couro Batido e Cinto do Gigante do Fogo com arte quebrada
- **Prioridade:** P3
- **Área:** Inventário, detalhes do item, busca
- **Passos:** procurar "Couro Batido" ou "Cinto de Força de Gigante do Fogo" na busca, ou ter um deles no inventário.
- **Esperado:** a carta com a arte do item, ou a carta sem arte (como os itens que ainda não têm imagem).
- **Acontece:** `a-studded.webp` e `m-belt-fire.webp` chegaram vazios (0 bytes) no envio das fotos de equipamento; o app achava o arquivo e mostrava imagem quebrada.
- **Status:** Corrigido na 4.2: os dois arquivos vazios saíram (os itens voltam a ficar sem arte até a imagem ser gerada de novo, ver `docs/ARTE-ITENS.md`). Teste: `src/lib/__tests__/artAssets.test.ts` reprova imagem vazia ou que não é WebP em qualquer pasta de `src/assets`, e `npm run art` para com erro se o original estiver vazio.

### B-008 · Janelas feitas à mão sem foco preso ou sem Esc
- **Prioridade:** P2
- **Área:** Acessibilidade (teclado e leitor de tela)
- **Passos:** abrir com o teclado o Onboarding, o Tutorial guiado, uma Cena do mestre, os Bastidores ou os Dons da criação no celular, e apertar Tab várias vezes.
- **Esperado:** o foco fica dentro da janela e volta para quem abriu ao fechar, como no `Modal`.
- **Acontece:**
  - **Foco:** essas 5 janelas declaram `aria-modal`, mas o Tab escapa para a página de trás.
  - **Esc:** das 7 janelas presas a botões, 3 não fecham com Esc (ações de ataque, conjurar, crédito de abate). As outras 4 fecham, cada uma do seu jeito.
- **Status:** Corrigido na 3.7 e na 3.8, sem mudar o visual:
  - **3.7:** Onboarding, Tutorial guiado e Dons da criação no celular usam `useDialogFocus`: foco preso, Esc fecha e o foco volta para quem abriu.
  - **3.8:** Cena e Bastidores do mestre também usam `useDialogFocus`. As 3 janelas presas a botões (ações de ataque, conjurar, golpe final) fecham com Esc pelo `useEscClose` (`src/lib/useEscClose.ts`), que devolve o foco ao botão e não muda o clique fora.
  - Teste: `e2e/foco-janelas.e2e.ts` (tutorial, tour, Dons, Bastidores, conjurar e "acertou?"; todos reprovam sem a correção). A Cena e o golpe final usam os mesmos ganchos, sem teste próprio (a mesa de teste não tem cutscene no ar nem criatura caída).


### B-003 · Memorizações das abas Magias e Retrato ignoram parte da ficha
- **Prioridade:** P3
- **Área:** Ficha › Magias, Retrato
- **Passos:** `npm run lint` mostra 4 avisos `react-hooks/exhaustive-deps`:
  - `TabMagias.tsx` linhas 75, 85 e 104;
  - `TabRetrato.tsx` linha 94.
- **Esperado:** dependências completas ou o motivo escrito na linha.
- **Acontece:** os `useMemo` dependem só de campos escolhidos da ficha, de propósito, para não recalcular a cada mudança. Se outro campo usado lá dentro mudar, a tela pode mostrar um valor antigo.
- **Status:** Corrigido na 3.6:
  - **Magias (3.6a):** as três contas passam a depender da ficha inteira; são baratas, então não vale arriscar valor antigo. `packs` e `hbSpells` ficam na lista com o motivo escrito na linha (mudam a lista global de magias que a função lê).
  - **Retrato (3.6b):** a conta já usava só o equipado e o inventário; o aviso vinha de `typeof char.inventory`. Com os dois em variáveis próprias, as dependências ficam completas.
  - `npm run lint` passa a aceitar **0** avisos (era 10), para nenhum voltar.

### B-010 · Discord da mesa: botão "Salvar" espremido
- **Prioridade:** P3
- **Área:** Sala da campanha › Discord da mesa (mestre)
- **Passos:** abrir a Sala da campanha como mestre e olhar o campo do webhook do Discord.
- **Esperado:** "Salvar" do mesmo tamanho que "Testar", ao lado dele.
- **Acontece:** o botão dourado (`fv-btn-gold`) não tem tamanho próprio; ali ninguém definia, e ele ficava com 24 px de altura e sem margem interna.
- **Status:** Corrigido na 3.5: `.fv-discord-field .fv-btn-gold` ganha altura, margem e fonte. Teste: `e2e/mesa.e2e.ts` › "Discord da mesa: o botão Salvar tem tamanho de botão (B-010)" (reprova sem a correção: 24 px).
- **Para as próximas telas:** outros `fv-btn-gold` sem tamanho definido podem ter o mesmo problema; conferir em cada migração da etapa 3 e na rodada de tamanhos da 5.3.

### B-009 · Temas que reconheciam peças pelo estilo inline deixavam de achá-las após a migração
- **Prioridade:** P3
- **Área:** Temas (Eclipse, Ouro Velho, Guilda Rubra) · Etapa 3
- **Passos:** abrir a aba Ficha no Eclipse, Ouro Velho ou Guilda Rubra depois de migrar a aba para classes; ou ligar a Concentração na aba Combate no Ouro Velho.
- **Esperado:** o visual do tema continua o mesmo.
- **Acontece:** esses temas acham as placas de atributo e os brilhos pelo texto do estilo inline (`[style*='clip-path']`, `[style*='0px 0px']`). Quando o estilo vira classe, a regra do tema para de pegar:
  - as placas da Ficha voltariam ao corte e às cores padrão;
  - o ponto da Concentração (migrado na 3.1) voltou a brilhar no Ouro Velho.
- **Status:** Corrigido na 3.3. As regras dos temas apontam para as classes (`.fv-ficha-ab`, `.fv-combat-conc-dot`). Conferido com prints nos 4 temas e com `toHaveCSS` no ponto da Concentração.
- **Para as próximas telas:** antes de migrar, procurar `[style*=` nos temas. Ainda resta `[style*='0px 0px']` no Ouro Velho, que pega os brilhos inline que sobraram.

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
