import type { Character } from '@/types/character';
import type { DiceSkin } from './diceSkins';

/**
 * Dados conquistados: visuais de dado que o herói ganha jogando (feitos,
 * caçadas, sessões e nível). O escolhido rola no lugar do dado do tema —
 * no 3D, no 2D e no aviso de rolagem que a mesa vê.
 *
 * Leve de propósito (o dado rola em qualquer tela): lê os contadores da
 * ficha direto, sem o catálogo de feitos.
 */
export interface DiceTrophy {
  id: string;
  /** Raridade só para a cor do selo no seletor. */
  rarity: 'comum' | 'raro' | 'epico' | 'lendario';
  skin: DiceSkin;
  /** Como liberar (aparece no cadeado). */
  hint: string;
  unlocked: (c: Pick<Character, 'deeds' | 'sessions' | 'level'>) => boolean;
}

const n = (c: Pick<Character, 'deeds'>, k: string) => (c.deeds?.counts as Record<string, number | undefined> | undefined)?.[k] ?? 0;
const topHunt = (c: Pick<Character, 'deeds'>) => Math.max(0, ...Object.values(c.deeds?.hunts ?? {}).map((h) => h?.n ?? 0));
const skin = (label: string, body: string, ink: string, outline: string, texture: DiceSkin['texture'], material: DiceSkin['material'] = 'none'): DiceSkin => ({
  label,
  body: [body],
  ink: [ink],
  outline: [outline],
  texture,
  material,
});

export const DICE_TROPHIES: DiceTrophy[] = [
  { id: 'errante', rarity: 'comum', skin: skin('Bordão do Errante', '#8A5A33', '#FFF1D6', '#2A1608', 'wood'), hint: 'Chegue ao nível 5.', unlocked: (c) => c.level >= 5 },
  { id: 'vitral', rarity: 'raro', skin: skin('Vitral do Templo', '#3B5BA9', '#FFF7D6', '#0E1A3A', 'stainedglass', 'glass'), hint: 'Jogue 10 sessões na mesa.', unlocked: (c) => (c.sessions?.length ?? 0) >= 10 },
  { id: 'tymora', rarity: 'raro', skin: skin('Ouro de Tymora', '#F5D35A', '#2B1A00', 'none', 'stars', 'glass'), hint: 'Tire 10 vinte naturais.', unlocked: (c) => n(c, 'crits') >= 10 },
  { id: 'beshaba', rarity: 'raro', skin: skin('Maldição de Beshaba', '#1A1420', '#E04848', '#000000', 'cloudy_2'), hint: 'Tire 10 uns naturais.', unlocked: (c) => n(c, 'fumbles') >= 10 },
  { id: 'cacador', rarity: 'raro', skin: skin('Pele do Caçador', '#C77A2A', '#1A0D00', 'none', 'tiger'), hint: 'Abata 10 vezes a mesma criatura (bestiário de caçadas).', unlocked: (c) => topHunt(c) >= 10 },
  { id: 'abismo', rarity: 'epico', skin: skin('Mar do Abismo', '#1C3F5E', '#E6FBFF', '#04121F', 'water', 'glass'), hint: 'Dê o golpe final em 3 corruptores.', unlocked: (c) => n(c, 'fiends') >= 3 },
  { id: 'fenix', rarity: 'epico', skin: skin('Pena da Fênix', '#D9531E', '#FFF1C2', '#3A0E00', 'fire', 'glass'), hint: 'Volte de 0 PV 3 vezes.', unlocked: (c) => n(c, 'comebacks') >= 3 },
  { id: 'ceifador', rarity: 'epico', skin: skin('Osso do Ceifador', '#E8E0CC', '#2A1E14', 'none', 'skulls'), hint: 'Dê 25 golpes finais.', unlocked: (c) => n(c, 'kills') >= 25 },
  { id: 'vale', rarity: 'lendario', skin: skin('Gelo do Vale', '#9FD8F0', '#0B2A3A', 'none', 'ice', 'glass'), hint: 'Tire 20 natural num teste contra a morte.', unlocked: (c) => n(c, 'deathSaveCrits') >= 1 },
  { id: 'dragao', rarity: 'lendario', skin: skin('Escamas de Dragão', '#D23A22', '#FFD27A', '#2A0603', 'dragon'), hint: 'Dê o golpe final num dragão.', unlocked: (c) => n(c, 'dragons') >= 1 },
];

const BY_ID = Object.fromEntries(DICE_TROPHIES.map((t) => [t.id, t]));

export const diceTrophy = (id: unknown): DiceTrophy | undefined => (typeof id === 'string' ? BY_ID[id] : undefined);

/** Dado conquistado que o herói escolheu (e ainda tem direito); senão, o do tema. */
export function heroDice(c: Pick<Character, 'diceSkin' | 'deeds' | 'sessions' | 'level'> | null | undefined): DiceTrophy | undefined {
  const t = c ? diceTrophy(c.diceSkin) : undefined;
  return t && t.unlocked(c!) ? t : undefined;
}
