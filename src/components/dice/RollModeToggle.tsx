import { useEffect, useRef, useState } from 'react';
import { useUiStore } from '@/store/uiStore';
import type { RollMode } from '@/store/uiStore';
import { Icon } from '@/components/ui/Icon';

interface ModeDef {
  id: RollMode;
  label: string;
  symbol: string;
  /** Cor (variável de tema) quando o modo está ligado. */
  color: string;
  rule: string;
  when: string;
}

const MODES: ModeDef[] = [
  {
    id: 'advantage',
    label: 'Vantagem',
    symbol: '▲',
    color: 'var(--acc)',
    rule: 'Rola 2d20 e fica com o MAIOR.',
    when: 'Quando algo te favorece: atacar um alvo que não te vê, ajuda de um aliado, usar Inspiração.',
  },
  {
    id: 'normal',
    label: 'Normal',
    symbol: '●',
    color: 'var(--ink)',
    rule: 'Rola 1d20. O padrão de toda rolagem.',
    when: 'Sempre que o mestre não disser nada em contrário.',
  },
  {
    id: 'disadvantage',
    label: 'Desvantagem',
    symbol: '▼',
    color: 'var(--danger)',
    rule: 'Rola 2d20 e fica com o MENOR.',
    when: 'Quando algo te atrapalha: envenenado, atacar no escuro, alvo longe demais para a arma.',
  },
];

/**
 * Modo de rolagem dos testes de d20 (ataques, perícias, salvaguardas).
 * Mostra o nome do modo — colorido quando não é Normal, para ninguém
 * esquecer uma vantagem ligada — e abre uma explicação das três opções.
 */
export function RollModeToggle() {
  const mode = useUiStore((s) => s.rollMode);
  const setRollMode = useUiStore((s) => s.setRollMode);
  const armed = useUiStore((s) => s.inspirationArmed);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const current = MODES.find((m) => m.id === mode) ?? MODES[1];
  const on = mode !== 'normal';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="fv-rollmode">
      <button
        type="button"
        className={'fv-rollmode-btn' + (on ? ' is-on' : '')}
        style={{ ['--mode-color' as string]: current.color }}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Modo de rolagem: ${current.label}${armed ? ' (Inspiração)' : ''}. Toque para mudar.`}
        title="Como os d20 são rolados"
      >
        <Icon name="d20" size={15} />
        <span className="fv-rollmode-label">{current.label}</span>
        <span className="fv-rollmode-caret" aria-hidden>▾</span>
      </button>

      {open && (
        <div className="fv-rollmode-pop fv-panel" role="dialog" aria-label="Modo de rolagem">
          <div className="fv-rollmode-head">Como rolar o d20</div>
          <div className="fv-rollmode-list" role="radiogroup" aria-label="Modo de rolagem">
            {MODES.map((m) => {
              const active = m.id === mode;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={'fv-rollmode-opt' + (active ? ' is-active' : '')}
                  style={{ ['--mode-color' as string]: m.color }}
                  onClick={() => {
                    setRollMode(m.id);
                    setOpen(false);
                  }}
                >
                  <span className="fv-rollmode-sym" aria-hidden>{m.symbol}</span>
                  <span className="fv-rollmode-text">
                    <b>{m.label}</b>
                    <span>{m.rule}</span>
                    <small>{m.when}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <ul className="fv-rollmode-notes">
            <li>Vale para <b>todas</b> as rolagens de d20 até você voltar para Normal.</li>
            <li>Teve vantagem e desvantagem ao mesmo tempo? Elas se anulam: role Normal.</li>
            <li>Usar a <b>Inspiração</b> liga a Vantagem só para a próxima rolagem.</li>
            <li>Dano e outros dados (d6, d8…) nunca usam vantagem.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
