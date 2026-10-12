import { subclassOf } from './characterClasses';
import type { Character } from '@/types/character';
import { characterResources } from './classResources';
import { levelIn } from './damageExtras';

/**
 * Bardo (PHB 2014) na mesa: Inspiração de Bardo (dar, Palavras Cortantes,
 * Habilidade Incomparável), Canção de Descanso, Contraencanto e o que os
 * colégios mudam. A ficha usa isto no painel do Bardo (Combate).
 */
export interface BardState {
  level: number;
  /** CD das magias: 8 + prof + CAR. */
  dc: number;
  college: 'lore' | 'valor' | null;
  /** Dado da Inspiração (d6 → d8 no 5º, d10 no 10º, d12 no 15º). */
  die: number;
  left: number;
  max: number;
  /** Fonte de Inspiração (5º): volta no descanso curto. */
  shortRest: boolean;
  /** Canção de Descanso (2º): d6 → d8 (9º), d10 (13º), d12 (17º). */
  songDie: number | null;
  /** Contraencanto (6º). */
  countercharm: boolean;
  /** Pau pra Toda Obra (2º): metade da proficiência nos testes sem proficiência. */
  jack: number | null;
  /** Conhecimento: Palavras Cortantes (3º) e Habilidade Incomparável (14º). */
  cuttingWords: boolean;
  peerless: boolean;
  /** Bravura: Inspiração de Combate (3º) e Magia de Batalha (14º). */
  combatInspiration: boolean;
  battleMagic: boolean;
  /** Inspiração Superior (20º): sem inspiração ao rolar iniciativa, recupera 1. */
  superior: boolean;
}

export const inspirationDie = (level: number) => (level >= 15 ? 12 : level >= 10 ? 10 : level >= 5 ? 8 : 6);
export const songOfRestDie = (level: number) => (level >= 17 ? 12 : level >= 13 ? 10 : level >= 9 ? 8 : level >= 2 ? 6 : null);

export function bardState(char: Character, prof: number, chaMod: number): BardState | null {
  const level = levelIn(char, 'bard');
  if (!level) return null;
  const res = characterResources(char).find((r) => r.id === 'inspiration');
  const max = res?.max ?? 0;
  const sub = subclassOf(char, 'bard');
  const college = sub === 'lore' || sub === 'valor' ? sub : null;
  return {
    level,
    dc: 8 + prof + chaMod,
    college,
    die: inspirationDie(level),
    left: Math.min(max, char.combat?.resources?.inspiration ?? max),
    max,
    shortRest: level >= 5,
    songDie: songOfRestDie(level),
    countercharm: level >= 6,
    jack: level >= 2 ? Math.floor(prof / 2) : null,
    cuttingWords: college === 'lore' && level >= 3,
    peerless: college === 'lore' && level >= 14,
    combatInspiration: college === 'valor' && level >= 3,
    battleMagic: college === 'valor' && level >= 14,
    superior: level >= 20,
  };
}
