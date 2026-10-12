# Auditoria — Mago (PHB 2014), nível 1 ao 20

Legenda: ✅ automático · 🎲 rola/conta · 📋 texto (narrativo) · 🔧 corrigido nesta auditoria (antes era só aparente).

| Nível | Característica | Estado | Onde |
|---|---|---|---|
| 1 | Conjuração (INT, grimório 6 + 2 por nível, prepara INT + nível, rituais do grimório) | ✅ | Aba Magias |
| 1 | Recuperação Arcana (até metade do nível, nenhum de 6º+) | 🔧 ✅ | Painel "Mago": escolhe os espaços e devolve; 1× por dia |
| 2 | Tradição Arcana (8 escolas) | ✅ | Subclasse |
| 18 | Domínio de Magia (1º e 2º círculos à vontade) | 🔧 ✅ | Aba Magias: "Usar" sem espaço nas magias escolhidas |
| 20 | Magias de Assinatura (2 de 3º, 1× por descanso curto) | 🔧 ✅ | Aba Magias: "Usar" sem espaço, recarrega no descanso curto |

## Escolas
| Escola | Característica | Estado | Onde |
|---|---|---|---|
| Abjuração 2 | Barreira Arcana (2 × nível + INT) | 🔧 ✅ | Abjuração de 1º+ ergue/recarrega; o dano cai nela antes dos PV |
| Abjuração 6 | Barreira Projetada | 📋 | Lembrete |
| Abjuração 10 | Abjuração Aprimorada | 📋 | Lembrete |
| Abjuração 14 | Resistência a Magia | 🔧 ✅ | Nas resistências |
| Adivinhação 2/14 | Portento (2 → 3 d20) | 🔧 🎲 | Painel: rola os d20 do dia; cada um some ao usar; limpa no descanso longo |
| Adivinhação 6/10 | Adivinhação Especialista, O Terceiro Olho | 📋 | Lembretes |
| Evocação 2/6 | Esculpir Magias, Truque Potente | 📋 | Lembretes |
| Evocação 10 | Evocação Poderosa (+INT) | 🔧 ✅ | Conjurar soma sozinho |
| Evocação 14 | Sobrecarga (dano máximo; 2d12+ necrótico do 2º uso) | 🔧 ✅ | Painel liga; a próxima magia de 1º–5º sai no máximo e cobra o necrótico |
| Conjuração 6 | Transposição Benigna | 🔧 🎲 | Painel; volta ao conjurar conjuração de 1º+ |
| Conjuração 2/10/14 | Conjuração Menor, Focada, Invocações Duráveis | 📋 | Lembretes |
| Encantamento 2 | Olhar Hipnótico | 🔧 🎲 | Painel (ação, SAB) |
| Encantamento 6 | Charme Instintivo | 🔧 🎲 | Painel (reação, SAB) |
| Encantamento 10/14 | Dividir Encantamento, Alterar Memórias | 📋 | Lembretes |
| Ilusão 10 | Eu Ilusório | 🔧 🎲 | Painel (reação, descanso curto) |
| Ilusão 2/6/14 | Ilusão Menor Aprimorada, Maleáveis, Realidade Ilusória | 📋 | Lembretes |
| Necromancia 2 | Colheita Sinistra (2 × / 3 × círculo) | 🔧 ✅ | Painel: escolhe o círculo e cura |
| Necromancia 10 | Acostumado à Morte-Vida | ✅ | Resistências (já existia) |
| Necromancia 6/14 | Servos Mortos-Vivos, Comandar Mortos-Vivos | 📋 | Lembretes |
| Transmutação 2–14 | Alquimia Menor, Pedra, Metamorfo, Mestre | 📋 | Lembretes |

## Testes
- `src/engine/__tests__/wizardArc.test.ts`:
  - Conjuração.
  - Recuperação Arcana.
  - Domínio de Magia e Assinatura.
  - Abjuração, Adivinhação, Evocação, Necromancia, Conjuração e Ilusão.
- `src/store/__tests__/wizardStore.test.ts`:
  - A Barreira Arcana absorve dano e recarrega.
  - A Recuperação devolve espaços.
  - O descanso longo limpa o Portento.
- `e2e/mago.e2e.ts`:
  - Recuperação Arcana.
  - Sobrecarga com Evocação Poderosa na Bola de Fogo.
  - Portento.
  - Barreira Arcana ao conjurar Escudo Arcano.
