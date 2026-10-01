import type { StepProps } from './stepTypes';
import { raceOf, getSubrace } from '@/data/races';
import { ABILITY_LABELS, SKILLS, SKILL_BY_KEY } from '@/data/skills';
import { LANGUAGE_OPTIONS } from '@/data/classChoices';
import { racialIncreases } from '@/engine/modifiers';
import { ABILITY_KEYS } from '@/types/dnd';
import type { AbilityKey, SkillKey } from '@/types/dnd';

const PICK = /idiomas?\s+(?:à|a)\s+escolha/i;

/**
 * Caldeirão de Tasha — "Personalizando sua Origem": os bônus de atributo da
 * raça podem ir para outros atributos (cada um num atributo diferente), e as
 * perícias e idiomas da raça podem ser trocados por outros.
 */
export function CustomOriginPanel({ char, update }: StepProps) {
  const race = raceOf(char);
  const sub = getSubrace(char.raceId, char.subraceId);
  const incs = racialIncreases(char.raceId, char.subraceId, char.raceAbilityChoice);
  const custom = char.customOrigin;
  const on = !!custom;
  const raceSkills = race.skillProfs ?? [];
  const raceLangs = [...(race.languages ?? []), ...(sub?.languages ?? [])].filter((l) => !PICK.test(l));

  // atribuição atual: atributo de cada aumento (na ordem de `incs`)
  const assigned: AbilityKey[] = (() => {
    if (!custom?.asi) return incs.map((i) => i.ability);
    const used = new Set<AbilityKey>();
    return incs.map((i) => {
      const k = ABILITY_KEYS.find((a) => custom.asi![a] === i.amount && !used.has(a)) ?? i.ability;
      used.add(k);
      return k;
    });
  })();

  const setAsi = (idx: number, ability: AbilityKey) =>
    update((c) => {
      const next = [...assigned];
      const other = next.indexOf(ability);
      if (other >= 0 && other !== idx) next[other] = next[idx]; // troca de lugar: cada aumento num atributo diferente
      next[idx] = ability;
      const asi: Partial<Record<AbilityKey, number>> = {};
      next.forEach((k, i) => { asi[k] = (asi[k] ?? 0) + incs[i].amount; });
      c.customOrigin = { ...(c.customOrigin ?? {}), asi };
    });

  const toggle = () =>
    update((c) => {
      c.customOrigin = on ? null : { asi: Object.fromEntries(incs.map((i) => [i.ability, i.amount])) };
    });

  return (
    <div className="fv-detail-sub fv-origin">
      <label className="fv-origin-toggle">
        <input type="checkbox" checked={on} onChange={toggle} />
        <span>
          <b>Origem personalizada</b> <small>Caldeirão de Tasha</small>
          <em>Mova os bônus raciais e troque perícias e idiomas da raça.</em>
        </span>
      </label>

      {on && (
        <div className="fv-origin-body">
          {incs.length > 0 && (
            <div className="fv-origin-row">
              <span className="fv-origin-label">Bônus de atributo</span>
              <div className="fv-origin-fields">
                {incs.map((inc, i) => (
                  <label key={i} className="fv-origin-field">
                    <b>+{inc.amount}</b>
                    <select className="fv-input" value={assigned[i]} onChange={(e) => setAsi(i, e.target.value as AbilityKey)} aria-label={`Atributo do +${inc.amount}`}>
                      {ABILITY_KEYS.map((k) => <option key={k} value={k}>{ABILITY_LABELS[k]}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}

          {raceSkills.length > 0 && (
            <div className="fv-origin-row">
              <span className="fv-origin-label">Perícias da raça</span>
              <div className="fv-origin-fields">
                {raceSkills.map((k) => (
                  <label key={k} className="fv-origin-field">
                    <small>{SKILL_BY_KEY[k].label} →</small>
                    <select
                      className="fv-input"
                      value={custom?.skillSwap?.[k] ?? k}
                      aria-label={`Trocar ${SKILL_BY_KEY[k].label}`}
                      onChange={(e) => update((c) => {
                        const swap = { ...(c.customOrigin?.skillSwap ?? {}) };
                        if (e.target.value === k) delete swap[k]; else swap[k] = e.target.value as SkillKey;
                        c.customOrigin = { ...(c.customOrigin ?? {}), skillSwap: swap };
                      })}
                    >
                      {SKILLS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}

          {raceLangs.length > 0 && (
            <div className="fv-origin-row">
              <span className="fv-origin-label">Idiomas da raça</span>
              <div className="fv-origin-fields">
                {raceLangs.map((l) => (
                  <label key={l} className="fv-origin-field">
                    <small>{l} →</small>
                    <select
                      className="fv-input"
                      value={custom?.langSwap?.[l] ?? l}
                      aria-label={`Trocar ${l}`}
                      onChange={(e) => update((c) => {
                        const swap = { ...(c.customOrigin?.langSwap ?? {}) };
                        if (e.target.value === l) delete swap[l]; else swap[l] = e.target.value;
                        c.customOrigin = { ...(c.customOrigin ?? {}), langSwap: swap };
                      })}
                    >
                      {[l, ...['Comum', ...LANGUAGE_OPTIONS.map((o) => o.label)].filter((x) => x !== l)].map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}
          <small className="fv-langs-why">Proficiências com armas e armaduras da raça também podem ser trocadas no livro — combine com o mestre.</small>
        </div>
      )}
    </div>
  );
}
