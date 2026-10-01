import { useState } from 'react';
import type { StepProps } from './stepTypes';
import { StepHeader, OptionGrid, OptionTile, ChoiceDetail, themedIcon } from './creatorUi';
import { HomebrewRaceEditor } from './HomebrewRaceEditor';
import { RACES, getSubraces, raceOf } from '@/data/races';
import { raceFacts } from '@/engine/creationSummary';
import { useHomebrewStore } from '@/store/homebrewStore';
import type { Race } from '@/types/dnd';

/** Capítulo I — Origem: a linhagem (e sublinhagem) do herói — do livro ou homebrew. */
export function StepRace({ char, update }: StepProps) {
  const race = raceOf(char);
  const subs = getSubraces(char.raceId);
  const homebrew = useHomebrewStore((s) => s.races);
  const [editing, setEditing] = useState<Race | 'new' | null>(null);

  const pickRace = (id: string) =>
    update((c) => {
      c.raceId = id;
      c.customRace = null;
      const s = getSubraces(id);
      c.subraceId = s.length ? s[s.length - 1].id : null;
    });

  const pickHomebrew = (r: Race) =>
    update((c) => {
      c.raceId = r.id;
      c.customRace = r;
      c.subraceId = r.subraces?.length ? r.subraces[0].id : null;
    });

  return (
    <div className="fv-step">
      <StepHeader step={0} />
      <div className="fv-choice">
        <div>
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

          <div className="fv-hb-head">
            <span className="fv-hb-badge">Homebrew</span>
            <small>raças criadas por você — o mestre vê o selo na ficha</small>
          </div>
          <OptionGrid label="Raças homebrew">
            {homebrew.map((r) => (
              <OptionTile
                key={r.id}
                icon={themedIcon('race', r.id, 'crest')}
                label={r.label}
                line={r.bonus}
                color={r.jewel}
                selected={char.raceId === r.id}
                onSelect={() => pickHomebrew(r)}
              />
            ))}
            <button type="button" className="fv-option fv-hb-new" onClick={() => setEditing('new')}>
              <span className="fv-hb-plus" aria-hidden>+</span>
              <span className="fv-option-name">Criar raça</span>
              <span className="fv-option-line">do zero, modelo ou cópia</span>
            </button>
          </OptionGrid>
        </div>

        <ChoiceDetail
          icon={themedIcon('race', race.id, 'crest')}
          color={race.jewel}
          eyebrow={race.homebrew ? 'Linhagem · homebrew' : 'Linhagem'}
          title={race.label}
          tag={race.homebrew ? [race.size, race.author && `por ${race.author}`].filter(Boolean).join(' · ') || undefined : undefined}
          desc={race.desc || 'Sem descrição.'}
          facts={raceFacts(char)}
        >
          {race.homebrew && (
            <>
              {race.source && <div className="fv-hb-source">Base oficial: {race.source}</div>}
              {(() => {
                const sub = subs.find((x) => x.id === char.subraceId);
                const list = [...(race.traitDetails ?? []), ...(sub?.traitDetails ?? [])];
                return list.length > 0 && (
                  <div className="fv-hb-traits">
                    {list.map((t) => (
                      <p key={t.name}><b>{t.name}.</b> {t.desc || <em>sem descrição</em>}</p>
                    ))}
                  </div>
                );
              })()}
              <button type="button" className="fv-btn-ghost fv-hb-edit" onClick={() => setEditing(race)}>Editar raça</button>
            </>
          )}
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

      {editing && (
        <HomebrewRaceEditor
          race={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            pickHomebrew(r);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
