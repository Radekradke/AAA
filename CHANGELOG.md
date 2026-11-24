# Changelog

Mudanças do Ficha Viva por versão. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versões em [SemVer](https://semver.org/lang/pt-BR/). As notas para jogadores, em linguagem simples, ficam em `docs/NOTAS-DA-VERSAO.md`.

## [Não lançado]

### Mudado
- **Temas em teste:** o app oferece 4 temas, Véu Astral, Corte Carmesim, Eclipse e Guilda Rubra.
  - **Escondidos:** Noite Arcana, Forja Dourada, Bosque Élfico e Ouro Velho continuam no código, mas não aparecem no seletor, no alternador nem na impressão. O CSS deles não é baixado.
  - **Quem estava num deles:** abre no Véu Astral, sem perder nada.
  - **Para trazer um de volta:** ponha o id em `THEME_ORDER` (`src/data/themes.ts`) e em `VISIVEIS` (`index.html`). Um teste confere que as duas listas batem.

### Removido
- **Vídeos de fundo:** o menu, a tela Entrar, o retorno do login, a Forja e as raças/classes não tocam mais vídeo. Saíram 8 vídeos, cerca de 12,5 MB que iam junto em todo deploy.
  - `public/assets/bg.mp4`
  - `public/assets/bruxo-bg.mp4`
  - `public/assets/irmas/`, os vídeos e as capas
  - `src/assets/racas/`, os vídeos e as capas do antigo Palco das origens
- **Código e configuração ligados aos vídeos:**
  - o player de vídeo do fundo;
  - a opção "Vídeos de fundo" em Configurações e a preferência `bgVideo`;
  - o campo `video` de raças e classes;
  - o CSS do menu "ao lado do vídeo".
- **O que continua:** o fundo de cada tema, com gradiente, runas, partículas e estrelas.

## [1.1.0] — 2026-11-24

Rodada profissional: segurança, caça a bugs, design system, desempenho e acessibilidade (`docs/PLANO-PROFISSIONAL.md`). Nenhuma mudança quebra fichas salvas: as antigas são migradas sozinhas na leitura.

### Adicionado
- **Rede de segurança no CI:**
  - ESLint (TypeScript, hooks, acessibilidade) com 0 avisos.
  - Orçamento de tamanho do pacote (`npm run budget`): entrada < 300 KB.
  - Teste de fumaça das 16 páginas.
  - Guarda contra estilo solto e cor fixa (`npm run debt`): por arquivo, só podem diminuir.
- **Design system:**
  - Tokens de cor, espaço, texto, cantos, movimento e camadas (`src/styles/tokens.css`, `docs/DESIGN-TOKENS.md`).
  - Primitivos: Button, IconButton, Field, Segmented, Chip, Badge e Tabs.
  - Camadas: Modal, Sheet, Popover, Tooltip e Toast.
  - Catálogo `/dev/ui`, só em desenvolvimento.
- **Medições e ferramentas:**
  - `npm run vitals`: LCP, FCP e CLS das telas principais num celular médio (`docs/DESEMPENHO.md`).
  - `npm run art`: gera a arte de magias e itens no tamanho do app, a partir dos originais em `arte-original/`.
- **Testes de ponta a ponta novos:**
  - foco visível no Tab nos 8 temas;
  - leitor de tela;
  - tamanhos de tela (320 px nos 8 temas e alvos de toque ≥ 24 px);
  - janelas que prendem o foco.
- **Versão no menu:** mostra a versão de lançamento (esta, 1.1.0), além da data do build e do commit.

### Mudado
- **Pacote de entrada:** 730 → 248 KB.
  - As regras do jogo (combate, magias, inventário, criação, importação) e os ícones completos carregam sob demanda, e são pré-carregados enquanto a pessoa está na tela inicial.
  - JS inicial: 1.116 → 633 KB. Comprimido: 401 → 243 KB.
- **Imagens:** as cartas de magia e de item vão no tamanho que aparecem (560×700).
  - Magias: 195 → 35 MB.
  - Itens: 30,5 → 12,5 MB.
- **Tela inicial no celular:** LCP de 2,76 → 2,22 s.
  - O tema e a fonte do título baixam junto com o JS.
  - A primeira tela não começa mais invisível.
- **Estilos:**
  - As telas trocaram `style={{…}}` por CSS com tokens: 857 → 322.
  - `globals.css`: 9.011 → 1.181 linhas, dividido em 7 arquivos; 39 classes sem uso saíram.
  - Prints antes e depois idênticos.
- **Leitor de tela:**
  - Toda tela tem `main`. A ficha tem `h1` (nome do herói) e seções em `h2`/`h3`.
  - Botões curtos ganharam nome completo ("Sofrer 5 de dano", "Teste de Força -1", "+1 ACERTO com Bordão").
  - O PV é anunciado quando muda, e as dicas descrevem o botão que embrulham.
- **Teclado:**
  - Toda parada do Tab mostra o foco, nos 8 temas.
  - A gaveta "Mais" da ficha no celular anda nas setas e devolve o foco.
  - As dicas não são mais uma parada extra: a aba Jogar foi de 120 para 108 paradas.
- **Toque:** peças menores que 24 px ganham área invisível no celular, sem mudar o desenho.

### Corrigido
- **B-001:** a ficha do Patrulheiro cobrava o idioma do inimigo favorito.
- **B-003:** memorizações das abas Magias e Retrato ignoravam parte da ficha.
- **B-004:** as opções de Especialização do Ladino estavam sem nome de grupo.
- **B-005:** sem internet, um pedaço do app que não tinha baixado fazia a página sumir.
- **B-006:** contraste de 2,96:1 no Corte Carmesim escuro.
- **B-007:** no mapa, Esc e depois F não voltava para a tela cheia.
- **B-008:** janelas feitas à mão não prendiam o foco nem fechavam com Esc.
- **B-009:** temas que reconheciam peças pelo estilo inline deixaram de achá-las.
- **B-010:** o "Salvar" do Discord da mesa ficava espremido.
- **B-012:** duas artes de item vazias apareciam quebradas.
- **Dependências:** `npm audit fix` (react-router).

### Conhecido
- **B-013:** na primeira visita em 4G lenta, a ficha e Seus heróis levam ~6 s; com o app já aberto antes, 1,0–1,4 s.
- **B-011:** o formato do card do herói definido por 4 temas nunca valeu (decisão de design pendente).
- **B-002:** alertas de segurança só nas ferramentas de desenvolvimento (vitest/vite).

## [1.0.0]

Versão de partida: o que o app já tinha antes da rodada profissional.
- ficha de D&D 5e (2014);
- criação guiada;
- mesa ao vivo com o mestre;
- sincronização na nuvem e uso offline;
- 8 temas.
