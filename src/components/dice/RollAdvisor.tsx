import { useMemo, useState } from 'react';
import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { adviseRoll, ADVISOR_EXAMPLES } from '@/engine/rollAdvisor';
import { modStr } from '@/engine/dice';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { Icon } from '@/components/ui/Icon';
import { useDiceRoller } from './useDiceRoller';

/**
 * "O que eu rolo?" — o jogador escreve o que quer fazer e a ficha responde
 * com o teste certo, o bônus e de onde ele vem. Um toque rola.
 */
export function RollAdvisor({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const t = useTheme();
  const { check } = useDiceRoller();
  const [text, setText] = useState('');

  const suggestions = useMemo(() => adviseRoll(text, char, derived), [text, char, derived]);
  const typed = text.trim().length >= 2;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Icon name="d20" size={16} color={t.gold} />
        <div className="fv-label">O que eu rolo?</div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 9 }}>Descreva a ação — a ficha indica o teste e o bônus.</div>

      <input
        className="fv-input"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ex.: escalar o muro"
        aria-label="Descreva o que seu personagem quer fazer"
        enterKeyHint="search"
        style={{ width: '100%', minHeight: 42, fontSize: 14, padding: '9px 13px' }}
      />

      {!typed && (
        <div style={{ marginTop: 9, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ADVISOR_EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setText(ex)}
              style={{ cursor: 'pointer', fontSize: 11.5, minHeight: 30, padding: '5px 11px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--sunk)', color: 'var(--muted)' }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {typed && suggestions.length === 0 && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--muted)' }}>
            Não reconheci essa ação. Tente outras palavras — ou pergunte ao mestre qual atributo ele quer.
          </div>
        )}

        {suggestions.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {suggestions.map((s, i) => {
              const main = i === 0;
              const color = main ? t.gold : t.acc;
              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 11px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid ' + hexA(color, main ? 0.55 : 0.3),
                    background: hexA(color, main ? 0.08 : 0.04),
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {main && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: t.gold, marginBottom: 2 }}>MAIS PROVÁVEL</div>}
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{s.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{s.why}</div>
                    <div style={{ fontSize: 10.5, color: hexA(color, 0.95), marginTop: 3, fontFamily: 'var(--font-num)' }}>{s.math}</div>
                  </div>
                  <button
                    onClick={() => check(s.label, s.bonus)}
                    aria-label={`Rolar ${s.label} ${modStr(s.bonus)}`}
                    style={{
                      cursor: 'pointer',
                      flex: 'none',
                      minWidth: 58,
                      minHeight: 44,
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid ' + hexA(color, 0.6),
                      background: 'var(--sunk)',
                      color,
                      fontFamily: 'var(--font-num)',
                      fontWeight: 700,
                      fontSize: 17,
                      lineHeight: 1,
                    }}
                  >
                    {modStr(s.bonus)}
                    <div style={{ fontSize: 7.5, letterSpacing: '.12em', color: 'var(--muted)', marginTop: 3 }}>ROLAR</div>
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
