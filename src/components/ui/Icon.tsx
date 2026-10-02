import type { CSSProperties } from 'react';
import { GAME_ICONS } from './gameIcons';

type GameIconName = keyof typeof GAME_ICONS;

export type IconName = GameIconName | 'star' | 'starFill' | 'more' | 'close' | 'image' | 'gear' | 'book' | 'logout' | 'link';

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
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.7" />
      <path d="m4.5 18 4.8-4.8 3.4 3.4 2.3-2.3 4.5 4.5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
      <circle cx="12" cy="12" r="6.6" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10 5 7.2 4.5 4 4.8v13.4c3.2-.3 6 .2 8 1.8 2-1.6 4.8-2.1 8-1.8V4.8c-3.2-.3-6 .2-8 1.7Z" />
      <path d="M12 6.5V20" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14" />
      <path d="m16 8 4 4-4 4M20 12H10" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.5a4 4 0 0 0 5.7.3l3-3a4 4 0 0 0-5.7-5.7l-1.4 1.4" />
      <path d="M14 10.5a4 4 0 0 0-5.7-.3l-3 3a4 4 0 0 0 5.7 5.7l1.4-1.4" />
    </>
  ),
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
