import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import '@/styles/dice.css';
import { useUiStore } from '@/store/uiStore';
import { useDiceRoller } from './useDiceRoller';
import { RollModeToggle } from './RollModeToggle';
import { RollTimeline } from './RollTimeline';
import type { Character } from '@/types/character';
import { DICE_TYPES, modStr } from '@/engine/dice';

/** Rolador de dados completo + linha do tempo das rolagens da ficha. */
export function DiceRoller({ char }: { char?: Character }) {
  const { rollDice, checkD20 } = useDiceRoller();
  const rollMode = useUiStore((s) => s.rollMode);

  const [sides, setSides] = useState(20);
  const [count, setCount] = useState(1);
  const [mod, setMod] = useState(0);

  const expr = `${count}d${sides}${mod ? ' ' + modStr(mod) : ''}`;
  const d20Single = sides === 20 && count === 1;
  const modeLabel = rollMode === 'advantage' ? ' · vantagem' : rollMode === 'disadvantage' ? ' · desvantagem' : '';

  return (
    <div className="animate-riseIn fv-dice">
      <Panel>
        <div className="fv-dice-head">
          <div className="fv-label">Rolador de Dados</div>
          <RollModeToggle />
        </div>
        <div className="fv-dice-types">
          {DICE_TYPES.map((sd) => {
            const active = sides === sd;
            return (
              <button
                key={sd}
                type="button"
                aria-pressed={active}
                onClick={() => setSides(sd)}
                className="fv-dice-type"
              >
                d{sd}
              </button>
            );
          })}
        </div>

        <div className="fv-dice-steppers">
          <Stepper label="Quantidade" value={count} onMinus={() => setCount((c) => Math.max(1, c - 1))} onPlus={() => setCount((c) => Math.min(20, c + 1))} />
          <Stepper label="Modificador" value={modStr(mod)} onMinus={() => setMod((m) => m - 1)} onPlus={() => setMod((m) => m + 1)} wide />
        </div>

        <button
          onClick={() => {
            const opts = {
              count,
              modifier: mod,
              label: `Rolagem ${expr}`,
              advantage: d20Single && rollMode === 'advantage',
              disadvantage: d20Single && rollMode === 'disadvantage',
            };
            // d20 avulso também consome a inspiração preparada
            if (d20Single) checkD20(opts);
            else rollDice(sides, opts);
          }}
          type="button"
          className="fv-btn-gold fv-dice-roll"
        >
          Rolar {expr}
          {d20Single ? modeLabel : ''}
        </button>
      </Panel>

      <Panel>
        <RollTimeline char={char} />
      </Panel>
    </div>
  );
}

function Stepper({ label, value, onMinus, onPlus, wide }: { label: string; value: string | number; onMinus: () => void; onPlus: () => void; wide?: boolean }) {
  return (
    <div>
      <div className="fv-dice-step-label">{label}</div>
      <div className="fv-dice-step-row">
        <button type="button" className="fv-dice-step-btn" onClick={onMinus} aria-label={`Diminuir ${label.toLowerCase()}`}>−</button>
        <span className={'fv-dice-step-val' + (wide ? ' is-wide' : '')}>{value}</span>
        <button type="button" className="fv-dice-step-btn is-up" onClick={onPlus} aria-label={`Aumentar ${label.toLowerCase()}`}>+</button>
      </div>
    </div>
  );
}
