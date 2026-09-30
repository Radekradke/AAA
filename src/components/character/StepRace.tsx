import type { StepProps } from './stepTypes';
import { StepHeader, OptionGrid, OptionTile, ChoiceDetail, themedIcon } from './creatorUi';
import { RACES, getRace, getSubraces } from '@/data/races';
import { raceFacts } from '@/engine/creationSummary';

/** Capítulo I — Origem: a linhagem (e sublinhagem) do herói. */
export function StepRace({ char, update }: StepProps) {
  const race = getRace(char.raceId);
  const subs = getSubraces(char.raceId);

  const pickRace = (id: string) =>
    update((c) => {
      c.raceId = id;
      const s = getSubraces(id);
      c.subraceId = s.length ? s[s.length - 1].id : null;
    });

  return (
    <div className="fv-step">
      <StepHeader step={0} />
      <div className="fv-choice">
        <OptionGrid label="Linhagens">
          {RACES.map((r) => (
            <OptionTile
              key={r.id}
              icon={themedIcon('race', r.id)}
              label={r.label}
              line={r.bonus}
              color={r.jewel}
              selected={char.raceId === r.id}
              onSelect={() => pickRace(r.id)}
            />
          ))}
        </OptionGrid>

        <ChoiceDetail icon={themedIcon('race', race.id)} color={race.jewel} eyebrow="Linhagem" title={race.label} desc={race.desc} facts={raceFacts(char)}>
          {subs.length > 0 && (
            <div className="fv-detail-sub">
              <div className="fv-facts-title">Sublinhagem</div>
              <div className="fv-pills" role="group" aria-label="Sublinhagem">
                {subs.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    aria-pressed={char.subraceId === sub.id}
                    className={'fv-pill' + (char.subraceId === sub.id ? ' is-on' : '')}
                    onClick={() => update((c) => { c.subraceId = sub.id; })}
                  >
                    {sub.label}
                    {sub.bonus && <small>{sub.bonus}</small>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </ChoiceDetail>
      </div>
    </div>
  );
}
