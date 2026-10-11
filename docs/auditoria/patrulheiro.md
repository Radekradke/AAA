# Auditoria — Patrulheiro (PHB 2014), nível 1 ao 20

Legenda: ✅ automático · 🎲 rola/conta · 📋 texto (narrativo) · 🔧 corrigido nesta auditoria (antes era só aparente).

| Nível | Característica | Estado | Onde |
|---|---|---|---|
| 1 | Inimigo Favorito (+ idioma) — 1º, 6º, 14º | ✅ | Escolhas; o painel "Patrulheiro" lista os inimigos |
| 1 | Explorador Nato (terreno) — 1º, 6º, 10º | ✅ | Escolhas; terrenos no painel e lembrete do benefício |
| 2 | Estilo de Luta (Arquearia, Defesa, Duelo, Duas Armas) | ✅ | Escolhas; bônus no ataque/CA/dano |
| 2 | Conjuração (meio conjurador, SAB, magias conhecidas) | ✅ | Aba Magias |
| 3 | Consciência Primitiva (gasta espaço, 1 min por círculo) | 🔧 🎲 | Painel: escolhe o círculo, gasta o espaço e a ação |
| 5 | Ataque Extra | ✅ | Ação Atacar: 2 ataques |
| 8 | Pés Ligeiros na Terra | 📋 | Lembrete no painel |
| 10 | Esconder-se à Vista (+10 em Furtividade parado) | 🔧 ✅ | Painel: liga "Camuflado"; o Esconder soma +10 |
| 14 | Desaparecer (Esconder como ação bônus) | 🔧 🎲 | Painel: rola Furtividade e gasta a ação bônus |
| 18 | Sentidos Selvagens | 📋 | Lembrete |
| 20 | Matador de Inimigos (+SAB, 1×/turno) | 🔧 ✅ | Dano do ataque com arma |

## Caçador
| 3 | Presa do Caçador: Matador de Colossos (+1d8, 1×/turno) | 🔧 ✅ | Dano do ataque com arma |
| 3 | Presa do Caçador: Matador de Gigantes (reação) | 🔧 🎲 | Painel |
| 3 | Presa do Caçador: Quebra-Hordas | 📋 | Lembrete |
| 7 | Táticas Defensivas | 📋 | Lembrete com a opção escolhida |
| 11 | Ataque Múltiplo (Rajada / Ataque Giratório) | 📋 | Lembrete com a opção escolhida |
| 15 | Defesa Superior: Evasão / Esquiva Sobrenatural | ✅ | Ao aplicar dano (já funcionava) |
| 15 | Defesa Superior: Resistir à Maré (reação) | 🔧 🎲 | Painel |

## Mestre das Feras
| 3 | Companheiro de Patrulheiro (soma proficiência) | ✅ | Ficha do companheiro |
| 7 | Treinamento Excepcional (ataques mágicos) | ✅ | Ficha do companheiro |
| 11 | Fúria Bestial (2 ataques) | ✅ | Ficha do companheiro |
| 15 | Compartilhar Magias | 📋 | Ficha do companheiro |

## Testes
- `src/engine/__tests__/rangerArc.test.ts`:
  - Inimigos e terrenos.
  - Conjuração: espaços e magias conhecidas.
  - Características do 3º ao 18º.
  - Matador de Inimigos.
  - Caçador.
  - Mestre das Feras.
- `e2e/patrulheiro.e2e.ts`:
  - Inimigos e terrenos no painel.
  - Consciência Primitiva.
  - Camuflado soma +10 no Desaparecer.
  - Matador de Colossos 1× por turno.
