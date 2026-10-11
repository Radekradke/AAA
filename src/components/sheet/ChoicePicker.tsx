import type { ChoiceOption } from '@/data/classChoices';
import type { ReplacePick } from '@/engine/classChoices';
import { choiceOptionLore } from '@/lib/lore';
import { LoreTooltip } from '@/components/ui/LoreTooltip';

interface ChoicePickerProps {
  label: string;
  hint?: string;
  /** Quem concede (classe/subclasse) e em que nível. */
  source?: string;
  options: ChoiceOption[];
  /** Opções que o personagem já tem (não podem ser escolhidas de novo). */
  taken: string[];
  /** Quantas escolher agora. */
  need: number;
  value: string[];
  onChange: (next: string[]) => void;
  /** Troca opcional de uma opção antiga (Manobras, Invocações…). */
  canReplace?: boolean;
  replace?: ReplacePick;
  onReplace?: (next: ReplacePick | undefined) => void;
}

/**
 * Escolha de opções de classe (Metamagia, Estilo de Luta, Manobras…):
 * cartões com o efeito resumido, contador "2 de 3" e bloqueio do que já tem.
 */
export function ChoicePicker({ label, hint, source, options, taken, need, value, onChange, canReplace, replace, onReplace }: ChoicePickerProps) {
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else if (need === 1) onChange([id]);
    else if (value.length < need) onChange([...value, id]);
  };
  const done = value.length === need;
  const takenOptions = options.filter((o) => taken.includes(o.id));

  return (
    <div className="fv-choice-picker">
      <div className="fv-choice-picker-head">
        <div>
          <b>{label}</b>
          {source && <span className="fv-choice-picker-source">{source}</span>}
        </div>
        {need > 0 ? (
          <span className={'fv-choice-picker-count' + (done ? ' is-done' : '')}>
            {done ? '✓ ' : ''}
            {value.length} de {need}
          </span>
        ) : (
          <span className="fv-choice-picker-count">opcional</span>
        )}
      </div>
      {hint && <p className="fv-choice-picker-hint">{hint}</p>}
      {need === 0 && takenOptions.length > 0 && (
        <p className="fv-choice-picker-hint">
          Você tem: {takenOptions.map((o) => o.label).join(', ')}.
        </p>
      )}
      {need > 0 && <div className="fv-choice-picker-grid" role="group" aria-label={label}>
        {options.map((o) => {
          const has = taken.includes(o.id);
          const on = value.includes(o.id);
          const full = !on && value.length >= need && need > 1;
          return (
            <LoreTooltip key={o.id} info={choiceOptionLore(o)}>
            <button
              type="button"
              aria-pressed={on}
              disabled={has || full}
              className={'fv-choice-opt' + (on ? ' is-on' : '') + (has ? ' is-taken' : '')}
              onClick={() => toggle(o.id)}
            >
              <span className="fv-choice-opt-top">
                <span className="fv-choice-opt-name">{o.label}</span>
                {has ? <span className="fv-choice-opt-tag">já tem</span> : o.tag && <span className="fv-choice-opt-tag">{o.tag}</span>}
              </span>
              <span className="fv-choice-opt-desc">{o.desc}</span>
            </button>
            </LoreTooltip>
          );
        })}
      </div>}

      {canReplace && onReplace && takenOptions.length > 0 && (
        <div className="fv-choice-replace">
          <span>Trocar uma que já tem (opcional):</span>
          <select
            className="fv-input"
            value={replace?.from ?? ''}
            onChange={(e) => onReplace(e.target.value ? { from: e.target.value, to: replace?.to ?? '' } : undefined)}
          >
            <option value="">Não trocar</option>
            {takenOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          {replace?.from && (
            <>
              <span aria-hidden>→</span>
              <select className="fv-input" value={replace.to} onChange={(e) => onReplace({ from: replace.from, to: e.target.value })}>
                <option value="">Escolha a nova…</option>
                {options
                  .filter((o) => !taken.includes(o.id) && !value.includes(o.id))
                  .map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
              </select>
            </>
          )}
        </div>
      )}
    </div>
  );
}
