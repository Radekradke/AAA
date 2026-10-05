import { COMPANION_BEASTS } from './beasts';
import type { Beast } from './beasts';

/**
 * Montarias e familiares (SRD 5.1) para a carta de aliados da aba Retrato.
 * Fora de beasts.ts para não pesar no pacote inicial (só a aba usa).
 */
const A = (str: number, dex: number, con: number, int: number, wis: number, cha: number) => ({ str, dex, con, int, wis, cha });

/** Montarias comuns (SRD 5.1): cavalo, pônei, mula, camelo… e o lobo atroz. */
export const MOUNTS: Beast[] = [
  {
    id: 'ridingHorse', label: 'Cavalo de Montaria', size: 'Grande', cr: '1/4', ac: 10, hp: 13, hitDice: '2d10+2', speed: '18 m',
    abilities: A(16, 10, 12, 2, 11, 7), skills: [], senses: 'Percepção passiva 10', traits: [],
    attacks: [{ name: 'Cascos', toHit: 5, dice: 2, die: 4, bonus: 3, type: 'concussão' }],
  },
  {
    id: 'warhorse', label: 'Cavalo de Guerra', size: 'Grande', cr: '1/2', ac: 11, hp: 19, hitDice: '3d10+3', speed: '18 m',
    abilities: A(18, 12, 13, 2, 12, 7), skills: [], senses: 'Percepção passiva 11',
    traits: [{ name: 'Investida Atropeladora', desc: 'Correndo 6 m em linha reta e acertando os cascos: salvaguarda de FOR CD 14 ou o alvo cai; caído, leva outro golpe de cascos como ação bônus.' }],
    attacks: [{ name: 'Cascos', toHit: 6, dice: 2, die: 6, bonus: 4, type: 'concussão' }],
  },
  {
    id: 'draftHorse', label: 'Cavalo de Tração', size: 'Grande', cr: '1/4', ac: 10, hp: 19, hitDice: '3d10+3', speed: '12 m',
    abilities: A(18, 10, 12, 2, 11, 7), skills: [], senses: 'Percepção passiva 10', traits: [],
    attacks: [{ name: 'Cascos', toHit: 6, dice: 2, die: 4, bonus: 4, type: 'concussão' }],
  },
  {
    id: 'pony', label: 'Pônei', size: 'Médio', cr: '1/8', ac: 10, hp: 11, hitDice: '2d8+2', speed: '12 m',
    abilities: A(15, 10, 13, 2, 11, 7), skills: [], senses: 'Percepção passiva 10', traits: [],
    attacks: [{ name: 'Cascos', toHit: 4, dice: 2, die: 4, bonus: 2, type: 'concussão' }],
  },
  {
    id: 'mule', label: 'Mula', size: 'Médio', cr: '1/8', ac: 10, hp: 11, hitDice: '2d8+2', speed: '12 m',
    abilities: A(14, 10, 13, 2, 10, 5), skills: [], senses: 'Percepção passiva 10',
    traits: [
      { name: 'Besta de Carga', desc: 'Conta como Grande para a carga que consegue levar.' },
      { name: 'Pés Firmes', desc: 'Vantagem em salvaguardas de FOR e DES contra ser derrubada.' },
    ],
    attacks: [{ name: 'Cascos', toHit: 4, dice: 1, die: 4, bonus: 2, type: 'concussão' }],
  },
  {
    id: 'camel', label: 'Camelo', size: 'Grande', cr: '1/8', ac: 9, hp: 15, hitDice: '2d10+4', speed: '15 m',
    abilities: A(16, 8, 14, 2, 8, 5), skills: [], senses: 'Percepção passiva 9', traits: [],
    attacks: [{ name: 'Mordida', toHit: 5, dice: 1, die: 4, bonus: 0, type: 'concussão' }],
  },
  {
    id: 'elk', label: 'Alce', size: 'Grande', cr: '1/4', ac: 10, hp: 13, hitDice: '2d10+2', speed: '15 m',
    abilities: A(16, 10, 12, 2, 10, 6), skills: [], senses: 'Percepção passiva 10',
    traits: [{ name: 'Investida', desc: 'Correndo 6 m em linha reta e acertando a chifrada: +2d6 de dano; salvaguarda de FOR CD 13 ou cai.' }],
    attacks: [
      { name: 'Chifrada', toHit: 5, dice: 1, die: 6, bonus: 3, type: 'concussão' },
      { name: 'Cascos', toHit: 5, dice: 2, die: 4, bonus: 3, type: 'concussão', note: 'só em alvo caído' },
    ],
  },
  {
    id: 'direWolf', label: 'Lobo Atroz', size: 'Grande', cr: '1', ac: 14, hp: 37, hitDice: '5d10+10', speed: '15 m',
    abilities: A(17, 15, 15, 3, 12, 7),
    skills: [{ label: 'Percepção', ability: 'wis', bonus: 3 }, { label: 'Furtividade', ability: 'dex', bonus: 4 }],
    senses: 'Percepção passiva 13',
    traits: [
      { name: 'Audição e Olfato Aguçados', desc: 'Vantagem em Percepção que dependa de audição ou olfato.' },
      { name: 'Táticas de Matilha', desc: 'Vantagem no ataque se um aliado estiver a 1,5 m do alvo.' },
    ],
    attacks: [{ name: 'Mordida', toHit: 5, dice: 2, die: 6, bonus: 3, type: 'perfurante', note: 'salvaguarda de FOR CD 13 ou cai' }],
  },
];

/** Familiares (Convocar Familiar, PHB 2014 / SRD 5.1). */
export const FAMILIARS: Beast[] = [
  {
    id: 'owl', label: 'Coruja', size: 'Miúdo', cr: '0', ac: 11, hp: 1, hitDice: '1d4-1', speed: '1,5 m, voo 18 m',
    abilities: A(3, 13, 8, 2, 12, 7),
    skills: [{ label: 'Percepção', ability: 'wis', bonus: 3 }, { label: 'Furtividade', ability: 'dex', bonus: 3 }],
    senses: 'visão no escuro 36 m, Percepção passiva 13',
    traits: [
      { name: 'Voo Rasante', desc: 'Não provoca ataques de oportunidade ao sair do alcance voando.' },
      { name: 'Audição e Visão Aguçadas', desc: 'Vantagem em Percepção que dependa de audição ou visão.' },
    ],
    attacks: [{ name: 'Garras', toHit: 3, dice: 1, die: 1, bonus: 0, type: 'cortante' }],
  },
  {
    id: 'cat', label: 'Gato', size: 'Miúdo', cr: '0', ac: 12, hp: 2, hitDice: '1d4', speed: '12 m, escalar 9 m',
    abilities: A(3, 15, 10, 3, 12, 7),
    skills: [{ label: 'Percepção', ability: 'wis', bonus: 3 }, { label: 'Furtividade', ability: 'dex', bonus: 4 }],
    senses: 'Percepção passiva 13',
    traits: [{ name: 'Olfato Aguçado', desc: 'Vantagem em Percepção que dependa de olfato.' }],
    attacks: [{ name: 'Garras', toHit: 0, dice: 1, die: 1, bonus: 0, type: 'cortante' }],
  },
  {
    id: 'raven', label: 'Corvo', size: 'Miúdo', cr: '0', ac: 12, hp: 1, hitDice: '1d4-1', speed: '3 m, voo 15 m',
    abilities: A(2, 14, 8, 2, 12, 6),
    skills: [{ label: 'Percepção', ability: 'wis', bonus: 3 }],
    senses: 'Percepção passiva 13',
    traits: [{ name: 'Imitação', desc: 'Imita sons simples que já ouviu (salvaguarda de Intuição CD 10 para perceber).' }],
    attacks: [{ name: 'Bico', toHit: 4, dice: 1, die: 1, bonus: 0, type: 'perfurante' }],
  },
  {
    id: 'hawk', label: 'Falcão', size: 'Miúdo', cr: '0', ac: 13, hp: 1, hitDice: '1d4-1', speed: '3 m, voo 18 m',
    abilities: A(5, 16, 8, 2, 14, 6),
    skills: [{ label: 'Percepção', ability: 'wis', bonus: 4 }],
    senses: 'Percepção passiva 14',
    traits: [{ name: 'Visão Aguçada', desc: 'Vantagem em Percepção que dependa de visão.' }],
    attacks: [{ name: 'Garras', toHit: 5, dice: 1, die: 1, bonus: 0, type: 'cortante' }],
  },
  {
    id: 'bat', label: 'Morcego', size: 'Miúdo', cr: '0', ac: 12, hp: 1, hitDice: '1d4-1', speed: '1,5 m, voo 9 m',
    abilities: A(2, 15, 8, 2, 12, 4), skills: [],
    senses: 'percepção às cegas 18 m, Percepção passiva 11',
    traits: [
      { name: 'Ecolocalização', desc: 'Sem a percepção às cegas se estiver surdo.' },
      { name: 'Audição Aguçada', desc: 'Vantagem em Percepção que dependa de audição.' },
    ],
    attacks: [{ name: 'Mordida', toHit: 0, dice: 1, die: 1, bonus: 0, type: 'perfurante' }],
  },
  {
    id: 'rat', label: 'Rato', size: 'Miúdo', cr: '0', ac: 10, hp: 1, hitDice: '1d4-1', speed: '6 m',
    abilities: A(2, 11, 9, 2, 10, 4), skills: [],
    senses: 'visão no escuro 9 m, Percepção passiva 10',
    traits: [{ name: 'Olfato Aguçado', desc: 'Vantagem em Percepção que dependa de olfato.' }],
    attacks: [{ name: 'Mordida', toHit: 0, dice: 1, die: 1, bonus: 0, type: 'perfurante' }],
  },
  {
    id: 'spider', label: 'Aranha', size: 'Miúdo', cr: '0', ac: 12, hp: 1, hitDice: '1d4-1', speed: '6 m, escalar 6 m',
    abilities: A(2, 14, 8, 1, 10, 2),
    skills: [{ label: 'Furtividade', ability: 'dex', bonus: 4 }],
    senses: 'visão no escuro 9 m, Percepção passiva 10',
    traits: [
      { name: 'Escalada de Aranha', desc: 'Escala superfícies difíceis e tetos sem teste.' },
      { name: 'Sentir pela Teia', desc: 'Em contato com uma teia, sabe onde está quem a toca.' },
    ],
    attacks: [{ name: 'Mordida', toHit: 4, dice: 1, die: 1, bonus: 0, type: 'perfurante', note: 'salvaguarda de CON CD 9 ou 1d4 de veneno' }],
  },
  {
    id: 'weasel', label: 'Doninha', size: 'Miúdo', cr: '0', ac: 13, hp: 1, hitDice: '1d4-1', speed: '9 m',
    abilities: A(3, 16, 8, 2, 12, 3),
    skills: [{ label: 'Percepção', ability: 'wis', bonus: 3 }, { label: 'Furtividade', ability: 'dex', bonus: 5 }],
    senses: 'Percepção passiva 13',
    traits: [{ name: 'Audição e Olfato Aguçados', desc: 'Vantagem em Percepção que dependa de audição ou olfato.' }],
    attacks: [{ name: 'Mordida', toHit: 5, dice: 1, die: 1, bonus: 0, type: 'perfurante' }],
  },
  {
    id: 'frog', label: 'Sapo', size: 'Miúdo', cr: '0', ac: 11, hp: 1, hitDice: '1d4-1', speed: '6 m, nadar 6 m',
    abilities: A(1, 13, 8, 1, 8, 3),
    skills: [{ label: 'Percepção', ability: 'wis', bonus: 1 }, { label: 'Furtividade', ability: 'dex', bonus: 3 }],
    senses: 'visão no escuro 9 m, Percepção passiva 11',
    traits: [
      { name: 'Anfíbio', desc: 'Respira no ar e na água.' },
      { name: 'Salto Parado', desc: 'Salta até 3 m em distância e 1,5 m de altura, com ou sem corrida.' },
    ],
    attacks: [],
  },
  {
    id: 'lizard', label: 'Lagarto', size: 'Miúdo', cr: '0', ac: 10, hp: 2, hitDice: '1d4', speed: '6 m, escalar 6 m',
    abilities: A(2, 11, 10, 1, 8, 3), skills: [],
    senses: 'visão no escuro 9 m, Percepção passiva 9', traits: [],
    attacks: [{ name: 'Mordida', toHit: 0, dice: 1, die: 1, bonus: 0, type: 'perfurante' }],
  },
];

/** Qualquer fera que pode virar companheiro, montaria ou familiar. */
export function getAllyBeast(id: string | null | undefined): Beast | undefined {
  if (!id) return undefined;
  return COMPANION_BEASTS.find((b) => b.id === id) ?? MOUNTS.find((b) => b.id === id) ?? FAMILIARS.find((b) => b.id === id);
}
