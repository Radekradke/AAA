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
- [ ] 3.2 Evoluir
- [ ] 3.3 Ficha
- [ ] 3.4 Inventário + editor de item
- [ ] 3.5 Sala da campanha
- [ ] 3.6 Jogar, Magias, Descanso, Diário, Retrato
- [ ] 3.7 Criação, Home, Heróis, Configurações
- [ ] 3.8 Mesa ao vivo, palco, console do mestre
- [ ] 3.9 Quebrar o `globals.css` e apagar CSS sem uso

## Etapa 4 — Desempenho
- [ ] 4.1 Dividir o pacote de entrada (< 300 KB)
- [ ] 4.2 Imagens
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
