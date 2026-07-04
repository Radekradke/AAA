import type { StepProps } from './stepTypes';
import { ChapterTitle } from './ChapterTitle';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { getRace } from '@/data/races';
import { SKILLS, SKILL_BY_KEY, ABILITY_SHORT } from '@/data/skills';
import { toolLabel } from '@/data/tools';
import type { SkillKey } from '@/types/dnd';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { skillLore } from '@/lib/lore';
import { expertiseSlots, expertiseUsed } from '@/engine/levelUp';

/**
 * Escolha de perícias: as do antecedente e as automáticas da raça já vêm
 * garantidas (se repetiria, escolha outra — regra 5e); a classe concede N
 * escolhas da própria lista; raças como o Meio-Elfo ganham escolhas livres.
 */
export function StepSkills({ char, update }: StepProps) {
  const t = useTheme();
  const cls = getClass(char.classId);
  const bg = getBackground(char.backgroundId);
  const race = getRace(char.raceId);

  const bgSkills = new Set(bg.skills);
  const raceSkills = new Set(race.skillProfs ?? []);
  const granted = new Set<SkillKey>([...bgSkills, ...raceSkills]);

  const classChosen = char.skillProfs.filter((k) => cls.skillChoices.includes(k) && !granted.has(k));
  const extraChosen = char.skillProfs.filter((k) => !cls.skillChoices.includes(k) && !granted.has(k));
  const classRemaining = cls.skillPicks - classChosen.length;
  const extraPicks = race.extraSkillPicks ?? 0;
  const extraRemaining = extraPicks - extraChosen.length;

  // expertise no nível 1 (Ladino: 2 vagas — perícias OU Ferramentas de Ladrão)
  const slots = expertiseSlots(char);
  const used = expertiseUsed(char);
  const proficientNow = Array.from(new Set([...char.skillProfs, ...granted])) as SkillKey[];
  const classHasThieves = (cls.tools ?? []).includes('thieves-tools') || (bg.tools ?? []).includes('thieves-tools');
  const thievesExpert = (char.toolProfs ?? []).some((tp) => tp.id === 'thieves-tools' && tp.expertise);

  const toggleSkillExpertise = (key: SkillKey) =>
    update((c) => {
      const has = (c.skillExpertise ?? []).includes(key);
      if (!has && used >= slots) return;
      c.skillExpertise = has ? (c.skillExpertise ?? []).filter((k) => k !== key) : [...(c.skillExpertise ?? []), key];
    });

  const toggleThievesExpertise = () =>
    update((c) => {
      c.toolProfs = c.toolProfs ?? [];
      const entry = c.toolProfs.find((tp) => tp.id === 'thieves-tools');
      if (entry) {
        if (!entry.expertise && used >= slots) return;
        entry.expertise = !entry.expertise;
      } else {
        if (used >= slots) return;
        c.toolProfs.push({ id: 'thieves-tools', label: toolLabel('thieves-tools'), expertise: true, source: cls.label });
      }
    });

  const toggle = (key: SkillKey, pool: 'class' | 'extra') =>
    update((c) => {
      if (granted.has(key)) return;
      const has = c.skillProfs.includes(key);
      if (has) {
        c.skillProfs = c.skillProfs.filter((k) => k !== key);
        return;
      }
      const remaining = pool === 'class' ? classRemaining : extraRemaining;
      if (remaining > 0) c.skillProfs = [...c.skillProfs, key];
    });

  return (
    <div className="animate-riseIn">
      <ChapterTitle
        chapter="Capítulo V"
        title="Perícias"
        subtitle={`Escolha ${cls.skillPicks} perícia(s) de ${cls.label}${extraPicks ? ` + ${extraPicks} livres (${race.label})` : ''}. As garantidas já vêm marcadas.`}
      />

      {/* garantidas por antecedente e raça */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          Garantidas — {bg.label}{raceSkills.size > 0 ? ` e ${race.label}` : ''}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {bg.skills.map((k) => (
            <LoreTooltip key={k} info={skillLore(k, 0, true)}>
              <span style={{ cursor: 'help', fontSize: 12.5, fontWeight: 600, color: '#140d04', background: t.gold, padding: '6px 13px', borderRadius: 999 }}>
                {SKILL_BY_KEY[k].label}
              </span>
            </LoreTooltip>
          ))}
          {[...raceSkills].map((k) => (
            <LoreTooltip key={k} info={skillLore(k, 0, true)}>
              <span style={{ cursor: 'help', fontSize: 12.5, fontWeight: 600, color: '#06131c', background: t.acc, padding: '6px 13px', borderRadius: 999 }}>
                {SKILL_BY_KEY[k].label} · {race.label}
              </span>
            </LoreTooltip>
          ))}
          {(bg.tools ?? []).map((id) => (
            <span key={id} className="fv-chip" style={{ color: 'var(--ink)' }}>⚒ {toolLabel(id)}</span>
          ))}
          {bg.languagesCount ? (
            <span className="fv-chip" style={{ color: 'var(--ink)' }}>+{bg.languagesCount} idioma{bg.languagesCount > 1 ? 's' : ''}</span>
          ) : null}
        </div>
        <div style={{ marginTop: 7, fontSize: 11, color: 'var(--muted)' }}>
          Regra 5e: se uma escolha repetiria uma perícia garantida, escolha outra — por isso elas aparecem bloqueadas abaixo.
        </div>
      </div>

      {/* escolhas de classe */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Perícias de classe — {cls.label}
        </div>
        <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 13, color: classRemaining === 0 ? t.gold : 'var(--acc)' }}>
          {classRemaining > 0 ? `${classRemaining} restante(s)` : 'completo ✓'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        {cls.skillChoices.map((key) => {
          const skill = SKILL_BY_KEY[key];
          const isGranted = granted.has(key);
          const active = char.skillProfs.includes(key) && !isGranted;
          const disabled = !active && !isGranted && classRemaining <= 0;
          return (
            <SkillCard
              key={key}
              label={skill.label}
              sub={ABILITY_SHORT[skill.ability]}
              granted={isGranted}
              active={active}
              disabled={disabled}
              onClick={() => toggle(key, 'class')}
              lore={skillLore(key, 0, isGranted || active)}
            />
          );
        })}
      </div>

      {/* expertise no nível 1 (Ladino) — perícias e Ferramentas de Ladrão */}
      {slots > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '18px 0 10px', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Especialização (Expertise) — proficiência em dobro
            </div>
            <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 13, color: used >= slots ? t.gold : 'var(--acc)' }}>
              {used}/{slots} vagas
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {proficientNow.map((key) => {
              const on = (char.skillExpertise ?? []).includes(key);
              const blocked = !on && used >= slots;
              return (
                <button
                  key={key}
                  onClick={() => toggleSkillExpertise(key)}
                  disabled={blocked}
                  style={{
                    cursor: blocked ? 'not-allowed' : 'pointer',
                    fontSize: 12.5,
                    fontWeight: 600,
                    minHeight: 36,
                    padding: '7px 13px',
                    borderRadius: 999,
                    border: '1px solid ' + (on ? t.gold : t.line),
                    background: on ? hexA(t.gold, 0.14) : 'rgba(0,0,0,.24)',
                    color: on ? t.gold : 'var(--muted)',
                    opacity: blocked ? 0.45 : 1,
                    transition: '.2s',
                  }}
                >
                  {on ? '★ ' : ''}{SKILL_BY_KEY[key].label}
                </button>
              );
            })}
            {classHasThieves && (
              <button
                onClick={toggleThievesExpertise}
                disabled={!thievesExpert && used >= slots}
                style={{
                  cursor: !thievesExpert && used >= slots ? 'not-allowed' : 'pointer',
                  fontSize: 12.5,
                  fontWeight: 700,
                  minHeight: 36,
                  padding: '7px 13px',
                  borderRadius: 999,
                  border: '1px solid ' + (thievesExpert ? t.gold : t.acc),
                  background: thievesExpert ? hexA(t.gold, 0.14) : hexA(t.acc, 0.07),
                  color: thievesExpert ? t.gold : t.acc,
                  opacity: !thievesExpert && used >= slots ? 0.45 : 1,
                  transition: '.2s',
                }}
              >
                {thievesExpert ? '★ ' : '⚒ '}Ferramentas de Ladrão
              </button>
            )}
          </div>
          <div style={{ marginTop: 7, fontSize: 11, color: 'var(--muted)' }}>
            Regra 2014: Ladino escolhe 2 entre perícias proficientes OU Ferramentas de Ladrão — o bônus de proficiência dobra.
          </div>
        </>
      )}

      {/* escolhas livres (Meio-Elfo — Versatilidade em Perícias) */}
      {extraPicks > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '18px 0 10px', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Escolhas livres — {race.label}
            </div>
            <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 13, color: extraRemaining === 0 ? t.gold : 'var(--acc)' }}>
              {extraRemaining > 0 ? `${extraRemaining} restante(s)` : 'completo ✓'}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
            {SKILLS.filter((sk) => !cls.skillChoices.includes(sk.key) && !granted.has(sk.key)).map((sk) => {
              const active = char.skillProfs.includes(sk.key);
              const disabled = !active && extraRemaining <= 0;
              return (
                <SkillCard
                  key={sk.key}
                  label={sk.label}
                  sub={ABILITY_SHORT[sk.ability]}
                  active={active}
                  disabled={disabled}
                  onClick={() => toggle(sk.key, 'extra')}
                  lore={skillLore(sk.key, 0, active)}
                  compact
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SkillCard({ label, sub, granted, active, disabled, onClick, lore, compact }: {
  label: string;
  sub: string;
  granted?: boolean;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  lore: ReturnType<typeof skillLore>;
  compact?: boolean;
}) {
  const t = useTheme();
  const on = active || granted;
  return (
    <LoreTooltip info={lore} anchorStyle={{ display: 'block' }}>
      <button
        onClick={onClick}
        disabled={granted}
        style={{
          cursor: granted ? 'default' : disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: compact ? '9px 12px' : '12px 14px',
          borderRadius: 'var(--radius-md)',
          textAlign: 'left',
          border: '1px solid ' + (on ? t.gold : t.line),
          background: on ? hexA(t.gold, 0.1) : 'rgba(0,0,0,.26)',
          opacity: disabled ? 0.45 : 1,
          boxShadow: on ? '0 0 18px ' + hexA(t.gold, 0.25) : 'none',
          transition: '.2s',
        }}
      >
        <div>
          <div style={{ fontSize: compact ? 13 : 14, color: on ? 'var(--gold)' : 'var(--ink)', fontWeight: 600 }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>
            {sub}{granted ? ' · garantida' : ''}
          </div>
        </div>
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: 999,
            flex: 'none',
            border: '1px solid ' + (on ? t.gold : t.line),
            background: on ? t.gold : 'transparent',
            boxShadow: on ? '0 0 9px ' + hexA(t.gold, 0.6) : 'none',
          }}
        />
      </button>
    </LoreTooltip>
  );
}
