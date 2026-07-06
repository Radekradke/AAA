# Como a Ficha Viva funciona (guia simplificado)

Este documento explica o projeto **em linguagem simples** — o suficiente para
você abrir qualquer arquivo e saber "o que é isso e por que existe". Não
precisa ser programador para entender a ideia geral.

---

## 1. A ideia em uma frase

> A ficha do personagem é um **grande objeto de dados** (tipo uma ficha de
> papel digitalizada). Tudo que aparece na tela — CA, PV, ataques, magias — é
> **calculado na hora** a partir desses dados, com a origem de cada número
> rastreável ("ver cálculo").

Isso significa: você nunca guarda "CA = 16". Você guarda "usando cota de malha"
e o app **calcula** 16 toda vez, somando armadura + destreza + escudo + etc.
Se algo muda (novo item, subiu de nível), o número se recalcula sozinho.

---

## 2. As três camadas (o mais importante)

Pense no projeto como um restaurante:

| Camada | Pasta | O que é | Analogia |
|--------|-------|---------|----------|
| **Dados** | `src/data/` | O "livro de regras": classes, raças, magias, armas… | A despensa (ingredientes) |
| **Motor** | `src/engine/` | As regras que calculam os números | A cozinha (as receitas) |
| **Tela** | `src/components/`, `src/pages/` | O que o usuário vê e toca | O salão (o prato servido) |

A regra de ouro: **os dados não sabem calcular, e o motor não sabe desenhar.**
Cada um faz só a sua parte. Por isso é fácil adicionar uma magia nova (só mexe
na despensa) sem quebrar o resto.

---

## 3. Passeio pelas pastas

```
src/
├── types/        → "contratos": a forma dos dados (o que é um Personagem, uma Magia…)
├── data/         → o LIVRO DE REGRAS (classes, raças, antecedentes, magias, itens…)
├── engine/       → o MOTOR: transforma os dados brutos em números prontos
├── store/        → a MEMÓRIA do app (personagens, login, tema) — via Zustand
├── services/     → a NUVEM (Supabase): login, salvar online, salas de mestre
├── hooks/        → "ganchos" React (ex.: sincronizar quando reconecta)
├── lib/          → utilidades soltas (cores, armazenamento local, sons, apoio)
├── components/   → as PEÇAS da tela (abas da ficha, modais, botões…)
└── pages/        → as TELAS inteiras (início, login, ficha, mesas…)
```

### O coração do motor: `engine/dndRules.ts`
A função **`deriveCharacter(personagem)`** é o cérebro. Ela recebe a ficha crua
e devolve **tudo calculado**: modificadores, CA, PV máximo, iniciativa,
deslocamento, perícias, ataques, CD de magia, passivas, etc. Quase toda tela
chama essa função para saber o que mostrar.

Cada número vem com um **"breakdown"** (decomposição) — a lista de onde ele
saiu. É isso que alimenta os tooltips de "ver cálculo".

### Os dados (`data/`)
Cada arquivo é uma parte do livro:
- `classes.ts`, `races.ts`, `backgrounds.ts`, `subclasses.ts` — quem o
  personagem é.
- `classFeatures.ts` — o que cada classe ganha por nível (1→20).
- `spells.ts` — o banco de magias (dano, área, save, condições…).
- `feats.ts`, `weapons.ts`, `armors.ts`, `items.ts`, `tools.ts` — o resto.
- `themes.ts` — os climas visuais (frio, brasa, verdejante).

---

## 4. Como o app guarda as coisas (offline-first)

**Offline-first** = funciona sem internet; a "verdade" fica no seu aparelho.

- As fichas são salvas no **IndexedDB** (um banco de dados dentro do navegador)
  via `lib/storage/`. Isso acontece sozinho, com um pequeno atraso de ~1s
  depois de cada edição (autosave). É o indicador "Salvando… / Salvo".
- Se você **fizer login na nuvem** (Supabase), o app também **sincroniza**:
  compara a versão local com a da nuvem e decide empurrar, puxar ou avisar de
  conflito (`services/offlineSyncService.ts`).

Sem login, tudo continua funcionando — só não sincroniza entre aparelhos.

---

## 5. A memória do app: as "stores" (`store/`)

Usamos **Zustand** (uma caixinha de memória global). As principais:
- `characterStore` — a lista de personagens e **todas as ações** (dar dano,
  curar, equipar, subir de nível, preparar magia…).
- `authStore` — quem está logado.
- `uiStore` — tema atual, som, histórico de rolagens, o dado em destaque.
- `saveStatusStore` — o status "Salvando/Salvo/Sincronizando".

Quando uma ação muda a memória, o React redesenha só o que precisa.

---

## 6. A tela: páginas e abas

- `pages/` são as telas com endereço (rota): `/` (início), `/entrar` (login),
  `/ficha/:id` (a ficha), `/mesas` e `/mesa/:id` (modo mestre), `/diagnostico`.
- A ficha (`pages/CharacterSheet.tsx`) é dividida em **abas**, em
  `components/sheet/`:
  - **Mesa** — o painel de jogo (rolar perícias, salvaguardas, recursos).
  - **Ficha** — atributos, proficiências, idiomas, sentidos passivos.
  - **Combate** — PV, ataques, economia de turno, concentração, exaustão.
  - **Inventário** — mochila, equipar, forjar itens, carga.
  - **Magias** — espaços, grimório, aprender magias, magias de itens.
  - **Evoluir** — subir de nível. **Descanso**, **Diário**, **Dados**.

Todas essas abas recebem `char` (a ficha) e `derived` (o resultado do
`deriveCharacter`) e só **desenham** — o cálculo já veio pronto.

---

## 7. A nuvem (`services/`) — opcional

- `supabaseClient.ts` — liga no Supabase (só a chave pública fica no app).
- `authService.ts` — login por e-mail e Google.
- `characterSheetService.ts` — salvar/ler fichas na nuvem.
- `campaignService.ts` — modo mestre: criar sala, convite por link, ver as
  fichas dos jogadores ao vivo.

A segurança de "cada um só vê o que é seu" é feita pelo **banco** (regras de
RLS no Supabase — ver `docs/SUPABASE.md`), não pelo app. Isso é o certo: mesmo
que alguém burle o app, o banco não deixa acessar dados dos outros.

---

## 8. O que acontece quando você abre uma ficha (o fluxo)

1. Você clica num herói → vai para `/ficha/:id`.
2. O app pega a ficha crua da memória (`characterStore`).
3. Chama `deriveCharacter(ficha)` → recebe todos os números prontos.
4. Cada aba desenha sua parte usando `char` + `derived`.
5. Você aperta "−5 Dano" → chama uma ação do `characterStore` → a memória muda
   → a tela se redesenha → o autosave grava no IndexedDB ~1s depois → se logado,
   sincroniza na nuvem.

É sempre esse ciclo: **ação → muda memória → recalcula → redesenha → salva.**

---

## 9. Onde mexer para tarefas comuns

| Quero… | Vou em… |
|--------|---------|
| Adicionar uma magia | `data/spells.ts` |
| Adicionar/arrumar uma característica de classe | `data/classFeatures.ts` |
| Mudar um cálculo (CA, PV, ataque…) | `engine/dndRules.ts` |
| Criar um tema novo | `data/themes.ts` + `styles/globals.css` |
| Mudar uma tela da ficha | `components/sheet/Tab*.tsx` |
| Ajustar login/nuvem | `services/` + `docs/SUPABASE.md` |
| Trocar os links de doação | `lib/support.ts` |

---

## 10. Ferramentas usadas (o "stack")

- **React** — monta a tela em pedacinhos (componentes).
- **TypeScript** — JavaScript com "contratos" que evitam erros bobos.
- **Vite** — empacota e serve o app rápido.
- **Zustand** — a memória global (simples, sem burocracia).
- **Supabase** — o "backend pronto" (login + banco de dados) para a nuvem.
- **Framer Motion** — as animações de transição.
- **Vitest** — os testes automáticos (rodam com `npm test`).

Comandos úteis: `npm run dev` (rodar), `npm test` (testar),
`npm run build` (gerar a versão final), `npm run typecheck` (checar os tipos).

---

### Resumo de tudo em 3 frases
1. A ficha é um objeto de dados; o **motor calcula** todos os números a partir
   dela, com origem rastreável.
2. **Dados, motor e tela** são separados — fácil de expandir sem quebrar.
3. Funciona **offline** no aparelho; a **nuvem é opcional** e a segurança mora
   no banco.
