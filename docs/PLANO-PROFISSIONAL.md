# Plano profissional da Ficha Viva

Diagnóstico medido em 22/11/2026 no código atual (`claude/bold-sagan-qlckqm`) e plano para chegar a um produto organizado, visualmente consistente e entregável sem falhas. Cada etapa é dividida em pacotes pequenos (um PR cada), com critério de pronto verificável.

## 1. Diagnóstico

### O que já está sólido
| Área | Situação |
|---|---|
| Tipos | `tsc` sem erros, zero `any` no código de produção |
| Testes | 130 arquivos, 1012 testes de unidade passando; 187 testes de ponta a ponta no navegador (PC e celular) |
| Regras | Motor separado da interface (`src/engine`), 12 classes auditadas do 1 ao 20 |
| Entrega | CI no GitHub (tipos, testes, build, Playwright) e preview na Vercel em cada PR |

### Onde está a dívida
| Problema | Medida | Por que importa |
|---|---|---|
| Estilo espalhado no código | **858** `style={{…}}` em componentes; as abas Combate, Evoluir, Ficha e Inventário têm 60–70 cada | O visual muda de tela para tela e cada ajuste tem que ser feito em vários lugares |
| Cores fora do tema | **126** cores fixas (`#RRGGBB`) em componentes | Quebram os 8 temas e o modo claro/escuro |
| Escala tipográfica | **32** tamanhos de fonte diferentes | Hierarquia visual confusa |
| Cantos | **25** raios de borda diferentes | Componentes parecidos com formas diferentes |
| CSS concentrado | `globals.css` com **9.009 linhas**; 22 mil no total | Difícil saber o que é usado, fácil quebrar outra tela |
| Componentes duplicados | Só 12 usos do `<Button>`; 330+ botões com classes soltas; **15** janelas feitas à mão fora do `<Modal>` | Foco, Esc, rolagem e acessibilidade diferentes em cada janela |
| Sem lint | Nenhum ESLint no projeto | Erros de hooks, acessibilidade e código morto não são pegos |
| Peso inicial | Pacote de entrada com **732 KB** (sem compressão) | Primeira abertura lenta no celular |
| Dependências | 2 alertas moderados (`react-router`) | Correção simples disponível |

## 2. Como vamos trabalhar

- **Um pacote = um PR pequeno**, com testes e prints antes/depois quando mudar visual.
- **Pronto** = CI verde (tipos, unidade, ponta a ponta, build) + conferido no PC (1366) e no celular (390) + nos temas claro e escuro.
- **Nada muda de comportamento** nas etapas de organização; bug encontrado vira item próprio no registro de bugs.
- Ordem: primeiro a rede de segurança, depois o sistema visual, depois migrar tela por tela.

## 3. Etapas

### Etapa 0 — Rede de segurança
| # | Pacote | Pronto quando |
|---|---|---|
| 0.1 | ESLint (TypeScript, regras de hooks, acessibilidade de JSX) no CI, começando só com erros reais | CI falha com hook errado ou botão sem rótulo |
| 0.2 | `npm audit fix` (react-router) | Zero alertas de produção |
| 0.3 | Orçamento de tamanho do pacote no CI | PR que aumentar o pacote inicial acima do limite falha |
| 0.4 | Teste de fumaça: abrir cada uma das 16 páginas sem erro no console (PC e celular) | Erro de console em qualquer página derruba o CI |
| 0.5 | Registro de bugs (`docs/BUGS.md`) com prioridade e passo a passo | Lista viva e usada pelas etapas seguintes |

### Etapa 1 — Caça a bugs por área
Roteiro guiado por área, com o app real, registrando tudo em `docs/BUGS.md`. Cada bug corrigido ganha um teste.

| # | Área |
|---|---|
| 1.1 | Criação (todos os capítulos, conceitos, Trilha de níveis, Herói rápido) |
| 1.2 | Ficha: Jogar, Combate, Magias, Inventário |
| 1.3 | Ficha: Evoluir, Descanso, Diário, Retrato, Dados |
| 1.4 | Mesa ao vivo (mestre e jogador), palco, mapa, NPCs, bestiário |
| 1.5 | Conta, sincronização, offline, importação/exportação, impressão |

### Etapa 2 — Design system
| # | Pacote | Pronto quando |
|---|---|---|
| 2.1 | **Tokens**: cor (papéis, não valores), espaçamento (escala 4/8), tipografia (≈7 tamanhos), raio (≈4), sombra, movimento — nos 8 temas, claro e escuro | Um arquivo de tokens; contraste AA conferido |
| 2.2 | **Primitivos**: `Button` (variantes e tamanhos), `IconButton`, `Field`/`Input`/`Select`/`Textarea`, `Segmented`, `Chip`, `Card`/`Panel`, `Tabs`, `Badge` | Cada um com estados (hover, foco, ativo, desligado, carregando) e testes |
| 2.3 | **Camadas**: `Modal`, `Sheet` (celular), `Popover`, `Tooltip`, `Toast` — foco preso, Esc, rolagem e leitor de tela iguais | As 15 janelas manuais têm substituto |
| 2.4 | **Catálogo** em `/dev/ui` (só desenvolvimento): todos os primitivos em todos os temas | Dá para revisar o sistema numa tela |
| 2.5 | **Guarda**: lint que proíbe cor fixa e `style` novo fora de valores dinâmicos | Dívida para de crescer |

### Etapa 3 — Migração tela por tela
Cada tela: trocar estilos soltos e cores fixas pelos primitivos e tokens, mover CSS para o arquivo do domínio, prints antes/depois.

| # | Tela | Estilos soltos hoje |
|---|---|---|
| 3.1 | Combate | 70 |
| 3.2 | Evoluir | 66 |
| 3.3 | Ficha | 62 |
| 3.4 | Inventário + editor de item | 61 + 36 |
| 3.5 | Sala da campanha | 55 |
| 3.6 | Jogar, Magias, Descanso, Diário, Retrato | — |
| 3.7 | Criação, Home, Heróis, Configurações | — |
| 3.8 | Mesa ao vivo, palco, console do mestre | — |
| 3.9 | Quebrar o `globals.css` por domínio e apagar o CSS sem uso | `globals.css` abaixo de 1.500 linhas |

### Etapa 4 — Desempenho
| # | Pacote | Pronto quando |
|---|---|---|
| 4.1 | Dividir o pacote de entrada (rotas, ícones, dados grandes) | Entrada abaixo de 300 KB |
| 4.2 | Imagens: formatos e tamanhos por tela | Primeira tela carrega rápido em 4G |
| 4.3 | Medir Core Web Vitals no preview | LCP < 2,5 s no celular |

### Etapa 5 — Acessibilidade e responsividade
| # | Pacote |
|---|---|
| 5.1 | Teclado de ponta a ponta (ordem de foco, atalhos, janelas) |
| 5.2 | Leitor de tela nas telas principais |
| 5.3 | 12 tamanhos de tela × 8 temas: sem rolagem horizontal, alvos de toque ≥ 44 px |

### Etapa 6 — Entrega
| # | Pacote |
|---|---|
| 6.1 | Versão, changelog e notas da versão |
| 6.2 | Roteiro final de teste manual (TESTES-MANUAIS) rodado do começo ao fim |
| 6.3 | Checklist de produção: SQLs do Supabase, variáveis da Vercel, backup |

## 4. Ordem sugerida
Etapa 0 → 1 → 2 → 3 (em paralelo com a correção dos bugs da etapa 1) → 4 → 5 → 6. São cerca de 35 pacotes pequenos.
