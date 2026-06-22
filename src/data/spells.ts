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
];

export const SPELL_BY_ID: Record<string, Spell> = Object.fromEntries(
  SPELLS.map((s) => [s.id, s]),
);

/** Truques e magias sugeridos por padrão para conjuradores novos. */
export const DEFAULT_PREPARED = ['sp-firebolt', 'sp-maosmagicas', 'sp-misseis', 'sp-escudo'];
