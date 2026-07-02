import type { TabProps } from './tabProps';
import { Panel } from '@/components/ui/Panel';
import { useTilt } from '@/lib/useTilt';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { ABILITY_LABELS, ABILITY_SHORT } from '@/data/skills';
import { ABILITY_KEYS } from '@/types/dnd';
import type { AbilityKey } from '@/types/dnd';
import { modStr } from '@/engine/dice';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { abilityLore, savingThrowLore, skillLore } from '@/lib/lore';

/**
 * Aba Ficha — leitura de HUD: faixa de atributos em placas hexagonais no topo
 * (teste no clique, resistência no selo) e perícias agrupadas por atributo,
 * escaneáveis num relance.
 */
export function TabFicha({ derived }: TabProps) {
  const t = useTheme();
  const tilt = useTilt();
  const { check } = useDiceRoller();

  // perícias agrupadas por atributo (FOR nunca tem mais que Atletismo etc.)
  const groups = ABILITY_KEYS.map((key) => ({
    key,
    skills: derived.skills.filter((sk) => sk.ability === key),
  })).filter((g) => g.skills.length > 0);

  return (
    <div className="animate-riseIn" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(13px,1.5vw,18px)' }}>
      {/* faixa de atributos */}
      <Panel style={{ padding: 'clamp(14px,1.6vw,18px)' }}>
        <div className="fv-label" style={{ marginBottom: 12 }}>Atributos &amp; Resistências</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 128px), 1fr))', gap: 10 }}>
          {derived.abilityList.map((a) => (
            <LoreTooltip key={a.key} info={abilityLore(a.key, a.total, a.mod)} anchorStyle={{ display: 'block' }}>
              <div
                onClick={() => check(`Teste de ${ABILITY_LABELS[a.key]}`, a.mod)}
                onMouseMove={tilt.onMouseMove}
                onMouseLeave={tilt.onMouseLeave}
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  background: `linear-gradient(180deg, rgba(0,0,0,.34), rgba(0,0,0,.2))`,
                  border: '1px solid var(--line)',
                  borderTop: `2px solid ${a.saveProf ? t.gold : hexA(t.acc, 0.4)}`,
                  clipPath: 'polygon(9px 0, calc(100% - 9px) 0, 100% 9px, 100% calc(100% - 9px), calc(100% - 9px) 100%, 9px 100%, 0 calc(100% - 9px), 0 9px)',
                  padding: '12px 8px 10px',
                  textAlign: 'center',
                  transition: '.2s',
                }}
              >
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: '.14em', color: 'var(--muted)' }}>
                  {ABILITY_SHORT[a.key]}
                </div>
                <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 32, lineHeight: 1, color: 'var(--ink)', margin: '5px 0 1px', textShadow: '0 0 18px var(--bloom)' }}>
                  {modStr(a.mod)}
                </div>
                <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 11.5, color: 'var(--acc)' }}>{a.total}</div>
                <LoreTooltip info={savingThrowLore(a.key, a.save, a.saveProf)} anchorStyle={{ display: 'block' }}>
                  <div
                    onClick={(e) => { e.stopPropagation(); check(`Resist. de ${ABILITY_LABELS[a.key]}`, a.save); }}
                    style={{
                      marginTop: 8,
                      fontSize: 10,
                      fontFamily: "'Chakra Petch', monospace",
                      letterSpacing: '.05em',
                      padding: '4px 0',
                      borderRadius: 4,
                      cursor: 'pointer',
                      color: a.saveProf ? '#140d04' : 'var(--muted)',
                      background: a.saveProf ? t.gold : 'rgba(255,255,255,.05)',
                      border: '1px solid ' + (a.saveProf ? t.gold : t.line),
                    }}
                  >
                    RESIST {modStr(a.save)}
                  </div>
                </LoreTooltip>
              </div>
            </LoreTooltip>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          Clique na placa para rolar 1d20 · barra dourada = resistência proficiente
        </div>
      </Panel>

      {/* perícias agrupadas por atributo */}
      <Panel style={{ padding: 'clamp(14px,1.6vw,18px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <div className="fv-label">Perícias por Atributo</div>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
            Percepção Passiva {derived.passivePerception}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 218px), 1fr))', gap: 10 }}>
          {groups.map((g) => (
            <SkillGroup key={g.key} ability={g.key} skills={g.skills} onRoll={check} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

interface SkillGroupProps {
  ability: AbilityKey;
  skills: TabProps['derived']['skills'];
  onRoll: (label: string, mod: number) => void;
}

/** Bloco de perícias de um atributo — cabeçalho com sigla e lista curta. */
function SkillGroup({ ability, skills, onRoll }: SkillGroupProps) {
  const t = useTheme();
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,.2)', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          padding: '8px 11px',
          background: `linear-gradient(90deg, ${hexA(t.acc, 0.12)}, transparent 70%)`,
          borderBottom: '1px solid var(--line)',
        }}
      >
        <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 12, color: 'var(--acc)' }}>
          {ABILITY_SHORT[ability]}
        </span>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: 'var(--muted)', letterSpacing: '.06em' }}>
          {ABILITY_LABELS[ability]}
        </span>
      </div>
      <div style={{ padding: '4px 6px 6px' }}>
        {skills.map((sk) => (
          <LoreTooltip key={sk.key} info={skillLore(sk.key, sk.bonus, sk.proficient)} anchorStyle={{ display: 'block' }}>
            <div
              onClick={() => onRoll(sk.label, sk.bonus)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 6px', cursor: 'pointer', borderRadius: 5, transition: '.15s' }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  flex: 'none',
                  transform: 'rotate(45deg)',
                  border: '1px solid ' + (sk.proficient ? t.gold : t.line),
                  background: sk.proficient ? t.gold : 'transparent',
                  boxShadow: sk.proficient ? '0 0 8px ' + hexA(t.gold, 0.6) : 'none',
                }}
              />
              <span style={{ flex: 1, fontSize: 13, color: sk.proficient ? 'var(--ink)' : 'var(--muted)' }}>{sk.label}</span>
              <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 14, color: sk.proficient ? t.gold : 'var(--ink)' }}>
                {modStr(sk.bonus)}
              </span>
            </div>
          </LoreTooltip>
        ))}
      </div>
    </div>
  );
}
