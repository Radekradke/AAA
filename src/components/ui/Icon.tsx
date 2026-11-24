import type { CSSProperties } from 'react';
import { useSyncExternalStore } from 'react';
import { GAME_ICONS_CORE } from './gameIconsCore';

type GameIconName = keyof typeof import('./gameIcons').GAME_ICONS;

/**
 * Os ícones do game-icons.net pesam ~70 KB. A tela inicial usa poucos
 * (./gameIconsCore, no pacote de entrada); o conjunto completo baixa junto
 * com as telas (loadAllIcons nas rotas) ou na primeira vez que um ícone de
 * fora do núcleo aparece — aí o ícone surge quando o conjunto chega.
 */
let allIcons: Record<string, readonly string[]> | null = null;
let loadingIcons: Promise<void> | null = null;
const iconListeners = new Set<() => void>();

export function loadAllIcons(): Promise<void> {
  loadingIcons ??= import('./gameIcons').then((m) => {
    allIcons = m.GAME_ICONS;
    iconListeners.forEach((fn) => fn());
  });
  return loadingIcons;
}

const subscribeIcons = (fn: () => void) => {
  iconListeners.add(fn);
  return () => iconListeners.delete(fn);
};

function gamePaths(name: string): readonly string[] | null | undefined {
  if (name in GAME_ICONS_CORE) return GAME_ICONS_CORE[name as keyof typeof GAME_ICONS_CORE];
  return allIcons ? allIcons[name] : undefined;
}

export type IconName = GameIconName | 'star' | 'starFill' | 'more' | 'close' | 'image' | 'gear' | 'book' | 'logout' | 'link' | 'calendar' | 'search' | 'download' | 'home' | 'contrast' | 'user' | 'print' | 'history' | 'compass' | 'help' | 'sliders' | 'palette' | 'device' | 'trash' | 'copy'
  | 'check' | 'pencil' | 'music' | 'play' | 'pause' | 'next' | 'prev' | 'sun' | 'crescent' | 'lock' | 'unlock' | 'scroll' | 'die' | 'flame' | 'pin' | 'clip' | 'coins' | 'heart' | 'hand' | 'skull' | 'hourglass' | 'clock' | 'warning' | 'refresh' | 'grip' | 'info' | 'mail' | 'flag' | 'target' | 'half' | 'sparkle' | 'diamond' | 'ritual' | 'menu' | 'caretDown' | 'triUp' | 'triDown' | 'dot' | 'expand' | 'panelRight' | 'rhombus' | 'plus' | 'arrowShoot' | 'shield' | 'mug' | 'key' | 'candle' | 'starsFour';

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
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  pencil: (
    <>
      <path d="M15.5 4.5l4 4L9 19H5v-4L15.5 4.5Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  music: (
    <>
      <path d="M9 17.5V6l10-2v11.5" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="15.5" r="2.5" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" />,
  pause: (
    <>
      <rect x="6.5" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" />
      <rect x="14" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" />
    </>
  ),
  next: (
    <>
      <path d="M6 5.5v13l9-6.5-9-6.5Z" fill="currentColor" />
      <path d="M18 5.5v13" />
    </>
  ),
  prev: (
    <>
      <path d="M18 5.5v13l-9-6.5 9-6.5Z" fill="currentColor" />
      <path d="M6 5.5v13" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6" />
    </>
  ),
  crescent: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2.5" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 7.6-1.8" />
      <path d="M12 14.5v2.5" />
    </>
  ),
  scroll: (
    <>
      <path d="M8 4.5h10a2 2 0 0 1 0 4h-1.5V17a2.5 2.5 0 0 1-2.5 2.5H6" />
      <path d="M8 4.5a2 2 0 0 0-2 2V17a2.5 2.5 0 1 0 5 0v-1.5h5.5" />
      <path d="M9.5 9h4.5M9.5 12h4.5" />
    </>
  ),
  die: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
      <circle cx="9" cy="9" r="1.1" fill="currentColor" />
      <circle cx="15" cy="9" r="1.1" fill="currentColor" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" />
      <circle cx="9" cy="15" r="1.1" fill="currentColor" />
      <circle cx="15" cy="15" r="1.1" fill="currentColor" />
    </>
  ),
  flame: (
    <>
      <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.6 2.7-5.6 3.9-9.3.9 2 2 3 3.2 3.6.4-1.7.3-3.4-.4-5.6 4.2 2.6 6.3 6.6 6.3 11.3 0 3.6-2.6 6.2-6.5 6.2Z" />
      <path d="M12 21c-1.7 0-2.9-1.2-2.9-2.9 0-1.8 1.4-2.7 2.1-4.3.7 1 1.3 1.3 1.9 1.5.2-.6.2-1.3 0-2 1.6 1 2.4 2.6 2.4 4.8 0 1.7-1.3 2.9-3.5 2.9Z" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  clip: <path d="m19 11.5-7.4 7.4a4.6 4.6 0 0 1-6.5-6.5l7.8-7.8a3.1 3.1 0 0 1 4.4 4.4l-7.6 7.6a1.5 1.5 0 0 1-2.2-2.2l6.9-6.9" />,
  coins: (
    <>
      <ellipse cx="9.5" cy="7.5" rx="5.5" ry="2.5" />
      <path d="M4 7.5v4c0 1.4 2.5 2.5 5.5 2.5M4 11.5v4c0 1.4 2.5 2.5 5.5 2.5" />
      <ellipse cx="15" cy="13" rx="5.5" ry="2.5" />
      <path d="M9.5 13v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" fill="currentColor" />,
  hand: (
    <>
      <path d="M8 12.5V6a1.5 1.5 0 0 1 3 0v5.5M11 11.5V4.8a1.5 1.5 0 0 1 3 0v6.7M14 11.5V6.3a1.5 1.5 0 0 1 3 0V14" />
      <path d="M8 12.5 6.7 11a1.6 1.6 0 0 0-2.4 2.1l3 4.1A7 7 0 0 0 13 20h.5a3.5 3.5 0 0 0 3.5-3.5V14" />
    </>
  ),
  skull: (
    <>
      <path d="M12 3.5c-4.4 0-7.5 3.1-7.5 7.2 0 2.4 1.1 4.1 2.8 5.1v3.7h9.4v-3.7c1.7-1 2.8-2.7 2.8-5.1 0-4.1-3.1-7.2-7.5-7.2Z" />
      <circle cx="9" cy="11" r="1.7" fill="currentColor" />
      <circle cx="15" cy="11" r="1.7" fill="currentColor" />
      <path d="M10.5 19.5V17M13.5 19.5V17" />
    </>
  ),
  hourglass: (
    <>
      <path d="M6.5 3.5h11M6.5 20.5h11" />
      <path d="M7.5 3.5c0 4.5 4.5 5.5 4.5 8.5s-4.5 4-4.5 8.5M16.5 3.5c0 4.5-4.5 5.5-4.5 8.5s4.5 4 4.5 8.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4 21 19.5H3L12 4Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17" r=".9" fill="currentColor" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M20 4.5v3.8h-3.8" />
    </>
  ),
  grip: (
    <>
      {[8, 12, 16].map((y) => (
        <g key={y}>
          <circle cx="9.5" cy={y} r="1.2" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy={y} r="1.2" fill="currentColor" stroke="none" />
        </g>
      ))}
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r=".9" fill="currentColor" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  flag: (
    <>
      <path d="M5.5 21V4" />
      <path d="M5.5 4.5h12l-2.5 4 2.5 4h-12" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  half: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" />
    </>
  ),
  sparkle: <path d="M12 3c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7Z" fill="currentColor" />,
  diamond: <path d="M12 4.5 18 12l-6 7.5L6 12l6-7.5Z" fill="currentColor" />,
  ritual: (
    <>
      <path d="M12 3.5 14.5 7 12 10.5 9.5 7 12 3.5ZM12 13.5l2.5 3.5-2.5 3.5-2.5-3.5 2.5-3.5ZM3.5 12 7 9.5l3.5 2.5L7 14.5 3.5 12ZM13.5 12 17 9.5l3.5 2.5-3.5 2.5-3.5-2.5Z" fill="currentColor" />
    </>
  ),
  menu: <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />,
  caretDown: <path d="m7 10 5 5 5-5Z" fill="currentColor" />,
  triUp: <path d="M12 6.5 19 17.5H5L12 6.5Z" fill="currentColor" />,
  triDown: <path d="M12 17.5 5 6.5h14L12 17.5Z" fill="currentColor" />,
  dot: <circle cx="12" cy="12" r="4.5" fill="currentColor" />,
  expand: <path d="M14 4.5h5.5V10M10 19.5H4.5V14M19.5 4.5 13 11M4.5 19.5 11 13" />,
  panelRight: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M13 4.5h5.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H13Z" fill="currentColor" />
    </>
  ),
  rhombus: <path d="M12 4 20 12l-8 8-8-8 8-8Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrowShoot: (
    <>
      <path d="M4 20 18 6" />
      <path d="M13 5h6v6" />
      <path d="m4 16 3 1 1 3M7 13l3 1 1 3" />
    </>
  ),
  shield: <path d="M12 3.5 19 6v5.5c0 4.4-2.9 7.6-7 9-4.1-1.4-7-4.6-7-9V6l7-2.5Z" />,
  mug: (
    <>
      <path d="M5.5 7.5h10V18a2.5 2.5 0 0 1-2.5 2.5H8A2.5 2.5 0 0 1 5.5 18V7.5Z" />
      <path d="M15.5 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" />
      <path d="M6 7.5a2.5 2.5 0 0 1 2.3-3.3 3 3 0 0 1 5.4.2A2.3 2.3 0 0 1 15.5 7" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h8.5M17 12v3M20 12v2.5" />
    </>
  ),
  candle: (
    <>
      <rect x="8.5" y="10" width="7" height="10.5" rx="1" />
      <path d="M12 10V8.5" />
      <path d="M12 3.5c1.4 1.6 1.8 2.6 1.8 3.4a1.8 1.8 0 0 1-3.6 0c0-.8.4-1.8 1.8-3.4Z" />
    </>
  ),
  starsFour: <path d="M12 3c.6 4 2 5.4 6 6-4 .6-5.4 2-6 6-.6-4-2-5.4-6-6 4-.6 5.4-2 6-6ZM18.5 14.5c.3 1.9 1 2.6 2.9 2.9-1.9.3-2.6 1-2.9 2.9-.3-1.9-1-2.6-2.9-2.9 1.9-.3 2.6-1 2.9-2.9Z" fill="currentColor" />,

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
  // re-renderiza quando o conjunto completo chega
  useSyncExternalStore(subscribeIcons, () => allIcons);
  const isStroke = name in STROKE_PATHS;
  if (!isStroke) {
    const paths = gamePaths(name);
    if (paths === undefined) void loadAllIcons();
    return (
      <svg width={size} height={size} viewBox="0 0 512 512" fill={color} aria-hidden className={className} style={{ flex: 'none', ...style }}>
        {(paths ?? []).map((d, i) => (
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

/** Ícone no meio do texto (no lugar de ✓, ✕, ★…): alinhado à linha e do tamanho da letra. */
export function InlineIcon({ name, size = 14, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <Icon name={name} size={size} className={('fv-ico ' + className).trim()} />;
}
