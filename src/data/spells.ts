import type { Spell } from '@/types/dnd';

/**
 * Lista genérica de magias e truques em português (estrutura expansível).
 * Não reproduz texto de regras protegido — apenas nome, círculo e escola.
 */
export const SPELLS: Spell[] = [
  // Truques (nível 0)
  { id: 'sp-firebolt', level: 0, name: 'Raio de Fogo', school: 'Evocação' },
  { id: 'sp-raygelo', level: 0, name: 'Raio de Gelo', school: 'Evocação' },
  { id: 'sp-maosmagicas', level: 0, name: 'Mãos Mágicas', school: 'Conjuração' },
  { id: 'sp-luz', level: 0, name: 'Luz', school: 'Evocação' },
  { id: 'sp-orientacao', level: 0, name: 'Orientação', school: 'Adivinhação' },
  { id: 'sp-prestidigitacao', level: 0, name: 'Prestidigitação', school: 'Transmutação' },
  // 1º círculo
  { id: 'sp-misseis', level: 1, name: 'Mísseis Mágicos', school: 'Evocação' },
  { id: 'sp-escudo', level: 1, name: 'Escudo Arcano', school: 'Abjuração' },
  { id: 'sp-curar', level: 1, name: 'Curar Ferimentos', school: 'Evocação' },
  { id: 'sp-bencao', level: 1, name: 'Bênção', school: 'Encantamento' },
  { id: 'sp-flechacida', level: 1, name: 'Flecha Ácida', school: 'Evocação' },
  // 2º círculo
  { id: 'sp-espelho', level: 2, name: 'Imagem Espelhada', school: 'Ilusão' },
  { id: 'sp-invisibilidade', level: 2, name: 'Invisibilidade', school: 'Ilusão' },
  { id: 'sp-restauracao', level: 2, name: 'Restauração Menor', school: 'Abjuração' },
  // 3º círculo
  { id: 'sp-bolafogo', level: 3, name: 'Bola de Fogo', school: 'Evocação' },
  { id: 'sp-relampago', level: 3, name: 'Relâmpago', school: 'Evocação' },
  { id: 'sp-voo', level: 3, name: 'Voo', school: 'Transmutação' },
  { id: 'sp-contramagia', level: 3, name: 'Contramágica', school: 'Abjuração' },
  { id: 'sp-revigorar', level: 3, name: 'Revigorar', school: 'Necromancia' },
  // mais truques
  { id: 'sp-chama', level: 0, name: 'Chama Sagrada', school: 'Evocação' },
  { id: 'sp-toquegelido', level: 0, name: 'Toque Gélido', school: 'Necromancia' },
  { id: 'sp-zombaria', level: 0, name: 'Zombaria Viciosa', school: 'Encantamento' },
  { id: 'sp-acidoespirito', level: 0, name: 'Respingo Ácido', school: 'Conjuração' },
  // 1º círculo
  { id: 'sp-sono', level: 1, name: 'Sono', school: 'Encantamento' },
  { id: 'sp-fadas', level: 1, name: 'Fogo das Fadas', school: 'Evocação' },
  { id: 'sp-ondatrov', level: 1, name: 'Onda Trovejante', school: 'Evocação' },
  { id: 'sp-detectar', level: 1, name: 'Detectar Magia', school: 'Adivinhação' },
  // 2º círculo
  { id: 'sp-aterrorizar', level: 2, name: 'Raio do Enfraquecimento', school: 'Necromancia' },
  { id: 'sp-passos', level: 2, name: 'Passo Enevoado', school: 'Conjuração' },
  { id: 'sp-segurar', level: 2, name: 'Imobilizar Pessoa', school: 'Encantamento' },
  // 4º e 5º círculos
  { id: 'sp-muralha', level: 4, name: 'Muralha de Fogo', school: 'Evocação' },
  { id: 'sp-banir', level: 4, name: 'Banimento', school: 'Abjuração' },
  { id: 'sp-conemar', level: 5, name: 'Cone do Frio', school: 'Evocação' },
  { id: 'sp-coluna', level: 5, name: 'Coluna de Chamas', school: 'Evocação' },
];

export const SPELL_BY_ID: Record<string, Spell> = Object.fromEntries(
  SPELLS.map((s) => [s.id, s]),
);

const SPELLS_BY_CLASS: Record<string, string[]> = {
  bard: ['sp-zombaria', 'sp-prestidigitacao', 'sp-sono', 'sp-fadas', 'sp-detectar', 'sp-ondatrov', 'sp-invisibilidade', 'sp-segurar'],
  cleric: ['sp-orientacao', 'sp-chama', 'sp-curar', 'sp-bencao', 'sp-detectar', 'sp-restauracao', 'sp-revigorar', 'sp-coluna'],
  druid: ['sp-orientacao', 'sp-curar', 'sp-fadas', 'sp-detectar', 'sp-ondatrov', 'sp-restauracao', 'sp-voo', 'sp-muralha'],
  paladin: ['sp-curar', 'sp-bencao', 'sp-detectar', 'sp-restauracao', 'sp-revigorar'],
  ranger: ['sp-curar', 'sp-detectar', 'sp-fadas', 'sp-restauracao'],
  sorcerer: ['sp-firebolt', 'sp-raygelo', 'sp-acidoespirito', 'sp-prestidigitacao', 'sp-sono', 'sp-escudo', 'sp-ondatrov', 'sp-bolafogo'],
  warlock: ['sp-toquegelido', 'sp-prestidigitacao', 'sp-sono', 'sp-detectar', 'sp-aterrorizar', 'sp-passos'],
  wizard: ['sp-firebolt', 'sp-raygelo', 'sp-maosmagicas', 'sp-luz', 'sp-misseis', 'sp-escudo', 'sp-flechacida', 'sp-espelho', 'sp-bolafogo', 'sp-contramagia'],
};

const DEFAULT_PREPARED_BY_CLASS: Record<string, string[]> = {
  bard: ['sp-zombaria', 'sp-prestidigitacao', 'sp-sono', 'sp-fadas'],
  cleric: ['sp-orientacao', 'sp-chama', 'sp-curar', 'sp-bencao'],
  druid: ['sp-orientacao', 'sp-curar', 'sp-fadas', 'sp-detectar'],
  paladin: ['sp-curar', 'sp-bencao'],
  ranger: ['sp-curar', 'sp-detectar'],
  sorcerer: ['sp-firebolt', 'sp-prestidigitacao', 'sp-escudo', 'sp-sono'],
  warlock: ['sp-toquegelido', 'sp-prestidigitacao', 'sp-sono'],
  wizard: ['sp-firebolt', 'sp-maosmagicas', 'sp-misseis', 'sp-escudo'],
};

export function spellsForClass(classId: string, maxCircle = 9): Spell[] {
  const ids = SPELLS_BY_CLASS[classId];
  const list = ids ? ids.map((id) => SPELL_BY_ID[id]).filter(Boolean) : SPELLS;
  return list.filter((spell) => spell.level === 0 || spell.level <= maxCircle);
}

/** Truques e magias sugeridos por padrão para conjuradores novos. */
export function defaultPreparedForClass(classId: string, maxCircle: number): string[] {
  const defaults = DEFAULT_PREPARED_BY_CLASS[classId] ?? [];
  return defaults.filter((id) => {
    const spell = SPELL_BY_ID[id];
    return spell && (spell.level === 0 || spell.level <= maxCircle);
  });
}
