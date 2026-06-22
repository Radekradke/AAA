import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useUiStore } from '@/store/uiStore';
import { useDiceRoller } from './useDiceRoller';
import { DICE_TYPES, modStr } from '@/engine/dice';

/** Rolador de dados completo + histórico das últimas rolagens. */
export function DiceRoller() {
  const t = useTheme();
  const { rollDice } = useDiceRoller();
  const history = useUiStore((s) => s.history);

  const [sides, setSides] = useState(20);
  const [count, setCount] = useState(1);
  const [mod, setMod] = useState(0);

  const expr = `${count}d${sides}${mod ? ' ' + modStr(mod) : ''}`;

  return (
    <div
      className="animate-riseIn"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(13px,1.5vw,18px)', alignItems: 'start' }}
    >
      <Panel>
        <div className="fv-label" style={{ marginBottom: 13 }}>Rolador de Dados</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9 }}>
          {DICE_TYPES.map((sd) => {
            const active = sides === sd;
            return (
              <button
                key={sd}
                onClick={() => setSides(sd)}
                style={{ cursor: 'pointer', fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 15, padding: '12px 0', borderRadius: 11, border: '1px solid ' + (active ? t.gold : t.line), color: active ? t.gold : t.ink, background: active ? hexA(t.gold, 0.12) : 'rgba(0,0,0,.26)', boxShadow: active ? '0 0 16px ' + hexA(t.gold, 0.3) : 'none', transition: '.2s' }}
              >
                d{sd}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          <Stepper label="Quantidade" value={count} onMinus={() => setCount((c) => Math.max(1, c - 1))} onPlus={() => setCount((c) => Math.min(20, c + 1))} />
          <Stepper label="Modificador" value={modStr(mod)} onMinus={() => setMod((m) => m - 1)} onPlus={() => setMod((m) => m + 1)} wide />
        </div>

        <button
          onClick={() => rollDice(sides, { count, modifier: mod, label: `Rolagem ${expr}` })}
          className="fv-btn-gold"
          style={{ marginTop: 18, width: '100%', padding: 14, fontSize: 16, boxShadow: '0 10px 28px rgba(0,0,0,.4), 0 0 24px var(--bloom)' }}
        >
          Rolar {expr}
        </button>
      </Panel>

      <Panel>
        <div className="fv-label" style={{ marginBottom: 11 }}>Histórico</div>
        {history.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Nenhuma rolagem ainda. Escolha um dado e role.
          </div>
        ) : (
          history.map((h) => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '9px 4px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>{h.expr} [{h.rolls.join(', ')}]</div>
              </div>
              <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 18, color: h.crit ? t.gold : h.fail ? t.danger : h.damage ? t.danger : 'var(--ink)' }}>{h.total}</span>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}

function Stepper({ label, value, onMinus, onPlus, wide }: { label: string; value: string | number; onMinus: () => void; onPlus: () => void; wide?: boolean }) {
  const btn = (accent: boolean): React.CSSProperties => ({ cursor: 'pointer', width: 34, height: 34, borderRadius: 9, border: '1px solid var(--line)', background: 'rgba(0,0,0,.26)', color: accent ? 'var(--acc)' : 'var(--muted)', fontWeight: 700, fontSize: 15 });
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <button onClick={onMinus} style={btn(false)}>−</button>
        <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 22, color: 'var(--ink)', minWidth: wide ? 40 : 28, textAlign: 'center' }}>{value}</span>
        <button onClick={onPlus} style={btn(true)}>+</button>
      </div>
    </div>
  );
}
