# Acessibilidade e tamanhos de tela

O que o app garante para teclado, leitor de tela e telas de vários tamanhos, e como conferir. Etapas 5.1 a 5.3 do plano profissional.

## Teclado (5.1)

- **Foco visível:** toda parada do Tab mostra onde está o foco, nos 8 temas, no PC e no celular.
  - Teste: `e2e/foco-visivel.e2e.ts` percorre a aba Jogar inteira em cada tema.
- **Janelas e gavetas:** prendem o foco, fecham com Esc e devolvem o foco ao botão que as abriu.
  - Isso inclui a gaveta "Mais" da ficha no celular, que se usa com as setas.
  - Teste: `e2e/foco-janelas.e2e.ts`.
- **Dica que embrulha um botão:** quem abre a dica é o próprio botão, ao receber o foco. A dica não vira uma parada a mais.
- **Atalhos:** I, A, 1–6, Alt, Shift e ?. Teste: `e2e/atalhos.e2e.ts`.

## Leitor de tela (5.2)

- **Estrutura:**
  - Toda tela tem uma região `main`.
  - A ficha tem o nome do herói como `h1` e as seções em `h2`/`h3`.
- **Nomes que dizem o que o botão faz:**
  - "Sofrer 5 de dano", "Teste de Força -1", "Salvaguarda de Inteligência +5, proficiente", "+1 ACERTO com Bordão", "Conjurar Sono".
  - Quando o texto visível é curto, o contexto entra como texto só para o leitor (`.fv-sr-only`).
- **Enfeites (✦ ◆ ↺) não são lidos:**
  - No CSS: `content: '✦' / ''`.
  - No HTML: `aria-hidden`.
- **Anúncios:**
  - Rolagens: região `status`.
  - PV quando muda: região `aria-live`, vazia até a primeira mudança.
- **Dicas:** a explicação vira a descrição (`aria-describedby`) do botão que ela embrulha.
- **Testes:**
  - `e2e/leitor-de-tela.e2e.ts`.
  - `e2e/acessibilidade.e2e.ts`: axe, WCAG 2.1 AA, em todas as telas e abas.

## Tamanhos de tela (5.3)

Conferido em **12 tamanhos × 8 temas**: 320, 360, 375, 390, 412 e 430 (celulares), 768, 820 e 1024 (tablets), 1280, 1366 e 1920 (PC). Telas conferidas: início, Seus heróis, mesas, configurações, criação e as 10 abas da ficha.

- **Rolagem lateral:** nenhuma, nas 960 combinações.
  - Teste: `e2e/tamanhos.e2e.ts` confere 320 px nos 8 temas.
- **Alvos de toque abaixo de 24 px** (mínimo do WCAG 2.5.8, nível AA): nenhum.
  - As peças pequenas ganham, só no toque (`pointer: coarse`), uma área invisível em volta, sem mudar o desenho.
  - Fileiras densas, com 24 px (para não invadir o vizinho): espaços de magia, testes contra a morte, preparar magia.
  - Peças soltas, com 36 px: remover, favoritar, selo da arte, alça de arrastar, "Novo turno".
  - Barras deslizantes: 24 px de altura.
  - Tudo isso fica em `src/styles/mobile.css`.
  - Teste: `e2e/tamanhos.e2e.ts`.

### Entre 24 e 44 px: decisão

44 px é a recomendação da Apple e do WCAG 2.5.5 (nível AAA). Boa parte dos botões do app tem entre 32 e 43 px no celular:
- ícones da barra do topo (38 px);
- botões de PV;
- chips;
- botões secundários.

Todos passam no nível AA (24 px). Levar todos a 44 px muda o desenho de cada tema (barra do topo, linhas da ficha), por isso ficou como decisão de design, não como correção.

Ao criar uma peça nova: **mire 44 px no celular** e nunca fique abaixo de 24 px. O teste reprova abaixo de 24.
