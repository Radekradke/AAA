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

/**
 * Artes oficiais por raça/aparência: basta soltar o arquivo em
 * `src/assets/herois/` (veja o LEIA-ME de lá e docs/ARTE-PERSONAGENS.md).
 * Nome: `<raça>-<masc|fem>` ou, mais específico, `<raça>-<sub-raça>-<masc|fem>`.
 */
const HERO_ART: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../assets/herois/*.{webp,png,jpg,jpeg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
  ).map(([path, url]) => [path.split('/').pop()!.replace(/\.\w+$/, ''), url]),
);

type ArtSource = 'player' | 'race' | 'default';

function heroArt(char: Character): { url: string; source: ArtSource } {
  if (char.portrait) return { url: char.portrait, source: 'player' };
  const g = char.gender === 'fem' ? 'fem' : 'masc';
  const race = (char.subraceId && HERO_ART[`${char.raceId}-${char.subraceId}-${g}`]) || HERO_ART[`${char.raceId}-${g}`];
  if (race) return { url: race, source: 'race' };
  // versões recortadas (fundo transparente, WebP ~130 KB) — as PNG originais tinham fundo claro
  return { url: g === 'fem' ? '/assets/heroi-fem-recorte.webp' : '/assets/heroi-recorte.webp', source: 'default' };
}

export function heroAvatar(char: Character): string {
  return heroArt(char).url;
}

/** Enquadramento do rosto para avatares circulares (background-size/position). */
export function heroFace(char: Character): { backgroundSize: string; backgroundPosition: string } {
  const { source } = heroArt(char);
  // foto do jogador: enquadramento desconhecido → cobre o círculo mirando o terço de cima
  if (source === 'player') return { backgroundSize: 'cover', backgroundPosition: '50% 22%' };
  // artes da raça seguem a composição do guia (rosto centrado, olhos a ~25% da altura)
  if (source === 'race') return { backgroundSize: '200%', backgroundPosition: '50% 16%' };
  return char.gender === 'fem'
    ? { backgroundSize: '230%', backgroundPosition: '62% 17%' }
    : { backgroundSize: '230%', backgroundPosition: '44% 15%' };
}
