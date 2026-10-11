# Auditoria — Feiticeiro (PHB 2014), nível 1 ao 20

Legenda: ✅ automático · 🎲 rola/conta · 📋 texto (narrativo) · 🔧 corrigido nesta auditoria (antes era só aparente).

| Nível | Característica | Estado | Onde |
|---|---|---|---|
| 1 | Conjuração (CAR, magias conhecidas, conjurador completo) | ✅ | Aba Magias |
| 1 | Origem de Feitiçaria | ✅ | Subclasse |
| 2 | Pontos de Feitiçaria (= nível) | ✅ | Recurso; o painel "Feiticeiro" mostra quantos sobram |
| 2 | Fonte de Magia: espaço → pontos (= círculo) | 🔧 ✅ | Painel: gasta o espaço e a ação bônus |
| 2 | Fonte de Magia: pontos → espaço (2/3/5/6/7, até o 5º) | 🔧 ✅ | Painel: devolve um espaço gasto (não passa do máximo) |
| 3/10/17 | Metamagia (2, +1, +1) | 🔧 ✅ | Escolhas; o painel gasta os pontos de cada opção (Gêmea pelo círculo) |
| 20 | Restauração Feiticeira (+4 no descanso curto) | 🔧 ✅ | Descanso curto |

## Linhagem Dracônica
| 1 | Ancestral Dragão (+ Dracônico) | ✅ | Escolhas, idiomas |
| 1 | Resiliência Dracônica (+1 PV/nível, CA 13 + DES) | ✅ | PV e CA |
| 6 | Afinidade Elemental (+CAR no dano do tipo) | 🔧 ✅ | Conjurar soma sozinho (também em magia de ataque) |
| 6 | Afinidade Elemental (1 ponto = resistência 1 hora) | 🔧 ✅ | Painel: liga a resistência na ficha |
| 14 | Asas Dracônicas | 📋 | Lembrete |
| 18 | Presença Dracônica (5 pontos, concentração) | 🔧 🎲 | Painel: gasta 5, a ação e liga a concentração |

## Magia Selvagem
| 1 | Surto de Magia Selvagem (d20 → tabela d100) | 🔧 🎲 | Aviso da magia: "Surto? (d20)"; painel rola a tabela (resumida) |
| 1 | Marés do Caos (vantagem; volta com um surto) | 🔧 ✅ | Painel; o surto devolve o uso |
| 6 | Distorcer o Destino (2 pontos, ±1d4) | 🔧 🎲 | Painel: reação |
| 14 | Caos Controlado (rola 2 vezes) | 🔧 🎲 | O surto mostra os dois resultados |
| 18 | Bombardeio de Magia | 📋 | Lembrete |

## Testes
- `src/engine/__tests__/sorcererArc.test.ts`:
  - Conjuração.
  - Pontos e custo da Fonte de Magia.
  - Metamagia.
  - Restauração.
  - Dracônica: CA, PV, Afinidade e resistência.
  - Magia Selvagem: tabela de Surto.
- `src/store/__tests__/sorceryPoints.test.ts`: Fonte de Magia nos dois sentidos e Restauração no descanso curto.
- `e2e/feiticeiro.e2e.ts`:
  - Fonte de Magia.
  - Metamagia.
  - Afinidade Elemental.
  - Marés do Caos e Surto com Caos Controlado.
