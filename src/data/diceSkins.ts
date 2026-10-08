import type { ThemeName } from '@/types/dnd';

/**
 * Skin dos dados de cada tema — a mesma paleta no dado 3D (física) e no
 * dado 2D (quando o 3D está desligado ou indisponível).
 *
 * Várias cores em `body` = cada dado sorteia uma (com `ink` e `outline` no
 * mesmo índice): o Eclipse alterna porcelana e ônix numa mesma rolagem.
 * Texturas vêm de @3d-dice/dice-box-threejs (MIT), copiadas em public/dice.
 */
export interface DiceSkin {
  /** Nome curto, mostrado no seletor de tema. */
  label: string;
  body: string[];
  ink: string[];
  /** Contorno dos números ('none' = sem contorno). */
  outline: string[];
  texture: 'none' | 'stars' | 'fire' | 'marble' | 'cloudy_2' | 'astral' | 'metal' | 'skulls' | 'dragon' | 'ice' | 'stainedglass' | 'tiger' | 'water' | 'wood';
  /** 'metal' fica escuro demais (a biblioteca zera o reflexo do ambiente): use vidro. */
  material: 'none' | 'glass';
}

export const DICE_SKINS: Record<ThemeName, DiceSkin> = {
  frio: { label: 'Vidro estelar', body: ['#1D3C8F'], ink: ['#EAF3FF'], outline: ['#0A1236'], texture: 'stars', material: 'glass' },
  brasa: { label: 'Cobre em brasa', body: ['#B5561E'], ink: ['#FFE9B0'], outline: ['#3A1405'], texture: 'fire', material: 'glass' },
  verdejante: { label: 'Jade e folha de ouro', body: ['#1F7A55'], ink: ['#F6E7AE'], outline: ['#062A1C'], texture: 'marble', material: 'glass' },
  carmesim: { label: 'Rubi aveludado', body: ['#8C1736'], ink: ['#FFE0D2'], outline: ['#2E0612'], texture: 'cloudy_2', material: 'glass' },
  astral: { label: 'Nebulosa', body: ['#4B2DA0'], ink: ['#FFE9A8'], outline: ['#160A3C'], texture: 'astral', material: 'glass' },
  ouro: { label: 'Ferro e ouro velho', body: ['#4A4133'], ink: ['#F4E2A8'], outline: ['#0B0906'], texture: 'metal', material: 'glass' },
  eclipse: { label: 'Porcelana e ônix', body: ['#F4F2EC', '#141414'], ink: ['#111111', '#F4F2EC'], outline: ['none', 'none'], texture: 'none', material: 'glass' },
  rubra: { label: 'Coral da guilda', body: ['#E2584B'], ink: ['#FFF5F1'], outline: ['#4A1218'], texture: 'none', material: 'glass' },
};
