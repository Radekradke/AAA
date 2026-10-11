# Auditoria — Guerreiro (PHB 2014), nível 1 ao 20

Legenda: ✅ automático · 🎲 rola/conta · 📋 texto (narrativo) · 🔧 corrigido nesta auditoria (antes era só aparente).

| Nível | Característica | Estado | Onde |
|---|---|---|---|
| 1 | Estilo de Luta: Arquearia (+2 ataque à distância), Defesa (+1 CA com armadura), Duelo (+2 dano numa mão), Duas Armas (atributo no dano da 2ª arma) | ✅ | Ataques e CA |
| 1 | Estilo de Luta: Combate com Armas Grandes | 🔧 ✅ | Rola de novo os 1 e 2 no dano (duas mãos sempre; versátil só usada com as duas mãos) |
| 1 | Estilo de Luta: Proteção | 📋 | Reação narrada |
| 1 | Retomar o Fôlego (1d10 + nível, ação bônus) | 🔧 🎲 | Painel do Guerreiro: rola, cura, gasta a ação bônus e o uso (volta no descanso curto) |
| 2 | Surto de Ação (1 → 2 no 17º) | 🔧 🎲 | Painel: gasta o uso e devolve a ação do turno |
| 3 | Arquétipo Marcial | ✅ | Subclasse |
| 5/11/20 | Ataque Extra (2/3/4 ataques) | ✅ | "Ação Atacar: N ataques" |
| 9/13/17 | Indomável (1/2/3 usos) | 🔧 🎲 | Painel: rola de novo a última salvaguarda da ficha |
| 4/6/8/12/14/16/19 | Aumento de atributo / talento | ✅ | Aba Evoluir |

## Campeão
| 3 | Crítico Aprimorado (19–20) | ✅ |
| 7 | Atleta Notável (½ proficiência em FOR/DES/CON sem treino) | ✅ | Perícias e testes |
| 10 | Estilo de Luta adicional | ✅ | Escolha |
| 15 | Crítico Superior (18–20) | ✅ |
| 18 | Sobrevivente (5 + CON no início do turno abaixo da metade) | 🔧 ✅ | "Novo turno" cura sozinho |

## Mestre de Batalha
| 3/7/10/15 | Dados de superioridade (4→5→6; d8→d10→d12) | ✅ | Recursos |
| 3+ | Manobras | 🔧 🎲 | No dano do ataque: escolhe a manobra, gasta 1 dado, soma ao dano e avisa a CD e o efeito (Derrubada, Empurrão, Desarmar, Ameaçador, Provocador…); Ataque Preciso soma o dado ao ataque |
| 3 | Estudioso da Guerra (ferramenta) | ✅ | Escolha → proficiência |
| 7 | Conheça seu Inimigo | 📋 |
| 15 | Implacável (+1 dado se zerado ao rolar iniciativa) | ✅ | Rolar Iniciativa |
| — | Aparar, Passo Evasivo, Reunir, Ataque Amplo, Ataque de Comando | 📋 | Texto da manobra (dependem da mesa) |

## Cavaleiro Arcano
| 3 | Conjuração (1/3, INT, abjuração/evocação) | ✅ | Aba Magias, espaços de magia |
| 3 | Vínculo com Arma | 📋 |
| 7/18 | Magia de Guerra / Aprimorada | 📋 | Texto (ataque como ação bônus após truque/magia) |
| 10 | Golpe Arcano | 📋 | Desvantagem na salvaguarda — o mestre aplica |
| 15 | Investida Arcana | 📋 | Teleporte ao usar o Surto |

## Testes
- `src/engine/__tests__/fighterArc.test.ts`: recursos por nível, Ataque Extra, Estilos (incluindo Armas Grandes), críticos do Campeão, Sobrevivente, dados e CD do Mestre de Batalha, espaços do Cavaleiro Arcano.
- `e2e/guerreiro.e2e.ts`: Fôlego cura, Surto, Indomável rerrola a salvaguarda, manobra gasta o dado e avisa a CD.
