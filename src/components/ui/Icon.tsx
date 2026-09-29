import type { CSSProperties } from 'react';
import { GAME_ICONS } from './gameIcons';

type GameIconName = keyof typeof GAME_ICONS;

export type IconName = GameIconName | 'star' | 'starFill' | 'more' | 'close';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  className?: string;
}

/**
 * Ícones de traço (viewBox 24) para os estados de interface que precisam de
 * contorno × preenchido (estrela da Inspiração) e controles genéricos.
 */
const STROKE_PATHS: Record<Exclude<IconName, GameIconName>, React.ReactNode> = {
  star: <path d="m12 3.5 2.5 5.4 5.9.7-4.4 4 1.2 5.9L12 16.6l-5.2 2.9 1.2-5.9-4.4-4 5.9-.7L12 3.5Z" />,
  starFill: <path d="m12 3.5 2.5 5.4 5.9.7-4.4 4 1.2 5.9L12 16.6l-5.2 2.9 1.2-5.9-4.4-4 5.9-.7L12 3.5Z" fill="currentColor" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
};

/**
 * Ícone do HUD. Os temáticos (abas, dados, forja…) vêm do game-icons.net —
 * silhuetas preenchidas com cara de RPG; herdam a cor do texto.
 */
export function Icon({ name, size = 18, color = 'currentColor', style, strokeWidth = 1.6, className }: IconProps) {
  if (name in GAME_ICONS) {
    return (
      <svg width={size} height={size} viewBox="0 0 512 512" fill={color} aria-hidden className={className} style={{ flex: 'none', ...style }}>
        {GAME_ICONS[name as GameIconName].map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      style={{ flex: 'none', ...style }}
    >
      {STROKE_PATHS[name as Exclude<IconName, GameIconName>]}
    </svg>
  );
}
