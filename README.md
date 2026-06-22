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
- **Inventário**: moedas, sintonia (máx. 3), adicionar/remover, **equipar/desequipar arma, armadura e escudo**, favoritar — tudo recalculando **CA, ataques e dano** ao vivo.
- **Magias** (conjuradores): espaços de magia, CD/ataque de magia e magias preparadas.
- **Descanso** curto/longo e **condições**.
- **Diário** de sessões (título, data, resumo, NPCs, locais, missões, tesouros, anotações livres) com **busca** + anotações rápidas.
- **Rolador de dados** (d4–d100, quantidade, modificador, histórico) com **resultado em destaque cinematográfico** e crítico/falha.
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
```

---

## 🗂️ Estrutura principal

```
src/
  components/
    ui/          Button, Panel/SectionLabel
    layout/      AppShell, TopBar, Screen
    animations/  ParticleField, BackgroundScene, RuneRing
    character/   CreatorHero + passos (Identity, Race, Class, Abilities, Skills, Gear, Review)
    sheet/       SheetHeader, SheetTabs, MobileNav, TabFicha/Combate/Inventario/Magias/Descanso/Diario
    dice/        DiceRoller, RollOverlay, useDiceRoller
    inventory/   AddItemPicker
    spells/      SpellPicker
    diary/       JournalCard
  pages/         Home, Login, CharacterSelect, CharacterCreator, CharacterSheet
  data/          races, classes, backgrounds, skills, weapons, armors, items, spells, themes
  engine/        dndRules, modifiers, dice, combat, inventory, characterBuilder, loadout
  store/         characterStore, authStore, uiStore (Zustand + persist)
  types/         character.ts, dnd.ts
  lib/           color, useTheme, useTilt, summary
  styles/        globals.css (temas, keyframes, utilitários)
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

## 🔭 O que pode melhorar depois

- Progressão de nível (subir de nível, ASI/talentos, espaços de magia por nível).
- Edição direta de nome/atributos na própria ficha e múltiplos rascunhos simultâneos.
- Sincronização em nuvem opcional (hoje é 100% local, por dispositivo).
- Mais raças, classes, subclasses, magias e itens (a arquitetura já suporta).
- Animação 3D de dado rolando (hoje o impacto é o overlay cinematográfico).
- Testes automatizados (unitários da engine + e2e do fluxo).

---

## ✅ Referência visual

Confirmado: **`Ficha Viva AAA.dc.html`** foi usado como base visual e de UX. A
estética original foi preservada e evoluída para um produto completo, interativo,
cinematográfico e funcional — sem descaracterizar o design.
