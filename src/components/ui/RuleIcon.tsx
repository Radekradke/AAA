import { CONDITION_ICONS, SCHOOL_ICONS } from './ruleIcons';

/** Desenho de game-icons (viewBox 512), na cor do texto. */
function Glyph({ d, size, className }: { d: readonly string[]; size: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 512 512" fill="currentColor" aria-hidden focusable="false">
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

/** Ícone da condição (Cego, Envenenado…); null se não houver. */
export function ConditionIcon({ id, size = 16, className }: { id: string; size?: number; className?: string }) {
  const d = CONDITION_ICONS[id];
  return d ? <Glyph d={d} size={size} className={'fv-ruleicon' + (className ? ` ${className}` : '')} /> : null;
}

/** Ícone da escola de magia (Evocação, Ilusão…); null se não houver. */
export function SchoolIcon({ school, size = 14, className }: { school: string; size?: number; className?: string }) {
  const d = SCHOOL_ICONS[school];
  return d ? <Glyph d={d} size={size} className={'fv-ruleicon' + (className ? ` ${className}` : '')} /> : null;
}

export const hasConditionIcon = (id: string) => !!CONDITION_ICONS[id];
