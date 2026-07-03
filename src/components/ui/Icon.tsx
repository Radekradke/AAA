import type { CSSProperties } from 'react';

export type IconName =
  | 'crest'
  | 'swords'
  | 'satchel'
  | 'spark'
  | 'moon'
  | 'quill'
  | 'd20'
  | 'volume'
  | 'volumeOff'
  | 'star'
  | 'starFill'
  | 'anvil'
  | 'edit'
  | 'sword'
  | 'banner'
  | 'levelup';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}

/** Caminhos vetoriais (viewBox 24) — traço em currentColor, estética de HUD de jogo. */
const PATHS: Record<IconName, React.ReactNode> = {
  // brasão/escudo (Ficha)
  crest: (
    <>
      <path d="M12 2.5 19.5 5v6c0 5-3.2 8.6-7.5 10.5C7.7 19.6 4.5 16 4.5 11V5L12 2.5Z" />
      <path d="M12 6.5v9M8.5 9.5 12 6.5l3.5 3" />
    </>
  ),
  // espadas cruzadas (Combate)
  swords: (
    <>
      <path d="m4 4 10.5 10.5M4 4v3.5M4 4h3.5M14.5 14.5 17 17M17 17l-1.2 1.2M17 17l1.2-1.2" />
      <path d="M20 4 9.5 14.5M20 4v3.5M20 4h-3.5M9.5 14.5 7 17M7 17l1.2 1.2M7 17l-1.2-1.2" />
      <path d="M9 19.5 4.5 15M15 19.5 19.5 15" />
    </>
  ),
  // mochila (Inventário)
  satchel: (
    <>
      <path d="M7 7.5V6a5 5 0 0 1 10 0v1.5" />
      <path d="M5.5 7.5h13l1 12.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1l1-12.5Z" />
      <path d="M9 11h6M12 11v3" />
    </>
  ),
  // fagulha arcana (Magias)
  spark: (
    <>
      <path d="M12 2.5c.7 4.4 2.6 6.8 7 7.5-4.4.7-6.3 3.1-7 7.5-.7-4.4-2.6-6.8-7-7.5 4.4-.7 6.3-3.1 7-7.5Z" />
      <path d="M18.5 15.5c.3 1.8 1.1 2.8 3 3-1.9.3-2.7 1.3-3 3-.3-1.7-1.1-2.7-3-3 1.9-.2 2.7-1.2 3-3Z" />
    </>
  ),
  // lua (Descanso)
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />,
  // pena (Diário)
  quill: (
    <>
      <path d="M19.5 4.5c-6 0-11 3.5-13 9.5l-2 5.5 5.5-2c6-2 9.5-7 9.5-13Z" />
      <path d="M4.5 19.5 14 10" />
    </>
  ),
  // d20 (Dados)
  d20: (
    <>
      <path d="M12 2 20.5 7v10L12 22 3.5 17V7L12 2Z" />
      <path d="M12 2 7 9.5h10L12 2ZM3.5 7 7 9.5M20.5 7 17 9.5M7 9.5 12 22M17 9.5 12 22" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" />
      <path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  volumeOff: (
    <>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </>
  ),
  star: <path d="m12 3.5 2.5 5.4 5.9.7-4.4 4 1.2 5.9L12 16.6l-5.2 2.9 1.2-5.9-4.4-4 5.9-.7L12 3.5Z" />,
  starFill: (
    <path
      d="m12 3.5 2.5 5.4 5.9.7-4.4 4 1.2 5.9L12 16.6l-5.2 2.9 1.2-5.9-4.4-4 5.9-.7L12 3.5Z"
      fill="currentColor"
    />
  ),
  // bigorna (forjar item)
  anvil: (
    <>
      <path d="M4 8h9c3.5 0 5.5-1 7-3-1 3.5-3 5.5-6 6v3h-5v-3c-2.5 0-4-1-5-3Z" />
      <path d="M8 17h8M6 20h12" />
      <path d="M9 14v3M15 14v3" />
    </>
  ),
  edit: (
    <>
      <path d="M14.5 5.5 18.5 9.5 8 20H4v-4L14.5 5.5Z" />
      <path d="m12.5 7.5 4 4" />
    </>
  ),
  // estandarte de guerra (Mesa)
  banner: (
    <>
      <path d="M6 3.5h12v13l-6-3.5-6 3.5v-13Z" />
      <path d="M6 3.5H4.5M18 3.5h1.5M12 6.5v3" />
    </>
  ),
  // chevrons de evolução (Level Up)
  levelup: (
    <>
      <path d="m5 13.5 7-6 7 6" />
      <path d="m5 19 7-6 7 6" />
      <path d="M12 7.5v-4M9.5 5.5 12 3l2.5 2.5" />
    </>
  ),
  sword: (
    <>
      <path d="M19.5 4.5 9 15M19.5 4.5V8M19.5 4.5H16" />
      <path d="M7 13l4 4M6 18.5 5.5 18a1.4 1.4 0 0 1 0-2l.8-.8 2.5 2.5-.8.8a1.4 1.4 0 0 1-2 0ZM4.5 19.5 6 18" />
    </>
  ),
};

/** Ícone vetorial do HUD (sem emoji). Herda a cor do texto por padrão. */
export function Icon({ name, size = 18, color = 'currentColor', style, strokeWidth = 1.6 }: IconProps) {
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
      style={{ flex: 'none', ...style }}
    >
      {PATHS[name]}
    </svg>
  );
}
