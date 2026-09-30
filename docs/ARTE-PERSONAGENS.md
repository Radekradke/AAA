# Arte dos personagens: prompt no estilo Ficha Viva

Guia para gerar retratos **no mesmo estilo, formato e nível de detalhe** das duas artes padrão do app:

- `public/assets/heroi.png`: elfo, masculino
- `public/assets/heroi-fem.png`: feminina

Serve para dois usos:

1. **Retratos oficiais por classe.** Salve em `src/assets/herois/` com o nome da classe e da aparência, em português mesmo (`Clériga feminina.webp`, `Bardo masculino.webp`), e o app passa a usá-los sozinho. Veja o `LEIA-ME.md` da pasta.
2. **Arte própria do jogador.** Gere com o prompt e envie pelo botão **Sua arte**, no retrato do herói (criação) ou no avatar (ficha). Se a imagem vier com fundo branco liso, o app recorta o fundo automaticamente.

---

## 1. O DNA do estilo (o que precisa se repetir)

| Elemento | Como é nas artes atuais |
| --- | --- |
| **Traço** | Ilustração anime/manhwa semi-realista, estilo *splash art* de gacha de fantasia sombria. Line art fina e afiada, cel shading com sombras duras e angulosas. |
| **Enquadramento** | Busto até a metade do tronco, 3/4, olhar levemente de lado. Cabeça no terço superior, rosto quase centralizado. |
| **Movimento** | Cabelo longo em mechas finas e pontudas, soprado pelo vento para um lado. Capa com dobras quebradas e geométricas, como papel rasgado. |
| **Figurino** | Capa/manto **preto** de gola alta, filigrana **bronze/ouro envelhecido** com motivos de espinhos e galhos, **gemas esmeralda** lapidadas (broche, brincos, colar). |
| **Paleta** | Preto profundo + bronze + verde-esmeralda, e **uma** cor forte de acento (cor do cabelo: loiro-cinza, rosa-queimado…). Pele com tom quente e sombra marrom. |
| **Fundo** | Liso e sem cenário: **cinza-escuro** (retratos de classe atuais, combina direto com o app) ou branco (artes padrão, que precisam de recorte). |
| **Acabamento** | Muito detalhe no rosto, nas joias e nos ornamentos. Nada de brilho difuso, bokeh ou efeito 3D. |

---

## 2. Prompt-mestre (copie e troque os campos entre colchetes)

Os geradores entendem melhor em inglês, então o prompt está em inglês.

```text
Dark fantasy character portrait in semi-realistic anime / manhwa gacha splash-art style.
Half-body bust, three-quarter view, head in the upper third of the frame, face centered,
calm confident expression, looking slightly off-camera.
Subject: [RACE DESCRIPTION], [GENDER] [CLASS].
Hair: [HAIR], long flowing strands blown by the wind to one side, sharp thin locks.
Outfit: high-collared black cloak with sharp angular folds like torn paper, ornate antique-bronze
filigree with thorn and branch motifs on the shoulders, faceted emerald gemstones on a brooch,
earrings and necklace, dark leather straps underneath.
Palette: deep black, antique bronze-gold and emerald green, with [ACCENT] as the only bright accent.
Crisp fine line art, hard cel shading with angular shadows, highly detailed face and jewelry,
clean silhouette, isolated on a plain flat dark charcoal-grey background, no scenery, no frame.
Vertical 3:4 composition, low-angle heroic view, the character fills the frame down to the waist,
holding the class weapon or focus: [CLASS GEAR].
```

**Negativo** (para quem aceita *negative prompt*: SD, Leonardo, Midjourney com `--no`):

```text
background scenery, landscape, gradient background, frame, border, text, watermark, logo, signature,
multiple characters, full body, cropped head, hands covering face, extra fingers, deformed hands,
3d render, photorealistic, chibi, blurry, soft glow, bokeh, lens flare
```

---

## 3. Como travar o estilo em cada ferramenta

O que mais faz a arte "casar" com as atuais é **usar retratos da coleção como referência de estilo**: de preferência dois de `src/assets/herois/`, ou as duas artes padrão.

- **ChatGPT / GPT-Image**
  1. Anexe `heroi.png` e `heroi-fem.png`.
  2. Comece com: *"Use these two images only as STYLE reference (line art, shading, palette, framing, white background). Create a NEW character:"* e cole o prompt-mestre.
  3. Peça formato **retrato 3:4** (768×1024 ou maior).
- **Midjourney (v6/v7)**
  1. Suba as duas imagens e use como `--sref`.
  2. Acrescente `--ar 3:4 --style raw --stylize 200 --no background, text, frame`.
  3. Mantenha o mesmo `--sref` e o mesmo `--seed` para toda a coleção.
- **Leonardo / Stable Diffusion XL**
  - Use um modelo anime (ex.: Anime XL / Illustrious), **Style Reference** com as duas artes (força ~0.6) e 768×1024.

Gere 4 variações e escolha a que tiver o **rosto mais nítido e centralizado**.

---

## 4. Campos prontos por raça (misture com a classe)

Os retratos são escolhidos pela **classe**, mas a raça dá personalidade (os atuais têm anão, elfa, meio-orc, tiefling, draconato…). Cole em `[RACE DESCRIPTION]`, `[HAIR]` e `[ACCENT]`.

| Raça · aparência | [RACE DESCRIPTION] | [HAIR] | [ACCENT] |
| --- | --- | --- | --- |
| `human-masc` | human man, rugged handsome face, light stubble, warm tan skin | dark brown wavy hair | dark brown hair |
| `human-fem` | human woman, strong elegant face, warm olive skin | long raven-black hair | raven-black hair with blue sheen |
| `elf-masc` | elf man, long pointed ears, sharp noble face, tanned skin, emerald eyes | long ash-blond hair | ash-blond hair |
| `elf-fem` | elf woman, long pointed ears, delicate sharp face, pale skin, emerald eyes | long silver-white hair | silver-white hair |
| `dwarf-masc` | dwarf man, broad shoulders, weathered face, long braided beard with bronze beard rings | thick copper-red hair and beard | copper-red beard |
| `dwarf-fem` | dwarf woman, sturdy build, freckles, determined face | thick copper-red braids with bronze rings | copper-red braids |
| `halfling-masc` | halfling man, youthful round face, clever smile | short curly chestnut hair | chestnut curls |
| `halfling-fem` | halfling woman, youthful round face, playful sly smile | curly honey-blonde hair | honey-blonde curls |
| `half-elf-masc` | half-elf man, subtly pointed short ears, mixed human-elf features | shoulder-length dark auburn hair | dark auburn hair |
| `half-elf-fem` | half-elf woman, subtly pointed short ears, graceful features | long wavy chestnut hair | chestnut hair |
| `half-orc-masc` | half-orc man, grey-green skin, small lower tusks, strong jaw, scar across the brow | black hair in a warrior topknot | grey-green skin |
| `half-orc-fem` | half-orc woman, grey-green skin, small lower tusks, fierce beautiful face | long black hair with side braids | grey-green skin |
| `gnome-masc` | gnome man, large bright eyes, mischievous grin, brass goggles pushed up on the forehead | wild spiky white hair | brass goggles |
| `gnome-fem` | gnome woman, large bright eyes, curious smile, brass goggles on the forehead | voluminous teal hair | teal hair |
| `tiefling-masc` | tiefling man, deep crimson skin, curved ram horns, solid glowing gold eyes | long black hair | crimson skin and gold eyes |
| `tiefling-fem` | tiefling woman, lavender-violet skin, elegant curved horns, solid glowing gold eyes | long dark plum hair | violet skin and gold eyes |
| `dragonborn-masc` | dragonborn man, draconic head with bronze scales, swept-back horns, reptilian gold eyes, no hair | (troque a linha Hair por: "a crest of sharp horns and a frilled neck") | bronze scales |
| `dragonborn-fem` | dragonborn woman, sleek draconic head with emerald-green scales, elegant swept-back horns | (troque por: "a sleek crest of horns") | emerald scales |

**Sub-raças** (variações de descrição):

| Sub-raça | Troque [RACE DESCRIPTION] por |
| --- | --- |
| `elf-drow` | dark elf, obsidian-grey skin, white hair, crimson eyes |
| `elf-wood-elf` | wood elf, copper skin, leaves woven into the hair |
| `elf-high-elf` | high elf, porcelain skin, circlet with a small emerald |
| `dwarf-mountain-dwarf` | mountain dwarf, a bronze war-helm tucked under the arm |
| `halfling-stout` | stout halfling, sturdier build, rosy cheeks |
| `gnome-forest-gnome` | forest gnome, moss and tiny flowers woven into the hair (no goggles) |

---

## 5. Checklist de formato (para encaixar no app sem ajuste)

- [ ] **3:4 vertical**, 768×1024 ou maior (o app reduz).
- [ ] Rosto no **terço de cima**, sem encostar na borda de cima.
- [ ] **Fundo cinza-escuro liso**, sem cenário.
- [ ] Nome do arquivo com classe + aparência (ex.: `Paladina feminina.webp`), salvo em `src/assets/herois/`.
- [ ] Se o rosto ficar muito fora do padrão, ajuste o ponto dele em `FACE` (`src/lib/summary.ts`).

### [CLASS GEAR] por classe

| Classe | [CLASS GEAR] |
| --- | --- |
| Bárbaro | a massive great-axe over the shoulder, fur mantle, bone and fang trophies |
| Bardo | an ornate lute or harp, elegant layered garments |
| Clérigo | a sun-disc mace or censer staff, holy symbol medallions, white-and-gold vestments |
| Druida | a gnarled wooden staff wrapped in vines and leaves, antlers, moss |
| Guerreiro | a spear or warhammer, plate armor pieces, battle cape |
| Monge | wrapped hands, simple robes, prayer beads, a quarterstaff |
| Paladino | a longsword and a heraldic shield, radiant plate armor |
| Patrulheiro | a longbow and quiver, hooded travel cloak, hunting knives |
| Ladino | twin daggers, dark hood, leather armor, lockpicks |
| Feiticeiro | raw arcane fire swirling around one hand, draconic markings |
| Bruxo | an eldritch pact tome, a glowing otherworldly eye sigil |
| Mago | a spellbook and an arcane staff, pointed hat or scholar robes |
