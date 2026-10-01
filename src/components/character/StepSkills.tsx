import type { StepProps } from './stepTypes';
import { StepHeader, SectionTitle } from './creatorUi';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { raceOf } from '@/data/races';
import { SKILLS, SKILL_BY_KEY, ABILITY_SHORT } from '@/data/skills';
import { toolLabel } from '@/data/tools';
import type { SkillKey } from '@/types/dnd';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { skillLore } from '@/lib/lore';
import { expertiseSlots, expertiseUsed } from '@/engine/levelUp';

/**
 * Escolha de perícias: as do antecedente e as automáticas da raça já vêm
 * garantidas (se repetiria, escolha outra — regra 5e); a classe concede N
 * escolhas da própria lista; raças como o Meio-Elfo ganham escolhas livres.
 */
export function StepSkills({ char, update }: StepProps) {
  const cls = getClass(char.classId);
  const bg = getBackground(char.backgroundId);
  const race = raceOf(char);

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
    <div className="fv-step">
      <StepHeader
        step={4}
        subtitle={`Escolha ${cls.skillPicks} de ${cls.label}${extraPicks ? ` e ${extraPicks} livres (${race.label})` : ''}.`}
      />

      {/* já treinadas: antecedente, linhagem e ferramentas */}
      <SectionTitle>Já treinadas</SectionTitle>
      <div className="fv-pills" style={{ marginBottom: 18 }}>
        {[...granted].map((k) => (
          <LoreTooltip key={k} info={skillLore(k, 0, true)}>
            <span className="fv-pill is-on is-static">
              {SKILL_BY_KEY[k].label}
              <small>{bgSkills.has(k) ? bg.label : race.label}</small>
            </span>
          </LoreTooltip>
        ))}
        {(bg.tools ?? []).map((id) => (
          <span key={id} className="fv-pill is-static">⚒ {toolLabel(id)}</span>
        ))}
      </div>

      <SectionTitle right={<Counter left={classRemaining} total={cls.skillPicks} />}>Escolhas de {cls.label}</SectionTitle>
      <div className="fv-skill-grid">
        {cls.skillChoices.map((key) => {
          const isGranted = granted.has(key);
          const active = char.skillProfs.includes(key) && !isGranted;
          return (
            <SkillToggle
              key={key}
              skill={key}
              state={isGranted ? 'granted' : active ? 'on' : classRemaining <= 0 ? 'blocked' : 'off'}
              onClick={() => toggle(key, 'class')}
            />
          );
        })}
      </div>

      {/* especialização no nível 1 (Ladino) — perícias OU Ferramentas de Ladrão */}
      {slots > 0 && (
        <>
          <SectionTitle right={<Counter left={slots - used} total={slots} />}>Especialização — bônus em dobro</SectionTitle>
          <div className="fv-pills" style={{ marginBottom: 18 }}>
            {proficientNow.map((key) => {
              const on = (char.skillExpertise ?? []).includes(key);
              const blocked = !on && used >= slots;
              return (
                <button key={key} type="button" aria-pressed={on} disabled={blocked} className={'fv-pill' + (on ? ' is-on' : '')} onClick={() => toggleSkillExpertise(key)}>
                  {on ? '★ ' : ''}{SKILL_BY_KEY[key].label}
                </button>
              );
            })}
            {classHasThieves && (
              <button type="button" aria-pressed={thievesExpert} disabled={!thievesExpert && used >= slots} className={'fv-pill' + (thievesExpert ? ' is-on' : '')} onClick={toggleThievesExpertise}>
                {thievesExpert ? '★ ' : '⚒ '}Ferramentas de Ladrão
              </button>
            )}
          </div>
        </>
      )}

      {/* escolhas livres (Meio-Elfo — Versatilidade em Perícias) */}
      {extraPicks > 0 && (
        <>
          <SectionTitle right={<Counter left={extraRemaining} total={extraPicks} />}>Livres — {race.label}</SectionTitle>
          <div className="fv-skill-grid">
            {SKILLS.filter((sk) => !cls.skillChoices.includes(sk.key) && !granted.has(sk.key)).map((sk) => {
              const active = char.skillProfs.includes(sk.key);
              return (
                <SkillToggle
                  key={sk.key}
                  skill={sk.key}
                  state={active ? 'on' : extraRemaining <= 0 ? 'blocked' : 'off'}
                  onClick={() => toggle(sk.key, 'extra')}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Counter({ left, total }: { left: number; total: number }) {
  return <span className={'fv-counter' + (left <= 0 ? ' is-done' : '')}>{left <= 0 ? 'completo ✓' : `faltam ${left} de ${total}`}</span>;
}

/** Perícia liga/desliga: nome, atributo e estado (treinada de outra fonte = travada). */
function SkillToggle({ skill, state, onClick }: { skill: SkillKey; state: 'on' | 'off' | 'granted' | 'blocked'; onClick: () => void }) {
  const def = SKILL_BY_KEY[skill];
  const on = state === 'on' || state === 'granted';
  return (
    <LoreTooltip info={skillLore(skill, 0, on)} anchorStyle={{ display: 'block' }}>
      <button
        type="button"
        aria-pressed={on}
        disabled={state === 'granted'}
        onClick={onClick}
        className={'fv-skill' + (on ? ' is-on' : '') + (state === 'blocked' ? ' is-blocked' : '') + (state === 'granted' ? ' is-granted' : '')}
      >
        <span className="fv-skill-check" aria-hidden>{on ? '✓' : ''}</span>
        <span className="fv-skill-text">
          <span className="fv-skill-name">{def.label}</span>
          <span className="fv-skill-sub">{state === 'granted' ? 'já treinada' : ABILITY_SHORT[def.ability]}</span>
        </span>
      </button>
    </LoreTooltip>
  );
}
