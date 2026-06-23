import type { TabProps } from './tabProps';
import { Panel } from '@/components/ui/Panel';
import { useTilt } from '@/lib/useTilt';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { ABILITY_LABELS, ABILITY_SHORT } from '@/data/skills';
import { modStr } from '@/engine/dice';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { abilityLore, savingThrowLore, skillLore } from '@/lib/lore';

/** Aba Ficha: atributos com testes/resistências e lista de perícias. */
export function TabFicha({ derived }: TabProps) {
  const t = useTheme();
  const tilt = useTilt();
  const { check } = useDiceRoller();

  return (
    <div
      className="animate-riseIn"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(13px,1.5vw,18px)', alignItems: 'start' }}
    >
      {/* Atributos & Resistências */}
      <Panel>
        <div className="fv-label" style={{ marginBottom: 13 }}>Atributos &amp; Resistências</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {derived.abilityList.map((a) => (
            <LoreTooltip key={a.key} info={abilityLore(a.key, a.total, a.mod)} anchorStyle={{ display: 'block' }}>
              <div
                onClick={() => check(`Teste de ${ABILITY_LABELS[a.key]}`, a.mod)}
                onMouseMove={tilt.onMouseMove}
                onMouseLeave={tilt.onMouseLeave}
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  background: 'rgba(0,0,0,.26)',
                  border: '1px solid var(--line)',
                  borderRadius: 13,
                  padding: '11px 8px 9px',
                  textAlign: 'center',
                  transition: '.2s',
                }}
              >
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: '.12em', color: 'var(--muted)' }}>{ABILITY_SHORT[a.key]}</div>
                <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 28, lineHeight: 1, color: 'var(--ink)', margin: '4px 0 1px' }}>
                  {modStr(a.mod)}
                </div>
                <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 11, color: 'var(--acc)' }}>{a.total}</div>
                <LoreTooltip info={savingThrowLore(a.key, a.save, a.saveProf)} anchorStyle={{ display: 'block' }}>
                  <div
                    onClick={(e) => { e.stopPropagation(); check(`Resist. de ${ABILITY_LABELS[a.key]}`, a.save); }}
                    style={{
                      marginTop: 7,
                      fontSize: 10,
                      fontFamily: "'Chakra Petch', monospace",
                      letterSpacing: '.04em',
                      padding: '3px 0',
                      borderRadius: 7,
                      cursor: 'pointer',
                      color: a.saveProf ? '#140d04' : 'var(--muted)',
                      background: a.saveProf ? t.gold : 'rgba(255,255,255,.05)',
                      border: '1px solid ' + (a.saveProf ? t.gold : t.line),
                    }}
                  >
                    resist {modStr(a.save)}
                  </div>
                </LoreTooltip>
              </div>
            </LoreTooltip>
          ))}
        </div>
        <div style={{ marginTop: 11, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          Toque num atributo para rolar 1d20 · selo dourado = proficiente
        </div>
      </Panel>

      {/* Perícias */}
      <Panel>
        <div className="fv-label" style={{ marginBottom: 11 }}>Perícias</div>
        <div className="fv-scroll-thin" style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
          {derived.skills.map((sk) => (
            <LoreTooltip key={sk.key} info={skillLore(sk.key, sk.bonus, sk.proficient)} anchorStyle={{ display: 'block' }}>
              <div
                onClick={() => check(sk.label, sk.bonus)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 6px',
                  borderBottom: '1px solid var(--line)',
                  cursor: 'pointer',
                  transition: '.15s',
                }}
              >
                <span
                  style={{
                    width: 13,
                    height: 13,
                    flex: 'none',
                    borderRadius: 999,
                    border: '1px solid ' + (sk.proficient ? t.gold : t.line),
                    background: sk.proficient ? t.gold : 'transparent',
                    boxShadow: sk.proficient ? '0 0 9px ' + hexA(t.gold, 0.6) : 'none',
                  }}
                />
                <span style={{ flex: 1, fontSize: 13.5, color: sk.proficient ? 'var(--ink)' : 'var(--muted)' }}>{sk.label}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>{ABILITY_SHORT[sk.ability]}</span>
                <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 15, color: sk.proficient ? t.gold : 'var(--ink)', minWidth: 30, textAlign: 'right' }}>
                  {modStr(sk.bonus)}
                </span>
              </div>
            </LoreTooltip>
          ))}
        </div>
      </Panel>
    </div>
  );
}
