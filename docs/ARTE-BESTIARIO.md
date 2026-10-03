# Arte do bestiário: um prompt por criatura

Guia para gerar a arte das **65 criaturas** do bestiário no mesmo estilo dos retratos dos heróis (ver [ARTE-PERSONAGENS.md](ARTE-PERSONAGENS.md)).

**Como usar:** gere a imagem e salve em `src/assets/bestiario/` com o nome da primeira coluna (ex.: `goblin.webp`). O app passa a usá-la sozinho:

- no card do bestiário;
- na faixa de iniciativa;
- nos peões do mapa;
- na busca.

Sem arquivo, aparece o emblema do tipo. O mestre ainda pode trocar a foto só para a mesa dele, pelo botão **Personalizar**.

---

## 1. O DNA do estilo

| Elemento | Como deve ser |
| --- | --- |
| **Traço** | Ilustração anime/manhwa semi-realista, *splash art* de gacha de fantasia sombria. Line art fina, cel shading com sombras duras e angulosas. Igual aos retratos dos heróis. |
| **Enquadramento** | Retrato **4:5** (800×1000 ou maior). A criatura centralizada, cabeça/olhos no terço superior. Bichos grandes (dragões, gigantes) podem aparecer do peito para cima; pequenos (rato, kobold), de corpo inteiro. |
| **Fundo** | Liso, **cinza-carvão escuro**, sem cenário nem moldura. O card coloca a cor do tipo por cima. |
| **Luz** | Luz de recorte (rim light) para a silhueta ler bem em miniatura (o peão do mapa tem ~40 px). |
| **Clima** | Ameaçador, mas legível. Olhos marcantes. Nada de texto, logo ou assinatura. |

## 2. Prompt-mestre

Troque `[SUBJECT]` pela descrição da tabela.

```text
Dark fantasy creature portrait in semi-realistic anime / manhwa gacha splash-art style.
Subject: [SUBJECT].
Centered composition, vertical 4:5 frame, the creature's head and eyes in the upper third,
menacing but readable silhouette, strong rim light, crisp fine line art, hard cel shading
with angular shadows, highly detailed eyes, teeth, scales or armor,
isolated on a plain flat dark charcoal-grey background, no scenery, no frame, no text.
```

**Negativo:**

```text
background scenery, landscape, gradient background, frame, border, text, watermark, logo, signature,
multiple creatures, cropped head, blurry, soft glow, bokeh, 3d render, photorealistic, chibi, cute
```

**Travar o estilo:** use dois retratos de `src/assets/herois/` como referência de estilo:

- **ChatGPT:** anexe e diga *"use only as STYLE reference"*.
- **Midjourney:** use `--sref` e mantenha o mesmo `--seed` para a coleção toda.
- **Leonardo:** use Style Reference com força ~0.6.

## 3. As criaturas

| Arquivo | Criatura | ND | Tipo | `[SUBJECT]` (cole no prompt) |
| --- | --- | --- | --- | --- |
| `rat.webp` | Rato | 0 | Fera | a mangy sewer rat with matted fur, red beady eyes and a long scaly tail, crouched on cobblestones |
| `bandit.webp` | Bandido | 1/8 | Humanoide | a scruffy human highway bandit in a patched hood and leather jerkin, scarf over the lower face, holding a scimitar |
| `cultist.webp` | Cultista | 1/8 | Humanoide | a hooded human cultist in a dark crimson robe embroidered with an occult sigil, ritual dagger in hand, fanatical eyes glowing under the hood |
| `guard.webp` | Guarda | 1/8 | Humanoide | a city watch guard in a chain shirt and open-faced helm, tabard with a town crest, spear and shield |
| `kobold.webp` | Kobold | 1/8 | Humanoide | a small reptilian kobold with rust-red scales, yellow eyes and a crude spear, wearing scavenged trinkets |
| `giant-rat.webp` | Rato Gigante | 1/8 | Fera | a dog-sized giant rat, bristling grey fur, yellowed incisors bared, scarred ears |
| `stirge.webp` | Estirge | 1/8 | Fera | a stirge: a bat-winged insectoid bloodsucker with a long needle proboscis and four clawed legs, red-tinged wings |
| `goblin.webp` | Goblin | 1/4 | Humanoide | a wiry green-skinned goblin with huge pointed ears, sharp grin, ragged leather armor, scimitar and small round shield |
| `skeleton.webp` | Esqueleto | 1/4 | Morto-vivo | an animated humanoid skeleton in rusted armor scraps, faint blue light in the empty eye sockets, notched shortsword |
| `zombie.webp` | Zumbi | 1/4 | Morto-vivo | a shambling human zombie with grey rotting skin, torn peasant clothes, milky eyes and outstretched arms |
| `wolf.webp` | Lobo | 1/4 | Fera | a grey timber wolf with yellow eyes, snarling, fur ruffled by wind |
| `boar.webp` | Javali | 1/4 | Fera | a bristly wild boar with curved tusks and small fierce eyes, mud on its hide |
| `acolyte.webp` | Acólito | 1/4 | Humanoide | a young human acolyte in simple temple robes with a holy symbol pendant, holding a lit candle, devout expression |
| `drow.webp` | Drow | 1/4 | Humanoide | a drow scout with obsidian skin, white hair and red eyes, dark elven chain armor and a hand crossbow |
| `orc.webp` | Orc | 1/2 | Humanoide | a muscular grey-green orc warrior with jutting tusks, warpaint, fur mantle and a heavy greataxe |
| `hobgoblin.webp` | Hobgoblin | 1/2 | Humanoide | a disciplined hobgoblin soldier with orange-red skin, lacquered lamellar armor, longsword and military insignia |
| `gnoll.webp` | Gnoll | 1/2 | Humanoide | a hyena-headed gnoll with spotted fur, crude bone jewelry, wild grin and a spear |
| `thug.webp` | Capanga | 1/2 | Humanoide | a burly human street thug with a broken nose, heavy leather coat and a spiked mace |
| `scout.webp` | Batedor | 1/2 | Humanoide | a human ranger scout in a green hooded cloak with a longbow and a quiver, watchful eyes |
| `shadow.webp` | Sombra | 1/2 | Morto-vivo | a living shadow: a dark humanoid silhouette of smoke and darkness with faint pale eyes, edges dissolving |
| `black-bear.webp` | Urso Negro | 1/2 | Fera | a black bear standing on hind legs, glossy dark fur and a tan muzzle, growling |
| `lizardfolk.webp` | Homem-Lagarto | 1/2 | Humanoide | a lizardfolk hunter with green-brown scales, frilled crest, bone-and-hide armor and a heavy club |
| `worg.webp` | Worg | 1/2 | Monstruosidade | a huge evil worg wolf with black fur, glowing amber eyes and drooling fangs, intelligent and cruel |
| `bugbear.webp` | Bugbear | 1 | Humanoide | a hulking hairy bugbear with a bear-like snout, long arms, hide armor and a morningstar |
| `dire-wolf.webp` | Lobo Atroz | 1 | Fera | a massive dire wolf with dark shaggy fur, scarred muzzle and enormous fangs |
| `ghoul.webp` | Carniçal | 1 | Morto-vivo | a gaunt ghoul with grey-green skin stretched over bones, long claws and a long tongue, hungry white eyes |
| `giant-spider.webp` | Aranha Gigante | 1 | Fera | a giant hunting spider with a black hairy body, red hourglass markings, many glinting eyes and dripping fangs, webs behind |
| `brown-bear.webp` | Urso Pardo | 1 | Fera | a huge brown grizzly bear roaring, thick fur and long claws |
| `harpy.webp` | Harpia | 1 | Monstruosidade | a harpy with the torso and face of a wild-haired woman, feathered vulture wings and taloned bird legs, cruel smile |
| `animated-armor.webp` | Armadura Animada | 1 | Constructo | an empty suit of ornate plate armor moving on its own, darkness and faint ghostly light inside the visor, holding a sword |
| `specter.webp` | Espectro | 1 | Morto-vivo | a translucent specter: a hollow-eyed ghostly figure in tattered spectral robes, pale blue glow, reaching hand |
| `ogre.webp` | Ogro | 2 | Gigante | a towering ogre with a dull brutish face, pot belly, crude hides and a giant tree-trunk club |
| `bandit-captain.webp` | Capitão Bandido | 2 | Humanoide | a charismatic human bandit captain with a scarred face, feathered hat, studded leather coat, scimitar and dagger |
| `priest.webp` | Sacerdote | 2 | Humanoide | a human high priest in white and gold vestments, ornate holy symbol glowing softly, stern serene face |
| `gargoyle.webp` | Gárgula | 2 | Elemental | a stone gargoyle with bat wings, horns and claws, cracked grey granite skin, crouched like a statue |
| `ghast.webp` | Lívido | 2 | Morto-vivo | a ghast: an emaciated undead with mottled grey skin, sharp teeth, filthy rags and a sickly green aura of stench |
| `mimic.webp` | Mímico | 2 | Monstruosidade | a mimic disguised as a wooden treasure chest whose lid opens into a mouth of jagged teeth and a long sticky tongue |
| `berserker.webp` | Berserker | 2 | Humanoide | a wild human berserker with braided hair, bare chest covered in tattoos and scars, fur cloak and greataxe, battle rage in the eyes |
| `owlbear.webp` | Urso-Coruja | 3 | Monstruosidade | an owlbear: a bear-sized beast with an owl face and hooked beak, brown feathers blending into fur, huge claws |
| `knight.webp` | Cavaleiro | 3 | Humanoide | a noble human knight in polished full plate with a heraldic tabard, greatsword, helmet visor raised |
| `minotaur.webp` | Minotauro | 3 | Monstruosidade | a massive minotaur with a bull head and long horns, muscular body, nose ring and a double-bladed greataxe |
| `werewolf.webp` | Lobisomem | 3 | Humanoide (metamorfo) | a werewolf in hybrid form: a hulking wolf-headed man with torn clothes, grey fur and glowing yellow eyes under moonlight |
| `basilisk.webp` | Basilisco | 3 | Monstruosidade | a basilisk: an eight-legged lizard with dull green scales, a crown of spines and eerie glowing petrifying eyes |
| `wight.webp` | Aparição | 3 | Morto-vivo | a wight: an undead warrior in corroded ancient armor, dried skin, glowing red eyes and a longsword |
| `hell-hound.webp` | Cão Infernal | 3 | Corruptor | a hell hound: a black infernal dog with smoldering red eyes, fire flickering in its jaws and embers on its fur |
| `veteran.webp` | Veterano | 3 | Humanoide | a grizzled human veteran soldier in battered splint armor, longsword and shortsword, many scars |
| `doppelganger.webp` | Doppelganger | 3 | Monstruosidade (metamorfo) | a doppelganger: a grey-skinned featureless humanoid with large blank white eyes, half its face shifting into a human disguise |
| `ettin.webp` | Ettin | 4 | Gigante | a two-headed ettin giant, each head with its own ugly face and tangled hair, crude hides, two clubs |
| `ghost.webp` | Fantasma | 4 | Morto-vivo | a mournful ghost of a noblewoman in an old-fashioned gown, translucent pale form, hair floating, sorrowful glowing eyes |
| `troll.webp` | Troll | 5 | Gigante | a gangly green troll with long arms, rubbery warty skin, long nose, tangled black hair and huge claws |
| `hill-giant.webp` | Gigante da Colina | 5 | Gigante | a hill giant with a brutish face, unkempt hair, crude hides and a massive greatclub |
| `wraith.webp` | Espírito Sombrio | 5 | Morto-vivo | a wraith: a dark hooded spectral form of shadow and malice, glowing red pinpoint eyes, wisps of darkness instead of legs |
| `earth-elemental.webp` | Elemental da Terra | 5 | Elemental | an earth elemental: a hulking humanoid made of rock, soil and crystals, glowing cracks, fists like boulders |
| `gladiator.webp` | Gladiador | 5 | Humanoide | a human gladiator champion with a bronze helm, one armored arm, shield and spear, arena sand dust |
| `wyvern.webp` | Serpe | 6 | Dragão | a wyvern: a dragon-like flying reptile with leathery wings, two legs and a long tail ending in a venomous stinger |
| `mage.webp` | Mago | 6 | Humanoide | a human archmage in deep blue robes with silver runes, an arcane staff crackling with energy, floating spell sigils |
| `medusa.webp` | Medusa | 6 | Monstruosidade | a medusa: a woman with a crown of living green snakes for hair, scaled skin, golden eyes, holding a longbow |
| `chimera.webp` | Quimera | 6 | Monstruosidade | a chimera: a lion body with a lion head, a goat head and a red dragon head breathing smoke, bat-like wings |
| `stone-giant.webp` | Gigante de Pedra | 7 | Gigante | a tall stone giant with grey stone-like skin, bald head, carved geometric tattoos, holding a boulder |
| `young-green-dragon.webp` | Dragão Verde Jovem | 8 | Dragão | a young green dragon with emerald scales, a frilled crest, horns and toxic green mist from its jaws |
| `hydra.webp` | Hidra | 8 | Monstruosidade | a multi-headed hydra with five serpentine necks, dark green scales, snapping fanged heads rising from swamp water |
| `frost-giant.webp` | Gigante do Gelo | 8 | Gigante | a frost giant with icy-blue skin, white braided hair and beard, fur and chain armor, a greataxe rimed with frost |
| `young-red-dragon.webp` | Dragão Vermelho Jovem | 10 | Dragão | a young red dragon with crimson scales, swept-back horns, glowing ember eyes and flames in its throat |
| `vampire.webp` | Vampiro | 13 | Morto-vivo (metamorfo) | an elegant vampire lord with pale skin, red eyes, fangs, slicked back dark hair and a high-collared black and crimson cloak |
| `adult-red-dragon.webp` | Dragão Vermelho Adulto | 17 | Dragão | an adult red dragon, massive and terrifying, crimson and gold scales, enormous horns and wings spread, breathing fire |

---

**Dica:** comece pelas que mais aparecem nas mesas: goblin, orc, lobo, esqueleto, zumbi, bandido, kobold, cultista e o dragão do chefe final.
