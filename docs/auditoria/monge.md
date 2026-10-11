# Auditoria — Monge (PHB 2014), nível 1 ao 20

Legenda: ✅ automático · 🎲 rola/conta · 📋 texto (narrativo) · 🔧 corrigido nesta auditoria (antes era só aparente).

| Nível | Característica | Estado | Onde |
|---|---|---|---|
| 1 | Defesa sem Armadura (10 + DES + SAB) | ✅ | CA |
| 1 | Artes Marciais (d4→d6→d8→d10, DES nas armas de monge, golpe desarmado) | ✅ | Ataques ("Golpe Desarmado") |
| 2 | Ki (pontos = nível, CD 8 + prof + SAB) | ✅ | Painel "Monge" mostra ki e CD |
| 2 | Rajada de Golpes / Defesa Paciente / Passo do Vento | 🔧 🎲 | Painel: gastam 1 ki e a ação bônus; Defesa Paciente liga o **Esquivar** (vantagem em salvaguardas de DES até o próximo turno); Passo do Vento dobra o deslocamento |
| 2/6/10/14/18 | Movimento sem Armadura (+3 → +9 m) | ✅ | Deslocamento (sem armadura nem escudo) |
| 3 | Defletir Projéteis (reação: −1d10 + DES + nível) | 🔧 🎲 | Chip no "Aplicar dano": rola a redução e gasta a reação |
| 4 | Queda Lenta (reação: −5 × nível) | 🔧 ✅ | Chip no "Aplicar dano" |
| 5 | Ataque Extra | ✅ | "Ação Atacar: 2 ataques" |
| 5 | Golpe Atordoante (1 ki, CON) | 🔧 🎲 | Dano do ataque corpo a corpo: chip "Golpe Atordoante (1 ki · CON CD N)" gasta o ki e avisa a CD |
| 6 | Golpes de Ki (mágicos) | ✅ | Nota no golpe desarmado |
| 7 | Evasão | ✅ | Chips de Evasão no "Aplicar dano" (mesmo do Ladino) |
| 7 | Mente Tranquila | 🔧 ✅ | Painel: ação que tira Enfeitiçado/Amedrontado |
| 10 | Pureza do Corpo | 🔧 ✅ | Imune a veneno/doenças: a ficha não deixa marcar Envenenado; aparece nas resistências |
| 13 | Língua do Sol e da Lua | 📋 | |
| 14 | Alma de Diamante | ✅ 🔧 🎲 | Proficiência em todas as salvaguardas; painel rola de novo a última salvaguarda por 1 ki |
| 15 | Corpo Atemporal | 📋 | |
| 18 | Corpo Vazio (4 ki) | 🔧 🎲 | Painel: gasta 4 ki e a ação |
| 20 | Ser Perfeito | ✅ | Rolar Iniciativa sem ki devolve 4 |

## Mão Aberta
| 3 | Técnica da Mão Aberta | 🔧 🎲 | Rajada de Golpes avisa as 3 opções com a CD |
| 6 | Integridade do Corpo (3 × nível PV) | 🔧 ✅ | Painel: cura de verdade, 1× por descanso longo |
| 11 | Tranquilidade | 📋 | |
| 17 | Palma Trêmula (3 ki) | 🔧 🎲 | Painel: gasta 3 ki, rola 10d10 necrótico e mostra a CD de CON |

## Sombra
| 3 | Artes das Sombras (2 ki) | 🔧 🎲 | Painel: gasta 2 ki e a ação |
| 6 | Passo das Sombras | 🔧 🎲 | Painel: ação bônus |
| 11/17 | Manto de Sombras, Oportunista | 📋 | |

## Quatro Elementos
| 3+ | Disciplinas Elementais | 🔧 🎲 | Cada disciplina escolhida vira botão com o custo de ki; as de dano (Punho do Ar Inquebrável, Chicote d’Água, Presas da Serpente) rolam o dano; mostra o máximo de ki por uso |

## Testes
- `src/engine/__tests__/monkArc.test.ts`: CA, dado de Artes Marciais, ki e CD, deslocamento, Defletir/Queda Lenta, Ataque Extra, Evasão e Pureza do Corpo, Alma de Diamante e Ser Perfeito, Esquivar, Mão Aberta, Sombra e disciplinas.
- `e2e/monge-paladino.e2e.ts`: Defesa Paciente gasta ki e liga o Esquivar, Integridade do Corpo cura, Defletir Projéteis reduz o dano e gasta a reação.
