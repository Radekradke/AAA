import type { StepProps } from './stepTypes';
import { StepHeader, OptionGrid, OptionTile, ChoiceDetail, themedIcon } from './creatorUi';
import { BACKGROUNDS, getBackground } from '@/data/backgrounds';
import { SKILL_BY_KEY } from '@/data/skills';
import { backgroundFacts } from '@/engine/creationSummary';
import { useTheme } from '@/lib/useTheme';
import { LANGUAGE_OPTIONS } from '@/data/classChoices';
import { languagePicks } from '@/engine/originChoices';

/** Capítulo III — Passado: o antecedente (perícias, ferramentas, gancho de história). */
export function StepBackground({ char, update }: StepProps) {
  const t = useTheme();
  const bg = getBackground(char.backgroundId);
  const facts = backgroundFacts(char);
  const langs = languagePicks(char);

  const toggleLang = (lang: string) =>
    update((c) => {
      const cur = c.extraLanguages ?? [];
      if (cur.includes(lang)) c.extraLanguages = cur.filter((l) => l !== lang);
      else if (langs.left > 0) c.extraLanguages = [...cur, lang];
    });

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
            <p className="fv-detail-feature" title={bg.feature}>
              {bg.featureName && <b>{bg.featureName}. </b>}
              {bg.feature}
            </p>
          )}
          {langs.total > 0 && (
            <div className="fv-detail-sub fv-langs">
              <div className="fv-facts-title">
                Idiomas à escolha <span className={'fv-counter' + (langs.left <= 0 ? ' is-done' : '')}>{langs.left <= 0 ? 'completo ✓' : `faltam ${langs.left} de ${langs.total}`}</span>
              </div>
              <small className="fv-langs-why">
                {langs.sources.map((src) => `${src.count} de ${src.label}`).join(' · ')} — você já fala {langs.fixed.join(', ')}.
              </small>
              <div className="fv-pills" role="group" aria-label="Idiomas à escolha">
                {LANGUAGE_OPTIONS.filter((o) => !langs.fixed.includes(o.label)).map((o) => {
                  const on = langs.chosen.includes(o.label);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={on}
                      disabled={!on && langs.left <= 0}
                      className={'fv-pill' + (on ? ' is-on' : '')}
                      title={o.tag === 'exótico' ? 'Idioma exótico: no livro, pede o ok do mestre' : undefined}
                      onClick={() => toggleLang(o.label)}
                    >
                      {o.label}
                      {o.tag === 'exótico' && <small>exótico</small>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </ChoiceDetail>
      </div>
    </div>
  );
}
