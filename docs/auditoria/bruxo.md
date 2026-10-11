# Auditoria — Bruxo (PHB 2014), nível 1 ao 20

Legenda: ✅ automático · 🎲 rola/conta · 📋 texto (narrativo) · 🔧 corrigido nesta auditoria (antes era só aparente).

| Nível | Característica | Estado | Onde |
|---|---|---|---|
| 1 | Magia de Pacto (1→4 espaços, círculo 1º→5º, voltam no descanso curto) | ✅ | Espaços e Descanso; o painel "Bruxo" mostra quantos sobram |
| 1 | Patrono + lista expandida | ✅ | Subclasse e aba Magias |
| 2 | Invocações Místicas | ✅ | Escolhas; as que dão magia conjuram de verdade (à vontade ou 1×/descanso longo); Explosão Agonizante/Repulsiva, Lança Mística, Visão do Diabo, Bebedor de Vida, Lâmina Sedenta e Influência Enganadora já funcionavam (auditoria das invocações) |
| 3 | Dádiva do Pacto: Lâmina (arma proficiente) | ✅ | Escolha da arma |
| 3 | Dádiva do Pacto: Tomo (3 truques de qualquer lista) | ✅ | Escolha dos truques |
| 3 | Dádiva do Pacto: Corrente (convocar familiar) | 🔧 ✅ | Agora concede convocar familiar (ritual), sem contar no limite |
| 11/13/15/17 | Arcano Místico (6º–9º) | ✅ | Aba Magias: conjura sem espaço, 1×/descanso longo |
| 20 | Mestre Místico | 🔧 ✅ | Painel: devolve todos os espaços de pacto, 1× por descanso longo |
| — | Invocações só de texto (Livro dos Segredos Antigos, Olhos do Guardião das Runas, Olhar de Duas Mentes, Um com as Sombras, Visão da Bruxa, Voz do Mestre das Correntes) | 📋 | Descrição na escolha |

## O Corruptor
| 1 | Bênção do Tinhoso (PV temporários = CAR + nível) | 🔧 ✅ | Painel: botão ao derrubar um inimigo |
| 6 | Sorte do Tinhoso (+1d10 num teste/salvaguarda) | 🔧 🎲 | Painel: rola 1d10 e soma ao último teste da ficha; volta no descanso curto |
| 10 | Resiliência Infernal (resistência a um tipo, troca no descanso) | 🔧 ✅ | Painel: escolha o tipo; entra nas resistências |
| 14 | Arremesso pelo Inferno (10d10 psíquico) | 🔧 🎲 | Painel: rola o dano e gasta o uso |

## A Arquifada
| 1 | Presença Feérica | 🔧 🎲 | Painel: ação, CD de SAB |
| 6 | Fuga Enevoada | 🔧 🎲 | Painel: reação |
| 10 | Defesas Encantadoras | 🔧 ✅ | A ficha não deixa marcar Enfeitiçado |
| 14 | Delírio Sombrio | 🔧 🎲 | Painel: ação, CD de SAB |

## O Grande Antigo
| 1 | Mente Desperta (telepatia 9 m) | 📋 | Lembrete no painel |
| 6 | Escudo Entrópico | 🔧 🎲 | Painel: reação |
| 10 | Escudo Mental (resistência psíquica) | 🔧 ✅ | Nas resistências |
| 14 | Criar Servo | 📋 | |

## Testes
- `src/engine/__tests__/warlockArc.test.ts`: espaços de pacto por nível, Pacto da Corrente e da Lâmina, invocações que viram magia, Arcano Místico e Mestre Místico, Corruptor, Arquifada e Grande Antigo.
- `e2e/bruxo.e2e.ts`: Mestre Místico devolve os espaços, Bênção do Tinhoso dá PV temporários, Resiliência Infernal vira resistência na ficha.
- `e2e/invocacoes.e2e.ts` (já existia): invocações à vontade e 1×/descanso, Visão do Diabo, Bebedor de Vida, Arcano Místico.
