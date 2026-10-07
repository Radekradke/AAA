# Arte padrão dos itens: lista completa

Lista dos **344 itens base** da Ficha Viva (armas, armaduras, equipamento do Livro do Jogador e itens mágicos), com o nome de arquivo de cada um. É a arte que aparece por padrão para todo mundo, até o jogador enviar uma foto própria para o item.

**Como usar:** gere a imagem e salve em `src/assets/itens/` com o nome da coluna **Arquivo** (ex.: `w-longsword.webp`). O app passa a usá-la sozinho:

- na miniatura do card no inventário;
- na carta ao lado dos detalhes (passar o mouse ou segurar no celular);
- nas relíquias do Retrato;
- em Retrato → Suas cartas.

Armas e armaduras **+1, +2 e +3** usam a arte da base (ex.: a Espada Longa +2 usa `w-longsword.webp`). A foto que o jogador enviar para o item sempre vence a padrão.

---

## 1. O DNA do estilo

| Elemento | Como deve ser |
| --- | --- |
| **Traço** | Mesmo estilo dos retratos e do bestiário: ilustração anime/manhwa semi-realista, *splash art* de fantasia sombria, line art fina, cel shading com sombras duras. |
| **Enquadramento** | Retrato **4:5** (480×600 basta; até 800×1000). O objeto **sozinho e inteiro**, centralizado, ocupando ~70% da altura. Armas longas na diagonal. |
| **Fundo** | Liso, **cinza-carvão escuro**, sem cenário, mesa ou moldura. A carta coloca a borda de metal e a cor da raridade por cima. |
| **Luz** | Luz de recorte (rim light) para a silhueta ler bem na miniatura do inventário (~44 px). |
| **Metal e materiais** | Materiais críveis (aço, couro, madeira, latão). Itens mágicos com um brilho discreto na cor da raridade: incomum verde, raro azul, muito raro roxo, lendário laranja-dourado. |
| **Proibido** | Mãos, personagens, texto, logo, assinatura, moldura desenhada. |

## 2. Prompt-mestre

Troque `[ITEM]` pelo nome do item (em inglês funciona melhor; ex.: "longsword", "chain mail", "bag of holding").

```text
Fantasy RPG item illustration in semi-realistic anime / manhwa gacha splash-art style.
Subject: a single [ITEM], complete and centered, no hands, no character.
Vertical 4:5 frame, the object filling about 70% of the height, long weapons placed diagonally,
crisp fine line art, hard cel shading with angular shadows, believable materials (steel, leather, wood, brass),
strong rim light, isolated on a plain flat dark charcoal-grey background, no scenery, no frame, no text.
```

Para itens mágicos, acrescente: `subtle magical glow in [COR] (uncommon green / rare blue / very rare purple / legendary orange-gold), faint runes`.

**Negativo:**

```text
hands, person, character, multiple objects, table, background scenery, gradient background, frame, border,
text, watermark, logo, signature, cropped object, blurry, bokeh, 3d render, photorealistic, chibi
```

## 3. Por onde começar

Os itens marcados com **★** (28) são o equipamento inicial das classes — aparecem em quase toda ficha nova. Comece por eles; depois armas e armaduras, e por fim equipamento e itens mágicos.

## 4. A lista

### Armas simples — corpo a corpo (10)

_A arma sozinha, inteira, na diagonal._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Clava ★ | `w-club.webp` | Comum | 1d4 concussão · Leve |
| Adaga ★ | `w-dagger.webp` | Comum | 1d4 perfurante · Acuidade, Leve, Arremesso · Distância 6/18 m |
| Clava Grande | `w-greatclub.webp` | Comum | 1d8 concussão · Duas mãos |
| Machado de Mão ★ | `w-handaxe.webp` | Comum | 1d6 cortante · Leve, Arremesso · Distância 6/18 m |
| Azagaia | `w-javelin.webp` | Comum | 1d6 perfurante · Arremesso · Distância 9/36 m |
| Martelo Leve | `w-lighthammer.webp` | Comum | 1d4 concussão · Leve, Arremesso · Distância 6/18 m |
| Maça ★ | `w-mace.webp` | Comum | 1d6 concussão |
| Bordão ★ | `w-quarterstaff.webp` | Comum | 1d6 (1d8) concussão · Versátil |
| Foice Curta | `w-sickle.webp` | Comum | 1d4 cortante · Leve |
| Lança ★ | `w-spear.webp` | Comum | 1d6 (1d8) perfurante · Arremesso, Versátil · Distância 6/18 m |

### Armas simples — à distância (4)

_A arma inteira; arcos e bestas com a corda visível._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Besta Leve ★ | `w-lightcrossbow.webp` | Comum | 1d8 perfurante · Munição, Recarga, Duas mãos · Distância 24/96 m |
| Dardo | `w-dart.webp` | Comum | 1d4 perfurante · Acuidade, Arremesso · Distância 6/18 m |
| Arco Curto ★ | `w-shortbow.webp` | Comum | 1d6 perfurante · Munição, Duas mãos · Distância 24/96 m |
| Funda | `w-sling.webp` | Comum | 1d4 concussão · Munição · Distância 9/36 m |

### Armas marciais — corpo a corpo (19)

_Lâminas e cabos bem trabalhados; armas de haste podem atravessar a carta na diagonal._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Machado de Batalha ★ | `w-battleaxe.webp` | Comum | 1d8 (1d10) cortante · Versátil |
| Mangual | `w-flail.webp` | Comum | 1d8 concussão |
| Glaive | `w-glaive.webp` | Comum | 1d10 cortante · Pesada, Alcance, Duas mãos |
| Machado Grande ★ | `w-greataxe.webp` | Comum | 1d12 cortante · Pesada, Duas mãos |
| Espada Grande ★ | `w-greatsword.webp` | Comum | 2d6 cortante · Pesada, Duas mãos |
| Alabarda | `w-halberd.webp` | Comum | 1d10 cortante · Pesada, Alcance, Duas mãos |
| Lança de Montaria | `w-lance.webp` | Comum | 1d12 perfurante · Alcance, Especial: desvantagem a 1,5 m; duas mãos se desmontado |
| Espada Longa ★ | `w-longsword.webp` | Comum | 1d8 (1d10) cortante · Versátil |
| Malho | `w-maul.webp` | Comum | 2d6 concussão · Pesada, Duas mãos |
| Maça Estrela | `w-morningstar.webp` | Comum | 1d8 perfurante |
| Pique | `w-pike.webp` | Comum | 1d10 perfurante · Pesada, Alcance, Duas mãos |
| Rapieira ★ | `w-rapier.webp` | Comum | 1d8 perfurante · Acuidade |
| Cimitarra | `w-scimitar.webp` | Comum | 1d6 cortante · Acuidade, Leve |
| Espada Curta ★ | `w-shortsword.webp` | Comum | 1d6 perfurante · Acuidade, Leve |
| Tridente | `w-trident.webp` | Comum | 1d6 (1d8) perfurante · Arremesso, Versátil · Distância 6/18 m |
| Picareta de Guerra | `w-warpick.webp` | Comum | 1d8 perfurante |
| Martelo de Guerra ★ | `w-warhammer.webp` | Comum | 1d8 (1d10) concussão · Versátil |
| Chicote | `w-whip.webp` | Comum | 1d4 cortante · Acuidade, Alcance |
| Machado de Batalha +1 | `w-battleaxe-plus1.webp` | Incomum | 1d8 (1d10) cortante · +1 mágico |

### Armas marciais — à distância (5)

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Rede | `w-net.webp` | Comum | Arma especial (marcial, arremesso): prende a criatura atingida |
| Zarabatana | `w-blowgun.webp` | Comum | 1 perfurante · Munição, Recarga · Distância 7,5/30 m |
| Besta de Mão | `w-handcrossbow.webp` | Comum | 1d6 perfurante · Munição, Leve, Recarga · Distância 9/36 m |
| Besta Pesada | `w-heavycrossbow.webp` | Comum | 1d10 perfurante · Munição, Pesada, Recarga, Duas mãos · Distância 30/120 m |
| Arco Longo ★ | `w-longbow.webp` | Comum | 1d8 perfurante · Munição, Pesada, Duas mãos · Distância 45/180 m |

### Armaduras e escudo (13)

_A peça montada num manequim invisível (sem corpo), de frente, levemente de três-quartos._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Armadura Acolchoada | `a-padded.webp` | Comum | CA 11 + DES · Furtividade em desvantagem |
| Armadura de Couro ★ | `a-leather.webp` | Comum | CA 11 + DES |
| Couro Batido ★ | `a-studded.webp` | Comum | CA 12 + DES |
| Peles ★ | `a-hide.webp` | Comum | CA 12 + DES (máx. 2) |
| Camisão de Malha ★ | `a-chainshirt.webp` | Comum | CA 13 + DES (máx. 2) |
| Brunea ★ | `a-scale.webp` | Comum | CA 14 + DES (máx. 2) · Furtividade em desvantagem |
| Peitoral | `a-breastplate.webp` | Comum | CA 14 + DES (máx. 2) |
| Meia-Armadura | `a-halfplate.webp` | Comum | CA 15 + DES (máx. 2) · Furtividade em desvantagem |
| Cota de Anéis | `a-ringmail.webp` | Comum | CA 14 · Furtividade em desvantagem |
| Cota de Malha ★ | `a-chainmail.webp` | Comum | CA 16 · FOR 13 · Furtividade em desvantagem |
| Armadura de Talas ★ | `a-splint.webp` | Comum | CA 17 · FOR 15 · Furtividade em desvantagem |
| Armadura de Placas | `a-plate.webp` | Comum | CA 18 · FOR 15 · Furtividade em desvantagem |
| Escudo de Aço | `s-shield.webp` | Comum | +2 CA |

### Equipamento — Munição (4)

_Um pequeno feixe da munição._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Flechas (20) | `g-arrows.webp` | Comum | Para arcos |
| Agulhas de Zarabatana (50) | `g-needles.webp` | Comum | Para zarabatana |
| Virotes (20) | `g-bolts.webp` | Comum | Para bestas |
| Balas de Funda (20) | `g-bullets.webp` | Comum | Para funda |

### Equipamento — Focos de conjuração (13)

_O foco brilhando de leve (cristal, orbe, cajado, símbolo sagrado, ramo de visco…)._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Bolsa de Componentes | `g-componentpouch.webp` | Comum | Componentes materiais sem custo das magias |
| Foco Arcano: Cristal | `g-focus-crystal.webp` | Comum | Feiticeiro, Bruxo, Mago |
| Foco Arcano: Orbe | `g-focus-orb.webp` | Comum | Feiticeiro, Bruxo, Mago |
| Foco Arcano: Bastão | `g-focus-rod.webp` | Comum | Feiticeiro, Bruxo, Mago |
| Foco Arcano: Cajado | `g-focus-staff.webp` | Comum | Feiticeiro, Bruxo, Mago (também serve de bordão) |
| Foco Arcano: Varinha | `g-focus-wand.webp` | Comum | Feiticeiro, Bruxo, Mago |
| Foco Druídico: Ramo de Visco | `g-druidic-mistletoe.webp` | Comum | Druida, Patrulheiro |
| Foco Druídico: Totem | `g-druidic-totem.webp` | Comum | Druida |
| Foco Druídico: Cajado de Madeira | `g-druidic-staff.webp` | Comum | Druida |
| Foco Druídico: Varinha de Teixo | `g-druidic-wand.webp` | Comum | Druida |
| Símbolo Sagrado: Amuleto | `g-holy-amulet.webp` | Comum | Clérigo, Paladino |
| Símbolo Sagrado: Emblema | `g-holy-emblem.webp` | Comum | Clérigo, Paladino (no escudo ou na roupa) |
| Símbolo Sagrado: Relicário | `g-holy-reliquary.webp` | Comum | Clérigo, Paladino |

### Equipamento — Aventura (68)

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Mochila ★ | `g-backpack.webp` | Comum | Carrega 0,03 m³ / 15 kg de equipamento |
| Corda de Cânhamo (15 m) ★ | `g-rope.webp` | Comum | 2 PV; romper exige FOR CD 17 |
| Tocha ★ | `g-torch.webp` | Comum | Luz plena 6 m + penumbra 6 m por 1 hora; como arma: 1 de dano de fogo |
| Rações (1 dia) ★ | `g-rations.webp` | Comum | Comida seca de viagem |
| Ábaco | `g-abacus.webp` | Comum | Contas e cálculos |
| Esferas de Metal (1.000) | `g-ballbearings.webp` | Comum | Espalhadas num quadrado de 3 m: DES CD 10 ou cai derrubado |
| Barril | `g-barrel.webp` | Comum | Guarda 150 L de líquido ou 0,11 m³ de sólidos |
| Cesto | `g-basket.webp` | Comum | Guarda 0,06 m³ / 20 kg |
| Saco de Dormir | `g-bedroll.webp` | Comum | Para dormir ao relento |
| Sino | `g-bell.webp` | Comum | Alarme ou sinal |
| Cobertor | `g-blanket.webp` | Comum | Aquece nas noites frias |
| Roldana e Talha | `g-blocktackle.webp` | Comum | Levanta até 4× o peso que você levantaria |
| Livro | `g-book.webp` | Comum | Poesia, história, tratado ou relatos |
| Garrafa de Vidro | `g-bottle.webp` | Comum | 0,7 L |
| Balde | `g-bucket.webp` | Comum | 11 L de líquido |
| Estrepes (saco com 20) | `g-caltrops.webp` | Comum | Área de 1,5 m: quem entra faz DES CD 15 ou para, sofre 1 perfurante e perde 3 m de desloca |
| Vela | `g-candle.webp` | Comum | Luz plena 1,5 m + penumbra 1,5 m por 1 hora |
| Estojo de Virotes | `g-casebolt.webp` | Comum | Guarda 20 virotes |
| Estojo de Mapas e Pergaminhos | `g-casemap.webp` | Comum | Guarda 10 folhas enroladas |
| Corrente (3 m) | `g-chain.webp` | Comum | 10 PV; romper exige FOR CD 20 |
| Giz | `g-chalk.webp` | Comum | Marcar caminhos |
| Baú | `g-chest.webp` | Comum | Guarda 0,34 m³ / 150 kg |
| Pé de Cabra | `g-crowbar.webp` | Comum | Vantagem em testes de FOR onde a alavanca ajuda |
| Equipamento de Pesca | `g-fishing.webp` | Comum | Vara, linha, anzóis e iscas |
| Frasco ou Caneca | `g-flask.webp` | Comum | 0,5 L |
| Gancho de Escalada | `g-grapplinghook.webp` | Comum | Prende numa borda para escalar com corda |
| Martelo | `g-hammer.webp` | Comum | Ferramenta de uso geral |
| Marreta | `g-sledgehammer.webp` | Comum | Quebrar portas e pedras |
| Ampulheta | `g-hourglass.webp` | Comum | Marca o tempo |
| Armadilha de Caça | `g-huntingtrap.webp` | Comum | FOR CD 13 para escapar; 1d4 perfurante e impedido |
| Tinta (frasco de 30 ml) | `g-ink.webp` | Comum | Para escrever |
| Pena de Escrever | `g-inkpen.webp` | Comum | Para escrever |
| Jarro | `g-jug.webp` | Comum | 4 L de líquido |
| Escada (3 m) | `g-ladder.webp` | Comum | Madeira |
| Lampião | `g-lamp.webp` | Comum | Luz plena 4,5 m + penumbra 9 m; 6 horas por frasco de óleo |
| Lanterna Furta-fogo | `g-lanternbull.webp` | Comum | Cone de luz plena 18 m + penumbra 18 m; 6 horas por óleo |
| Lanterna Coberta | `g-lanternhood.webp` | Comum | Luz plena 9 m + penumbra 9 m; pode baixar a cobertura |
| Cadeado | `g-lock.webp` | Comum | Com chave; abrir sem ela: DES CD 15 com ferramentas de ladrão |
| Lupa | `g-magnifying.webp` | Comum | Acende fogo ao sol; vantagem em avaliar objetos pequenos |
| Algemas | `g-manacles.webp` | Comum | Pequeno ou Médio; escapar DES CD 20, romper FOR CD 20 |
| Kit de Refeição | `g-messkit.webp` | Comum | Prato, copo e talheres de lata |
| Espelho de Aço | `g-mirror.webp` | Comum | Olhar por cantos, sinalizar |
| Papel (folha) | `g-paper.webp` | Comum | Para escrever |
| Pergaminho (folha) | `g-parchment.webp` | Comum | Para escrever |
| Perfume (frasco) | `g-perfume.webp` | Comum | Aroma marcante |
| Picareta de Mineiro | `g-pick.webp` | Comum | Cavar rocha |
| Piton | `g-piton.webp` | Comum | Cravo de escalada |
| Vara (3 m) | `g-pole.webp` | Comum | Testar o chão à frente |
| Panela de Ferro | `g-pot.webp` | Comum | 4 L |
| Bolsa | `g-pouch.webp` | Comum | Guarda 0,006 m³ / 3 kg |
| Aljava | `g-quiver.webp` | Comum | Guarda 20 flechas |
| Aríete Portátil | `g-ram.webp` | Comum | +4 em FOR para arrombar portas (vantagem com ajuda) |
| Corda de Seda (15 m) | `g-ropesilk.webp` | Comum | 2 PV; romper exige FOR CD 17 |
| Saco | `g-sack.webp` | Comum | Guarda 0,03 m³ / 15 kg |
| Balança de Mercador | `g-scale.webp` | Comum | Pesa até 1 kg com precisão |
| Lacre de Cera | `g-sealingwax.webp` | Comum | Sela cartas |
| Pá | `g-shovel.webp` | Comum | Cavar |
| Apito de Sinal | `g-whistle.webp` | Comum | Som agudo à distância |
| Anel de Sinete | `g-signet.webp` | Comum | Carimba lacres com seu brasão |
| Sabão | `g-soap.webp` | Comum | Higiene |
| Grimório | `g-spellbook.webp` | Comum | 100 páginas para as magias do mago |
| Cravos de Ferro (10) | `g-spikes.webp` | Comum | Travar portas, ancorar cordas |
| Luneta | `g-spyglass.webp` | Comum | Aumenta 2× o que você vê |
| Tenda (2 pessoas) | `g-tent.webp` | Comum | Abrigo simples e portátil |
| Pederneira | `g-tinderbox.webp` | Comum | Acende tocha em 1 ação; outros fogos em 1 minuto |
| Frasco (vial) | `g-vial.webp` | Comum | 120 ml |
| Odre | `g-waterskin.webp` | Comum | 2 L de água |
| Pedra de Amolar | `g-whetstone.webp` | Comum | Afia lâminas |

### Equipamento — Kits (8)

_O estojo aberto com as ferramentas arrumadas._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Kit de Curandeiro | `g-healkit.webp` | Comum | 10 usos: estabiliza uma criatura a 0 PV sem teste de Medicina |
| Ferramentas de Ladrão | `g-thieves.webp` | Comum | Abrir fechaduras e desarmar armadilhas (proficiência soma no teste) |
| Kit de Escalada | `g-climbers.webp` | Comum | Pitons, luvas e arnês: ancorado, não cai mais de 7,5 m |
| Kit de Disfarce | `g-disguise.webp` | Comum | Cosméticos, tinta de cabelo e adereços |
| Kit de Falsificação | `g-forgery.webp` | Comum | Papéis, tintas, selos e lacres |
| Kit de Herbalismo | `g-herbalism.webp` | Comum | Identificar plantas; fazer antitoxina e poção de cura |
| Ferramentas de Navegador | `g-navigator.webp` | Comum | Traçar rotas e não se perder no mar |
| Kit de Envenenador | `g-poisoner.webp` | Comum | Criar e aplicar venenos |

### Equipamento — Pacotes (7)

_A mochila aberta com o conteúdo à mostra._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Pacote de Explorador | `g-explorer.webp` | Comum | Mochila, saco de dormir, kit de refeição, pederneira, 10 tochas, 10 rações, odre e corda d |
| Pacote de Assaltante | `g-pack-burglar.webp` | Comum | Mochila, 1.000 esferas, 3 m de linha, sino, 5 velas, pé de cabra, martelo, 10 pitons, lant |
| Pacote de Diplomata | `g-pack-diplomat.webp` | Comum | Baú, 2 estojos, roupas finas, tinta, pena, lampião, 2 óleos, 5 papéis, perfume, lacre, sab |
| Pacote de Explorador de Masmorras | `g-pack-dungeoneer.webp` | Comum | Mochila, pé de cabra, martelo, 10 pitons, 10 tochas, pederneira, 10 rações, odre, corda 15 |
| Pacote de Artista | `g-pack-entertainer.webp` | Comum | Mochila, saco de dormir, 2 fantasias, 5 velas, 5 rações, odre, kit de disfarce |
| Pacote de Sacerdote | `g-pack-priest.webp` | Comum | Mochila, cobertor, 10 velas, pederneira, caixa de esmolas, 2 incensos, incensário, vestes, |
| Pacote de Estudioso | `g-pack-scholar.webp` | Comum | Mochila, livro de estudo, tinta, pena, 10 pergaminhos, saquinho de areia, faquinha |

### Equipamento — Ferramentas de artesão (17)

_As ferramentas sobre um pano ou estojo de couro._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Suprimentos de Alquimista | `g-tool-alchemist.webp` | Comum | Alquimia |
| Suprimentos de Cervejeiro | `g-tool-brewer.webp` | Comum | Fermentação e bebidas |
| Suprimentos de Calígrafo | `g-tool-calligrapher.webp` | Comum | Escrita decorativa |
| Ferramentas de Carpinteiro | `g-tool-carpenter.webp` | Comum | Madeira e construção |
| Ferramentas de Cartógrafo | `g-tool-cartographer.webp` | Comum | Mapas |
| Ferramentas de Sapateiro | `g-tool-cobbler.webp` | Comum | Calçados |
| Utensílios de Cozinheiro | `g-tool-cook.webp` | Comum | Cozinha |
| Ferramentas de Vidreiro | `g-tool-glassblower.webp` | Comum | Vidro |
| Ferramentas de Joalheiro | `g-tool-jeweler.webp` | Comum | Joias e gemas |
| Ferramentas de Curtidor | `g-tool-leatherworker.webp` | Comum | Couro |
| Ferramentas de Pedreiro | `g-tool-mason.webp` | Comum | Pedra |
| Suprimentos de Pintor | `g-tool-painter.webp` | Comum | Pintura |
| Ferramentas de Oleiro | `g-tool-potter.webp` | Comum | Cerâmica |
| Ferramentas de Ferreiro | `g-tool-smith.webp` | Comum | Metal |
| Ferramentas de Funileiro | `g-tool-tinker.webp` | Comum | Consertos e engenhocas |
| Ferramentas de Tecelão | `g-tool-weaver.webp` | Comum | Tecidos |
| Ferramentas de Entalhador | `g-tool-woodcarver.webp` | Comum | Entalhe em madeira |

### Equipamento — Instrumentos musicais (10)

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Gaita de Foles | `g-inst-bagpipes.webp` | Comum | Instrumento de sopro |
| Tambor | `g-inst-drum.webp` | Comum | Percussão |
| Saltério | `g-inst-dulcimer.webp` | Comum | Cordas percutidas |
| Flauta | `g-inst-flute.webp` | Comum | Sopro |
| Alaúde | `g-inst-lute.webp` | Comum | Cordas |
| Lira | `g-inst-lyre.webp` | Comum | Cordas |
| Trompa | `g-inst-horn.webp` | Comum | Metal |
| Flauta de Pã | `g-inst-panflute.webp` | Comum | Sopro |
| Charamela | `g-inst-shawm.webp` | Comum | Sopro de palheta dupla |
| Viola de Arco | `g-inst-viol.webp` | Comum | Cordas friccionadas |

### Equipamento — Jogos (4)

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Jogo de Dados | `g-game-dice.webp` | Comum | Dados de osso |
| Xadrez de Dragão | `g-game-dragonchess.webp` | Comum | Tabuleiro e peças |
| Baralho | `g-game-cards.webp` | Comum | Cartas de jogar |
| Ante dos Três Dragões | `g-game-threedragon.webp` | Comum | Jogo de cartas |

### Equipamento — Roupas (5)

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Mantos | `g-robes.webp` | Comum | Vestes simples ou cerimoniais |
| Roupas Comuns | `g-clothes-common.webp` | Comum | Do dia a dia |
| Fantasia | `g-clothes-costume.webp` | Comum | Para apresentações |
| Roupas Finas | `g-clothes-fine.webp` | Comum | Para a nobreza e a corte |
| Roupas de Viajante | `g-clothes-traveler.webp` | Comum | Resistentes para a estrada |

### Equipamento — Consumíveis (6)

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Água Benta (frasco) | `g-holywater.webp` | Comum | Arremesso 6 m: 2d6 radiante em corruptor ou morto-vivo |
| Óleo (frasco) | `g-oil.webp` | Comum | Arremesso 6 m espalha óleo; aceso: 5 de dano de fogo |
| Ácido (frasco) | `g-acid.webp` | Comum | Arremesso 6 m: 2d6 de ácido |
| Fogo Alquímico (frasco) | `g-alchemistfire.webp` | Comum | Arremesso 6 m: 1d4 de fogo por turno até apagar (DES CD 10) |
| Antitoxina (frasco) | `g-antitoxin.webp` | Comum | Vantagem contra veneno por 1 hora |
| Veneno Básico (frasco) | `g-poison.webp` | Comum | Cobre uma arma ou 3 munições: 1d4 de veneno por 1 minuto |

### Equipamento — Montarias (8)

_O animal de corpo inteiro, de perfil, arreado (a carta do companheiro usa a mesma regra)._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Camelo | `g-mount-camel.webp` | Comum | Deslocamento 15 m · carga 240 kg |
| Burro ou Mula | `g-mount-donkey.webp` | Comum | Deslocamento 12 m · carga 210 kg |
| Elefante | `g-mount-elephant.webp` | Comum | Deslocamento 12 m · carga 660 kg |
| Cavalo de Tração | `g-mount-drafthorse.webp` | Comum | Deslocamento 12 m · carga 270 kg |
| Cavalo de Montaria | `g-mount-ridinghorse.webp` | Comum | Deslocamento 18 m · carga 240 kg |
| Mastim | `g-mount-mastiff.webp` | Comum | Deslocamento 12 m · carga 97 kg (montaria de pequenos) |
| Pônei | `g-mount-pony.webp` | Comum | Deslocamento 12 m · carga 112 kg |
| Cavalo de Guerra | `g-mount-warhorse.webp` | Comum | Deslocamento 18 m · carga 270 kg · treinado para combate |

### Equipamento — Arreios e veículos (16)

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Freio e Rédeas | `g-tack-bridle.webp` | Comum | Para conduzir a montaria |
| Ração Animal (1 dia) | `g-tack-feed.webp` | Comum | Alimento da montaria |
| Sela de Montaria | `g-tack-saddle-riding.webp` | Comum | Sela comum |
| Sela Militar | `g-tack-saddle-military.webp` | Comum | Vantagem para não cair da montaria |
| Sela de Carga | `g-tack-saddle-pack.webp` | Comum | Para animais de carga |
| Sela Exótica | `g-tack-saddle-exotic.webp` | Comum | Para montarias aquáticas ou voadoras |
| Alforjes | `g-tack-saddlebags.webp` | Comum | Bolsas para a montaria |
| Estábulo (1 dia) | `g-tack-stabling.webp` | Comum | Abrigo e cuidado para a montaria |
| Carroça | `g-veh-cart.webp` | Comum | Veículo de tração simples |
| Carroção | `g-veh-wagon.webp` | Comum | Veículo de carga grande |
| Carruagem | `g-veh-carriage.webp` | Comum | Transporte de passageiros |
| Biga | `g-veh-chariot.webp` | Comum | Carro de guerra |
| Trenó | `g-veh-sled.webp` | Comum | Para neve e gelo |
| Barco a Remo | `g-veh-rowboat.webp` | Comum | 2,25 km/h |
| Barco de Quilha | `g-veh-keelboat.webp` | Comum | 1,5 km/h · 1 tripulante, 6 passageiros |
| Veleiro | `g-veh-sailing.webp` | Comum | 3 km/h · 20 tripulantes, 20 passageiros |

### Itens mágicos — Poções e pergaminhos (34)

_Brilho mágico discreto na cor da raridade; runas ou detalhes que sugiram o poder do item._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Poção de Cura ★ | `p-heal.webp` | Comum | Recupera 2d4+2 PV |
| Poção de Cura Maior | `p-heal-greater.webp` | Incomum | Recupera 4d4+4 PV |
| Poção de Cura Superior | `p-heal-superior.webp` | Raro | Recupera 8d4+8 PV |
| Poção de Cura Suprema | `p-heal-supreme.webp` | Muito raro | Recupera 10d4+20 PV |
| Poção de Escalada | `p-climbing.webp` | Comum | 1 hora: deslocamento de escalada igual ao de caminhada e vantagem em Atletismo para escala |
| Poção de Amizade Animal | `p-animal.webp` | Incomum | 1 hora: conjura Amizade Animal à vontade (CD 13) |
| Poção de Sopro de Fogo | `p-firebreath.webp` | Incomum | 1 hora: ação bônus para cuspir fogo (4d6, DES CD 13 metade), 3 vezes |
| Poção de Crescimento | `p-growth.webp` | Incomum | 1d4 horas: efeito ampliar de Aumentar/Reduzir |
| Poção de Força de Gigante da Colina | `p-giant-hill.webp` | Incomum | 1 hora: FOR passa a 21 |
| Poção de Força de Gigante do Gelo | `p-giant-frost.webp` | Raro | 1 hora: FOR passa a 23 |
| Poção de Força de Gigante do Fogo | `p-giant-fire.webp` | Raro | 1 hora: FOR passa a 25 |
| Poção de Força de Gigante das Nuvens | `p-giant-cloud.webp` | Muito raro | 1 hora: FOR passa a 27 |
| Poção de Força de Gigante da Tempestade | `p-giant-storm.webp` | Lendário | 1 hora: FOR passa a 29 |
| Poção de Veneno | `p-poison.webp` | Incomum | Parece cura: 3d6 de veneno e envenenado (CON CD 13) |
| Poção de Resistência | `p-resistance.webp` | Incomum | 1 hora: resistência a um tipo de dano |
| Poção de Respirar na Água | `p-waterbreathing.webp` | Incomum | 1 hora: respira debaixo d’água |
| Poção de Diminuição | `p-diminution.webp` | Raro | 1d4 horas: efeito reduzir de Aumentar/Reduzir |
| Poção de Forma Gasosa | `p-gaseous.webp` | Raro | 1 hora: efeito de Forma Gasosa |
| Poção de Heroísmo | `p-heroism.webp` | Raro | 1 hora: 10 PV temporários e efeito de Bênção |
| Poção de Invulnerabilidade | `p-invulnerability.webp` | Raro | 1 minuto: resistência a todo dano |
| Poção de Ler Mentes | `p-mindreading.webp` | Raro | 1 hora: efeito de Detectar Pensamentos (CD 13) |
| Poção de Clarividência | `p-clairvoyance.webp` | Raro | Efeito de Clarividência |
| Poção de Voo | `p-flying.webp` | Muito raro | 1 hora: deslocamento de voo igual ao de caminhada |
| Poção de Invisibilidade | `p-invisibility.webp` | Muito raro | 1 hora: invisível (acaba ao atacar ou conjurar) |
| Poção da Longevidade | `p-longevity.webp` | Muito raro | Rejuvenesce 1d6+6 anos |
| Poção de Velocidade | `p-speed.webp` | Muito raro | 1 minuto: efeito de Velocidade |
| Poção de Vitalidade | `p-vitality.webp` | Muito raro | Remove exaustão e doenças; dados de vida curam o máximo por 24 h |
| Elixir da Saúde | `p-elixir-health.webp` | Raro | Cura doenças e as condições cego, surdo, paralisado e envenenado |
| Óleo da Escorregadia | `p-oil-slipperiness.webp` | Incomum | 8 horas: efeito de Movimentação Livre; ou vira área de Graxa |
| Óleo da Eterealidade | `p-oil-etherealness.webp` | Raro | 1 hora: efeito de Forma Etérea |
| Óleo da Afiação | `p-oil-sharpness.webp` | Muito raro | 1 hora: arma cortante/perfurante vira +3 |
| Filtro do Amor | `p-philter-love.webp` | Incomum | 1 hora: encantado pela primeira criatura que vir |
| Pergaminho de Magia (1º círculo) | `p-scroll-1.webp` | Comum | Conjura uma magia de 1º círculo da sua lista (CD 13, ataque +5) |
| Pergaminho de Magia (3º círculo) | `p-scroll-3.webp` | Incomum | Magia de 3º círculo (CD 15, ataque +7); fora da sua lista: teste de atributo |

### Itens mágicos — Anéis (13)

_Brilho mágico discreto na cor da raridade; runas ou detalhes que sugiram o poder do item._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Anel de Proteção | `m-ring-prot.webp` | Raro | +1 na CA e nas salvaguardas |
| Anel de Resistência | `m-ring-resist.webp` | Raro | Resistência a um tipo de dano (conforme a gema) |
| Anel da Queda Suave | `m-ring-feather.webp` | Raro | Cai 18 m por rodada, sem dano de queda |
| Anel da Ação Livre | `m-ring-freeaction.webp` | Raro | Terreno difícil não custa extra; magia não reduz seu deslocamento nem paralisa/impede |
| Anel do Salto | `m-ring-jumping.webp` | Incomum | Salto à vontade (ação bônus) |
| Anel do Escudo Mental | `m-ring-mindshield.webp` | Incomum | Imune a ler pensamentos, mentiras detectadas e localização por magia |
| Anel da Natação | `m-ring-swimming.webp` | Incomum | Deslocamento de natação de 12 m |
| Anel do Calor | `m-ring-warmth.webp` | Incomum | Resistência a frio; confortável até −45 °C |
| Anel de Andar na Água | `m-ring-waterwalking.webp` | Incomum | Anda sobre líquidos como se fossem chão |
| Anel da Evasão | `m-ring-evasion.webp` | Raro | 3 cargas: reação para passar numa salvaguarda de DES |
| Anel da Invisibilidade | `m-ring-invisibility.webp` | Lendário | Fica invisível à vontade (ação) |
| Anel de Armazenar Magias | `m-ring-spellstoring.webp` | Raro | Guarda até 5 círculos de magia para conjurar depois |
| Anel da Regeneração | `m-ring-regeneration.webp` | Muito raro | Recupera 1d6 PV a cada 10 minutos; membros perdidos voltam |

### Itens mágicos — Vestimentas (27)

_Brilho mágico discreto na cor da raridade; runas ou detalhes que sugiram o poder do item._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Manto de Proteção | `m-cloak-prot.webp` | Incomum | +1 na CA e nas salvaguardas |
| Manto do Deslocamento | `m-cloak.webp` | Raro | Ataques contra você têm desvantagem até você sofrer dano (volta no seu turno) |
| Manto Élfico | `m-cloak-elvenkind.webp` | Incomum | Capuz erguido: vantagem em Furtividade; Percepção para vê-lo em desvantagem |
| Manto do Morcego | `m-cloak-bat.webp` | Raro | Vantagem em Furtividade; voo de 12 m na penumbra/escuridão |
| Manto da Arraia | `m-cloak-manta.webp` | Incomum | Respira na água; natação de 18 m |
| Botas Élficas | `m-boots-elvenkind.webp` | Incomum | Passos silenciosos: vantagem em Furtividade para andar em silêncio |
| Botas de Caminhar e Saltar | `m-boots-striding.webp` | Incomum | Deslocamento mínimo de 9 m; salta 3× a distância |
| Botas da Velocidade | `m-boots-speed.webp` | Raro | Ação bônus: deslocamento dobrado e ataques de oportunidade em desvantagem (10 min/dia) |
| Botas Aladas | `m-boots-winged.webp` | Incomum | Voo igual ao deslocamento por até 4 horas/dia |
| Botas da Levitação | `m-boots-levitation.webp` | Raro | Levitação à vontade (em si mesmo) |
| Braçadeiras de Defesa | `m-bracers-defense.webp` | Raro | +2 na CA sem armadura e sem escudo |
| Braçadeiras do Arqueiro | `m-bracers-archery.webp` | Incomum | Proficiência em arco longo e curto; +2 de dano com eles |
| Manoplas de Força do Ogro | `m-gauntlets-ogre.webp` | Incomum | FOR passa a 19 |
| Tiara do Intelecto | `m-headband-intellect.webp` | Incomum | INT passa a 19 |
| Amuleto da Saúde | `m-amulet-health.webp` | Raro | CON passa a 19 |
| Cinto de Força de Gigante da Colina | `m-belt-hill.webp` | Raro | FOR passa a 21 |
| Cinto de Força de Gigante do Gelo | `m-belt-frost.webp` | Muito raro | FOR passa a 23 |
| Cinto de Força de Gigante do Fogo | `m-belt-fire.webp` | Muito raro | FOR passa a 25 |
| Cinto de Força de Gigante das Nuvens | `m-belt-cloud.webp` | Lendário | FOR passa a 27 |
| Cinto de Força de Gigante da Tempestade | `m-belt-storm.webp` | Lendário | FOR passa a 29 |
| Cinto Anão | `m-belt-dwarven.webp` | Raro | +2 CON (máx. 20), fala anão, visão no escuro 18 m |
| Óculos da Noite | `m-goggles-night.webp` | Incomum | Visão no escuro de 18 m |
| Olhos de Águia | `m-eyes-eagle.webp` | Incomum | Vantagem em Percepção pela visão |
| Periapto de Fechar Ferimentos | `m-periapt-wound.webp` | Incomum | Estabiliza sozinho; dados de vida curam o dobro |
| Periapto da Prova contra Veneno | `m-periapt-poison.webp` | Raro | Imune a dano de veneno e à condição envenenado |
| Pedra da Sorte | `m-stone-luck.webp` | Incomum | +1 em testes de atributo e salvaguardas |
| Manto do Arquimago | `m-robe-archmagi.webp` | Lendário | CA 15 + DES sem armadura; vantagem contra magia; +2 no ataque e CD de magia |

### Itens mágicos — Maravilhosos (21)

_Brilho mágico discreto na cor da raridade; runas ou detalhes que sugiram o poder do item._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Tocha Eterna | `m-torch-eternal.webp` | Comum | Chama mágica que não esquenta nem apaga |
| Bolsa Devoradora (Bolsa de Guardar) | `m-bag-holding.webp` | Incomum | Guarda 250 kg / 1,8 m³ e pesa sempre 7,5 kg |
| Mochila Prática de Heward | `m-haversack.webp` | Raro | Três bolsos mágicos; o item pedido está sempre no topo |
| Corda da Escalada | `m-rope-climbing.webp` | Incomum | 18 m de corda que se move e amarra ao comando |
| Bastão Imóvel | `m-immovable-rod.webp` | Incomum | Botão: fica parado no ar, aguentando até 4 toneladas |
| Decantador de Água Infinita | `m-decanter.webp` | Incomum | Jorra água doce ou salgada ao comando |
| Globo Flutuante | `m-driftglobe.webp` | Incomum | Luz ou Luz do Dia; flutua e segue você |
| Pedras Mensageiras | `m-sending-stones.webp` | Incomum | Par de pedras: Enviar Mensagem 1×/dia entre elas |
| Chapéu do Disfarce | `m-hat-disguise.webp` | Incomum | Disfarçar-se à vontade |
| Colar de Bolas de Fogo | `m-necklace-fireballs.webp` | Raro | Contas que viram Bola de Fogo (CD 15) ao serem arremessadas |
| Gema da Visão | `m-gem-seeing.webp` | Raro | 3 cargas: Visão da Verdade por 10 minutos |
| Pedra Ioun (Proteção) | `m-ioun-protection.webp` | Raro | +1 na CA enquanto orbita sua cabeça |
| Pedra Ioun (Percepção) | `m-ioun-awareness.webp` | Raro | Não pode ser surpreendido enquanto consciente |
| Pedra Ioun (Fortitude) | `m-ioun-fortitude.webp` | Muito raro | +2 CON (máx. 20) |
| Pedra Ioun (Discernimento) | `m-ioun-insight.webp` | Muito raro | +2 SAB (máx. 20) |
| Pedra Ioun (Intelecto) | `m-ioun-intellect.webp` | Muito raro | +2 INT (máx. 20) |
| Pedra Ioun (Liderança) | `m-ioun-leadership.webp` | Muito raro | +2 CAR (máx. 20) |
| Pedra Ioun (Força) | `m-ioun-strength.webp` | Muito raro | +2 FOR (máx. 20) |
| Pedra Ioun (Agilidade) | `m-ioun-agility.webp` | Muito raro | +2 DES (máx. 20) |
| Buraco Portátil | `m-portable-hole.webp` | Raro | Tecido que vira um buraco de 1,8 m de diâmetro e 3 m de fundo |
| Baralho das Muitas Coisas | `m-deck-many.webp` | Lendário | Sacar cartas traz sorte… ou desgraça |

### Itens mágicos — Varinhas, cajados e bastões (16)

_Brilho mágico discreto na cor da raridade; runas ou detalhes que sugiram o poder do item._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Varinha do Mago de Guerra +1 | `m-wand-warmage1.webp` | Incomum | +1 no ataque de magia; ignora meia cobertura |
| Varinha do Mago de Guerra +2 | `m-wand-warmage2.webp` | Raro | +2 no ataque de magia; ignora meia cobertura |
| Varinha do Mago de Guerra +3 | `m-wand-warmage3.webp` | Muito raro | +3 no ataque de magia; ignora meia cobertura |
| Bastão do Guardião do Pacto +1 | `m-rod-pact1.webp` | Incomum | Bruxo: +1 no ataque e na CD de magia; recupera 1 espaço 1×/dia |
| Bastão do Guardião do Pacto +2 | `m-rod-pact2.webp` | Raro | Bruxo: +2 no ataque e na CD de magia; recupera 1 espaço 1×/dia |
| Bastão do Guardião do Pacto +3 | `m-rod-pact3.webp` | Muito raro | Bruxo: +3 no ataque e na CD de magia; recupera 1 espaço 1×/dia |
| Varinha de Mísseis Mágicos | `m-wand-missiles.webp` | Incomum | 7 cargas: Mísseis Mágicos (recupera 1d6+1 ao amanhecer) |
| Varinha de Teia | `m-wand-web.webp` | Incomum | 7 cargas: Teia (CD 15) |
| Varinha de Detecção de Magia | `m-wand-magicdetection.webp` | Incomum | 3 cargas: Detectar Magia |
| Varinha de Bolas de Fogo | `m-wand-fireballs.webp` | Raro | 7 cargas: Bola de Fogo (CD 15) |
| Varinha de Relâmpagos | `m-wand-lightning.webp` | Raro | 7 cargas: Relâmpago (CD 15) |
| Varinha da Paralisia | `m-wand-paralysis.webp` | Raro | 7 cargas: raio paralisante (CON CD 15) |
| Cajado da Cura | `m-staff-healing.webp` | Raro | 10 cargas: Curar Ferimentos, Restauração Menor, Curar Ferimentos em Massa |
| Cajado do Fogo | `m-staff-fire.webp` | Muito raro | Resistência a fogo; 10 cargas: Mãos Flamejantes, Bola de Fogo, Muralha de Fogo |
| Cajado do Gelo | `m-staff-frost.webp` | Muito raro | Resistência a frio; 10 cargas: Névoa Obscurecente, Tempestade de Gelo, Cone do Frio |
| Cajado do Poder | `m-staff-power.webp` | Muito raro | +2 na CA, salvaguardas e ataque de magia; 20 cargas de magias |

### Itens mágicos — Armas mágicas (10)

_Brilho mágico discreto na cor da raridade; runas ou detalhes que sugiram o poder do item._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Língua de Fogo (Espada Longa) | `mw-flametongue.webp` | Raro | Ação bônus: acende a lâmina — +2d6 de fogo em cada acerto; luz de 12 m |
| Marca Gélida (Espada Longa) | `mw-frostbrand.webp` | Muito raro | +1d6 de frio em cada acerto; resistência a fogo |
| Lâmina Solar | `mw-sunblade.webp` | Raro | Espada longa de luz +2 (acuidade), radiante; +1d8 contra mortos-vivos |
| Adaga do Veneno | `mw-daggervenom.webp` | Raro | Adaga +1; 1×/dia: +2d10 de veneno e envenenado (CON CD 15) |
| Azagaia do Relâmpago | `mw-javelin-lightning.webp` | Incomum | Vira um raio: linha de 36 m com 4d6 elétrico (DES CD 13); +4d6 no alvo |
| Maça da Ruptura | `mw-mace-disruption.webp` | Raro | +2d6 radiante contra corruptores e mortos-vivos |
| Machado do Berserker | `mw-berserker-axe.webp` | Raro | Machado +1; +1 PV por nível; amaldiçoado (fúria ao ser ferido) |
| Arco do Juramento | `mw-oathbow.webp` | Muito raro | Arco longo: inimigo jurado — vantagem e +3d6 perfurante |
| Vingadora Sagrada | `mw-holyavenger.webp` | Lendário | Espada longa +3 (Paladino); +2d10 radiante contra corruptores e mortos-vivos; aura de resi |
| Espada Vorpal | `mw-vorpal.webp` | Lendário | Espada cortante +3; 20 natural pode decapitar |

### Itens mágicos — Armaduras mágicas (6)

_Brilho mágico discreto na cor da raridade; runas ou detalhes que sugiram o poder do item._

| Item | Arquivo | Raridade | Nota |
| --- | --- | --- | --- |
| Cota de Malha de Mithral | `ma-mithral.webp` | Incomum | CA 16 · sem requisito de FOR e sem desvantagem em Furtividade |
| Armadura de Placas de Adamante | `ma-adamantine.webp` | Incomum | CA 18 · acertos críticos contra você viram acertos normais |
| Camisão Élfico | `ma-elven-chain.webp` | Raro | Camisão de malha +1 · conta como armadura leve (DES sem limite) |
| Armadura de Escamas de Dragão | `ma-dragonscale.webp` | Muito raro | Brunea +1 · resistência ao tipo do dragão; vantagem contra presença aterradora |
| Escudo Sentinela | `ms-sentinel.webp` | Incomum | +2 CA · vantagem em iniciativa e Percepção |
| Escudo Animado | `ms-animated.webp` | Muito raro | +2 CA · flutua e protege sozinho por 1 minuto |
