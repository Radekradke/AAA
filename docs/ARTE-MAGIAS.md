# Arte das magias: lista completa

Lista das **476 magias** da Ficha Viva (Livro do Jogador, Xanathar e Tasha), com o nome de arquivo e o nome em inglês de cada uma, que é o que vai no prompt. A arte aparece para todo mundo como a carta da magia.

**Como usar:** gere a imagem e salve em `src/assets/magias/` com o nome da coluna **Arquivo** (ex.: `sp-bolafogo.webp`). O app passa a usá-la sozinho:

- na carta ao lado dos detalhes da magia (passar o mouse ou segurar no celular);
- na aba **Magias**, no **Jogar** e nas magias concedidas por itens.

A moldura da carta segue o círculo, nas mesmas cores de raridade dos itens: truque **comum**, 1º–2º **incomum**, 3º–5º **raro**, 6º–8º **muito raro**, 9º **lendário**.

---

## 1. O DNA do estilo

| Elemento | Como deve ser |
| --- | --- |
| **Traço** | O mesmo dos retratos, do bestiário e dos itens: ilustração anime/manhwa semi-realista, *splash art* de fantasia sombria, line art fina, cel shading com sombras duras. |
| **Assunto** | **O efeito da magia** em primeiro plano: a explosão, o raio, o escudo, a runa, a criatura invocada. Pode ter **mãos ou uma silhueta pequena e sem rosto** só quando a magia precisa de um conjurador ou de um alvo para ser entendida (ex.: Imobilizar Pessoa). Nunca um personagem reconhecível. |
| **Enquadramento** | Retrato **4:5** (480×600 basta; até 800×1000). O efeito centralizado, ocupando ~70% da altura, lendo bem em miniatura. |
| **Fundo** | Escuro e simples (**cinza-carvão** a quase preto), sem cenário detalhado. A própria luz da magia ilumina a cena. A carta coloca a borda e a cor do círculo por cima. |
| **Cor** | A cor-guia da **escola** (tabela abaixo) domina; o elemento do dano manda quando existir (fogo laranja, frio azul-gelo, raio branco-azulado, ácido verde-limão, veneno verde-escuro, necrótico verde-doentio, radiante dourado, trovão azul-acinzentado com ondas, energia violeta). |
| **Proibido** | Texto, letras legíveis, logo, assinatura, moldura desenhada, personagem com rosto. |

## 2. Prompt-mestre

Troque `[MAGIA]` pelo **nome em inglês** da lista e `[ESCOLA]` pela pista visual da escola (tabela da seção 3).

```text
Fantasy RPG spell card illustration in semi-realistic anime / manhwa gacha splash-art style.
Subject: the D&D spell "[MAGIA]" shown as its magical effect, dramatic and readable at small size,
[ESCOLA].
Vertical 4:5 frame, the effect centered and filling about 70% of the height,
crisp fine line art, hard cel shading with angular shadows, glowing magical light as the main light source,
dark charcoal near-black background, no detailed scenery, no frame, no text.
If a caster or target is needed, only hands or a small faceless silhouette.
```

**Negativo:**

```text
text, letters, runes that read as words, watermark, logo, signature, frame, border, card template,
recognizable character, face close-up, crowd, busy background, cropped effect, blurry, 3d render, photorealistic, chibi
```

## 3. Cor e pista de cada escola

| Escola | Cor-guia | Pista visual (`[ESCOLA]`) |
| --- | --- | --- |
| Abjuração | azul-prateado | `protective wards, translucent hexagonal barriers, pale silver-blue light` |
| Adivinhação | prata e violeta | `all-seeing eyes, stars and crystal lenses, silver-violet light` |
| Conjuração | dourado e turquesa | `summoning circle, glowing portal, golden-teal light, materializing shapes` |
| Encantamento | rosa-magenta | `swirling charm sigils around the mind, soft pink-magenta glow, hypnotic spirals` |
| Evocação | branco e laranja intenso | `raw elemental energy bursting outward, intense white-hot core, sparks` |
| Ilusão | lavanda prismática | `shimmering mirror shards, prismatic lavender light, things half real` |
| Necromancia | verde-doentio e preto | `sickly green necrotic mist, shadows, bone motifs, cold dim light` |
| Transmutação | âmbar e ouro | `alchemical transformation, amber-gold spirals, matter changing shape` |

## 4. Por onde começar

As magias marcadas com **★** (30) são as que quase toda ficha nova de conjurador tem (truques e 1º círculo mais escolhidos). Comece por elas; depois siga círculo por círculo.

## 5. A lista

### Truques (44) · moldura comum

| Magia | Arquivo | Nome em inglês (prompt) | Escola | Livro |
| --- | --- | --- | --- | --- |
| Amizade | `phb-friends.webp` | Friends | Encantamento | PHB |
| Arte Druídica | `phb-druidcraft.webp` | Druidcraft | Transmutação | PHB |
| Bordão Místico ★ | `phb-shillelagh.webp` | Shillelagh | Transmutação | PHB |
| Chama Sagrada ★ | `sp-chama.webp` | Sacred Flame | Evocação | PHB |
| Chicote de Espinhos | `phb-thorn-whip.webp` | Thorn Whip | Transmutação | PHB |
| Consertar | `phb-mending.webp` | Mending | Transmutação | PHB |
| Controlar Chamas | `xge-control-flames.webp` | Control Flames | Transmutação | Xanathar |
| Criar Fogueira | `xge-create-bonfire.webp` | Create Bonfire | Conjuração | Xanathar |
| Dobre pelos Mortos ★ | `xge-toll-the-dead.webp` | Toll the Dead | Necromancia | Xanathar |
| Estabilizar Criatura | `sp-estabilizar.webp` | Spare the Dying | Necromancia | PHB |
| Estrondo | `xge-thunderclap.webp` | Thunderclap | Evocação | Xanathar |
| Explosão de Espadas | `tce-sword-burst.webp` | Sword Burst | Conjuração | Tasha |
| Globos de Luz | `phb-dancing-lights.webp` | Dancing Lights | Evocação | PHB |
| Golpe Certeiro | `phb-true-strike.webp` | True Strike | Adivinhação | PHB |
| Ilusão Menor | `sp-ilusao.webp` | Minor Illusion | Ilusão | PHB |
| Infestação | `xge-infestation.webp` | Infestation | Conjuração | Xanathar |
| Isca Elétrica | `tce-lightning-lure.webp` | Lightning Lure | Evocação | Tasha |
| Lâmina de Chamas Verdes | `tce-green-flame-blade.webp` | Green Flame Blade | Evocação | Tasha |
| Lâmina Trovejante | `tce-booming-blade.webp` | Booming Blade | Evocação | Tasha |
| Lasca Mental | `tce-mind-sliver.webp` | Mind Sliver | Encantamento | Tasha |
| Lufada | `xge-gust.webp` | Gust | Transmutação | Xanathar |
| Luz ★ | `sp-luz.webp` | Light | Evocação | PHB |
| Mãos Mágicas ★ | `sp-maosmagicas.webp` | Mage Hand | Conjuração | PHB |
| Mensagem | `phb-message.webp` | Message | Transmutação | PHB |
| Moldar Água | `xge-shape-water.webp` | Shape Water | Transmutação | Xanathar |
| Moldar Terra | `xge-mold-earth.webp` | Mold Earth | Transmutação | Xanathar |
| Orientação ★ | `sp-orientacao.webp` | Guidance | Adivinhação | PHB |
| Palavra Radiante | `xge-word-of-radiance.webp` | Word of Radiance | Evocação | Xanathar |
| Pedra Mágica | `xge-magic-stone.webp` | Magic Stone | Transmutação | Xanathar |
| Prestidigitação ★ | `sp-prestidigitacao.webp` | Prestidigitation | Transmutação | PHB |
| Produzir Chama ★ | `sp-produzirchama.webp` | Produce Flame | Conjuração | PHB |
| Proteção contra Lâminas | `phb-blade-ward.webp` | Blade Ward | Abjuração | PHB |
| Queimadura de Frio | `xge-frostbite.webp` | Frostbite | Evocação | Xanathar |
| Raio de Fogo ★ | `sp-firebolt.webp` | Fire Bolt | Evocação | PHB |
| Raio de Gelo ★ | `sp-raygelo.webp` | Ray of Frost | Evocação | PHB |
| Rajada de Veneno | `phb-poison-spray.webp` | Poison Spray | Conjuração | PHB |
| Rajada Mística ★ | `sp-eldritch.webp` | Eldritch Blast | Evocação | PHB |
| Resistência | `phb-resistance.webp` | Resistance | Abjuração | PHB |
| Respingo Ácido | `sp-acidoespirito.webp` | Acid Splash | Conjuração | PHB |
| Selvageria Primal | `xge-primal-savagery.webp` | Primal Savagery | Transmutação | Xanathar |
| Taumaturgia | `phb-thaumaturgy.webp` | Thaumaturgy | Transmutação | PHB |
| Toque Chocante ★ | `phb-shocking-grasp.webp` | Shocking Grasp | Evocação | PHB |
| Toque Gélido | `sp-toquegelido.webp` | Chill Touch | Necromancia | PHB |
| Zombaria Viciosa ★ | `sp-zombaria.webp` | Vicious Mockery | Encantamento | PHB |

### 1º círculo (73) · moldura incomum

| Magia | Arquivo | Nome em inglês (prompt) | Escola | Livro |
| --- | --- | --- | --- | --- |
| Absorver Elementos | `xge-absorb-elements.webp` | Absorb Elements | Abjuração | Xanathar |
| Alarme | `phb-alarm.webp` | Alarm | Abjuração | PHB |
| Amizade Animal | `phb-animal-friendship.webp` | Animal Friendship | Encantamento | PHB |
| Área Escorregadia | `phb-grease.webp` | Grease | Conjuração | PHB |
| Armadura Arcana ★ | `sp-armaduraarcana.webp` | Mage Armor | Abjuração | PHB |
| Armadura de Agathys | `phb-armor-agathys.webp` | Armor of Agathys | Abjuração | PHB |
| Bênção ★ | `sp-bencao.webp` | Bless | Encantamento | PHB |
| Bom Fruto ★ | `phb-goodberry.webp` | Goodberry | Transmutação | PHB |
| Braços de Hadar | `phb-arms-hadar.webp` | Arms of Hadar | Conjuração | PHB |
| Bruxaria ★ | `phb-hex.webp` | Hex | Encantamento | PHB |
| Catapulta | `xge-catapult.webp` | Catapult | Transmutação | Xanathar |
| Causar Medo | `xge-cause-fear.webp` | Cause Fear | Necromancia | Xanathar |
| Cerimônia | `xge-ceremony.webp` | Ceremony | Abjuração | Xanathar |
| Comando ★ | `sp-comando.webp` | Command | Encantamento | PHB |
| Compreender Idiomas | `phb-comprehend-languages.webp` | Comprehend Languages | Adivinhação | PHB |
| Constrição ★ | `phb-entangle.webp` | Entangle | Conjuração | PHB |
| Convocar Familiar | `phb-find-familiar.webp` | Find Familiar | Conjuração | PHB |
| Criar ou Destruir Água | `sp-criaragua.webp` | Create or Destroy Water | Transmutação | PHB |
| Curar Ferimentos ★ | `sp-curar.webp` | Cure Wounds | Evocação | PHB |
| Destruição Colérica | `phb-wrathful-smite.webp` | Wrathful Smite | Evocação | PHB |
| Destruição Lancinante | `phb-searing-smite.webp` | Searing Smite | Evocação | PHB |
| Destruição Trovejante | `phb-thunderous-smite.webp` | Thunderous Smite | Evocação | PHB |
| Detectar Magia ★ | `sp-detectar.webp` | Detect Magic | Adivinhação | PHB |
| Detectar o Bem e o Mal | `phb-detect-evil-good.webp` | Detect Evil and Good | Adivinhação | PHB |
| Detectar Veneno e Doença | `phb-detect-poison.webp` | Detect Poison | Adivinhação | PHB |
| Disco Flutuante de Tenser | `phb-floating-disk.webp` | Floating Disk | Conjuração | PHB |
| Disfarçar-se | `phb-disguise-self.webp` | Disguise Self | Ilusão | PHB |
| Duelo Compelido | `phb-compelled-duel.webp` | Compelled Duel | Encantamento | PHB |
| Enfeitiçar Pessoa | `sp-enfeiticar.webp` | Charm Person | Encantamento | PHB |
| Escrita Ilusória | `phb-illusory-script.webp` | Illusory Script | Ilusão | PHB |
| Escudo Arcano ★ | `sp-escudo.webp` | Shield | Abjuração | PHB |
| Escudo da Fé | `sp-escudofe.webp` | Shield of Faith | Abjuração | PHB |
| Faca de Gelo | `xge-ice-knife.webp` | Ice Knife | Conjuração | Xanathar |
| Falar com Animais | `phb-speak-animals.webp` | Speak with Animals | Adivinhação | PHB |
| Favor Divino | `phb-divine-favor.webp` | Divine Favor | Evocação | PHB |
| Fogo das Fadas ★ | `sp-fadas.webp` | Faerie Fire | Evocação | PHB |
| Golpe Constritor | `phb-ensnaring-strike.webp` | Ensnaring Strike | Conjuração | PHB |
| Golpe Zéfiro | `xge-zephyr-strike.webp` | Zephyr Strike | Transmutação | Xanathar |
| Heroísmo | `sp-heroismo.webp` | Heroism | Encantamento | PHB |
| Identificação | `phb-identify.webp` | Identify | Adivinhação | PHB |
| Imagem Silenciosa | `phb-silent-image.webp` | Silent Image | Ilusão | PHB |
| Infligir Ferimentos | `phb-inflict-wounds.webp` | Inflict Wounds | Necromancia | PHB |
| Infusão Cáustica de Tasha | `tce-tashas-caustic-brew.webp` | Tasha's Caustic Brew | Evocação | Tasha |
| Laço | `xge-snare.webp` | Snare | Abjuração | Xanathar |
| Laço Animal | `xge-beast-bond.webp` | Beast Bond | Adivinhação | Xanathar |
| Leque Cromático | `phb-color-spray.webp` | Color Spray | Ilusão | PHB |
| Mãos Flamejantes ★ | `sp-flechacida.webp` | Burning Hands | Evocação | PHB |
| Marca do Caçador ★ | `phb-hunters-mark.webp` | Hunter's Mark | Adivinhação | PHB |
| Mísseis Mágicos ★ | `sp-misseis.webp` | Magic Missile | Evocação | PHB |
| Névoa Obscurecente | `sp-nevoa.webp` | Fog Cloud | Conjuração | PHB |
| Onda Trovejante ★ | `sp-ondatrov.webp` | Thunderwave | Evocação | PHB |
| Orbe Cromático | `phb-chromatic-orb.webp` | Chromatic Orb | Evocação | PHB |
| Palavra Curativa ★ | `sp-palavracura.webp` | Healing Word | Evocação | PHB |
| Passos Longos | `phb-longstrider.webp` | Longstrider | Transmutação | PHB |
| Perdição | `sp-perdicao.webp` | Bane | Encantamento | PHB |
| Proteção contra o Bem e o Mal | `phb-prot-evil-good.webp` | Protection from Evil and Good | Abjuração | PHB |
| Purificar Alimentos e Bebidas | `phb-purify-food.webp` | Purify Food and Drink | Transmutação | PHB |
| Queda Suave | `phb-feather-fall.webp` | Feather Fall | Transmutação | PHB |
| Raio Adoecente | `phb-ray-sickness.webp` | Ray of Sickness | Necromancia | PHB |
| Raio de Bruxa | `phb-witch-bolt.webp` | Witch Bolt | Evocação | PHB |
| Raio do Caos | `xge-chaos-bolt.webp` | Chaos Bolt | Evocação | Xanathar |
| Raio Guiador ★ | `phb-guiding-bolt.webp` | Guiding Bolt | Evocação | PHB |
| Recuo Acelerado | `phb-expeditious-retreat.webp` | Expeditious Retreat | Transmutação | PHB |
| Repreensão Infernal | `sp-repreensao.webp` | Hellish Rebuke | Evocação | PHB |
| Riso Histérico de Tasha | `phb-hideous-laughter.webp` | Hideous Laughter | Encantamento | PHB |
| Saltar | `sp-saltar.webp` | Jump | Transmutação | PHB |
| Santuário | `phb-sanctuary.webp` | Sanctuary | Abjuração | PHB |
| Saraivada de Espinhos | `phb-hail-thorns.webp` | Hail of Thorns | Conjuração | PHB |
| Servo Invisível | `phb-unseen-servant.webp` | Unseen Servant | Conjuração | PHB |
| Sono ★ | `sp-sono.webp` | Sleep | Encantamento | PHB |
| Sussurros Dissonantes | `phb-dissonant-whispers.webp` | Dissonant Whispers | Encantamento | PHB |
| Tremor de Terra | `xge-earth-tremor.webp` | Earth Tremor | Evocação | Xanathar |
| Vitalidade Falsa | `phb-false-life.webp` | False Life | Necromancia | PHB |

### 2º círculo (73) · moldura incomum

| Magia | Arquivo | Nome em inglês (prompt) | Escola | Livro |
| --- | --- | --- | --- | --- |
| Abrasador de Aganazzar | `xge-aganazzars-scorcher.webp` | Aganazzar's Scorcher | Evocação | Xanathar |
| Acalmar Emoções | `phb-calm-emotions.webp` | Calm Emotions | Encantamento | PHB |
| Alterar-se | `phb-alter-self.webp` | Alter Self | Transmutação | PHB |
| Ampliar/Reduzir | `sp-aumentar.webp` | Enlarge/Reduce | Transmutação | PHB |
| Aprimorar Habilidade | `phb-enhance-ability.webp` | Enhance Ability | Transmutação | PHB |
| Arma Espiritual | `sp-espiritual.webp` | Spiritual Weapon | Evocação | PHB |
| Arma Mágica | `phb-magic-weapon.webp` | Magic Weapon | Transmutação | PHB |
| Arrombar | `phb-knock.webp` | Knock | Transmutação | PHB |
| Augúrio | `phb-augury.webp` | Augury | Adivinhação | PHB |
| Aura Mágica de Nystul | `phb-magic-aura.webp` | Magic Aura | Ilusão | PHB |
| Auxílio | `phb-aid.webp` | Aid | Abjuração | PHB |
| Boca Encantada | `phb-magic-mouth.webp` | Magic Mouth | Ilusão | PHB |
| Cativar | `phb-enthrall.webp` | Enthrall | Encantamento | PHB |
| Cegueira/Surdez | `phb-blindness.webp` | Blindness | Necromancia | PHB |
| Chama Contínua | `phb-continual-flame.webp` | Continual Flame | Evocação | PHB |
| Chicote Mental de Tasha | `tce-tashas-mind-whip.webp` | Tasha's Mind Whip | Encantamento | Tasha |
| Convocar Montaria | `phb-find-steed.webp` | Find Steed | Conjuração | PHB |
| Cordão de Flechas | `phb-cordon-arrows.webp` | Cordon Arrows | Transmutação | PHB |
| Coroa da Loucura | `phb-crown-madness.webp` | Crown of Madness | Encantamento | PHB |
| Crescer Espinhos | `phb-spike-growth.webp` | Spike Growth | Transmutação | PHB |
| Despedaçar | `phb-shatter.webp` | Shatter | Evocação | PHB |
| Destruição Marcante | `phb-branding-smite.webp` | Branding Smite | Evocação | PHB |
| Detectar Pensamentos | `phb-detect-thoughts.webp` | Detect Thoughts | Adivinhação | PHB |
| Encontrar Armadilhas | `phb-find-traps.webp` | Find Traps | Adivinhação | PHB |
| Enxame de Bolas de Neve de Snilloc | `xge-snillocs-snowball-swarm.webp` | Snilloc's Snowball Swarm | Evocação | Xanathar |
| Escrita Celeste | `xge-skywrite.webp` | Skywrite | Transmutação | Xanathar |
| Escuridão | `phb-darkness.webp` | Darkness | Evocação | PHB |
| Esfera Flamejante | `phb-flaming-sphere.webp` | Flaming Sphere | Conjuração | PHB |
| Espinho Mental | `xge-mind-spike.webp` | Mind Spike | Adivinhação | Xanathar |
| Espírito Curador | `xge-healing-spirit.webp` | Healing Spirit | Conjuração | Xanathar |
| Esquentar Metal | `phb-heat-metal.webp` | Heat Metal | Transmutação | PHB |
| Flecha Ácida de Melf | `sp-flechacidamelf.webp` | Melf's Acid Arrow | Evocação | PHB |
| Força Fantasmagórica | `phb-phantasmal-force.webp` | Phantasmal Force | Ilusão | PHB |
| Imagem Espelhada | `sp-espelho.webp` | Mirror Image | Ilusão | PHB |
| Imobilizar Pessoa | `sp-segurar.webp` | Hold Person | Encantamento | PHB |
| Invisibilidade | `sp-invisibilidade.webp` | Invisibility | Ilusão | PHB |
| Invocar Fera | `tce-summon-beast.webp` | Summon Beast | Conjuração | Tasha |
| Lâmina das Sombras | `xge-shadow-blade.webp` | Shadow Blade | Ilusão | Xanathar |
| Lâmina Flamejante | `phb-flame-blade.webp` | Flame Blade | Evocação | PHB |
| Levitação | `phb-levitate.webp` | Levitate | Transmutação | PHB |
| Localizar Animais ou Plantas | `phb-locate-animals.webp` | Locate Animals or Plants | Adivinhação | PHB |
| Localizar Objeto | `phb-locate-object.webp` | Locate Object | Adivinhação | PHB |
| Lufada de Vento | `phb-gust-wind.webp` | Gust of Wind | Evocação | PHB |
| Mensageiro Animal | `phb-animal-messenger.webp` | Animal Messenger | Encantamento | PHB |
| Nublar | `phb-blur.webp` | Blur | Ilusão | PHB |
| Nuvem de Adagas | `phb-cloud-daggers.webp` | Cloud of Daggers | Conjuração | PHB |
| Oração de Cura | `phb-prayer-healing.webp` | Prayer of Healing | Evocação | PHB |
| Passo Enevoado | `sp-passos.webp` | Misty Step | Conjuração | PHB |
| Passos sem Pegadas | `phb-pass-without-trace.webp` | Pass Without Trace | Abjuração | PHB |
| Patas de Aranha | `phb-spider-climb.webp` | Spider Climb | Transmutação | PHB |
| Pele de Árvore | `phb-barkskin.webp` | Barkskin | Transmutação | PHB |
| Pirotecnia | `xge-pyrotechnics.webp` | Pyrotechnics | Transmutação | Xanathar |
| Prender à Terra | `xge-earthbind.webp` | Earthbind | Transmutação | Xanathar |
| Proteção contra Veneno | `phb-protection-poison.webp` | Protection from Poison | Abjuração | PHB |
| Punho de Terra de Maximilian | `xge-maximilians-earthen-grasp.webp` | Maximilian's Earthen Grasp | Transmutação | Xanathar |
| Raio Ardente | `sp-calorabrasante.webp` | Scorching Ray | Evocação | PHB |
| Raio do Enfraquecimento | `sp-aterrorizar.webp` | Ray of Enfeeblement | Necromancia | PHB |
| Raio Lunar | `phb-moonbeam.webp` | Moonbeam | Evocação | PHB |
| Redemoinho de Poeira | `xge-dust-devil.webp` | Dust Devil | Conjuração | Xanathar |
| Repouso Tranquilo | `phb-gentle-repose.webp` | Gentle Repose | Necromancia | PHB |
| Restauração Menor | `sp-restauracao.webp` | Lesser Restoration | Abjuração | PHB |
| Sentido Bestial | `phb-beast-sense.webp` | Beast Sense | Adivinhação | PHB |
| Silêncio | `phb-silence.webp` | Silence | Ilusão | PHB |
| Sopro de Dragão | `xge-dragons-breath.webp` | Dragon's Breath | Transmutação | Xanathar |
| Sugestão | `phb-suggestion.webp` | Suggestion | Encantamento | PHB |
| Teia | `sp-teiaaranha.webp` | Web | Conjuração | PHB |
| Tranca Arcana | `phb-arcane-lock.webp` | Arcane Lock | Abjuração | PHB |
| Truque de Corda | `phb-rope-trick.webp` | Rope Trick | Transmutação | PHB |
| Vento Protetor | `xge-warding-wind.webp` | Warding Wind | Evocação | Xanathar |
| Ver o Invisível | `phb-see-invisibility.webp` | See Invisibility | Adivinhação | PHB |
| Vínculo Protetor | `phb-warding-bond.webp` | Warding Bond | Abjuração | PHB |
| Visão no Escuro | `phb-darkvision.webp` | Darkvision | Transmutação | PHB |
| Zona da Verdade | `phb-zone-truth.webp` | Zone of Truth | Encantamento | PHB |

### 3º círculo (67) · moldura raro

| Magia | Arquivo | Nome em inglês (prompt) | Escola | Livro |
| --- | --- | --- | --- | --- |
| Acelerar | `sp-hipnose.webp` | Haste | Transmutação | PHB |
| Amedrontar | `sp-medo.webp` | Fear | Ilusão | PHB |
| Andar na Água | `phb-water-walk.webp` | Water Walk | Transmutação | PHB |
| Animar Mortos | `phb-animate-dead.webp` | Animate Dead | Necromancia | PHB |
| Arma Elemental | `phb-elemental-weapon.webp` | Elemental Weapon | Transmutação | PHB |
| Aura de Vitalidade | `phb-aura-vitality.webp` | Aura of Vitality | Evocação | PHB |
| Bola de Fogo | `sp-bolafogo.webp` | Fireball | Evocação | PHB |
| Círculo Mágico | `phb-magic-circle.webp` | Magic Circle | Abjuração | PHB |
| Clarividência | `phb-clairvoyance.webp` | Clairvoyance | Adivinhação | PHB |
| Conjurar Animais | `phb-conjure-animals.webp` | Conjure Animals | Conjuração | PHB |
| Conjurar Rajada | `phb-conjure-barrage.webp` | Conjure Barrage | Conjuração | PHB |
| Contramágica | `sp-contramagia.webp` | Counterspell | Abjuração | PHB |
| Convocar Relâmpagos | `phb-call-lightning.webp` | Call Lightning | Conjuração | PHB |
| Crescimento de Plantas | `phb-plant-growth.webp` | Plant Growth | Transmutação | PHB |
| Criar Alimentos e Água | `phb-create-food.webp` | Create Food | Conjuração | PHB |
| Destruição Cegante | `phb-blinding-smite.webp` | Blinding Smite | Evocação | PHB |
| Dissipar Magia | `sp-relampagosagrado.webp` | Dispel Magic | Abjuração | PHB |
| Enviar Mensagem | `phb-sending.webp` | Sending | Evocação | PHB |
| Erupção de Terra | `xge-erupting-earth.webp` | Erupting Earth | Transmutação | Xanathar |
| Espíritos Guardiões | `phb-spirit-guardians.webp` | Spirit Guardians | Conjuração | PHB |
| Falar com os Mortos | `phb-speak-dead.webp` | Speak with Dead | Necromancia | PHB |
| Falar com Plantas | `phb-speak-plants.webp` | Speak with Plants | Transmutação | PHB |
| Fingir-se de Morto | `phb-feign-death.webp` | Feign Death | Necromancia | PHB |
| Flecha Relampejante | `phb-lightning-arrow.webp` | Lightning Arrow | Transmutação | PHB |
| Flechas Flamejantes | `xge-flame-arrows.webp` | Flame Arrows | Transmutação | Xanathar |
| Fome de Hadar | `phb-hunger-hadar.webp` | Hunger of Hadar | Conjuração | PHB |
| Forma Gasosa | `phb-gaseous-form.webp` | Gaseous Form | Transmutação | PHB |
| Fortaleza do Intelecto | `tce-intellect-fortress.webp` | Intellect Fortress | Abjuração | Tasha |
| Fundir-se às Rochas | `phb-meld-stone.webp` | Meld Stone | Transmutação | PHB |
| Glifo de Proteção | `phb-glyph-warding.webp` | Glyph of Warding | Abjuração | PHB |
| Idiomas | `phb-tongues.webp` | Tongues | Adivinhação | PHB |
| Imagem Maior | `phb-major-image.webp` | Major Image | Ilusão | PHB |
| Inimigos por Toda Parte | `xge-enemies-abound.webp` | Enemies Abound | Encantamento | Xanathar |
| Invocar Cria das Sombras | `tce-summon-shadowspawn.webp` | Summon Shadowspawn | Conjuração | Tasha |
| Invocar Demônios Menores | `xge-summon-lesser-demons.webp` | Summon Lesser Demons | Conjuração | Xanathar |
| Invocar Fada | `tce-summon-fey.webp` | Summon Fey | Conjuração | Tasha |
| Invocar Morto-Vivo | `tce-summon-undead.webp` | Summon Undead | Necromancia | Tasha |
| Lentidão | `phb-slow.webp` | Slow | Transmutação | PHB |
| Luz do Dia | `phb-daylight.webp` | Daylight | Evocação | PHB |
| Manto do Cruzado | `phb-crusaders-mantle.webp` | Crusader's Mantle | Evocação | PHB |
| Manto Espiritual | `tce-spirit-shroud.webp` | Spirit Shroud | Necromancia | Tasha |
| Maremoto | `xge-tidal-wave.webp` | Tidal Wave | Conjuração | Xanathar |
| Meteoros Diminutos de Melf | `xge-melfs-minute-meteors.webp` | Melf's Minute Meteors | Evocação | Xanathar |
| Montaria Fantasmagórica | `phb-phantom-steed.webp` | Phantom Steed | Ilusão | PHB |
| Muralha de Água | `xge-wall-of-water.webp` | Wall of Water | Evocação | Xanathar |
| Muralha de Areia | `xge-wall-of-sand.webp` | Wall of Sand | Evocação | Xanathar |
| Muralha de Vento | `phb-wind-wall.webp` | Wind Wall | Evocação | PHB |
| Não Detecção | `phb-nondetection.webp` | Nondetection | Abjuração | PHB |
| Nevasca | `phb-sleet-storm.webp` | Sleet Storm | Conjuração | PHB |
| Névoa Fétida | `phb-stinking-cloud.webp` | Stinking Cloud | Conjuração | PHB |
| Padrão Hipnótico | `phb-hypnotic-pattern.webp` | Hypnotic Pattern | Ilusão | PHB |
| Palavra Curativa em Massa | `sp-palavracoragem.webp` | Mass Healing Word | Evocação | PHB |
| Passo Trovejante | `xge-thunder-step.webp` | Thunder Step | Conjuração | Xanathar |
| Pequena Cabana de Leomund | `phb-tiny-hut.webp` | Tiny Hut | Evocação | PHB |
| Piscar | `phb-blink.webp` | Blink | Transmutação | PHB |
| Proteção contra Energia | `phb-protection-energy.webp` | Protection from Energy | Abjuração | PHB |
| Relâmpago | `sp-relampago.webp` | Lightning Bolt | Evocação | PHB |
| Remover Maldição | `phb-remove-curse.webp` | Remove Curse | Abjuração | PHB |
| Respirar na Água | `phb-water-breathing.webp` | Water Breathing | Transmutação | PHB |
| Revivificar | `sp-revigorar.webp` | Revivify | Necromancia | PHB |
| Rogar Maldição | `phb-bestow-curse.webp` | Bestow Curse | Necromancia | PHB |
| Servo Minúsculo | `xge-tiny-servant.webp` | Tiny Servant | Transmutação | Xanathar |
| Sinal de Esperança | `phb-beacon-hope.webp` | Beacon of Hope | Abjuração | PHB |
| Soneca | `xge-catnap.webp` | Catnap | Encantamento | Xanathar |
| Toque Vampírico | `phb-vampiric-touch.webp` | Vampiric Touch | Necromancia | PHB |
| Transferência de Vida | `xge-life-transference.webp` | Life Transference | Necromancia | Xanathar |
| Voo | `sp-voo.webp` | Fly | Transmutação | PHB |

### 4º círculo (48) · moldura raro

| Magia | Arquivo | Nome em inglês (prompt) | Escola | Livro |
| --- | --- | --- | --- | --- |
| Adivinhação | `phb-divination.webp` | Divination | Adivinhação | PHB |
| Assassino Fantasmagórico | `phb-phantasmal-killer.webp` | Phantasmal Killer | Ilusão | PHB |
| Aura de Pureza | `phb-aura-purity.webp` | Aura of Purity | Abjuração | PHB |
| Aura de Vida | `phb-aura-life.webp` | Aura of Life | Abjuração | PHB |
| Banimento | `sp-banir.webp` | Banishment | Abjuração | PHB |
| Baú Secreto de Leomund | `phb-secret-chest.webp` | Secret Chest | Conjuração | PHB |
| Cão Fiel de Mordenkainen | `phb-faithful-hound.webp` | Faithful Hound | Conjuração | PHB |
| Compulsão | `phb-compulsion.webp` | Compulsion | Encantamento | PHB |
| Confusão | `phb-confusion.webp` | Confusion | Encantamento | PHB |
| Conjurar Elementais Menores | `phb-conjure-minor-elementals.webp` | Conjure Minor Elementals | Conjuração | PHB |
| Conjurar Seres da Floresta | `phb-conjure-woodland.webp` | Conjure Woodland | Conjuração | PHB |
| Controlar a Água | `phb-control-water.webp` | Control Water | Transmutação | PHB |
| Destruição Atordoante | `phb-staggering-smite.webp` | Staggering Smite | Encantamento | PHB |
| Dominar Besta | `phb-dominate-beast.webp` | Dominate Beast | Encantamento | PHB |
| Encontrar Corcel Maior | `xge-find-greater-steed.webp` | Find Greater Steed | Conjuração | Xanathar |
| Enfeitiçar Monstro | `xge-charm-monster.webp` | Charm Monster | Encantamento | Xanathar |
| Escudo de Fogo | `phb-fire-shield.webp` | Fire Shield | Evocação | PHB |
| Esfera Aquosa | `xge-watery-sphere.webp` | Watery Sphere | Conjuração | Xanathar |
| Esfera de Tempestade | `xge-storm-sphere.webp` | Storm Sphere | Evocação | Xanathar |
| Esfera Resiliente de Otiluke | `phb-resilient-sphere.webp` | Resilient Sphere | Evocação | PHB |
| Esfera Vitriólica | `xge-vitriolic-sphere.webp` | Vitriolic Sphere | Evocação | Xanathar |
| Fabricar | `phb-fabricate.webp` | Fabricate | Transmutação | PHB |
| Guardião da Fé | `phb-guardian-faith.webp` | Guardian of Faith | Conjuração | PHB |
| Guardião da Natureza | `xge-guardian-of-nature.webp` | Guardian of Nature | Transmutação | Xanathar |
| Inseto Gigante | `phb-giant-insect.webp` | Giant Insect | Transmutação | PHB |
| Invisibilidade Maior | `phb-greater-invisibility.webp` | Greater Invisibility | Ilusão | PHB |
| Invocar Aberração | `tce-summon-aberration.webp` | Summon Aberration | Conjuração | Tasha |
| Invocar Construto | `tce-summon-construct.webp` | Summon Construct | Conjuração | Tasha |
| Invocar Demônio Maior | `xge-summon-greater-demon.webp` | Summon Greater Demon | Conjuração | Xanathar |
| Invocar Elemental | `tce-summon-elemental.webp` | Summon Elemental | Conjuração | Tasha |
| Liberdade de Movimento | `sp-liberdade.webp` | Freedom of Movement | Abjuração | PHB |
| Localizar Criatura | `phb-locate-creature.webp` | Locate Creature | Adivinhação | PHB |
| Metamorfose | `phb-polymorph.webp` | Polymorph | Transmutação | PHB |
| Moldar Rochas | `phb-stone-shape.webp` | Stone Shape | Transmutação | PHB |
| Muralha de Fogo | `sp-muralha.webp` | Wall of Fire | Evocação | PHB |
| Olho Arcano | `phb-arcane-eye.webp` | Arcane Eye | Adivinhação | PHB |
| Pele de Pedra | `phb-stoneskin.webp` | Stoneskin | Abjuração | PHB |
| Porta Dimensional | `phb-dimension-door.webp` | Dimension Door | Conjuração | PHB |
| Praga | `phb-blight.webp` | Blight | Necromancia | PHB |
| Proteção contra a Morte | `phb-death-ward.webp` | Death Ward | Abjuração | PHB |
| Radiação Nauseante | `xge-sickening-radiance.webp` | Sickening Radiance | Evocação | Xanathar |
| Ruína Elemental | `xge-elemental-bane.webp` | Elemental Bane | Transmutação | Xanathar |
| Santuário Particular de Mordenkainen | `phb-private-sanctum.webp` | Private Sanctum | Abjuração | PHB |
| Sombra de Moil | `xge-shadow-of-moil.webp` | Shadow of Moil | Necromancia | Xanathar |
| Tempestade de Gelo | `sp-tempestade.webp` | Ice Storm | Evocação | PHB |
| Tentáculos Negros de Evard | `phb-black-tentacles.webp` | Black Tentacles | Conjuração | PHB |
| Terreno Alucinatório | `phb-hallucinatory-terrain.webp` | Hallucinatory Terrain | Ilusão | PHB |
| Vinha Constritora | `phb-grasping-vine.webp` | Grasping Vine | Conjuração | PHB |

### 5º círculo (57) · moldura raro

| Magia | Arquivo | Nome em inglês (prompt) | Escola | Livro |
| --- | --- | --- | --- | --- |
| Aljava Veloz | `phb-swift-quiver.webp` | Swift Quiver | Transmutação | PHB |
| Alvorada | `xge-dawn.webp` | Dawn | Evocação | Xanathar |
| Animar Objetos | `phb-animate-objects.webp` | Animate Objects | Transmutação | PHB |
| Arma Sagrada | `xge-holy-weapon.webp` | Holy Weapon | Evocação | Xanathar |
| Caminhar em Árvores | `phb-tree-stride.webp` | Tree Stride | Conjuração | PHB |
| Chamado Infernal | `xge-infernal-calling.webp` | Infernal Calling | Conjuração | Xanathar |
| Círculo de Poder | `phb-circle-power.webp` | Circle of Power | Abjuração | PHB |
| Círculo de Teletransporte | `phb-teleportation-circle.webp` | Teleportation Circle | Conjuração | PHB |
| Coluna de Chamas | `sp-coluna.webp` | Flame Strike | Evocação | PHB |
| Comunhão | `phb-commune.webp` | Commune | Adivinhação | PHB |
| Comunhão com a Natureza | `phb-commune-nature.webp` | Commune with Nature | Adivinhação | PHB |
| Concha Antivida | `phb-antilife-shell.webp` | Antilife Shell | Abjuração | PHB |
| Cone do Frio | `sp-conemar.webp` | Cone of Cold | Evocação | PHB |
| Conjurar Elemental | `phb-conjure-elemental.webp` | Conjure Elemental | Conjuração | PHB |
| Conjurar Saraivada | `phb-conjure-volley.webp` | Conjure Volley | Conjuração | PHB |
| Consagrar | `phb-hallow.webp` | Hallow | Evocação | PHB |
| Contágio | `phb-contagion.webp` | Contagion | Necromancia | PHB |
| Contatar Outro Plano | `phb-contact-plane.webp` | Contact Plane | Adivinhação | PHB |
| Controlar Ventos | `xge-control-winds.webp` | Control Winds | Transmutação | Xanathar |
| Criação | `phb-creation.webp` | Creation | Ilusão | PHB |
| Curar Ferimentos em Massa | `sp-curargrupo.webp` | Mass Cure Wounds | Evocação | PHB |
| Dança Macabra | `xge-danse-macabre.webp` | Danse Macabre | Necromancia | Xanathar |
| Despertar | `phb-awaken.webp` | Awaken | Transmutação | PHB |
| Despistar | `phb-mislead.webp` | Mislead | Ilusão | PHB |
| Destruição Banidora | `phb-banishing-smite.webp` | Banishing Smite | Abjuração | PHB |
| Dissipar o Bem e o Mal | `phb-dispel-evil-good.webp` | Dispel Evil and Good | Abjuração | PHB |
| Dominar Pessoa | `sp-dominar.webp` | Dominate Person | Encantamento | PHB |
| Enervação | `xge-enervation.webp` | Enervation | Necromancia | Xanathar |
| Estática Sináptica | `xge-synaptic-static.webp` | Synaptic Static | Encantamento | Xanathar |
| Fortalecer Perícia | `xge-skill-empowerment.webp` | Skill Empowerment | Transmutação | Xanathar |
| Fúria da Natureza | `xge-wrath-of-nature.webp` | Wrath of Nature | Evocação | Xanathar |
| Golpe Vento de Aço | `xge-steel-wind-strike.webp` | Steel Wind Strike | Conjuração | Xanathar |
| Imobilizar Monstro | `phb-hold-monster.webp` | Hold Monster | Encantamento | PHB |
| Imolação | `xge-immolation.webp` | Immolation | Evocação | Xanathar |
| Inundação de Energia Negativa | `xge-negative-energy-flood.webp` | Negative Energy Flood | Necromancia | Xanathar |
| Lendas e Histórias | `phb-legend-lore.webp` | Legend Lore | Adivinhação | PHB |
| Mão de Bigby | `phb-bigbys-hand.webp` | Bigby's Hand | Evocação | PHB |
| Missão | `phb-geas.webp` | Geas | Encantamento | PHB |
| Modificar Memória | `phb-modify-memory.webp` | Modify Memory | Encantamento | PHB |
| Muralha de Energia | `phb-wall-force.webp` | Wall of Force | Evocação | PHB |
| Muralha de Luz | `xge-wall-of-light.webp` | Wall of Light | Evocação | Xanathar |
| Muralha de Pedra | `phb-wall-stone.webp` | Wall of Stone | Evocação | PHB |
| Névoa Mortal | `phb-cloudkill.webp` | Cloudkill | Conjuração | PHB |
| Onda Destrutiva | `phb-destructive-wave.webp` | Destructive Wave | Evocação | PHB |
| Passagem pelas Paredes | `phb-passwall.webp` | Passwall | Transmutação | PHB |
| Passo Distante | `xge-far-step.webp` | Far Step | Conjuração | Xanathar |
| Praga de Insetos | `phb-insect-plague.webp` | Insect Plague | Conjuração | PHB |
| Reencarnar | `phb-reincarnate.webp` | Reincarnate | Transmutação | PHB |
| Restauração Maior | `phb-greater-restoration.webp` | Greater Restoration | Abjuração | PHB |
| Reviver os Mortos | `sp-revivificar.webp` | Raise Dead | Necromancia | PHB |
| Similaridade | `phb-seeming.webp` | Seeming | Ilusão | PHB |
| Sonho | `phb-dream.webp` | Dream | Ilusão | PHB |
| Telecinese | `phb-telekinesis.webp` | Telekinesis | Transmutação | PHB |
| Transmutar Rocha | `xge-transmute-rock.webp` | Transmute Rock | Transmutação | Xanathar |
| Vidência | `phb-scrying.webp` | Scrying | Adivinhação | PHB |
| Vínculo Planar | `phb-planar-binding.webp` | Planar Binding | Abjuração | PHB |
| Vínculo Telepático de Rary | `phb-telepathic-bond.webp` | Telepathic Bond | Adivinhação | PHB |

### 6º círculo (47) · moldura muito raro

| Magia | Arquivo | Nome em inglês (prompt) | Escola | Livro |
| --- | --- | --- | --- | --- |
| Aliado Planar | `phb-planar-ally.webp` | Planar Ally | Conjuração | PHB |
| Aparência Extraplanar de Tasha | `tce-tashas-otherworldly-guise.webp` | Tasha's Otherworldly Guise | Transmutação | Tasha |
| Banquete dos Heróis | `phb-heroes-feast.webp` | Heroes' Feast | Conjuração | PHB |
| Barreira de Lâminas | `phb-blade-barrier.webp` | Blade Barrier | Evocação | PHB |
| Bosque do Druida | `xge-druid-grove.webp` | Druid Grove | Abjuração | Xanathar |
| Caminhar no Vento | `phb-wind-walk.webp` | Wind Walk | Transmutação | PHB |
| Carne para Pedra | `phb-flesh-stone.webp` | Flesh to Stone | Transmutação | PHB |
| Círculo da Morte | `phb-circle-death.webp` | Circle of Death | Necromancia | PHB |
| Conjurar Fada | `phb-conjure-fey.webp` | Conjure Fey | Conjuração | PHB |
| Contingência | `phb-contingency.webp` | Contingency | Evocação | PHB |
| Convocação Instantânea de Drawmij | `phb-instant-summons.webp` | Instant Summons | Conjuração | PHB |
| Corrente de Relâmpagos | `phb-chain-lightning.webp` | Chain Lightning | Evocação | PHB |
| Criar Homúnculo | `xge-create-homunculus.webp` | Create Homunculus | Transmutação | Xanathar |
| Criar Mortos-Vivos | `phb-create-undead.webp` | Create Undead | Necromancia | PHB |
| Cura Completa | `phb-heal.webp` | Heal | Evocação | PHB |
| Dança Irresistível de Otto | `phb-irresistible-dance.webp` | Irresistible Dance | Encantamento | PHB |
| Desintegrar | `sp-desintegrar.webp` | Disintegrate | Transmutação | PHB |
| Dispersar | `xge-scatter.webp` | Scatter | Conjuração | Xanathar |
| Encontrar o Caminho | `phb-find-path.webp` | Find the Path | Adivinhação | PHB |
| Esfera Congelante de Otiluke | `phb-freezing-sphere.webp` | Freezing Sphere | Evocação | PHB |
| Gaiola de Almas | `xge-soul-cage.webp` | Soul Cage | Necromancia | Xanathar |
| Globo de Invulnerabilidade | `phb-globe-invulnerability.webp` | Globe Invulnerability | Abjuração | PHB |
| Guardas e Proteções | `phb-guards-wards.webp` | Guards and Wards | Abjuração | PHB |
| Ilusão Programada | `phb-programmed-illusion.webp` | Programmed Illusion | Ilusão | PHB |
| Investidura da Pedra | `xge-investiture-of-stone.webp` | Investiture of Stone | Transmutação | Xanathar |
| Investidura das Chamas | `xge-investiture-of-flame.webp` | Investiture of Flame | Transmutação | Xanathar |
| Investidura do Gelo | `xge-investiture-of-ice.webp` | Investiture of Ice | Transmutação | Xanathar |
| Investidura do Vento | `xge-investiture-of-wind.webp` | Investiture of Wind | Transmutação | Xanathar |
| Invocar Celestial | `tce-summon-celestial.webp` | Summon Celestial | Conjuração | Tasha |
| Invocar Corruptor | `tce-summon-fiend.webp` | Summon Fiend | Conjuração | Tasha |
| Mau-Olhado | `phb-eyebite.webp` | Eyebite | Necromancia | PHB |
| Mover Terra | `phb-move-earth.webp` | Move Earth | Transmutação | PHB |
| Muralha de Espinhos | `phb-wall-thorns.webp` | Wall of Thorns | Conjuração | PHB |
| Muralha de Gelo | `phb-wall-ice.webp` | Wall of Ice | Evocação | PHB |
| Ossos da Terra | `xge-bones-of-the-earth.webp` | Bones of the Earth | Transmutação | Xanathar |
| Palavra de Recordação | `phb-word-recall.webp` | Word of Recall | Conjuração | PHB |
| Portal Arcano | `phb-arcane-gate.webp` | Arcane Gate | Conjuração | PHB |
| Prejudicar | `phb-harm.webp` | Harm | Necromancia | PHB |
| Prisão Mental | `xge-mental-prison.webp` | Mental Prison | Ilusão | Xanathar |
| Proibição | `phb-forbiddance.webp` | Forbiddance | Abjuração | PHB |
| Proteção Primordial | `xge-primordial-ward.webp` | Primordial Ward | Abjuração | Xanathar |
| Raio Solar | `phb-sunbeam.webp` | Sunbeam | Evocação | PHB |
| Recipiente Arcano | `phb-magic-jar.webp` | Magic Jar | Necromancia | PHB |
| Sugestão em Massa | `phb-mass-suggestion.webp` | Mass Suggestion | Encantamento | PHB |
| Transformação de Tenser | `xge-tensers-transformation.webp` | Tenser's Transformation | Transmutação | Xanathar |
| Transporte pelas Plantas | `phb-transport-plants.webp` | Transport Plants | Conjuração | PHB |
| Visão da Verdade | `phb-true-seeing.webp` | True Seeing | Adivinhação | PHB |

### 7º círculo (25) · moldura muito raro

| Magia | Arquivo | Nome em inglês (prompt) | Escola | Livro |
| --- | --- | --- | --- | --- |
| Bola de Fogo Controlável | `phb-delayed-fireball.webp` | Delayed Fireball | Evocação | PHB |
| Conjurar Celestial | `phb-conjure-celestial.webp` | Conjure Celestial | Conjuração | PHB |
| Coroa de Estrelas | `xge-crown-of-stars.webp` | Crown of Stars | Evocação | Xanathar |
| Dedo da Morte | `phb-finger-death.webp` | Finger of Death | Necromancia | PHB |
| Espada de Mordenkainen | `phb-mordenkainens-sword.webp` | Mordenkainen's Sword | Evocação | PHB |
| Forma Etérea | `phb-etherealness.webp` | Etherealness | Transmutação | PHB |
| Inverter a Gravidade | `phb-reverse-gravity.webp` | Reverse Gravity | Transmutação | PHB |
| Isolamento | `phb-sequester.webp` | Sequester | Transmutação | PHB |
| Jaula de Energia | `phb-forcecage.webp` | Forcecage | Evocação | PHB |
| Mansão Magnífica de Mordenkainen | `phb-magnificent-mansion.webp` | Magnificent Mansion | Conjuração | PHB |
| Miragem Arcana | `phb-mirage-arcane.webp` | Mirage Arcane | Ilusão | PHB |
| Palavra de Poder: Dor | `xge-power-word-pain.webp` | Power Word Pain | Encantamento | Xanathar |
| Palavra Divina | `phb-divine-word.webp` | Divine Word | Evocação | PHB |
| Projetar Imagem | `phb-project-image.webp` | Project Image | Ilusão | PHB |
| Regeneração | `phb-regenerate.webp` | Regenerate | Transmutação | PHB |
| Ressurreição | `phb-resurrection.webp` | Resurrection | Necromancia | PHB |
| Símbolo | `phb-symbol.webp` | Symbol | Abjuração | PHB |
| Simulacro | `phb-simulacrum.webp` | Simulacrum | Ilusão | PHB |
| Sonho do Véu Azul | `tce-dream-of-the-blue-veil.webp` | Dream of the Blue Veil | Conjuração | Tasha |
| Spray Prismático | `phb-prismatic-spray.webp` | Prismatic Spray | Evocação | PHB |
| Teletransporte | `sp-teletransporte.webp` | Teleport | Conjuração | PHB |
| Tempestade de Fogo | `phb-fire-storm.webp` | Fire Storm | Evocação | PHB |
| Templo dos Deuses | `xge-temple-of-the-gods.webp` | Temple of the Gods | Conjuração | Xanathar |
| Turbilhão | `xge-whirlwind.webp` | Whirlwind | Evocação | Xanathar |
| Viagem Planar | `phb-plane-shift.webp` | Plane Shift | Conjuração | PHB |

### 8º círculo (22) · moldura muito raro

| Magia | Arquivo | Nome em inglês (prompt) | Escola | Livro |
| --- | --- | --- | --- | --- |
| Antipatia/Simpatia | `phb-antipathy-sympathy.webp` | Antipathy/Sympathy | Encantamento | PHB |
| Aura Sagrada | `phb-holy-aura.webp` | Holy Aura | Abjuração | PHB |
| Campo Antimagia | `phb-antimagic-field.webp` | Antimagic Field | Abjuração | PHB |
| Clone | `phb-clone.webp` | Clone | Necromancia | PHB |
| Controlar o Clima | `phb-control-weather.webp` | Control Weather | Transmutação | PHB |
| Dominar Monstro | `phb-dominate-monster.webp` | Dominate Monster | Encantamento | PHB |
| Dragão Ilusório | `xge-illusory-dragon.webp` | Illusory Dragon | Ilusão | Xanathar |
| Enfraquecer o Intelecto | `phb-feeblemind.webp` | Feeblemind | Encantamento | PHB |
| Escuridão Enlouquecedora | `xge-maddening-darkness.webp` | Maddening Darkness | Encantamento | Xanathar |
| Explosão Solar | `phb-sunburst.webp` | Sunburst | Evocação | PHB |
| Formas Animais | `phb-animal-shapes.webp` | Animal Shapes | Transmutação | PHB |
| Fortaleza Poderosa | `xge-mighty-fortress.webp` | Mighty Fortress | Conjuração | Xanathar |
| Lábia | `phb-glibness.webp` | Glibness | Transmutação | PHB |
| Labirinto | `phb-maze.webp` | Maze | Conjuração | PHB |
| Mente em Branco | `phb-mind-blank.webp` | Mind Blank | Abjuração | PHB |
| Murchar Horrendo de Abi-Dalzim | `xge-abi-dalzims-horrid-wilting.webp` | Abi-Dalzim's Horrid Wilting | Necromancia | Xanathar |
| Nuvem Incendiária | `phb-incendiary-cloud.webp` | Incendiary Cloud | Conjuração | PHB |
| Palavra de Poder: Atordoar | `sp-palavrapoder.webp` | Power Word Stun | Encantamento | PHB |
| Semiplano | `phb-demiplane.webp` | Demiplane | Conjuração | PHB |
| Telepatia | `phb-telepathy.webp` | Telepathy | Evocação | PHB |
| Terremoto | `phb-earthquake.webp` | Earthquake | Evocação | PHB |
| Tsunami | `phb-tsunami.webp` | Tsunami | Conjuração | PHB |

### 9º círculo (20) · moldura lendário

| Magia | Arquivo | Nome em inglês (prompt) | Escola | Livro |
| --- | --- | --- | --- | --- |
| Alterar Forma | `phb-shapechange.webp` | Shapechange | Transmutação | PHB |
| Aprisionamento | `phb-imprisonment.webp` | Imprisonment | Abjuração | PHB |
| Chuva de Meteoros | `sp-meteoro.webp` | Meteor Swarm | Evocação | PHB |
| Cura Completa em Massa | `phb-mass-heal.webp` | Mass Heal | Evocação | PHB |
| Desejo | `sp-desejo.webp` | Wish | Conjuração | PHB |
| Grito Psíquico | `xge-psychic-scream.webp` | Psychic Scream | Encantamento | Xanathar |
| Invulnerabilidade | `xge-invulnerability.webp` | Invulnerability | Abjuração | Xanathar |
| Lâmina do Desastre | `tce-blade-of-disaster.webp` | Blade of Disaster | Conjuração | Tasha |
| Metamorfose em Massa | `xge-mass-polymorph.webp` | Mass Polymorph | Transmutação | Xanathar |
| Metamorfose Verdadeira | `phb-true-polymorph.webp` | True Polymorph | Transmutação | PHB |
| Muralha Prismática | `phb-prismatic-wall.webp` | Prismatic Wall | Abjuração | PHB |
| Palavra de Poder: Curar | `phb-power-word-heal.webp` | Power Word Heal | Evocação | PHB |
| Palavra de Poder: Matar | `phb-power-word-kill.webp` | Power Word Kill | Encantamento | PHB |
| Parar o Tempo | `phb-time-stop.webp` | Time Stop | Transmutação | PHB |
| Portal | `phb-gate.webp` | Gate | Conjuração | PHB |
| Presciência | `phb-foresight.webp` | Foresight | Adivinhação | PHB |
| Projeção Astral | `phb-astral-projection.webp` | Astral Projection | Necromancia | PHB |
| Ressurreição Verdadeira | `phb-true-resurrection.webp` | True Resurrection | Necromancia | PHB |
| Sinistro | `phb-weird.webp` | Weird | Ilusão | PHB |
| Tempestade da Vingança | `phb-storm-vengeance.webp` | Storm Vengeance | Conjuração | PHB |
