import type { Character } from '@/types/character';
import { getSubrace, raceOf } from '@/data/races';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { artKeyFromFileName } from './heroArtName';
import facesJson from '@/assets/herois/rostos.json';

/** "Anão da Montanha · Guerreiro" */
export function raceLine(char: Character): string {
  const race = raceOf(char);
  const sub = getSubrace(char.raceId, char.subraceId);
  return race.label + (race.homebrew ? ' (homebrew)' : '') + (sub ? ` · ${sub.label}` : '');
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
  const race = raceOf(char);
  return `${race.label} · ${cls.label} ${char.level}`;
}

/**
 * Retratos oficiais por classe + aparência: basta soltar o arquivo em
 * `src/assets/herois/` com o nome `<classe>-<masc|fem>` (ex.: `druid-fem.webp`)
 * ou em português (`Druida feminina.webp`).
 * Veja o LEIA-ME de lá e docs/ARTE-PERSONAGENS.md.
 */
const HERO_ART: Record<string, string> = {};
/** Chaves `<classe>-<masc|fem>` que já têm retrato oficial. */
export function heroArtKeys(): Record<string, string> {
  return HERO_ART;
}
export function heroFaces(): Record<string, [number, number]> {
  return FACE;
}
for (const [path, url] of Object.entries(
  import.meta.glob('../assets/herois/*.{webp,png,jpg,jpeg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
)) {
  const key = artKeyFromFileName(path.split('/').pop()!);
  if (key) HERO_ART[key] = url;
}

/**
 * Onde fica o rosto em cada retrato (% da largura, % da altura) — o avatar
 * redondo e o painel centralizam ali. Fica em src/assets/herois/rostos.json
 * (a Oficina de Retratos gera esse arquivo). Retrato sem entrada usa o padrão.
 */
const FACE = facesJson as unknown as Record<string, [number, number]>;
const FACE_DEFAULT: [number, number] = [42, 17];
/** Retratos oficiais são 3:4 (altura / largura). */
const ART_ASPECT = 4 / 3;
/** Zoom do avatar redondo sobre o retrato oficial. */
const AVATAR_ZOOM = 2.3;

type ArtSource = 'player' | 'class' | 'default';

function heroArt(char: Character): { url: string; source: ArtSource; key?: string } {
  if (char.portrait) return { url: char.portrait, source: 'player' };
  const g = char.gender === 'fem' ? 'fem' : 'masc';
  const key = `${char.classId}-${g}`;
  if (HERO_ART[key]) return { url: HERO_ART[key], source: 'class', key };
  // versões recortadas (fundo transparente, WebP ~130 KB) — as PNG originais tinham fundo claro
  return { url: g === 'fem' ? '/assets/heroi-fem-recorte.webp' : '/assets/heroi-recorte.webp', source: 'default' };
}

export function heroAvatar(char: Character): string {
  return heroArt(char).url;
}

const clampPct = (v: number) => `${Math.round(Math.min(100, Math.max(0, v * 100)) * 10) / 10}%`;

/** Enquadramento do rosto para avatares circulares (background-size/position). */
export function heroFace(char: Character): { backgroundSize: string; backgroundPosition: string } {
  const art = heroArt(char);
  // foto do jogador: enquadramento desconhecido → cobre o círculo mirando o terço de cima
  if (art.source === 'player') return { backgroundSize: 'cover', backgroundPosition: '50% 22%' };
  if (art.source === 'class') {
    // leva o ponto do rosto ao centro do círculo (background-position em % é relativo à sobra)
    const [fx, fy] = FACE[art.key!] ?? FACE_DEFAULT;
    const z = AVATAR_ZOOM, zh = AVATAR_ZOOM * ART_ASPECT;
    return {
      backgroundSize: `${z * 100}%`,
      backgroundPosition: `${clampPct((0.5 - (fx / 100) * z) / (1 - z))} ${clampPct((0.48 - (fy / 100) * zh) / (1 - zh))}`,
    };
  }
  return char.gender === 'fem'
    ? { backgroundSize: '230%', backgroundPosition: '62% 17%' }
    : { backgroundSize: '230%', backgroundPosition: '44% 15%' };
}

/** object-position do retrato grande (painel do herói), mirando o rosto. */
export function heroPortraitPosition(char: Character): string {
  const art = heroArt(char);
  if (art.source === 'class') {
    const [fx, fy] = FACE[art.key!] ?? FACE_DEFAULT;
    return `${fx}% ${Math.max(0, fy - 8)}%`;
  }
  return '50% 18%';
}
