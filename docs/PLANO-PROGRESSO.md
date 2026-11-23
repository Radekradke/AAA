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
- [ ] 1.2 Ficha: Jogar, Combate, Magias, Inventário
- [ ] 1.3 Ficha: Evoluir, Descanso, Diário, Retrato, Dados
- [ ] 1.4 Mesa ao vivo, palco, mapa, NPCs, bestiário
- [ ] 1.5 Conta, sincronização, offline, importação/exportação, impressão

## Etapa 2 — Design system
- [ ] 2.1 Tokens
- [ ] 2.2 Primitivos
- [ ] 2.3 Camadas (Modal, Sheet, Popover, Tooltip, Toast)
- [ ] 2.4 Catálogo `/dev/ui`
- [ ] 2.5 Guarda contra cor fixa e estilo solto

## Etapa 3 — Migração tela por tela
- [ ] 3.1 Combate
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
