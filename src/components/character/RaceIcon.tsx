import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { GAME_ICONS } from '@/components/ui/gameIcons';
import { RACE_ICONS_EXTRA } from '@/components/ui/raceIconsExtra';
import { RACES } from '@/data/races';
import type { Race } from '@/types/dnd';

/**
 * Ícones de raça: os nove do livro (já no app) + criaturas e povos extras
 * (raceIconsExtra) para as raças homebrew. Este módulo só entra na criação
 * de personagem e no editor de raça — o resto do app não baixa os extras.
 */
export interface RaceIconChoice {
  key: string;
  label: string;
  group: 'livro' | 'criaturas';
}

export const RACE_ICON_CHOICES: RaceIconChoice[] = [
  ...RACES.filter((r) => `race-${r.id}` in GAME_ICONS).map((r) => ({ key: `race-${r.id}`, label: r.label, group: 'livro' as const })),
  ...Object.entries(RACE_ICONS_EXTRA).map(([key, d]) => ({ key, label: d.label, group: 'criaturas' as const })),
];

const isKnown = (key: string | undefined): key is string => !!key && (key in RACE_ICONS_EXTRA || key in GAME_ICONS);

/** Ícone que a raça mostra: o escolhido (homebrew), o do livro, ou o brasão. */
export function raceIconKey(race: Pick<Race, 'id' | 'icon'>, fallback: IconName = 'crest'): string {
  if (isKnown(race.icon)) return race.icon;
  const own = `race-${race.id}`;
  return own in GAME_ICONS ? own : fallback;
}

/** Desenha qualquer ícone de raça (do livro ou extra) no mesmo traço. */
export function GlyphIcon({ name, size = 18, className, style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  const extra = RACE_ICONS_EXTRA[name];
  if (extra) {
    return (
      <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor" aria-hidden className={className} style={{ flex: 'none', ...style }}>
        {extra.paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    );
  }
  return <Icon name={(name in GAME_ICONS ? name : 'crest') as IconName} size={size} className={className} style={style} />;
}

/**
 * Escolha do ícone no editor de raça homebrew: mostra o atual e abre uma
 * grade (livro + criaturas) com busca pelo nome — "lagarto", "asas", "lobo"…
 */
export function RaceIconPicker({ value, color, onChange }: { value: string | undefined; color: string; onChange: (key: string | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = isKnown(value) ? value : undefined;
  const label = current ? RACE_ICON_CHOICES.find((c) => c.key === current)?.label : undefined;
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const shown = useMemo(() => {
    const t = norm(q.trim());
    return t ? RACE_ICON_CHOICES.filter((c) => norm(c.label).includes(t) || c.key.includes(t)) : RACE_ICON_CHOICES;
  }, [q]);
  const groups: { id: RaceIconChoice['group']; title: string }[] = [
    { id: 'livro', title: 'Do livro' },
    { id: 'criaturas', title: 'Criaturas e povos' },
  ];

  return (
    <div className="fv-hb-icon" style={{ ['--hb-color' as string]: color } as CSSProperties}>
      <button type="button" className="fv-hb-icon-current" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="fv-hb-icon-grid">
        <span className="fv-hb-icon-swatch" aria-hidden>
          <GlyphIcon name={current ?? 'crest'} size={34} />
        </span>
        <span className="fv-hb-icon-text">
          <b>{label ?? 'Brasão (padrão)'}</b>
          <small>{open ? 'Fechar ícones' : 'Trocar ícone'}</small>
        </span>
      </button>

      {open && (
        <div className="fv-hb-icon-panel" id="fv-hb-icon-grid">
          <input
            className="fv-input fv-hb-icon-search"
            type="search"
            placeholder="Buscar: lagarto, asas, lobo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar ícone"
          />
          <div role="radiogroup" aria-label="Ícone da raça">
            <button
              type="button"
              role="radio"
              aria-checked={!current}
              className={'fv-hb-icon-opt' + (!current ? ' is-on' : '')}
              onClick={() => onChange(undefined)}
              title="Brasão (padrão)"
              aria-label="Brasão (padrão)"
            >
              <GlyphIcon name="crest" size={26} />
            </button>
            {groups.map((g) => {
              const items = shown.filter((c) => c.group === g.id);
              if (!items.length) return null;
              return (
                <div key={g.id} className="fv-hb-icon-group">
                  <span className="fv-hb-icon-title">{g.title}</span>
                  <div className="fv-hb-icon-grid">
                    {items.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        role="radio"
                        aria-checked={current === c.key}
                        className={'fv-hb-icon-opt' + (current === c.key ? ' is-on' : '')}
                        onClick={() => onChange(c.key)}
                        title={c.label}
                        aria-label={c.label}
                      >
                        <GlyphIcon name={c.key} size={26} />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!shown.length && <p className="fv-live-hint">Nenhum ícone com “{q}”.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
