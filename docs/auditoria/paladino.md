# Auditoria — Paladino (PHB 2014), nível 1 ao 20

Legenda: ✅ automático · 🎲 rola/conta · 📋 texto (narrativo) · 🔧 corrigido nesta auditoria (antes era só aparente).

| Nível | Característica | Estado | Onde |
|---|---|---|---|
| 1 | Sentido Divino (1 + CAR) | 🔧 🎲 | Painel "Paladino": gasta o uso e a ação |
| 1 | Cura pelas Mãos (5 × nível) | 🔧 ✅ | Painel: escolha os PV; "Curar a mim" cura de verdade e gasta a reserva; "Curar aliado"; "Doença ou veneno" gasta 5 e tira Envenenado |
| 2 | Estilo de Luta | ✅ | Ataques e CA |
| 2 | Conjuração (meio conjurador, CAR) | ✅ | Espaços e aba Magias |
| 2 | Destruição Divina (2d8 + 1d8/círculo, máx. 5d8; +1d8 em morto-vivo/corruptor) | ✅ 🎲 | Dano do ataque corpo a corpo: escolhe o espaço, gasta e rola |
| 3 | Saúde Divina | 🔧 ✅ | Imune a doenças (nas resistências) |
| 3 | Juramento + magias de juramento | ✅ | Sempre preparadas |
| 3 | Canalizar Divindade | 🔧 🎲 | Painel: as duas opções do juramento, com a CD; gasta o uso |
| 5 | Ataque Extra | ✅ | |
| 6 | Aura de Proteção (+CAR, mín. 1, nas salvaguardas) | ✅ | Salvaguardas; o painel mostra o bônus e o alcance (3 m → 9 m no 18º) |
| 10 | Aura de Coragem | 🔧 ✅ | A ficha não deixa marcar Amedrontado |
| 11 | Destruição Divina Aprimorada (+1d8 radiante) | ✅ | Soma sozinha no dano corpo a corpo |
| 14 | Toque Purificador (CAR usos) | 🔧 🎲 | Painel |
| 18 | Auras com 9 m | ✅ | Texto do painel |

## Devoção
| 3 | Arma Sagrada | 🔧 ✅ | Liga e soma CAR (mín. +1) nas jogadas de ataque com arma por 1 minuto |
| 3 | Expulsar o Profano | 🔧 🎲 | Painel com a CD (SAB) |
| 7 | Aura de Devoção | 🔧 ✅ | A ficha não deixa marcar Enfeitiçado |
| 15 | Pureza de Espírito | 📋 | Proteção contra o bem e o mal permanente |
| 20 | Nimbo Sagrado | 🔧 🎲 | Painel: 1× por descanso longo |

## Anciões
| 3 | Ira da Natureza / Expulsar os Infiéis | 🔧 🎲 | Painel com a CD |
| 7 | Aura de Proteção (resistência a dano de magias) | 🔧 ✅ | Nas resistências |
| 15 | Sentinela Imortal | 🔧 ✅ | Ao cair a 0 PV pelo "Aplicar dano", fica com 1 PV (1× por descanso longo) |
| 20 | Campeão Ancião | 🔧 🎲 | Painel |

## Vingança
| 3 | Repreender Inimigos | 🔧 🎲 | Painel com a CD |
| 3 | Voto de Inimizade | 🔧 ✅ | Liga (ação bônus) e dá vantagem nos ataques; aparece nos efeitos ativos |
| 7 | Vingador Implacável | 📋 | |
| 15 | Alma da Vingança | 📋 | Reação de ataque contra o alvo jurado |
| 20 | Anjo Vingador | 🔧 🎲 | Painel |

## Testes
- `src/engine/__tests__/paladinArc.test.ts`: Sentido Divino e Cura pelas Mãos, espaços e Destruição Divina, Saúde Divina, Ataque Extra e Canalizar por juramento, Arma Sagrada no ataque, Aura de Proteção, imunidades das auras, Destruição Aprimorada, Toque Purificador, Sentinela Imortal e a forma do 20º.
- `e2e/monge-paladino.e2e.ts`: Cura pelas Mãos cura e gasta a reserva, Arma Sagrada soma CAR, Aura de Coragem bloqueia Amedrontado.
