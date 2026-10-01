# Ficha Viva AAA ⚔️✦

Criador e **ficha viva jogável** de personagens de **D&D 5e**, em português, com
estética cinematográfica de **jogo AAA**. Mobile-first, mas grandioso no desktop:
partículas mágicas/brasas no fundo, brilho arcano nos cards, runas, luz
volumétrica e transições suaves entre telas.

> A identidade visual foi construída a partir da referência
> **`Ficha Viva AAA.dc.html`** (bundle do Claude Design): mesmas cores, tipografia
> (Cinzel / Chakra Petch / Inter), os dois climas — **Arcano Frio** e **Brasa
> Heróica** —, o sistema de partículas, os cards com inclinação 3D, o HUD em abas
> e o overlay cinematográfico de rolagem. O protótipo (que era estático e com
> dados fixos) foi **evoluído** para um produto real, interativo e persistente.

---

## ✨ O que foi criado

Um SPA completo em **React + TypeScript + Vite + TailwindCSS**, com **Zustand**
(persistido em `localStorage`) e **Framer Motion** + um **canvas de partículas**
próprio.

Fluxo completo:

1. **Tela inicial cinematográfica** (`Home`) — sigilo rúnico, título e botão com pulso mágico.
2. **Login / Cadastro / Convidado** (`Login`) — contas locais ou acesso imediato como convidado.
3. **Seleção de personagens** (`CharacterSelect`) — cards com CA/PV/Prof., criar, duplicar, excluir, importar.
4. **Criação interativa** (`CharacterCreator`) — 7 capítulos com herói iluminado, cards selecionáveis e resumo lateral:
   Identidade → Origem (raça/sublinhagem) → Caminho (classe) → Atributos → Perícias → Equipamento → Despertar.
5. **Ficha viva** (`CharacterSheet`) — HUD em 7 abas, jogável de verdade no PC e no celular.

A **ficha** inclui:

- Cabeçalho com avatar, raça, classe, nível, antecedente, **CA, Iniciativa, Deslocamento, Percepção Passiva e Proficiência** calculados.
- **Atributos** com modificadores automáticos e **testes/resistências** roláveis (1d20 + mod).
- **Perícias** com proficiência e bônus automáticos.
- **Combate**: PV com barra colorida (dano/cura/PV temp.), **ataques automáticos** das armas equipadas (acerto e dano), economia de turno (ação/bônus/reação/movimento), recursos de classe, dados de vida e resgate da morte.
- **Inventário estilo BG3**: três recipientes holográficos — **Equipado**, **Mochila** e **Baú** — com **arrastar e soltar** ([dnd-kit](https://dndkit.com), MIT; no celular: segurar e arrastar; teclado pela alça ⠿). Ao pegar um item, uma barra de destinos aparece perto do polegar. Cada item equipável mostra **o que muda antes de equipar** ("CA 18 → 20 ▲", "Dano 1d8+3 → 1d12+3 ▲") calculado pela mesma engine da ficha, com avisos de regra (Força mínima, Furtividade, duas mãos com escudo). Moedas, sintonia (máx. 3), favoritos e Forja continuam.
- **App instalável e offline** ([vite-plugin-pwa](https://vite-pwa-org.netlify.app), MIT): "Instalar app no aparelho" no menu ⋯ (no iPhone, passo a passo do Compartilhar → Tela de Início). A ficha abre e rola dados sem internet; novas versões pedem confirmação antes de atualizar.
- **Pontos de Inspiração** (Mesa): selo dourado holográfico com **+ / −** para ganhar/corrigir; tocar no selo **prepara a vantagem** no próximo teste d20 (ataque, perícia, resistência) e o ponto só é descontado quando o dado rola — cancelar ou trocar de ficha não gasta. A rolagem fica marcada "· Inspiração" no histórico.
- **Magias** (conjuradores): espaços de magia, CD/ataque de magia e magias preparadas.
- **Descanso** curto/longo e **condições**.
- **Diário** de sessões (título, data, resumo, NPCs, locais, missões, tesouros, anotações livres) com **busca** + anotações rápidas.
- **"O que eu rolo?"** (aba Mesa): descreva a ação em português ("escalar o muro", "ele está mentindo?") e a ficha sugere o teste, o bônus e de onde ele vem — com um toque para rolar. Sem IA, 100% offline.
- **Rolador de dados** (d4–d100, quantidade, modificador, vantagem/desvantagem) com **resultado em destaque cinematográfico** e crítico/falha.
- **Dados 3D com física** ([dice-box-threejs](https://github.com/3d-dice/dice-box-threejs), MIT): os dados rolam pela tela e caem **exatamente** no valor sorteado pela engine (notação `1d20@17`). Carregados sob demanda, com as cores de cada atmosfera; liga/desliga no menu ⋯ (desligado para quem prefere menos animação). d100 e aparelhos sem WebGL usam a animação 2D.
- **Linha do tempo da sessão**: as últimas 60 rolagens do aparelho, filtradas pela ficha aberta, com horário e críticos em destaque. Sobrevive a recarregar a página e vira anotação do **Diário** com um toque.
- **Evolução de nível** (aba Evoluir): PV, talentos, aumentos de atributo e subclasses, com validação.
- **Magias estilo BG3**: grimório, pergaminhos e itens que concedem magias com usos por descanso.
- **Nuvem opcional (Supabase)**: login, sincronização local ↔ nuvem com resolução de conflitos e **mesas de campanha** com convite. Sem Supabase configurado, tudo funciona localmente. Veja `docs/SUPABASE.md`.
- **Console do mestre** (`/mesa/:id/jogar`, para o mestre): **Bastidores | Palco | Inspetor**, com a **faixa de iniciativa** e a **barra de improviso** sempre à mão. Bastidores reúne Sessão, NPCs, Criaturas (bestiário), Encontro, Cenas, Pistas e Notas privadas; o Inspetor mostra o que foi tocado (no palco, na iniciativa ou nos bastidores) com as ações daquilo. Improviso em segundos: **NPC, criatura, pista, item para um herói, encontro e nota** (Alt+N/C/P/I/E/O). Dá para **preparar a sessão antes** (bandeja de atalhos) ou só começar e reagir — nada é obrigatório. Dano em criatura, ocultar/revelar e remover têm **Desfazer**. No celular, Bastidores e Inspetor viram gavetas. *A FichaViva não tenta controlar a história: dá ao mestre ferramentas para reagir a ela.*
- **8 temas, cada um uma identidade visual** — não só cor: layout, formas, tipografia e o dado mudam. Véu Astral (planetário: órbitas e cápsulas), Noite Arcana (observatório: instrumentos, régua e leituras em mono), Forja Dourada (oficina anã: chapas rebitadas e porcas sextavadas), Bosque Élfico (clareira: folhas, seixos e menu em galhos), Corte Carmesim (teatro barroco: fitas marcadoras e cartas de tarô), Ouro Velho, Eclipse e Guilda Rubra. **Todos têm paleta clara e escura** (Configurações → Aparência ou menu ⋯): o layout continua o mesmo e só as cores mudam; a escolha fica salva por tema.
- **Exportar/Importar** personagem em **JSON**.

A engine de regras (`/src/engine`) é simples, tipada e expansível, com suporte a homebrew.

---

## ▶️ Como rodar

Requisitos: **Node 18+** (testado em Node 22).

```bash
npm install        # instala dependências
npm run dev        # ambiente de desenvolvimento (http://localhost:5173)
npm run build      # build de produção em /dist
npm run preview    # serve o build localmente
npm run typecheck  # checagem de tipos sem emitir
npm test           # testes automatizados (engine de regras, sync, "O que eu rolo?")
```

Para entender o código por dentro, comece por `docs/COMO-FUNCIONA.md`.

---

## 🗂️ Estrutura principal

```
src/
  components/
    ui/          Button, Panel/SectionLabel
    layout/      AppShell, TopBar, Screen
    animations/  ParticleField, BackgroundScene, RuneRing
    character/   passos da criação (Identity, Race, Class, Abilities, Skills, Gear, Review) + CharacterEditModal
    sheet/       SheetHeader, SheetTabs, MobileNav, TabFicha/Combate/Inventario/Magias/Descanso/Diario
    dice/        DiceRoller, RollOverlay, useDiceRoller
    inventory/   AddItemPicker
    spells/      SpellPicker
    diary/       JournalCard
  pages/         Home, Login, CharacterSelect, CharacterCreator, CharacterSheet, LiveSession
  features/
    master/      console do mestre: MasterWorkspace, backstage/, inspector/, initiative/, quick/, masterStore
    live/        PlayerWorkspace (mesa do jogador) + LiveHeader
  data/          races, classes, backgrounds, skills, weapons, armors, items, spells, themes
  engine/        dndRules, modifiers, dice, combat, inventory, characterBuilder, loadout,
                 levelUp, spellcasting, rollAdvisor ("O que eu rolo?") + __tests__
  services/      Supabase: auth, sync offline, campanhas
  store/         characterStore (IndexedDB), authStore, uiStore (Zustand + persist)
  types/         character.ts, dnd.ts
  lib/           color, useTheme, useTilt, summary
  styles/        globals.css (base, keyframes, utilitários) · themes/ (uma identidade por arquivo + modos claro/escuro)
public/assets/   heroi.png, heroi-fem.png, bg.mp4
```

---

## 🧠 Engine D&D 5e (resumo)

- Modificador de atributo: `floor((valor − 10) / 2)`
- Bônus de proficiência por nível: `2 + floor((nível − 1) / 4)`
- CA por armadura/escudo + DES (com teto para armaduras médias) + itens
- PV por dado de vida + Constituição; iniciativa por Destreza
- Ataques: `1d20 + proficiência + atributo` (acuidade/distância usam DES); dano com modificador
- Perícias e resistências proficientes; descanso curto/longo; recursos por descanso; carga aproximada

> Não há conteúdo oficial protegido por direitos autorais — apenas estrutura
> genérica e dados básicos, fáceis de expandir.

---

## 🔭 Próximos passos

Ideias trazidas do antigo *dnd-companion* e de projetos open source de RPG:

- **Importador do dnd-companion**: converter as fichas antigas para o modelo atual.
- **Recursos personalizados/homebrew**: contadores próprios com recarga por descanso.
- **Compartilhar ficha por link/QR** (somente leitura, revogável) e **impressão**.
- **Ícones consistentes** para itens, magias e condições (ex.: [game-icons.net](https://game-icons.net), CC BY 3.0).
- **Inventário visual** com comparação do item atual × selecionado (efeito na CA/ataque antes de equipar).
- **Rastreador de iniciativa** do mestre conectado às fichas da mesa.
- **Diário conectado**: NPCs, locais e relações ligados às sessões.

---

## ✅ Referência visual

Confirmado: **`Ficha Viva AAA.dc.html`** foi usado como base visual e de UX. A
estética original foi preservada e evoluída para um produto completo, interativo,
cinematográfico e funcional — sem descaracterizar o design.

---

## 🎨 Créditos

Dados 3D: [@3d-dice/dice-box-threejs](https://github.com/3d-dice/dice-box-threejs)
(MIT, Frank Ali; baseado nos 3D Dice de MajorVictory e Teall Dice).

Selo holográfico (`src/components/ui/holo-badge.tsx`, usado na Inspiração e nos
recipientes do inventário): adaptado do efeito do *AwardBadge* (21st.dev), sem a
marca original.

Ícones temáticos (abas, dados, forja…) de **[game-icons.net](https://game-icons.net)**,
por Lorc, Delapouite e colaboradores, sob licença
**[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)**. Os caminhos usados
ficam em `src/components/ui/gameIcons.ts`.

