import type { Spell } from '@/types/dnd';
import { CANTRIP_SCALE, spellBuilder } from './spellsPhb';

/**
 * Magias do Caldeirão de Tasha para Tudo (2020) — pacote "tce".
 * Formato compacto (veja spellsPhb.ts); resumos PARAFRASEADOS.
 * As magias de "Invocar" chamam um espírito com bloco próprio, que
 * escala com o círculo usado (veja o livro).
 */
const S = spellBuilder('tce', 'TCE');

const SUMMON = 'O espírito age logo após você, obedece aos seus comandos e some com 0 PV. Seus números (CA, PV, ataques) crescem com o círculo usado.';

export const TCE_SPELLS: Spell[] = [
  // ======================= TRUQUES =======================
  S('booming-blade', 0, 'Lâmina Trovejante', 'V', 'A', 'Pessoal (raio de 1,5 m)', 'S, M', '1 rodada', 'skw', 'Faça um ataque corpo a corpo com arma; se acertar, o alvo fica envolto em energia: se ele se mover voluntariamente antes do seu próximo turno, sofre 1d8 trovejante.', { dmg: ['1d8', 'trovejante'], higher: 'No 5º nível: +1d8 trovejante no acerto e 2d8 ao se mover (+1d8 em cada no 11º e no 17º).' }),
  S('green-flame-blade', 0, 'Lâmina de Chamas Verdes', 'V', 'A', 'Pessoal (raio de 1,5 m)', 'S, M', 'I', 'skw', 'Faça um ataque corpo a corpo com arma; se acertar, uma chama verde salta para outra criatura a 1,5 m, causando fogo igual ao seu modificador de conjuração.', { dmg: ['mod.', 'fogo'], higher: 'No 5º nível: +1d8 de fogo no alvo e 1d8 + mod. no segundo (+1d8 em cada no 11º e no 17º).' }),
  S('lightning-lure', 0, 'Isca Elétrica', 'V', 'A', 'Pessoal (raio de 4,5 m)', 'V', 'I', 'skw', 'Um chicote de relâmpago: salvaguarda de FOR ou a criatura é puxada até 3 m na sua direção; se terminar a 1,5 m de você, sofre 1d8 elétrico.', { save: 'str', dmg: ['1d8', 'elétrico'], higher: CANTRIP_SCALE }),
  S('mind-sliver', 0, 'Lasca Mental', 'E', 'A', '18 m', 'V', '1 rodada', 'skw', 'Salvaguarda de INT ou 1d6 psíquico, e o alvo subtrai 1d4 da próxima salvaguarda que fizer antes do fim do seu próximo turno.', { save: 'int', dmg: ['1d6', 'psíquico'], higher: CANTRIP_SCALE }),
  S('sword-burst', 0, 'Explosão de Espadas', 'C', 'A', 'Pessoal (raio de 1,5 m)', 'V', 'I', 'skw', 'Lâminas espectrais giram ao seu redor: cada criatura a 1,5 m faz salvaguarda de DES ou sofre 1d6 de energia.', { save: 'dex', dmg: ['1d6', 'energia'], area: 'raio de 1,5 m', higher: CANTRIP_SCALE }),

  // ======================= 1º CÍRCULO =======================
  S('tashas-caustic-brew', 1, 'Infusão Cáustica de Tasha', 'V', 'A', 'Pessoal (linha de 9 m)', 'V, S, M', 'c1m', 'sw', 'Um jato de ácido numa linha de 9 m × 1,5 m: salvaguarda de DES ou fica coberto de ácido, sofrendo 2d4 no início de cada turno até alguém usar uma ação para raspar.', { save: 'dex', dmg: ['2d4', 'ácido'], area: 'linha de 9 m', higher: '+2d4 por círculo acima do 1º.' }),

  // ======================= 2º CÍRCULO =======================
  S('summon-beast', 2, 'Invocar Fera', 'C', 'A', '27 m', 'V, S, M', 'c1h', 'dr', `Invoca um espírito bestial (Ar, Terra ou Água). ${SUMMON}`, { higher: 'O espírito fica mais forte a cada círculo acima do 2º.' }),
  S('tashas-mind-whip', 2, 'Chicote Mental de Tasha', 'E', 'A', '27 m', 'V', '1 rodada', 'sw', 'Salvaguarda de INT ou 3d6 psíquico (metade se passar) e, se falhar, não usa reação e no próximo turno escolhe só um entre movimento, ação ou ação bônus.', { save: 'int', dmg: ['3d6', 'psíquico'], higher: '+1 alvo por círculo acima do 2º.' }),

  // ======================= 3º CÍRCULO =======================
  S('intellect-fortress', 3, 'Fortaleza do Intelecto', 'A', 'A', '9 m', 'V', 'c1h', 'bskw', 'Uma criatura ganha resistência a psíquico e vantagem em salvaguardas de INT, SAB e CAR.', { higher: '+1 alvo por círculo acima do 3º.', tags: ['defesa'] }),
  S('spirit-shroud', 3, 'Manto Espiritual', 'N', 'B', 'Pessoal', 'V, S', 'c1m', 'ckpw', 'Espíritos o cercam: seus ataques contra criaturas a 3 m causam +1d8 radiante, necrótico ou frio; elas não recuperam PV e perdem 3 m de deslocamento.', { dmg: ['1d8', 'radiante/necrótico/frio'], higher: '+1d8 a cada dois círculos acima do 3º.', tags: ['buff'] }),
  S('summon-fey', 3, 'Invocar Fada', 'C', 'A', '27 m', 'V, S, M', 'c1h', 'dkrw', `Invoca um espírito feérico (Furioso, Alegre ou Ardiloso) que pode se teleportar. ${SUMMON}`, { higher: 'O espírito fica mais forte a cada círculo acima do 3º.' }),
  S('summon-shadowspawn', 3, 'Invocar Cria das Sombras', 'C', 'A', '36 m', 'V, S, M', 'c1h', 'kw', `Invoca um espírito sombrio (Fúria, Desespero ou Medo) que se esconde nas sombras. ${SUMMON}`, { higher: 'O espírito fica mais forte a cada círculo acima do 3º.' }),
  S('summon-undead', 3, 'Invocar Morto-Vivo', 'N', 'A', '27 m', 'V, S, M', 'c1h', 'kw', `Invoca um espírito morto-vivo (Fantasmagórico, Pútrido ou Esquelético). ${SUMMON}`, { higher: 'O espírito fica mais forte a cada círculo acima do 3º.' }),

  // ======================= 4º CÍRCULO =======================
  S('summon-aberration', 4, 'Invocar Aberração', 'C', 'A', '27 m', 'V, S, M', 'c1h', 'kw', `Invoca um espírito aberrante (Observador, Espectro Esgueirador ou Slaad). ${SUMMON}`, { higher: 'O espírito fica mais forte a cada círculo acima do 4º.' }),
  S('summon-construct', 4, 'Invocar Construto', 'C', 'A', '27 m', 'V, S, M', 'c1h', 'w', `Invoca um espírito construto (Argila, Metal ou Pedra). ${SUMMON}`, { higher: 'O espírito fica mais forte a cada círculo acima do 4º.' }),
  S('summon-elemental', 4, 'Invocar Elemental', 'C', 'A', '27 m', 'V, S, M', 'c1h', 'drw', `Invoca um espírito elemental (Ar, Terra, Fogo ou Água). ${SUMMON}`, { higher: 'O espírito fica mais forte a cada círculo acima do 4º.' }),

  // ======================= 6º CÍRCULO =======================
  S('summon-celestial', 6, 'Invocar Celestial', 'C', 'A', '27 m', 'V, S, M', 'c1h', 'cp', `Invoca um espírito celestial (Vingador ou Defensor) que pode curar. ${SUMMON}`, { higher: 'O espírito fica mais forte a cada círculo acima do 6º.' }),
  S('summon-fiend', 6, 'Invocar Corruptor', 'C', 'A', '27 m', 'V, S, M', 'c1h', 'kw', `Invoca um espírito corruptor (Demônio, Diabo ou Yugoloth). ${SUMMON}`, { higher: 'O espírito fica mais forte a cada círculo acima do 6º.' }),
  S('tashas-otherworldly-guise', 6, 'Aparência Extraplanar de Tasha', 'T', 'B', 'Pessoal', 'V, S, M', 'c1m', 'skw', 'Assume uma forma dos Planos Superiores ou Inferiores: imunidades a dano e a uma condição, voo de 12 m, +2 na CA, ataques com arma usam seu atributo de conjuração e você ataca duas vezes.', { tags: ['buff'] }),

  // ======================= 7º CÍRCULO =======================
  S('dream-of-the-blue-veil', 7, 'Sonho do Véu Azul', 'C', 'X', '6 m', 'V, S, M', '6 horas', 'bskw', 'Você e até oito criaturas sonham com outro mundo do Plano Material e, ao fim, despertam fisicamente lá.'),

  // ======================= 9º CÍRCULO =======================
  S('blade-of-disaster', 9, 'Lâmina do Desastre', 'C', 'B', '18 m', 'V, S', 'c1m', 'skw', 'Uma fenda em forma de lâmina: até dois ataques corpo a corpo com magia por turno (ação bônus para mover e atacar), 4d12 de energia; crítico em 18–20 com o triplo de dados.', { attack: 'melee', dmg: ['4d12', 'energia'] }),
];
