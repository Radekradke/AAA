import type { Feat } from '@/types/dnd';

/**
 * Talentos do PHB 2014 (subconjunto) — nomes/resumos em português.
 * Efeitos mecânicos codificados entram automaticamente na ficha e são
 * rastreáveis nos cálculos; os demais são lembretes de mesa.
 */
export const FEATS: Feat[] = [
  {
    id: 'alert',
    label: 'Alerta',
    desc: '+5 de iniciativa; você não pode ser surpreendido enquanto consciente.',
    initiativeBonus: 5,
  },
  {
    id: 'athlete',
    label: 'Atleta',
    desc: '+1 em Força ou Destreza; levantar-se e escalar ficam mais eficientes.',
    abilityChoice: ['str', 'dex'],
  },
  {
    id: 'tough',
    label: 'Durão',
    desc: '+2 pontos de vida por nível (retroativo).',
    hpPerLevel: 2,
  },
  {
    id: 'mobile',
    label: 'Móbil',
    desc: '+3 m de deslocamento; terreno difícil não reduz seu Disparar.',
    speedBonus: 3,
  },
  {
    id: 'observant',
    label: 'Observador',
    desc: '+1 em Inteligência ou Sabedoria; +5 em Percepção e Investigação passivas.',
    abilityChoice: ['int', 'wis'],
    passivePerceptionBonus: 5,
  },
  {
    id: 'resilient',
    label: 'Resiliente',
    desc: '+1 em um atributo e proficiência nas salvaguardas desse atributo.',
    abilityChoice: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
  },
  {
    id: 'lucky',
    label: 'Sortudo',
    desc: '3 pontos de sorte por descanso longo para rerrolar d20s.',
  },
  {
    id: 'gwm',
    label: 'Mestre em Armas Grandes',
    desc: 'Pode aceitar −5 no ataque por +10 no dano com armas pesadas; ataque bônus ao abater.',
  },
  {
    id: 'sharpshooter',
    label: 'Atirador de Elite',
    desc: 'Ignora distância longa e cobertura; −5 no ataque por +10 no dano à distância.',
  },
  {
    id: 'sentinel',
    label: 'Sentinela',
    desc: 'Ataques de oportunidade zeram o deslocamento do alvo; punir ataques a aliados.',
  },
  {
    id: 'warcaster',
    label: 'Conjurador de Guerra',
    desc: 'Vantagem em salvaguardas de concentração; conjura com as mãos ocupadas.',
  },
  {
    id: 'tavern',
    label: 'Brigão de Taverna',
    desc: '+1 em Força ou Constituição; socos d4 e agarrão com ataque bônus.',
    abilityChoice: ['str', 'con'],
  },
];

export const FEAT_BY_ID: Record<string, Feat> = Object.fromEntries(FEATS.map((f) => [f.id, f]));

export function getFeat(id: string): Feat | undefined {
  return FEAT_BY_ID[id];
}
