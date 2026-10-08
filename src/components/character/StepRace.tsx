import { useState } from 'react';
import type { StepProps } from './stepTypes';
import { StepHeader, OptionGrid, OptionTile, ChoiceDetail, themedIcon } from './creatorUi';
import { raceIconKey } from './RaceIcon';
import { HomebrewRaceEditor } from './HomebrewRaceEditor';
import { CustomOriginPanel } from './CustomOriginPanel';
import { LevelOneChoices } from './LevelOneChoices';
import { useUiStore } from '@/store/uiStore';
import { RACES, getSubraces, raceOf } from '@/data/races';
import { raceFacts } from '@/engine/creationSummary';
import { useHomebrewStore } from '@/store/homebrewStore';
import { SPELLS, spellVisible } from '@/data/spells';

const wizardCantrips = () => SPELLS.filter((sp) => spellVisible(sp) && sp.level === 0 && !!sp.classes?.includes('wizard')).sort((a, b) => a.name.localeCompare(b.name));
import type { AbilityKey, Race } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import { ABILITY_LABELS } from '@/data/skills';

/** Capítulo I — Origem: a linhagem (e sublinhagem) do herói — do livro ou homebrew. */
export function StepRace({ char, update }: StepProps) {
  const race = raceOf(char);
  const subs = getSubraces(char.raceId);
  const homebrew = useHomebrewStore((s) => s.races);
  const tasha = useUiStore((s) => s.packs?.tce);
  const [editing, setEditing] = useState<Race | 'new' | null>(null);

  const pickRace = (id: string) =>
    update((c) => {
      if (c.raceId !== id && c.choices) c.choices = Object.fromEntries(Object.entries(c.choices).filter(([k]) => !k.startsWith('race.')));
      c.raceId = id;
      c.customRace = null;
      c.customOrigin = null;
      const s = getSubraces(id);
      c.subraceId = s.length ? s[s.length - 1].id : null;
    });

  const pickHomebrew = (r: Race) =>
    update((c) => {
      if (c.raceId !== r.id && c.choices) c.choices = Object.fromEntries(Object.entries(c.choices).filter(([k]) => !k.startsWith('race.')));
      c.raceId = r.id;
      c.customRace = r;
      c.customOrigin = null;
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
                icon={raceIconKey(r)}
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
          {/* escolhas da linhagem ficam sob a grade (a coluna de detalhe não cresce até criar barra) */}
          <div className="fv-choice-extras">
            {race.abilityChoice && !char.customOrigin && (() => {
              const ch = race.abilityChoice;
              const picked = (char.raceAbilityChoice ?? []).filter((k) => !ch.exclude?.includes(k));
              const active = picked.length === ch.count ? picked : ch.default;
              const toggle = (k: AbilityKey) =>
                update((c) => {
                  const cur = (c.raceAbilityChoice ?? active).filter((x) => !ch.exclude?.includes(x));
                  c.raceAbilityChoice = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k].slice(-ch.count);
                });
              return (
                <div className="fv-detail-sub">
                  <div className="fv-facts-title">+{ch.amount} em {ch.count} atributos à escolha</div>
                  <div className="fv-pills" role="group" aria-label="Atributos à escolha">
                    {ABILITY_KEYS.filter((k) => !ch.exclude?.includes(k)).map((k) => {
                      const on = picked.length ? picked.includes(k) : active.includes(k);
                      return (
                        <button key={k} type="button" aria-pressed={on} className={'fv-pill' + (on ? ' is-on' : '')} onClick={() => toggle(k)}>
                          {ABILITY_LABELS[k]}
                          <small>+{ch.amount}</small>
                        </button>
                      );
                    })}
                  </div>
                  {picked.length > 0 && picked.length < ch.count && <small className="fv-langs-why">Escolha mais {ch.count - picked.length}.</small>}
                </div>
              );
            })()}
            {subs.length > 0 && (
              <div className="fv-detail-sub">
                <div className="fv-facts-title">{race.id === 'dragonborn' ? 'Ancestral dracônico (cor do dragão)' : 'Sublinhagem'}</div>
                <div className="fv-pills" role="group" aria-label="Sublinhagem">
                  {subs.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      aria-pressed={char.subraceId === sub.id}
                      className={'fv-pill' + (char.subraceId === sub.id ? ' is-on' : '')}
                      onClick={() => update((c) => { c.subraceId = sub.id; c.customOrigin = null; })}
                    >
                      {sub.label}
                      {sub.bonus && <small>{sub.bonus}</small>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {char.subraceId === 'high-elf' && (() => {
              const picked = char.choices?.['race.highElfCantrip']?.[0] ?? '';
              return (
                <div className="fv-detail-sub">
                  <div className="fv-facts-title">Truque de mago (Alto Elfo)</div>
                  <select
                    className="fv-input"
                    value={picked}
                    aria-label="Truque do Alto Elfo"
                    onChange={(e) => update((c) => { c.choices = { ...(c.choices ?? {}), 'race.highElfCantrip': e.target.value ? [e.target.value] : [] }; })}
                  >
                    <option value="">Escolha um truque…</option>
                    {wizardCantrips().map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                  </select>
                  <small className="fv-langs-why">Conjura com Inteligência, à vontade.</small>
                </div>
              );
            })()}
            <LevelOneChoices char={char} update={update} scope="race" />
            {tasha && <CustomOriginPanel char={char} update={update} />}
          </div>
        </div>

        <ChoiceDetail
          icon={raceIconKey(race)}
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
