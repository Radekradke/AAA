import type { StepProps } from './stepTypes';
import { StepHeader, OptionGrid, OptionTile, ChoiceDetail, themedIcon } from './creatorUi';
import { BACKGROUNDS, getBackground } from '@/data/backgrounds';
import { SKILL_BY_KEY } from '@/data/skills';
import { backgroundFacts, STEP_BACKGROUND } from '@/engine/creationSummary';
import { useTheme } from '@/lib/useTheme';
import { LANGUAGE_OPTIONS } from '@/data/classChoices';
import { BG_TOOL_KEY, backgroundTools, languagePicks } from '@/engine/originChoices';
import { TOOLS } from '@/data/tools';
import { TOOL_INFO } from '@/data/toolInfo';
import { useState } from 'react';

const TOOL_CHOICE_TITLE = {
  artesao: 'Ferramenta de artesão à escolha',
  instrumento: 'Instrumento musical à escolha',
  jogo: 'Jogo à escolha',
} as const;

/** Capítulo III — Passado: o antecedente (perícias, ferramentas, gancho de história). */
export function StepBackground({ char, update }: StepProps) {
  const t = useTheme();
  const bg = getBackground(char.backgroundId);
  const facts = backgroundFacts(char);
  const langs = languagePicks(char);
  // exóticos (pedem o ok do mestre) ficam recolhidos; abrem sozinhos se já há um escolhido
  const [showExotic, setShowExotic] = useState(false);
  const exoticChosen = LANGUAGE_OPTIONS.some((o) => o.tag === 'exótico' && langs.chosen.includes(o.label));
  const exoticOpen = showExotic || exoticChosen;

  const toggleLang = (lang: string) =>
    update((c) => {
      const cur = c.extraLanguages ?? [];
      if (cur.includes(lang)) c.extraLanguages = cur.filter((l) => l !== lang);
      else if (langs.left > 0) c.extraLanguages = [...cur, lang];
    });

  // cor dos ícones: o acento do tema (o Eclipse define um ocre próprio; os outros usam o metal)
  const bgColor = 'var(--opt-accent, ' + t.gold + ')';

  return (
    <div className="fv-step fv-bg-step">
      <StepHeader step={STEP_BACKGROUND} char={char} />
      <div className="fv-choice">
        <div>
          <OptionGrid label="Antecedentes" compact>
            {BACKGROUNDS.map((b) => (
              <OptionTile
                key={b.id}
                icon={themedIcon('bg', b.id)}
                label={b.label}
                line={b.skills.map((k) => SKILL_BY_KEY[k].label).join(' · ')}
                color={bgColor}
                selected={char.backgroundId === b.id}
                onSelect={() =>
                  update((c) => {
                    if (c.backgroundId !== b.id && c.choices?.[BG_TOOL_KEY]) {
                      // a ferramenta escolhida era do antecedente antigo
                      const { [BG_TOOL_KEY]: _old, ...rest } = c.choices;
                      c.choices = rest;
                    }
                    c.backgroundId = b.id;
                  })
                }
              />
            ))}
          </OptionGrid>
          {/* idiomas à escolha sob a grade, onde sobra espaço */}
          <div className="fv-choice-extras">
            {bg.toolChoice && (() => {
              const options = TOOLS.filter((o) => o.group === bg.toolChoice!.group);
              const current = backgroundTools(char).find((id) => options.some((o) => o.id === id)) ?? bg.toolChoice.default;
              return (
                <div className="fv-detail-sub fv-bg-tool">
                  <div className="fv-facts-title">{TOOL_CHOICE_TITLE[bg.toolChoice.group]}</div>
                  <div className="fv-bg-tool-row">
                    <select
                      className="fv-input"
                      aria-label={TOOL_CHOICE_TITLE[bg.toolChoice.group]}
                      value={current}
                      onChange={(e) => update((c) => { c.choices = { ...(c.choices ?? {}), [BG_TOOL_KEY]: [e.target.value] }; })}
                    >
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                    {TOOL_INFO[current] && <small>{TOOL_INFO[current].short} · {TOOL_INFO[current].ability}</small>}
                  </div>
                </div>
              );
            })()}
            {langs.total > 0 && (
              <div className="fv-detail-sub fv-langs">
                <div className="fv-facts-title">
                  Idiomas à escolha <span className={'fv-counter' + (langs.left <= 0 ? ' is-done' : '')}>{langs.left <= 0 ? 'completo ✓' : `faltam ${langs.left} de ${langs.total}`}</span>
                </div>
                <small className="fv-langs-why">
                  {langs.sources.map((src) => `${src.count} de ${src.label}`).join(' · ')} — você já fala {langs.fixed.join(', ')}.
                </small>
                <div className="fv-pills" role="group" aria-label="Idiomas à escolha">
                  {LANGUAGE_OPTIONS.filter((o) => !langs.fixed.includes(o.label) && (exoticOpen || o.tag !== 'exótico')).map((o) => {
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
                  {!exoticOpen && (
                    <button type="button" className="fv-pill is-ghost" aria-expanded={false} onClick={() => setShowExotic(true)}>
                      + Exóticos
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <ChoiceDetail icon={themedIcon('bg', bg.id)} color={bgColor} eyebrow="Antecedente" title={bg.label} desc={bg.desc} facts={facts}>
          {bg.feature && (
            <p className="fv-detail-feature" title={bg.feature}>
              {bg.featureName && <b>{bg.featureName}. </b>}
              {bg.feature}
            </p>
          )}
        </ChoiceDetail>
      </div>
    </div>
  );
}
