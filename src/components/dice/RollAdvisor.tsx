import { useMemo, useState } from 'react';
import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { adviseRoll, ADVISOR_EXAMPLES } from '@/engine/rollAdvisor';
import { modStr } from '@/engine/dice';
import '@/styles/dice.css';
import { Icon } from '@/components/ui/Icon';
import { useDiceRoller } from './useDiceRoller';

/**
 * "O que eu rolo?" — o jogador escreve o que quer fazer e a ficha responde
 * com o teste certo, o bônus e de onde ele vem. Um toque rola.
 */
export function RollAdvisor({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const { check } = useDiceRoller();
  const [text, setText] = useState('');

  const suggestions = useMemo(() => adviseRoll(text, char, derived), [text, char, derived]);
  const typed = text.trim().length >= 2;

  return (
    <div>
      <div className="fv-adv-head">
        <Icon name="d20" size={16} color="var(--color-metal)" />
        <div className="fv-label">O que eu rolo?</div>
      </div>
      <div className="fv-adv-hint">Descreva a ação — a ficha indica o teste e o bônus.</div>

      <input
        className="fv-input fv-adv-input"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ex.: escalar o muro"
        aria-label="Descreva o que seu personagem quer fazer"
        enterKeyHint="search"
      />

      {!typed && (
        <div className="fv-adv-examples">
          {ADVISOR_EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              className="fv-adv-example"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {typed && suggestions.length === 0 && (
          <div className="fv-adv-none">
            Não reconheci essa ação. Tente outras palavras — ou pergunte ao mestre qual atributo ele quer.
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="fv-adv-list">
            {suggestions.map((s, i) => {
              const main = i === 0;
              return (
                <div key={s.id} className={'fv-adv-row' + (main ? ' is-main' : '')}>
                  <div className="fv-adv-text">
                    {main && <div className="fv-adv-best">MAIS PROVÁVEL</div>}
                    <div className="fv-adv-label">{s.label}</div>
                    <div className="fv-adv-why">{s.why}</div>
                    <div className="fv-adv-math">{s.math}</div>
                  </div>
                  <button
                    onClick={() => check(s.label, s.bonus)}
                    aria-label={`Rolar ${s.label} ${modStr(s.bonus)}`}
                    type="button"
                    className="fv-adv-roll"
                  >
                    {modStr(s.bonus)}
                    <div className="fv-adv-roll-sub">ROLAR</div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
