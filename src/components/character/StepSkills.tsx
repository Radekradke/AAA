import type { StepProps } from './stepTypes';
import { ChapterTitle } from './ChapterTitle';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { SKILL_BY_KEY, ABILITY_SHORT } from '@/data/skills';
import type { SkillKey } from '@/types/dnd';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { skillLore } from '@/lib/lore';

export function StepSkills({ char, update }: StepProps) {
  const t = useTheme();
  const cls = getClass(char.classId);
  const bg = getBackground(char.backgroundId);
  const bgSkills = new Set(bg.skills);

  const chosen = char.skillProfs.filter((k) => !bgSkills.has(k));
  const remaining = cls.skillPicks - chosen.length;

  const toggle = (key: SkillKey) =>
    update((c) => {
      if (bgSkills.has(key)) return;
      const has = c.skillProfs.includes(key);
      if (has) {
        c.skillProfs = c.skillProfs.filter((k) => k !== key);
      } else if (c.skillProfs.filter((k) => !bgSkills.has(k)).length < cls.skillPicks) {
        c.skillProfs = [...c.skillProfs, key];
      }
    });

  return (
    <div className="animate-riseIn">
      <ChapterTitle
        chapter="Capítulo V"
        title="Perícias"
        subtitle={`Escolha ${cls.skillPicks} perícia(s) de ${cls.label}. As do antecedente já vêm garantidas.`}
      />

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          Concedidas por {bg.label}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {bg.skills.map((k) => (
            <LoreTooltip key={k} info={skillLore(k, 0, true)}>
              <span
                style={{
                  cursor: 'help',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#140d04',
                  background: t.gold,
                  padding: '6px 13px',
                  borderRadius: 999,
                }}
              >
                {SKILL_BY_KEY[k].label}
              </span>
            </LoreTooltip>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Perícias de classe
        </div>
        <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 13, color: remaining === 0 ? t.gold : 'var(--acc)' }}>
          {remaining > 0 ? `${remaining} restante(s)` : 'completo ✓'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        {cls.skillChoices.map((key) => {
          const skill = SKILL_BY_KEY[key];
          const granted = bgSkills.has(key);
          const active = char.skillProfs.includes(key);
          const disabled = !active && !granted && remaining <= 0;
          return (
            <LoreTooltip key={key} info={skillLore(key, 0, granted || active)} anchorStyle={{ display: 'block' }}>
              <button
                onClick={() => toggle(key)}
                disabled={granted}
                style={{
                cursor: granted ? 'default' : disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 12,
                textAlign: 'left',
                border: '1px solid ' + (active || granted ? t.gold : t.line),
                background: active || granted ? hexA(t.gold, 0.1) : 'rgba(0,0,0,.26)',
                opacity: disabled ? 0.45 : 1,
                boxShadow: active || granted ? '0 0 18px ' + hexA(t.gold, 0.25) : 'none',
                transition: '.2s',
              }}
              >
                <div>
                  <div style={{ fontSize: 14, color: active || granted ? 'var(--gold)' : 'var(--ink)', fontWeight: 600 }}>
                    {skill.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
                    {ABILITY_SHORT[skill.ability]}
                  </div>
                </div>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    flex: 'none',
                    border: '1px solid ' + (active || granted ? t.gold : t.line),
                    background: active || granted ? t.gold : 'transparent',
                    boxShadow: active || granted ? '0 0 9px ' + hexA(t.gold, 0.6) : 'none',
                  }}
                />
              </button>
            </LoreTooltip>
          );
        })}
      </div>
    </div>
  );
}
