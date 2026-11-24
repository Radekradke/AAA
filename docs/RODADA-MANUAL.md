# Rodada do roteiro manual — versão 1.1.0

Etapa 6.2: as 91 seções de `docs/TESTES-MANUAIS.md` conferidas de ponta a ponta em 24/11/2026, no build de produção (`vite preview`) e no servidor de testes.

Cada seção diz como foi conferida:

- **Robô** — a seção foi feita no navegador do jeito que está escrita (clicar, preencher, conferir o número). Fica em `e2e/roteiro-manual.e2e.ts` e roda no CI a cada mudança.
- **e2e** — já existe um teste de ponta a ponta que faz o que a seção pede (arquivo indicado). Todos passaram na rodada completa (262 testes).
- **Regra** — a seção confere uma conta do motor (PV, CA, bônus, dados). As contas são testadas nos testes de unidade (1078) e na varredura da 1.1 (1.440 heróis: 12 classes × 20 níveis × 6 sementes). Na tela, aparecem nas dicas já cobertas pelo robô.
- **Pessoa** — depende de ouvir ou de julgar o visual (som, brilho). Fica para uma pessoa, na lista do fim.
- **—** — a seção descreve algo que saiu do app (os vídeos de fundo).

Resultado: **nenhuma falha**. O robô fez 40 conferências nas seções 1–5, 11–14, 17–20 e 24, sem nenhum erro no console. Repetido 4 vezes: 12/12.

## Seções

| § | Seção | Como | Resultado |
|---|---|---|---|
| 1 | Personagem nível 1 | Robô | PV 13 = 10 (d10) + CON 3 ✓ |
| 2 | Subir para o nível 2 | Robô | PV 13 → 22 (+6 média + CON) ✓, Surto de Ação ✓ |
| 3 | Nível 3 — subclasse obrigatória | Robô | confirmar bloqueado + aviso ✓; Campeão libera ✓ |
| 4 | Nível 4 — ASI ou talento | Robô | seção de ASI aparece ✓ |
| 5 | CON altera PV retroativamente | Robô | +2 CON: mod 3 → 4, PV 31 → 44 (+6 +4 +1×3) ✓ |
| 6 | Talento com efeito mecânico | Regra | `rules.test.ts`, `tableRules.test.ts` ✓ |
| 7 | Deslocamento rastreável | Regra | sub-raça e origem do deslocamento nos testes do motor ✓ |
| 8 | Item mágico +1 | Regra + e2e | `talentos-armas`, `inventario` ✓ |
| 9 | Armadura e CA | Regra | CA com limite de DES nos testes do motor ✓ |
| 10 | Conjurador | Regra + e2e | CD/ataque mágico; `magias`, `mago` ✓ |
| 11 | Descansos | Robô + e2e | com 0 PV, longo bloqueado ✓; longo cura tudo ✓; `descanso` ✓ |
| 12 | Modo Mesa | Robô | os 14 itens da aba Jogar presentes ✓ |
| 13 | Teste contra a morte | Robô + e2e | 0 PV → CAINDO ✓; curou, some ✓; `critico` ✓ |
| 14 | Condições | Robô | Envenenado ativa ✓; descanso longo limpa ✓ |
| 15 | Migração de personagens antigos | Regra | `ensureCharacterV2` (7 testes); fichas v3 do teste migram na leitura ✓ |
| 16 | Homebrew | e2e | `homebrew-conteudo`, `forja` ✓ |
| 17 | Modais (desktop e mobile) | Robô + e2e | perícias e moedas dentro da tela, Esc fecha ✓; `modais` ✓ |
| 18 | Modal de moedas | Robô | 5 tipos ✓, total em po ✓ |
| 19 | Perícias + expertise | Robô + e2e | 18 perícias ✓; `ladino` (expertise) ✓ |
| 20 | Ferramentas | Robô | Ferramentas de Ladrão ✓; Expertise +5 → +7 ✓; adicionar e remover ✓ |
| 21 | Antecedente completo | Regra | antecedentes nos testes do motor (5 arquivos) ✓ |
| 22 | Arma +1/+2/+3 e Meio-Elfo | Regra + e2e | `forja`, `talentos-armas` ✓ |
| 23 | Talentos com pré-requisito | Regra | `rules.test.ts` ✓ |
| 24 | Mesa: atributos, condições e turno | Robô | Ação marca, Novo turno libera ✓ |
| 25 | Console do mestre | e2e | `mesa` (console, mapa em tela cheia), `foco-janelas` ✓ |
| 26 | Agenda da campanha | e2e | `agenda` ✓ |
| 27 | Bestiário da mesa | e2e | `bestiario` ✓ |
| 28 | Criar com o ChatGPT | e2e | `colar-ficha` ✓ |
| 29 | Aba Retrato | e2e | `retrato` ✓ |
| 30 | Forja: vestível e parte do corpo | e2e | `forja` ✓ |
| 31 | Carta: moldura, feitos e cicatrizes | e2e | `carta`, `feitos` ✓ |
| 32 | Crítico cinematográfico | e2e | `critico` ✓ |
| 33 | Companheiros e montarias | e2e | `aliados` ✓ |
| 34 | Forja: magia concedida | e2e | `forja` ✓ |
| 35 | Carta: raridade, títulos, relíquias | e2e | `carta`, `feitos` ✓ |
| 36 | Retrato → Suas cartas | e2e | `carta` ✓ |
| 37 | Bestiário de caçadas | e2e | `cacadas` ✓ |
| 38 | Dados conquistados | e2e | `dados` ✓ |
| 39 | Morte para a mesa toda | e2e + Pessoa | `critico`, `dados` ✓; o ritmo do som do coração fica para pessoa |
| 40 | Ícones e sons | Pessoa | ícones aparecem em todas as telas (prints); sons ficam para pessoa |
| 41 | Celular e app instalado | e2e | `celular`, `offline` ✓ |
| 42 | Responsividade | e2e | `responsividade`, `tamanhos` (12 tamanhos × 8 temas, 5.3) ✓ |
| 43 | Inventário: anéis, amuletos, capas | e2e | `inventario` ✓ |
| 44 | Manto do Arquimago, Cinto Anão, Pedras Ioun | Regra | itens nos testes do motor ✓ |
| 45 | Arte dos itens na busca | e2e | `busca` ✓ |
| 46 | Brilho das cartas só no hover | Pessoa | visual |
| 47 | Magias, kits e equipamento × livros | Regra | testes dos dados do catálogo ✓ |
| 48 | Escolhas do 1º nível na criação | e2e | `criacao`, `escolhas-balao` ✓ |
| 49 | Etapa "Magias" na criação | e2e | `criacao` ✓ |
| 50 | Capítulo "Dons" | e2e | `escolhas-balao`, `foco-janelas` ✓ |
| 51 | Dica de item e miniaturas na busca | e2e | `busca` ✓ |
| 52 | Dons explicados (Origem, Caminho) | e2e | `criacao-conceito`, `origem-sub-racas` ✓ |
| 53 | Auditoria da criação | e2e | `criacao` + varredura 1.1 (48/48 criações guiadas) ✓ |
| 54 | Auditoria das abas da ficha | e2e | `ficha` + testes "macaco" da 1.2/1.3 (~2.300 cliques) ✓ |
| 55 | Diário — Rabiscos, Crônica, Anotar | e2e | `diario`, `cronica` ✓ |
| 56 | Diário — Quadro da Guilda | e2e | `diario` ✓ |
| 57 | Diário — Pistas | e2e | `diario` ✓ |
| 58 | Diário — Pessoas e busca | e2e | `diario` ✓ |
| 59 | Diário privado e leve | e2e | `diario` ✓ |
| 60 | Regra oficial × regra da mesa | Regra + e2e | `tableRules.test.ts`; aba Evoluir no robô ✓ |
| 61 | Pacotes abrem sozinhos | e2e | `inventario` ✓ |
| 62 | Descrições e etiquetas de itens | Regra | testes do catálogo ✓ |
| 63 | Mesa ao vivo | e2e | `mesa` ✓ |
| 64 | Munição | e2e | `municao` ✓ |
| 65 | Versão do app no menu | e2e | `versao`; agora mostra "Versão 1.1.0" (6.1) ✓ |
| 66 | Miniatura das magias | e2e | `busca`, `carta` ✓ |
| 67 | Contador de artes | e2e | `contador-artes` ✓ |
| 68 | Selo da raça e arte da magia | e2e + Pessoa | presença ✓; acabamento visual fica para pessoa |
| 69 | Aprender / preparar magias | e2e | `aprender-magias`, `lista-magias` ✓ |
| 70 | Sub-raças explicadas | e2e | `origem-sub-racas` ✓ |
| 71 | Bruxo: invocações e Arcano Místico | e2e | `invocacoes`, `bruxo` ✓ |
| 72 | Bárbaro 1–20 | e2e | `barbaro` ✓ |
| 73 | Guerreiro 1–20 | e2e + Robô | `guerreiro`; §1–5 pelo robô ✓ |
| 74 | Menu: irmãs magas no fundo | — | removido (o app não tem mais vídeos de fundo) |
| 75 | Ladino 1–20 | e2e | `ladino` ✓ |
| 76 | Vídeos de fundo e Palco | — | removido |
| 77 | Monge 1–20 | e2e | `monge-paladino` ✓ |
| 78 | Paladino 1–20 | e2e | `monge-paladino` ✓ |
| 79 | Bruxo 1–20 | e2e | `bruxo` ✓ |
| 80 | Talentos de arma, versátil, segunda mão | e2e | `talentos-armas` ✓ |
| 81 | Clérigo e Bardo 1–20 | e2e | `clerigo-bardo` ✓ |
| 82 | Patrulheiro 1–20 | e2e | `patrulheiro` ✓ |
| 83 | Feiticeiro 1–20 | e2e | `feiticeiro` ✓ |
| 84 | Mago 1–20 | e2e | `mago` ✓ |
| 85 | Druida 1–20 | e2e | `druida` ✓ |
| 86 | Magias e talentos homebrew | e2e | `homebrew-conteudo` ✓ |
| 87 | Atalhos de teclado | e2e | `atalhos` ✓ |
| 88 | Discord | e2e | `discord` ✓ |
| 89 | Importar do D&D Beyond | e2e | `dndbeyond` ✓ |
| 90 | Criar já em nível alto | e2e | `nivel-alto` ✓ |
| 91 | Herói rápido | e2e + Robô | `heroi-rapido`; o robô cria heróis por ele ✓ |

## Para uma pessoa conferir (3 itens, ~5 minutos)

Com os efeitos sonoros ligados, num celular ou PC:

1. **§39/§40 Sons:** o coração do teste contra a morte acelera a cada falha. Os sons das rolagens tocam.
2. **§46 Brilho:** o brilho das cartas aparece só com o mouse por cima.
3. **§68 Acabamento:** selo da raça no card e arte da magia no modal.

## O que depende do Supabase de produção

As seções 25–27, 55–59 e 63 usam a nuvem. Nos testes, ela é simulada (mesmos pedidos e respostas). Antes de publicar, os SQLs de `supabase/` precisam estar aplicados no projeto real. Isso entra no checklist de produção (6.3).
