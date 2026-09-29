import type { StepProps } from './stepTypes';
import { StepHeader, OptionGrid, OptionTile, ChoiceDetail, themedIcon } from './creatorUi';
import { BACKGROUNDS, getBackground } from '@/data/backgrounds';
import { SKILL_BY_KEY, ABILITY_SHORT } from '@/data/skills';
import { backgroundFacts } from '@/engine/creationSummary';
import { useTheme } from '@/lib/useTheme';

/** Capítulo III — Passado: o antecedente (perícias, ferramentas, gancho de história). */
export function StepBackground({ char, update }: StepProps) {
  const t = useTheme();
  const bg = getBackground(char.backgroundId);
  const facts = [...backgroundFacts(char), { label: 'Favorece', value: bg.suggestedAbilities.map((k) => ABILITY_SHORT[k]).join(' e ') }];

  return (
    <div className="fv-step">
      <StepHeader step={2} />
      <div className="fv-choice">
        <OptionGrid label="Antecedentes" compact>
          {BACKGROUNDS.map((b) => (
            <OptionTile
              key={b.id}
              icon={themedIcon('bg', b.id)}
              label={b.label}
              line={b.skills.map((k) => SKILL_BY_KEY[k].label).join(' · ')}
              color={t.gold}
              selected={char.backgroundId === b.id}
              onSelect={() => update((c) => { c.backgroundId = b.id; })}
            />
          ))}
        </OptionGrid>

        <ChoiceDetail icon={themedIcon('bg', bg.id)} color={t.gold} eyebrow="Antecedente" title={bg.label} desc={bg.desc} facts={facts}>
          {bg.feature && (
            <p className="fv-detail-feature">
              {bg.featureName && <b>{bg.featureName}. </b>}
              {bg.feature}
            </p>
          )}
        </ChoiceDetail>
      </div>
    </div>
  );
}
