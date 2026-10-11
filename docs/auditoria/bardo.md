# Auditoria — Bardo (PHB 2014), nível 1 ao 20

Legenda: ✅ automático · 🎲 rola/conta · 📋 texto (narrativo) · 🔧 corrigido nesta auditoria (antes era só aparente).

| Nível | Característica | Estado | Onde |
|---|---|---|---|
| 1 | Conjuração (CAR, magias conhecidas, rituais), 3 instrumentos | ✅ | Aba Magias e Escolhas |
| 1 | Inspiração de Bardo (CAR usos; d6 → d8 → d10 → d12) | ✅ | Recurso |
| 1 | Dar Inspiração (ação bônus, 18 m) | 🔧 🎲 | Painel "Bardo": gasta o dado e a ação bônus |
| 2 | Pau pra Toda Obra (meia proficiência sem treino, inclusive iniciativa) | ✅ | Perícias e iniciativa |
| 2 | Canção de Descanso (d6 → d8 → d10 → d12) | 🔧 🎲 | Painel: rola o dado, com "Em mim" |
| 3 | Aptidão (2 perícias; +2 no 10º) | ✅ | Ficha → Perícias |
| 5 | Fonte de Inspiração (volta no descanso curto) | ✅ | Recurso |
| 6 | Contraencanto (ação) | 🔧 🎲 | Painel |
| 10/14/18 | Segredos Mágicos | ✅ | Escolhas |
| 20 | Inspiração Superior (volta 1 ao rolar iniciativa) | ✅ | Rolar Iniciativa |

## Colégio do Conhecimento
| 3 | Proficiências Adicionais (3 perícias) | ✅ | Escolhas |
| 3 | Palavras Cortantes (reação, subtrai o dado) | 🔧 🎲 | Painel: rola e gasta o dado e a reação |
| 6 | Segredos Mágicos Adicionais (2, fora do limite) | ✅ | Escolhas |
| 14 | Habilidade Incomparável (dado no seu teste) | 🔧 🎲 | Painel: soma ao último teste rolado |

## Colégio da Bravura
| 3 | Proficiências marciais (média, escudos, armas marciais) | ✅ | Proficiências |
| 3 | Inspiração de Combate (dado no dano ou na CA) | 🔧 📋 | Texto do Dar Inspiração |
| 6 | Ataque Extra | ✅ | Ação Atacar: 2 ataques |
| 14 | Magia de Batalha | 📋 | Lembrete |

## Testes
- `src/engine/__tests__/bardArc.test.ts`:
  - Dado e usos da Inspiração; Fonte de Inspiração.
  - Pau pra Toda Obra (perícias e iniciativa).
  - Canção de Descanso.
  - Aptidão.
  - Contraencanto e Inspiração Superior.
  - Conhecimento e Bravura.
- `e2e/clerigo-bardo.e2e.ts`:
  - Dar Inspiração gasta o dado.
  - Palavras Cortantes rola d10.
