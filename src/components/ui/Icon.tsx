import type { CSSProperties } from 'react';
import { GAME_ICONS } from './gameIcons';

type GameIconName = keyof typeof GAME_ICONS;

export type IconName = GameIconName | 'star' | 'starFill' | 'more' | 'close' | 'image' | 'gear' | 'book' | 'logout' | 'link' | 'calendar' | 'search' | 'download' | 'home' | 'contrast' | 'user' | 'print' | 'history' | 'compass' | 'help' | 'sliders' | 'palette' | 'device' | 'trash' | 'copy';

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
  home: (
    <>
      <path d="M4 11.5 12 4.5l8 7" />
      <path d="M6.5 10v9.5h11V10" />
      <path d="M10.2 19.5v-5h3.6v5" />
    </>
  ),
  contrast: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c.8-3.8 3.6-5.8 7.2-5.8s6.4 2 7.2 5.8" />
    </>
  ),
  print: (
    <>
      <path d="M7 8.5V4h10v4.5" />
      <rect x="3.5" y="8.5" width="17" height="8" rx="2" />
      <path d="M7 14h10v6H7z" />
    </>
  ),
  history: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4 4.5v3.8h3.8" />
      <path d="M12 8v4.3l2.8 1.7" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6v.4" />
      <circle cx="12" cy="16.8" r=".9" fill="currentColor" />
    </>
  ),
  sliders: (
    <>
      <path d="M5 6.5h8M17 6.5h2M5 12h2M11 12h8M5 17.5h10" />
      <circle cx="15" cy="6.5" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="17.5" r="2" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.3 0 1.9-.9 1.6-2-.3-1.2.4-2.3 1.7-2.3h1.8a3.4 3.4 0 0 0 3.4-3.4C20.5 7.6 16.7 3.5 12 3.5Z" />
      <circle cx="8" cy="11" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="7.5" r="1.1" fill="currentColor" />
      <circle cx="14.8" cy="7.8" r="1.1" fill="currentColor" />
    </>
  ),
  device: (
    <>
      <rect x="6.5" y="3" width="11" height="18" rx="2.5" />
      <path d="M10.5 18h3" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V4.5h5V7" />
      <path d="M6.5 7l.9 12.5h9.2L17.5 7M10.2 10.5v6M13.8 10.5v6" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  download: <path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19.5h14" />,
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
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
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
