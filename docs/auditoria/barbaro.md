# Auditoria — Bárbaro (PHB 2014), nível 1 ao 20

Legenda: ✅ automático (a ficha aplica sozinha) · 🎲 rola/conta (a ficha rola ou controla o uso) · 📋 texto (regra narrativa, só explicação) · 🔧 corrigido nesta auditoria (antes era só aparente).

| Nível | Característica | Estado | Onde |
|---|---|---|---|
| 1 | Fúria (usos 2→6, dano +2/+3/+4, ilimitada no 20º) | 🔧 ✅ | Painel de Fúria (Combate): gasta 1 uso e a ação bônus; dano extra no ataque; resistência no dano recebido; vantagem em testes/salvaguardas de FOR; não conjura em Fúria |
| 1 | Defesa sem Armadura (10 + DES + CON, escudo vale) | ✅ | CA |
| 2 | Ataque Imprudente | 🔧 ✅ | Botão no painel: vantagem nos ataques corpo a corpo com FOR no turno; aviso "inimigos com vantagem" até o próximo turno |
| 2 | Sentido de Perigo | 🔧 ✅ | Salvaguarda de DES com vantagem (não vale se cego, surdo ou incapacitado) |
| 3 | Caminho Primal | ✅ | Escolha da subclasse |
| 5 | Ataque Extra | ✅ | "Ação Atacar: 2 ataques" |
| 5 | Movimento Rápido (+3 m sem armadura pesada) | ✅ | Deslocamento |
| 7 | Instinto Selvagem (vantagem na iniciativa) | ✅ | Rolar Iniciativa |
| 9/13/17 | Crítico Brutal (+1/+2/+3 dados) | ✅ | Dano crítico corpo a corpo |
| 11 | Fúria Implacável (CON CD 10, +5 por uso) | 🔧 🎲 | Ao cair a 0 PV em Fúria aparece a salvaguarda; passou → 1 PV; CD volta a 10 no descanso |
| 15 | Fúria Persistente | 📋 | Texto no painel |
| 18 | Força Indomável (teste de FOR ≥ valor de FOR) | 🔧 ✅ | Teste de FOR/Atletismo nunca abaixo do valor |
| 20 | Campeão Primitivo (FOR e CON +4, teto 24) | ✅ | Atributos |
| 4/8/12/16/19 | Aumento de atributo / talento | ✅ | Aba Evoluir |

## Caminho do Furioso
| 3 | Frenesi | 🔧 🎲 | "Entrar em Fúria com Frenesi": lembrete do ataque bônus e +1 exaustão ao fim da Fúria |
| 6 | Fúria Inconsciente | 🔧 ✅ | Em Fúria, não deixa marcar Enfeitiçado/Amedrontado |
| 10 | Presença Intimidadora | 📋 | Texto (o alvo faz salvaguarda de SAB; o mestre resolve) |
| 14 | Retaliação | 📋 | Texto (reação de ataque) |

## Caminho do Guerreiro Totêmico
| 3 | Espírito Totêmico (Urso/Águia/Lobo) | 🔧 ✅/📋 | Urso: resistência a tudo menos psíquico na Fúria; Águia e Lobo: texto no painel |
| 6 | Aspecto da Fera | 📋 | Escolha + texto |
| 14 | Sintonia Totêmica | 📋 | Escolha + texto no painel em Fúria |

## Também corrigido
- A Fúria acaba ao desmaiar (com a Fúria Implacável, só se falhar).
- O descanso encerra a Fúria e o Imprudente; o Frenesi cobra a exaustão.
- O "Em Fúria" do ataque também gasta o uso, e o × nos efeitos ativos encerra a Fúria do jeito certo.

## Testes
- `src/engine/__tests__/barbarianArc.test.ts`: usos e dano da Fúria do 1 ao 20, CA, deslocamento, iniciativa, Crítico Brutal, Campeão Primitivo, Sentido de Perigo, Força Indomável, Fúria Implacável, Urso e Furioso.
- `e2e/barbaro.e2e.ts`: entrar em Fúria (uso, resistência no dano), Fúria Implacável, Frenesi, Imprudente e teste de FOR com vantagem.
