# Auditoria — Druida (PHB 2014), nível 1 ao 20

Legenda: ✅ automático · 🎲 rola/conta · 📋 texto (narrativo) · 🔧 corrigido nesta auditoria (antes era só aparente).

| Nível | Característica | Estado | Onde |
|---|---|---|---|
| 1 | Druídico | 📋 | Lembrete |
| 1 | Conjuração (SAB, prepara SAB + nível, rituais) | ✅ | Aba Magias |
| 2 | Forma Selvagem (2 usos, descanso curto; dura metade do nível em horas) | 🔧 ✅ | Painel "Druida": escolhe a fera, gasta o uso e a ação |
| 2/4/8 | ND 1/4 sem voo/natação → 1/2 sem voo → 1 | 🔧 ✅ | A lista só mostra feras permitidas |
| 2 | PV e ataques da forma; o dano cai na fera primeiro e o excedente passa | 🔧 ✅ | Painel (PV da forma, ataques roláveis) + "Aplicar dano" |
| 18 | Corpo Atemporal, Magias Bestiais | 📋 | Lembretes |
| 20 | Arquidruida (Forma Selvagem ilimitada) | ✅ | Usos ∞ |

## Círculo da Lua
| 2 | Forma Selvagem de Combate: ação bônus; espaço → 1d8 por círculo de cura | 🔧 ✅ | Painel: transformar como ação bônus; "Curar a forma" |
| 2/6 | Formas de Círculo (ND 1; nível ÷ 3 a partir do 6º) | 🔧 ✅ | Lista de feras (incluí feras até ND 6) |
| 6 | Golpes Primais (ataques mágicos) | 🔧 ✅ | Nota nos ataques da forma |
| 10 | Forma Selvagem Elemental (2 usos) | 🔧 ✅ | Os 4 elementais aparecem na lista |
| 14 | Mil Formas | 📋 | Lembrete |

## Círculo da Terra
| 2 | Truque Adicional | ✅ | Limite de truques (já existia) |
| 2 | Recuperação Natural (metade do nível, nenhum de 6º+) | 🔧 ✅ | Painel: escolhe e devolve os espaços |
| 3/5/7/9 | Magias de Círculo | ✅ | Escolha do terreno (já existia) |
| 6 | Passo da Terra | 📋 | Lembrete |
| 10 | Guarda da Natureza (imune a veneno e doenças) | 🔧 ✅ | Não deixa marcar Envenenado; nas resistências |
| 14 | Santuário da Natureza | 📋 | Lembrete |

## Testes
- `src/engine/__tests__/druidArc.test.ts`:
  - Conjuração.
  - Usos e duração da Forma Selvagem.
  - ND e deslocamento por nível.
  - Lua: ação bônus, Golpes Primais e elementais.
  - Forma atual.
  - Terra: truque, Recuperação Natural e Guarda da Natureza.
- `src/store/__tests__/wildShape.test.ts`:
  - O dano cai na fera e o excedente passa para o druida.
  - Voltar à forma e o descanso longo encerram a forma.
- `e2e/druida.e2e.ts`:
  - Urso-pardo: ataques e volta à forma normal.
  - Recuperação Natural.
