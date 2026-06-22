import type { Character } from '@/types/character';
import { getRace, getSubrace } from '@/data/races';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';

/** "Anão da Montanha · Guerreiro" */
export function raceLine(char: Character): string {
  const race = getRace(char.raceId);
  const sub = getSubrace(char.raceId, char.subraceId);
  return race.label + (sub ? ` · ${sub.label}` : '');
}

export function classLine(char: Character): string {
  const cls = getClass(char.classId);
  return `${cls.label} ${char.level}`;
}

/** Subtítulo completo da ficha: "Anão · Guerreiro 5 · Soldado". */
export function heroSubtitle(char: Character): string {
  const bg = getBackground(char.backgroundId);
  return `${raceLine(char)} · ${classLine(char)} · ${bg.label}`;
}

export function shortSubtitle(char: Character): string {
  const cls = getClass(char.classId);
  const race = getRace(char.raceId);
  return `${race.label} · ${cls.label} ${char.level}`;
}

export function heroAvatar(char: Character): string {
  return char.gender === 'fem' ? '/assets/heroi-fem.png' : '/assets/heroi.png';
}
