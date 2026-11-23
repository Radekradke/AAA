# Progresso do plano profissional

Lista de trabalho de `docs/PLANO-PROFISSIONAL.md`. Cada retomada automática pega o **primeiro item não marcado**, faz, testa, abre o PR e marca aqui quando for mergeado.

Legenda: `[ ]` a fazer · `[~]` em andamento (PR aberto) · `[x]` feito e mergeado

## Etapa 0 — Rede de segurança
- [x] 0.1 ESLint (TypeScript, hooks, acessibilidade) no CI
- [x] 0.2 `npm audit fix` (react-router)
- [x] 0.3 Orçamento de tamanho do pacote no CI
- [x] 0.4 Teste de fumaça: 16 páginas sem erro no console
- [x] 0.5 Registro de bugs (`docs/BUGS.md`)

## Etapa 1 — Caça a bugs
- [x] 1.1 Criação
- [x] 1.2 Ficha: Jogar, Combate, Magias, Inventário
- [x] 1.3 Ficha: Evoluir, Descanso, Diário, Retrato, Dados
- [x] 1.4 Mesa ao vivo, palco, mapa, NPCs, bestiário
- [x] 1.5 Conta, sincronização, offline, importação/exportação, impressão

## Etapa 2 — Design system
- [x] 2.1 Tokens
- [x] 2.2 Primitivos
- [x] 2.3 Camadas (Modal, Sheet, Popover, Tooltip, Toast)
- [x] 2.4 Catálogo `/dev/ui`
- [x] 2.5 Guarda contra cor fixa e estilo solto

## Etapa 3 — Migração tela por tela
- [x] 3.1 Combate
- [x] 3.2 Evoluir
- [x] 3.3 Ficha
- [x] 3.4 Inventário + editor de item
- [x] 3.5 Sala da campanha
- [x] 3.6 Jogar, Magias, Descanso, Diário, Retrato
- [x] 3.7 Criação, Home, Heróis, Configurações
- [x] 3.8 Mesa ao vivo, palco, console do mestre
- [x] 3.9 Quebrar o `globals.css` e apagar CSS sem uso

## Etapa 4 — Desempenho
- [x] 4.1 Dividir o pacote de entrada (< 300 KB)
- [~] 4.2 Imagens
- [ ] 4.3 Core Web Vitals

## Etapa 5 — Acessibilidade e responsividade
- [ ] 5.1 Teclado
- [ ] 5.2 Leitor de tela
- [ ] 5.3 12 tamanhos × 8 temas

## Etapa 6 — Entrega
- [ ] 6.1 Versão e changelog
- [ ] 6.2 Roteiro manual completo
- [ ] 6.3 Checklist de produção

## Diário das retomadas
<!-- Cada retomada acrescenta uma linha: data · item · PR · resultado -->
- 23/11 · 0.1 lint · PR #122 mergeado · 0 erros de lint, 1012 unidade, 187 ponta a ponta
- 23/11 · 0.2 dependências · PR #123 mergeado · react-router 6.30 → 7.18 (a 6 não tem correção); 0 alertas de produção. Restam 2 alertas só de desenvolvimento (vitest, esbuild do vite), que pedem versões maiores: ficam no registro de bugs
- 23/11 · 0.3–0.5 · PR #124 mergeado · orçamento do pacote (JS 1150 / CSS 245 / gzip 415 KB) no CI; fumaça das 16 páginas, 32/32 (PC e celular); `docs/BUGS.md` com 3 bugs abertos
- 23/11 · B-001 (etapa 1, achado da 0.5) · PR #125 mergeado · Patrulheiro deixa de dever idioma de inimigo que não fala; 1013 unidade
- 23/11 · 1.1 criação · PR #126 mergeado · varredura do motor: 1.440 heróis (12 classes × 20 níveis × 6 sementes) sem problema; criador inteiro guiado por robô em 12 classes × níveis 1 e 6, PC e celular: 48/48, sem erro no console; fichas de 36 heróis com todas as abas abertas: limpo; 1 achado de acessibilidade (B-004) corrigido
- 23/11 · 1.2 Jogar, Combate, Magias, Inventário · PR #127 mergeado · teste macaco (clica em todo botão de cada aba, fecha o que abre e volta se navegar) em 12 classes: ~1.700 cliques, sem tela de erro e sem erro no console; app responde em 30–150 ms por clique. Nenhum bug novo
- 23/11 · 1.3 Evoluir, Descanso, Diário, Retrato, Dados · PR #128 mergeado · teste macaco por rótulo (só o conteúdo da aba) em 6 classes, PC e celular: ~600 cliques, sem tela de erro e sem erro no console. Nenhum bug novo. Pendência de cobertura: o Retrato troca de vista no 1º clique, então foi pouco exercitado — vira item da 1.5/5.x
- 23/11 · 1.4 mesa ao vivo, palco, mapa, NPCs, bestiário · PR #129 mergeado · teste macaco como mestre e jogador (sala da campanha, mesa ao vivo, lista de mesas), PC e celular: ~170 cliques, sem tela de erro e sem erro no console. Nenhum bug novo. Pouca cobertura na sala vista pelo jogador (o 1º clique troca de vista) — fica para 5.x
- 23/11 · 1.5 conta, sincronização, offline, importação/exportação, impressão · PR #130 mergeado · backup baixado e restaurado em outro aparelho: ok; edição sem rede fica "1 pendente" e sincroniza ao voltar: ok; teste macaco em Configurações, Entrar, Diagnóstico e Impressão (PC e celular): limpo; 1 bug achado e corrigido (B-005: sem internet, pedaço que não baixou fazia a página sumir)
- 23/11 · 2.1 tokens · PR #131 mergeado · `src/styles/tokens.css` (cor por papel, espaço 4 px, 7 tamanhos de texto, cantos, movimento, camadas) + `docs/DESIGN-TOKENS.md`; teste de contraste AA em 8 temas × 2 modos achou 1 falha (B-006, corrigida); rodada completa de ponta a ponta achou o B-007 (corrida da tela cheia do mapa, já existia), corrigido
- 23/11 · 2.2 primitivos · PR #132 mergeado · Button (tamanhos, carregando, ícone), IconButton, Field/Input/Select/Textarea, Segmented, Chip, Badge, Tabs em `src/components/ui/` + `src/styles/ui.css` (só tokens); 16 testes de marcação/ARIA e de teclado; os 12 `<Button>` antigos iguais, exceto o canto, que passa a seguir o tema como os outros 238 botões
- 23/11 · 2.3 camadas + 2.4 catálogo · PR #133 mergeado · Sheet, Popover e Tooltip (com Modal e Toast, mesmas regras de Esc e foco); catálogo `/dev/ui` só em desenvolvimento, com os 8 temas × claro/escuro; 9 testes de ponta a ponta de teclado; auditoria das 15 janelas feitas à mão com o substituto de cada uma (pendências no B-008)
- 23/11 · 2.5 guarda · PR #134 mergeado · `npm run debt` no CI: por arquivo, style={{…}} e cor fixa só podem diminuir (registro: 857 e 569); conferido que reprova ao acrescentar um
- 23/11 · 3.1 Combate · PR #135 mergeado · TabCombate: 70 style={{…}} → 4 (só os que mudam na hora); as 9 cores fixas (verde de cura, âmbar da exaustão) ficam para quando houver tokens de cura/aviso; estilos em `src/styles/combat.css` com tokens; prints antes/depois: Eclipse idêntico, Véu Astral 0,01% (fundo animado), PC e celular
- 23/11 · 3.2 Evoluir · PR #136 mergeado · TabEvoluir: 66 style={{…}} → 1 (largura da barra de XP); estilos em `src/styles/evoluir.css` com tokens; prints antes/depois (PC Véu Astral e Eclipse, celular, com talentos, subclasse e PV manual abertos): idênticos
- 23/11 · 3.3 Ficha · PR #137 mergeado · TabFicha: 62 style={{…}} → 3 (cor de cada atributo e cor ajustada para leitura); estilos em `src/styles/ficha.css`; prints em 4 temas (Véu Astral, Eclipse, Ouro Velho, Guilda Rubra) e celular: idênticos. Achado B-009: temas que reconheciam peças pelo estilo inline — corrigido (inclui o ponto da Concentração da 3.1 no Ouro Velho)
- 23/11 · 3.4a aba Inventário · PR #138 mergeado · TabInventario: 61 style={{…}} → 13 (cor da carga, da raridade e das moedas, e os brilhos que dependem delas); estilos em `src/styles/inventario.css`; o ponto da sintonia entrou na regra do Ouro Velho que apaga brilhos; prints em 4 temas (Mochila e Equipado, com itens raros, lendário, homebrew, cargas e sintonia) e celular: idênticos
- 23/11 · 3.4b editor de item (Forja) · PR #139 mergeado · ItemEditorModal: 39 style={{…}} → 0 (e os 30 rótulos com `style={label}` viraram classe); estilos em `src/styles/item-editor.css`; as caixas de marcar ganharam `aria-pressed`; prints da Forja com arma, armadura e item mágico em 4 temas e celular: idênticos
- 23/11 · 3.5 Sala da campanha · PR #140 mergeado · CampaignRoom: 57 style={{…}} → 4 (barra de PV e cor de cada atributo); estilos em `src/styles/campaign-room.css`; os botões de escolha (Nota/NPC/Missão) ganharam `aria-pressed`; prints de mestre e jogador em 4 temas e celular: idênticos, fora o botão corrigido. Achado B-010: "Salvar" do Discord da mesa espremido (24 px) — corrigido, com teste
- 23/11 · 3.6a Magias · PR #141 mergeado · TabMagias: 29 style={{…}} → 4 e SpellLibrary: 17 → 5 (cor de cada etiqueta, a arte de fundo da magia); estilos em `src/styles/magias.css` e `src/styles/spell-library.css`; os losangos dos espaços entraram na regra do Ouro Velho que apaga brilhos; prints em 4 temas, celular e na biblioteca (fechada e com uma magia aberta): idênticos. B-003 corrigido na aba Magias (lint: 4 avisos → 1, o do Retrato)
- 23/11 · 3.6b Jogar, Descanso, Retrato e Diário · PR #142 mergeado · TabMesa: 22 style={{…}} → 8 (cor da vida, barra de PV, cor de cada atributo e botão, arte das magias, ataques que vão para outro componente) e TabDescanso: 13 → 0; estilos em `src/styles/jogar.css` e `src/styles/descanso.css`; Retrato e Diário já só tinham valores dinâmicos; prints da aba Jogar nos 8 temas (também com o herói caindo) e do Descanso em 5 temas, PC e celular: idênticos. B-003 fechado; lint passa a aceitar 0 avisos
- 23/11 · 3.7a Heróis · PR #143 mergeado · CharacterSelect: 28 style={{…}} → 5 (arte, rosto e cor de cada herói) e CharacterEditModal: 27 → 1 (rosto); estilos em `src/styles/heroes.css` e `src/styles/hero-edit.css`; botões de nível e atributo ganharam nome para o leitor de tela e as perícias `aria-pressed`; prints de Seus Heróis em 7 temas e celular, e da janela Editar herói em 5 temas: idênticos. Achados: tokens não seguiam a paleta local do Eclipse (corrigido em `tokens.css`, conferido na criação e na ficha) e B-011 (formato do card do herói definido por 4 temas nunca valeu; aberto para o André decidir)
- 23/11 · 3.7b Entrar e Criação; B-008 em 3 janelas · PR #144 mergeado · Login: 22 style={{…}} → 0 e Criação: 8 → 0 (só ficam cores e artes de cada opção); estilos em `src/styles/login.css` e `src/styles/creator.css`; abas Entrar/Cadastrar com `aria-pressed`; prints de Entrar nos 8 temas (as duas abas) e da criação em 3 temas e celular: idênticos. Onboarding, Tutorial guiado e Dons no celular prendem o foco, fecham com Esc e devolvem o foco (B-008, 3 de 5 janelas), com teste novo. Home e Configurações já só tinham valores dinâmicos
- 23/11 · 3.8a Mesa: janelas com foco e Esc · PR #145 mergeado · Cena e Bastidores do mestre prendem o foco e devolvem ao fechar; conjurar, "acertou?" e golpe final fecham com Esc (`useEscClose`, sem mudar o clique fora). B-008 fechado; teste `e2e/foco-janelas.e2e.ts` com 6 casos, todos reprovam sem a correção
- 23/11 · 3.8b Mesas e dados · PR #146 mergeado · Campaigns: 18 style={{…}} → 0; DiceRoller, RollTimeline e RollAdvisor: 44 → 0; estilos em `src/styles/campaigns.css` e `src/styles/dice.css`; botões de dado com `aria-pressed` e − / + com nome; prints de Mesas nos 8 temas e celular, e das abas Dados e Jogar (histórico com crítico e falha, "O que eu rolo?" preenchido) em 4 temas e celular: idênticos. Mesa ao vivo, palco, console e bestiário já só tinham valores dinâmicos (posição, tamanho, cor de cada peça)
- 23/11 · 3.9 globals.css e CSS sem uso · PR #147 mergeado · 39 classes sem uso em nenhum lugar do código saíram de 19 arquivos de CSS (453 linhas), com um analisador de seletores: dentro de `:is`/`:where` sai só o item, dentro de `:not` também, e a especificidade de cada lista ficou a mesma; `globals.css` 9.011 → 1.181 linhas, o resto em 7 arquivos de `src/styles/global/` importados na mesma ordem pelo `main.tsx` (CSS final idêntico byte a byte ao do arquivo único); CSS inicial 243 → 239 KB
- 23/11 · 4.1 pacote de entrada · PR #148 mergeado · entrada do app 730 → 248 KB (meta < 300), JS inicial 1116 → 633 KB, gzip 401 → 243 KB. As ações da ficha com regras (combate, inventário, magias, criação, importação) e o homebrew moram em `store/character/heavy`, carregado pelas rotas antes de abrir e pré-carregado no tempo ocioso pela tela inicial; a migração de fichas antigas acontece na leitura do armazenamento (o `migrate` do zustand 4.5 não espera promessa); ícones: só os 9 da tela inicial vão na entrada. `npm run budget` ganhou limite próprio para a entrada (300 KB)
- 23/11 · 4.2 imagens · PR em revisão · as cartas de magia (476) e de item (341) aparecem com no máximo 180 px de largura, mas iam no tamanho original: agora `src/assets` guarda 560×700 (cobre tela 3×) e o original fica em `arte-original/`, fora do site; `npm run art -- magias|itens` gera a versão do app com o canvas do Chromium do Playwright (sem dependência nova). Magias 195 → 35 MB (410 → 74 KB por carta), itens 30,5 → 12,5 MB; site publicado 114 MB; prints lado a lado no tamanho real em tela 2×: iguais. A tela inicial não carrega imagem nenhuma (medido). Achado B-012: duas artes de item vazias (imagem quebrada) — corrigido, com teste que reprova imagem vazia, não-WebP ou carta acima de 560 px
