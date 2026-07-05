import type { RarityDef, ThemeDef, ThemeName } from '@/types/dnd';

/** Ordem de rotação dos climas no alternador da barra superior. */
export const THEME_ORDER: ThemeName[] = ['frio', 'brasa', 'verdejante'];

/** Os climas cinematográficos da referência visual. */
export const THEMES: Record<ThemeName, ThemeDef> = {
  frio: {
    bg: '#0A0C10',
    bg2: '#10141C',
    panel: 'rgba(17,22,32,0.62)',
    panel2: 'rgba(27,35,50,0.46)',
    steel: '#1A2230',
    line: 'rgba(125,160,205,0.16)',
    acc: '#46C8FF',
    acc2: '#C24DFF',
    accSoft: 'rgba(70,200,255,0.10)',
    gold: '#FFE08A',
    goldB: '#FFF0C2',
    ink: '#EAF1FA',
    muted: '#8B99B0',
    danger: '#FF6A3D',
    bloom: 'rgba(70,200,255,0.20)',
    particle: '#7DE3FF',
    label: 'Arcano Frio',
  },
  brasa: {
    bg: '#0B0806',
    bg2: '#16100B',
    panel: 'rgba(28,20,13,0.62)',
    panel2: 'rgba(44,31,20,0.46)',
    steel: '#241910',
    line: 'rgba(205,160,105,0.16)',
    acc: '#FF8A4D',
    acc2: '#E0A93E',
    accSoft: 'rgba(255,140,70,0.10)',
    gold: '#FFE3A0',
    goldB: '#FFF1CF',
    ink: '#FAF1E6',
    muted: '#B49C84',
    danger: '#FF5430',
    bloom: 'rgba(255,150,70,0.22)',
    particle: '#FFB066',
    label: 'Brasa Heróica',
  },
  verdejante: {
    bg: '#060B07',
    bg2: '#0C1610',
    panel: 'rgba(15,28,20,0.62)',
    panel2: 'rgba(22,44,31,0.46)',
    steel: '#10241A',
    line: 'rgba(120,205,150,0.16)',
    acc: '#3FD98A',
    acc2: '#8FE04D',
    accSoft: 'rgba(63,217,138,0.10)',
    gold: '#F0E4A8',
    goldB: '#FBF4CC',
    ink: '#ECF7EE',
    muted: '#86A892',
    danger: '#FF5A3C',
    bloom: 'rgba(63,217,138,0.20)',
    particle: '#7DE3A0',
    label: 'Mata Ancestral',
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
