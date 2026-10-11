# Auditoria — Ladino (PHB 2014), nível 1 ao 20

Legenda: ✅ automático · 🎲 rola/conta · 📋 texto (narrativo) · 🔧 corrigido nesta auditoria (antes era só aparente).

| Nível | Característica | Estado | Onde |
|---|---|---|---|
| 1 | Expertise (2 perícias ou ferramentas de ladrão; +2 no 6º) | ✅ | Ficha: perícias com ★×2 |
| 1 | Ataque Furtivo (⌈nível/2⌉d6, 1× por turno, acuidade ou distância) | ✅ 🎲 | Dano do ataque: chip "Ataque Furtivo +Nd6", ligado por padrão e travado depois de usado no turno |
| 1 | Gíria de Ladrão | ✅ | Idiomas |
| 2 | Ação Ardilosa (Disparada, Desengajar, Esconder como ação bônus) | 🔧 🎲 | Combate → painel "Ladino": Disparada dobra o deslocamento do turno; Esconder rola Furtividade; todos gastam a ação bônus |
| 3 | Arquétipo | ✅ | Subclasse |
| 5 | Esquiva Sobrenatural (reação: metade do dano de um ataque) | 🔧 ✅ | Chip no "Aplicar dano": corta pela metade e gasta a reação |
| 7 | Evasão (DES para meio dano: passou = 0, falhou = metade) | 🔧 ✅ | Chips "Evasão: passei / falhei" no "Aplicar dano" |
| 11 | Talento Confiável (d20 ≤ 9 conta 10 em perícia com proficiência) | 🔧 ✅ | Toda rolagem de perícia ou ferramenta treinada; o rótulo mostra "d20 1 → 10" |
| 14 | Sentido Cego (3 m) | 🔧 ✅ | Chip "Sentido Cego 3 m" na Ficha |
| 15 | Mente Escorregadia (proficiência em SAB) | ✅ | Salvaguardas |
| 18 | Elusivo (nenhum ataque tem vantagem contra você) | 📋 | Depende do atacante (mestre) |
| 20 | Golpe de Sorte (1× por descanso curto) | 🔧 🎲 | Painel: transforma o último teste em 20 no d20 (ou um ataque que errou em acerto) e gasta o uso |
| 4/8/10/12/16/19 | Aumento de atributo / talento | ✅ | Aba Evoluir |

## Ladrão
| 3 | Mãos Rápidas | 🔧 🎲 | Painel: Prestidigitação/ferramentas/Usar Objeto como ação bônus |
| 3 | Trabalho de Segundo Andar | 📋 | Escalar sem custo extra; salto +DES × 30 cm |
| 9 | Furtividade Suprema | 🔧 ✅ | Furtividade com vantagem se andou até metade do deslocamento no turno |
| 13 | Usar Instrumento Mágico | 📋 |
| 17 | Reflexos de Ladrão | 🔧 ✅ | Ao rolar iniciativa, avisa o 2º turno na 1ª rodada (iniciativa − 10) |

## Assassino
| 3 | Proficiências (kit de disfarce e de envenenador) | 🔧 ✅ | Entram ao escolher a subclasse (e nas fichas que já existiam) |
| 3 | Assassinar | 🔧 ✅ | Painel: "Assassinar" dá vantagem nos ataques do turno; no dano, o chip de crítico lembra "alvo surpreso" |
| 9 | Perícia em Infiltração | 📋 |
| 13 | Impostor | 📋 |
| 17 | Golpe Mortal | 🔧 🎲 | Painel mostra a CD (8 + DES + proficiência) da salvaguarda de CON; dano dobrado fica com a mesa |

## Trapaceiro Arcano
| 3 | Conjuração (1/3, INT, encantamento/ilusão) | ✅ | Espaços de magia e aba Magias |
| 3 | Mãos Mágicas Ligeiras | 📋 |
| 9 | Emboscada Mágica | 📋 |
| 13 | Trapaceiro Versátil | 📋 |
| 17 | Ladrão de Magias | 📋 |

## Também vale para outras classes
- Evasão: Monge 7º e Caçador 15º (Defesa Superior) usam os mesmos chips.
- Esquiva Sobrenatural: Caçador 15º.

## Testes
- `src/engine/__tests__/rogueArc.test.ts`: expertise, dados do Furtivo e armas válidas, idiomas e salvaguarda de SAB, o que liga em cada nível, Esquiva/Evasão (e Monge/Caçador), Talento Confiável, Ladrão (Furtividade Suprema e Reflexos), Assassino (kits e CD do Golpe Mortal), espaços do Trapaceiro Arcano.
- `e2e/ladino.e2e.ts`: Disparada dobra o deslocamento, Esquiva corta o dano e gasta a reação, Evasão zera o dano, Talento Confiável transforma um 1 em 10.
