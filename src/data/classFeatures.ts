/**
 * Progressão de classe — D&D 5e 2014 (PHB).
 * Apenas nomes/resumos das características (sem texto oficial protegido).
 * Estrutura expansível: adicione níveis e classes homebrew livremente.
 */

/** Níveis de Aumento de Atributo/Talento (ASI) por classe — PHB 2014. */
export const ASI_LEVELS: Record<string, number[]> = {
  default: [4, 8, 12, 16, 19],
  fighter: [4, 6, 8, 12, 14, 16, 19],
  rogue: [4, 8, 10, 12, 16, 19],
};

export function asiLevelsFor(classId: string): number[] {
  return ASI_LEVELS[classId] ?? ASI_LEVELS.default;
}

export function isAsiLevel(classId: string, classLevel: number): boolean {
  return asiLevelsFor(classId).includes(classLevel);
}

/** Nível de classe em que a subclasse é escolhida — PHB 2014. */
export const SUBCLASS_LEVEL: Record<string, number> = {
  barbarian: 3,
  bard: 3,
  cleric: 1,
  druid: 2,
  fighter: 3,
  monk: 3,
  paladin: 3,
  ranger: 3,
  rogue: 3,
  sorcerer: 1,
  warlock: 1,
  wizard: 2,
};

/** Características de classe por nível (1–10) — nomes em português. */
export const CLASS_FEATURES: Record<string, Record<number, string[]>> = {
  barbarian: {
    1: ['Fúria', 'Defesa sem Armadura'],
    2: ['Ataque Descuidado', 'Sentido de Perigo'],
    3: ['Caminho Primal (subclasse)'],
    4: ['Aumento de Atributo'],
    5: ['Ataque Extra', 'Movimento Rápido'],
    7: ['Instinto Selvagem'],
    9: ['Crítico Brutal (1 dado)'],
  },
  bard: {
    1: ['Conjuração', 'Inspiração de Bardo (d6)'],
    2: ['Versatilidade (Jack of All Trades)', 'Canção de Descanso (d6)'],
    3: ['Colégio de Bardo (subclasse)', 'Especialização (Expertise)'],
    4: ['Aumento de Atributo'],
    5: ['Fonte de Inspiração', 'Inspiração de Bardo (d8)'],
    6: ['Contra-encanto'],
    10: ['Especialização adicional', 'Segredos Mágicos'],
  },
  cleric: {
    1: ['Conjuração', 'Domínio Divino (subclasse)'],
    2: ['Canalizar Divindade (1/descanso)', 'Característica de Domínio'],
    4: ['Aumento de Atributo'],
    5: ['Destruir Mortos-Vivos (ND 1/2)'],
    6: ['Canalizar Divindade (2/descanso)', 'Característica de Domínio'],
    8: ['Aumento de Atributo', 'Característica de Domínio'],
    10: ['Intervenção Divina'],
  },
  druid: {
    1: ['Druídico', 'Conjuração'],
    2: ['Forma Selvagem', 'Círculo Druídico (subclasse)'],
    4: ['Aumento de Atributo', 'Forma Selvagem aprimorada'],
    8: ['Aumento de Atributo', 'Forma Selvagem aprimorada'],
  },
  fighter: {
    1: ['Estilo de Luta', 'Fôlego (Second Wind)'],
    2: ['Surto de Ação'],
    3: ['Arquétipo Marcial (subclasse)'],
    4: ['Aumento de Atributo'],
    5: ['Ataque Extra'],
    6: ['Aumento de Atributo'],
    9: ['Indomável (1 uso)'],
  },
  monk: {
    1: ['Defesa sem Armadura', 'Artes Marciais'],
    2: ['Ki', 'Movimento sem Armadura'],
    3: ['Tradição Monástica (subclasse)', 'Defletir Projéteis'],
    4: ['Aumento de Atributo', 'Queda Lenta'],
    5: ['Ataque Extra', 'Golpe Atordoante'],
    6: ['Golpes de Ki', 'Característica de Tradição'],
    7: ['Evasão', 'Mente Tranquila'],
  },
  paladin: {
    1: ['Sentido Divino', 'Cura pelas Mãos'],
    2: ['Estilo de Luta', 'Conjuração', 'Destruição Divina (Smite)'],
    3: ['Saúde Divina', 'Juramento Sagrado (subclasse)'],
    4: ['Aumento de Atributo'],
    5: ['Ataque Extra'],
    6: ['Aura de Proteção'],
    10: ['Aura de Coragem'],
  },
  ranger: {
    1: ['Inimigo Favorito', 'Explorador Nato'],
    2: ['Estilo de Luta', 'Conjuração'],
    3: ['Arquétipo de Patrulheiro (subclasse)', 'Consciência Primitiva'],
    4: ['Aumento de Atributo'],
    5: ['Ataque Extra'],
    8: ['Aumento de Atributo', 'Pés Ligeiros na Terra'],
  },
  rogue: {
    1: ['Especialização (Expertise)', 'Ataque Furtivo (1d6)', 'Gíria de Ladrão'],
    2: ['Ação Ardilosa'],
    3: ['Arquétipo de Ladino (subclasse)', 'Ataque Furtivo (2d6)'],
    4: ['Aumento de Atributo'],
    5: ['Esquiva Sobrenatural', 'Ataque Furtivo (3d6)'],
    6: ['Especialização adicional'],
    7: ['Evasão', 'Ataque Furtivo (4d6)'],
    9: ['Ataque Furtivo (5d6)'],
    10: ['Aumento de Atributo'],
  },
  sorcerer: {
    1: ['Conjuração', 'Origem de Feitiçaria (subclasse)'],
    2: ['Fonte de Magia (Pontos de Feitiçaria)'],
    3: ['Metamagia (2 opções)'],
    4: ['Aumento de Atributo'],
    10: ['Metamagia adicional'],
  },
  warlock: {
    1: ['Patrono Transcendental (subclasse)', 'Magia de Pacto'],
    2: ['Invocações Místicas (2)'],
    3: ['Dádiva do Pacto'],
    4: ['Aumento de Atributo'],
    5: ['Invocação adicional'],
  },
  wizard: {
    1: ['Conjuração', 'Recuperação Arcana'],
    2: ['Tradição Arcana (subclasse)'],
    4: ['Aumento de Atributo'],
    6: ['Característica de Tradição'],
    10: ['Característica de Tradição'],
  },
};

/** Características ganhas por uma classe num nível específico. */
export function featuresAt(classId: string, classLevel: number): string[] {
  return CLASS_FEATURES[classId]?.[classLevel] ?? [];
}
