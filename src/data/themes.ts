import type { RarityDef, ThemeDef, ThemeName } from '@/types/dnd';

/** Ordem de rotação dos climas no alternador da barra superior. */
export const THEME_ORDER: ThemeName[] = ['frio', 'brasa', 'verdejante'];

/**
 * Os climas: cada um é um lugar com material próprio (veja o topo de
 * globals.css). Cores daqui precisam bater com as variáveis de lá.
 */
export const THEMES: Record<ThemeName, ThemeDef> = {
  frio: {
    bg: '#07090D',
    bg2: '#0F141C',
    panel: '#121823',
    panel2: '#0D121A',
    steel: '#1A2230',
    line: 'rgba(170,186,212,0.13)',
    acc: '#46C8FF',
    acc2: '#9F86FF',
    accSoft: 'rgba(214,228,255,0.05)',
    gold: '#D9E3F2',
    goldB: '#FFFFFF',
    ink: '#E9EEF6',
    muted: '#8D98AB',
    danger: '#FF6A3D',
    bloom: 'rgba(90,170,255,0.10)',
    particle: '#9FDCFF',
    label: 'Arcano Frio',
    motif: 'runes',
  },
  brasa: {
    bg: '#0B0806',
    bg2: '#1A110A',
    panel: '#1C1611',
    panel2: '#15100C',
    steel: '#241910',
    line: 'rgba(214,172,116,0.16)',
    acc: '#FF7B3A',
    acc2: '#F0B43C',
    accSoft: 'rgba(255,226,186,0.05)',
    gold: '#F3C464',
    goldB: '#FFE3A3',
    ink: '#F7EDE1',
    muted: '#B39C83',
    danger: '#FF4D2E',
    bloom: 'rgba(255,120,50,0.12)',
    particle: '#FFA050',
    label: 'Brasa Heróica',
    motif: 'embers',
  },
  verdejante: {
    bg: '#060A07',
    bg2: '#101A12',
    panel: '#131B15',
    panel2: '#0F1611',
    steel: '#10241A',
    line: 'rgba(176,206,160,0.13)',
    acc: '#5FD38D',
    acc2: '#D9B45A',
    accSoft: 'rgba(222,246,208,0.045)',
    gold: '#E6CF8A',
    goldB: '#F6E9BF',
    ink: '#EDF3EA',
    muted: '#90A694',
    danger: '#FF6A45',
    bloom: 'rgba(130,210,140,0.10)',
    particle: '#C2E27F',
    label: 'Mata Ancestral',
    motif: 'leaves',
  },
};

export const RARITY: Record<string, RarityDef> = {
  comum: { label: 'Comum', color: '#9BA7B5' },
  incomum: { label: 'Incomum', color: '#3FC56B' },
  raro: { label: 'Raro', color: '#4D9BFF' },
  'muito-raro': { label: 'Muito Raro', color: '#B061FF' },
  lendario: { label: 'Lendário', color: '#FFA033' },
};

/** Converte um tema em mapa de variáveis CSS para aplicar inline. */
export function themeToVars(t: ThemeDef): Record<string, string> {
  return {
    '--bg': t.bg,
    '--bg2': t.bg2,
    '--panel': t.panel,
    '--panel2': t.panel2,
    '--steel': t.steel,
    '--line': t.line,
    '--acc': t.acc,
    '--acc2': t.acc2,
    '--accSoft': t.accSoft,
    '--gold': t.gold,
    '--goldB': t.goldB,
    '--ink': t.ink,
    '--muted': t.muted,
    '--danger': t.danger,
    '--bloom': t.bloom,
  };
}
