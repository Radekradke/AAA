import type { CSSProperties, ReactNode } from 'react';
import type { IconName } from '@/components/ui/Icon';
import { CREATION_STEPS, visibleSteps } from '@/engine/creationSummary';
import type { Character } from '@/types/character';
import { GAME_ICONS } from '@/components/ui/gameIcons';
import { GlyphIcon } from './RaceIcon';
import type { Fact } from '@/engine/creationSummary';

/**
 * Peças da "forja do herói" (criação de personagem). Uma linguagem só para
 * todas as etapas: cabeçalho curto, opções como placas com ícone, e um
 * painel de detalhe que diz o que a escolha coloca na ficha.
 */

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

/** Cabeçalho da etapa: capítulo, título e uma linha de contexto. */
export function StepHeader({ step, subtitle, char }: { step: number; subtitle?: string; char?: Character }) {
  const s = CREATION_STEPS[step];
  // numeração pelas etapas que este herói percorre ("Magias" some para quem não conjura)
  const n = char ? Math.max(0, visibleSteps(char).indexOf(step)) : step;
  return (
    <header className="fv-step-head">
      <div className="fv-step-eyebrow"><span className="fv-step-num" aria-hidden>{String(n + 1).padStart(2, '0')}</span>Capítulo {ROMAN[n]}</div>
      <h2>{s.title}</h2>
      <p>{subtitle ?? s.subtitle}</p>
    </header>
  );
}

/** Rótulo de seção dentro de uma etapa. */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="fv-section-title">
      <span>{children}</span>
      {right}
    </div>
  );
}

/** Grade de opções (raças, classes, antecedentes). */
export function OptionGrid({ label, children, compact }: { label: string; children: ReactNode; compact?: boolean }) {
  return (
    <div role="group" aria-label={label} className={'fv-options' + (compact ? ' is-compact' : '')}>
      {children}
    </div>
  );
}

/** Placa de opção: ícone, nome e uma linha que diz para que serve. */
export function OptionTile({ icon, visual, label, line, color, selected, onSelect, onPreview, disabled }: {
  /** Ícone do app ou de raça (inclui os extras das raças homebrew). */
  icon: IconName | string;
  /** Arte ou ícone próprio no lugar do glifo (ex.: a arte do instrumento). */
  visual?: ReactNode;
  label: string;
  line: string;
  color: string;
  selected: boolean;
  onSelect: () => void;
  /** Passar o mouse/focar mostra a opção no painel sem escolher. */
  onPreview?: (on: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      onMouseEnter={onPreview && (() => onPreview(true))}
      onMouseLeave={onPreview && (() => onPreview(false))}
      onFocus={onPreview && (() => onPreview(true))}
      onBlur={onPreview && (() => onPreview(false))}
      disabled={disabled}
      className={'fv-option' + (selected ? ' is-selected' : '') + (visual ? ' has-visual' : '')}
      style={{ ['--opt-color' as string]: color } as CSSProperties}
    >
      {visual ? <span className="fv-option-visual" aria-hidden>{visual}</span> : <GlyphIcon name={icon} size={30} className="fv-option-icon" />}
      <span className="fv-option-name">{label}</span>
      <span className="fv-option-line">{line}</span>
    </button>
  );
}

/** Painel da escolha atual: identidade da opção + o que ela concede. */
export function ChoiceDetail({ icon, visual, media, color, eyebrow, title, tag, desc, facts, factsTitle, actions, children }: {
  /** Ação principal logo abaixo da descrição (antes da lista "Na ficha"). */
  actions?: ReactNode;
  icon: IconName | string;
  /** Ícone próprio no lugar do glifo (ex.: escola da magia). */
  visual?: ReactNode;
  /** Arte grande (carta do item) no lugar da caixinha do ícone. */
  media?: ReactNode;
  factsTitle?: string;
  color: string;
  eyebrow: string;
  title: string;
  tag?: string;
  desc: string;
  facts?: Fact[];
  children?: ReactNode;
}) {
  return (
    <section className="fv-detail" style={{ ['--opt-color' as string]: color } as CSSProperties} aria-live="polite">
      <div className="fv-detail-head">
        {media ?? (
          <div className="fv-detail-icon">
            {visual ?? <GlyphIcon name={icon} size={40} />}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="fv-detail-eyebrow">{eyebrow}</div>
          <h3>{title}</h3>
          {tag && <div className="fv-detail-tag">{tag}</div>}
        </div>
      </div>
      <p className="fv-detail-desc" title={desc}>{desc}</p>
      {actions}
      {facts && facts.length > 0 && <FactList facts={facts} title={factsTitle} />}
      {children}
    </section>
  );
}

/** "Na ficha": o que a escolha concede, em pares rótulo → valor. */
export function FactList({ facts, title = 'Na ficha' }: { facts: Fact[]; title?: string }) {
  return (
    <div className="fv-facts">
      <div className="fv-facts-title">{title}</div>
      <dl>
        {facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Controle segmentado (ex.: método de atributos). */
export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="fv-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? 'is-on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Ícone temático de raça/classe/antecedente, com um padrão se faltar. */
export function themedIcon(prefix: 'race' | 'class' | 'bg', id: string, fallback: IconName = 'banner'): IconName {
  const key = `${prefix}-${id}`;
  return (key in GAME_ICONS ? key : fallback) as IconName;
}
