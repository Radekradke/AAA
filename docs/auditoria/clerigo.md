# Auditoria — Clérigo (PHB 2014), nível 1 ao 20

Legenda: ✅ automático · 🎲 rola/conta · 📋 texto (narrativo) · 🔧 corrigido nesta auditoria (antes era só aparente).

| Nível | Característica | Estado | Onde |
|---|---|---|---|
| 1 | Conjuração (SAB, prepara SAB + nível, rituais) | ✅ | Aba Magias |
| 1 | Domínio Divino + magias de domínio (sempre preparadas) | ✅ | Subclasse e aba Magias |
| 2 | Canalizar Divindade 1 → 2 (6º) → 3 (18º), volta no descanso curto | ✅ | Recurso; o painel "Clérigo" mostra quantos sobram |
| 2 | Expulsar Mortos-Vivos (ação, SAB) | 🔧 🎲 | Painel: gasta o Canalizar e a ação, com a CD |
| 5/8/11/14/17 | Destruir Mortos-Vivos (ND 1/2, 1, 2, 3, 4) | 🔧 ✅ | Painel mostra o ND e o texto da expulsão |
| 10 | Intervenção Divina (d100 ≤ nível) | 🔧 🎲 | Painel: rola o d100 e diz se funcionou (7 dias) ou não (descanso longo) |
| 20 | Intervenção Divina garantida | 🔧 ✅ | Painel: chance de 100% |

## Domínio da Vida
| 1 | Proficiência com armadura pesada | ✅ | Proficiências |
| 1 | Discípulo da Vida (+2 + círculo nas magias de cura) | 🔧 ✅ | Conjurar soma sozinho na cura |
| 2 | Canalizar: Preservar a Vida (5 × nível, até a metade dos PV) | 🔧 🎲 | Painel: botão com "Em mim" que respeita a metade |
| 6 | Curandeiro Abençoado (2 + círculo em você ao curar outro) | 🔧 ✅ | Aviso da cura: "Foi em outra criatura (+N em mim)" |
| 8 | Golpe Divino (1d8 → 2d8 radiante, 1×/turno) | 🔧 ✅ | Dano do ataque com arma |
| 17 | Cura Suprema (dados de cura no máximo) | 🔧 ✅ | Conjurar: a cura vem com os dados no máximo |

## Domínio da Luz
| 1 | Truque Luz | ✅ | Aba Magias |
| 1 | Labareda Protetora (reação, SAB/descanso longo) | 🔧 🎲 | Painel |
| 2 | Canalizar: Radiância da Alvorada (2d10 + nível radiante, CON) | 🔧 🎲 | Painel: rola o dano e mostra a metade |
| 6 | Labareda Aprimorada (protege aliados) | 🔧 📋 | Texto do botão |
| 8 | Conjuração Potente (+SAB no dano dos truques de clérigo) | 🔧 ✅ | Conjurar soma sozinho |
| 17 | Coroa de Luz | 📋 | Lembrete no painel |

## Domínio da Guerra
| 1 | Proficiências marciais e armadura pesada | ✅ | Proficiências |
| 1 | Sacerdote da Guerra (ataque bônus, SAB/descanso longo) | 🔧 🎲 | Painel: gasta o uso e a ação bônus |
| 2 | Canalizar: Golpe Dirigido (+10 no ataque) | 🔧 🎲 | Painel |
| 6 | Canalizar: Bênção do Deus da Guerra (reação, +10 para aliado) | 🔧 🎲 | Painel |
| 8 | Golpe Divino (tipo da arma) | 🔧 ✅ | Dano do ataque |
| 17 | Avatar da Batalha | ✅ | Resistências |

## Domínio do Conhecimento
| 1 | Bênçãos do Conhecimento (2 idiomas, 2 perícias com expertise) | ✅ | Escolhas |
| 2 | Canalizar: Conhecimento das Eras | 🔧 🎲 | Painel |
| 6 | Canalizar: Ler Pensamentos (SAB) | 🔧 🎲 | Painel |
| 8 | Conjuração Potente | 🔧 ✅ | Conjurar |
| 17 | Visões do Passado | 📋 | Lembrete |

## Domínio da Natureza
| 1 | Acólito da Natureza (truque de druida + perícia), armadura pesada | ✅ | Escolhas |
| 2 | Canalizar: Encantar Animais e Plantas (SAB) | 🔧 🎲 | Painel |
| 6 | Amortecer Elementos | 📋 | Lembrete |
| 8 | Golpe Divino (frio, fogo ou elétrico) | 🔧 ✅ | Dano do ataque |
| 17 | Senhor da Natureza | 📋 | Lembrete |

## Domínio da Tempestade
| 1 | Proficiências marciais e armadura pesada | ✅ | Proficiências |
| 1 | Ira da Tempestade (reação, 2d8) | 🔧 🎲 | Painel: rola o dano |
| 2 | Canalizar: Ira Destrutiva (dano máximo) | 🔧 🎲 | Painel |
| 6 | Golpe Trovejante | 📋 | Lembrete |
| 8 | Golpe Divino (trovejante) | 🔧 ✅ | Dano do ataque |
| 17 | Nascido da Tempestade | 📋 | Lembrete |

## Domínio da Enganação
| 1 | Bênção do Trapaceiro | 🔧 🎲 | Painel (ação) |
| 2 | Canalizar: Invocar Duplicidade | 🔧 🎲 | Painel |
| 6 | Canalizar: Manto de Sombras | 🔧 🎲 | Painel |
| 8 | Golpe Divino (veneno) | 🔧 ✅ | Dano do ataque |
| 17 | Duplicidade Aprimorada | 📋 | Lembrete |

## Testes
- `src/engine/__tests__/clericArc.test.ts`:
  - Canalizar 1/2/3 e Destruir Mortos-Vivos.
  - Intervenção Divina.
  - Canalizar de cada domínio.
  - Discípulo da Vida, Curandeiro Abençoado e Cura Suprema.
  - Conjuração Potente.
  - Golpe Divino (tipo e 1×/turno).
  - Reações de domínio.
- `e2e/clerigo-bardo.e2e.ts`:
  - Curar Ferimentos com Discípulo da Vida.
  - Preservar a Vida gasta o Canalizar.
  - Intervenção Divina sem resposta trava até o descanso.
