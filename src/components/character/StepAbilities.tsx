import type { StepProps } from './stepTypes';
import { STEP_ABILITIES } from '@/engine/creationSummary';
import { StepHeader, Segmented } from './creatorUi';
import { ABILITY_KEYS } from '@/types/dnd';
import type { AbilityKey } from '@/types/dnd';
import { ABILITY_LABELS, ABILITY_SHORT, ABILITY_COLORS } from '@/data/skills';
import { getBackground } from '@/data/backgrounds';
import { abilityModifier, racialBonusFor } from '@/engine/modifiers';
import { standardArrayFor, recommendedAbilities, STANDARD_ARRAY } from '@/engine/characterBuilder';
import { getClass } from '@/data/classes';
import { modStr } from '@/engine/dice';
import type { AbilityMethod } from '@/engine/abilityMethods';
import { POINT_BUDGET, POINT_COST, abilityMethodOf, assignByPriority, pointBuySpent, rollAbilityDice, rollTotal, rollsMatch } from '@/engine/abilityMethods';

const METHODS: { id: AbilityMethod; label: string }[] = [
  { id: 'array', label: 'Valores padrão' },
  { id: 'pointbuy', label: 'Compra de pontos' },
  { id: 'roll', label: 'Rolar 4d6' },
  { id: 'manual', label: 'Livre' },
];

const METHOD_HINT: Record<AbilityMethod, string> = {
  array: 'Seis valores fixos (15, 14, 13, 12, 10, 8): troque entre os atributos.',
  pointbuy: '27 pontos para gastar; cada atributo vai de 8 a 15.',
  roll: 'Seis rolagens de 4d6, descartando o menor dado. Depois troque os valores entre os atributos.',
  manual: 'Digite os valores combinados com o mestre (3 a 20).',
};

/** Capítulo IV — Atributos: seis linhas, um controle cada. */
export function StepAbilities({ char, update }: StepProps) {
  const method = abilityMethodOf(char);
  const base = char.baseAbilities;
  const rolled = method === 'roll' && rollsMatch(char);
  // valores que os seletores oferecem: o array padrão ou o que saiu nos dados
  const pool = method === 'roll' ? [...new Set((char.abilityRolls ?? []).map(rollTotal))].sort((a, b) => b - a) : STANDARD_ARRAY;
  const cls = getClass(char.classId);
  const bg = getBackground(char.backgroundId);
  const recommended = recommendedAbilities(char.classId);

  const setBase = (key: AbilityKey, value: number) =>
    update((c) => {
      c.baseAbilities = { ...c.baseAbilities, [key]: value };
    });

  // valores padrão (15·14·13·12·10·8): trocar um valor troca com quem o tinha
  const assignArrayValue = (key: AbilityKey, value: number) =>
    update((c) => {
      const next = { ...c.baseAbilities };
      const owner = ABILITY_KEYS.find((k) => next[k] === value && k !== key);
      if (owner) next[owner] = next[key];
      next[key] = value;
      c.baseAbilities = next;
    });

  const pointsLeft = POINT_BUDGET - pointBuySpent(base);

  const changeMethod = (m: AbilityMethod) =>
    update((c) => {
      c.abilityMethod = m;
      if (m === 'array') c.baseAbilities = standardArrayFor(c.classId);
      if (m === 'pointbuy') {
        const reset = {} as typeof c.baseAbilities;
        for (const k of ABILITY_KEYS) reset[k] = 8;
        c.baseAbilities = reset;
      }
      // já tinha rolado: volta aos valores dos dados
      if (m === 'roll' && c.abilityRolls?.length === 6) c.baseAbilities = assignByPriority(c.classId, c.abilityRolls.map(rollTotal));
    });

  const rollAll = () =>
    update((c) => {
      const dice = rollAbilityDice();
      c.abilityMethod = 'roll';
      c.abilityRolls = dice;
      c.baseAbilities = assignByPriority(c.classId, dice.map(rollTotal));
    });

  const step = (key: AbilityKey, dir: 1 | -1) => {
    const v = base[key];
    if (dir < 0) {
      if (v > (method === 'pointbuy' ? 8 : 3)) setBase(key, v - 1);
      return;
    }
    if (v >= (method === 'pointbuy' ? 15 : 20)) return;
    if (method === 'pointbuy' && pointsLeft - ((POINT_COST[v + 1] ?? 99) - (POINT_COST[v] ?? 0)) < 0) return;
    setBase(key, v + 1);
  };

  return (
    <div className="fv-step">
      <StepHeader step={STEP_ABILITIES} char={char} subtitle={`Priorize ${ABILITY_LABELS[cls.prim]} — é o que move o ${cls.label}.`} />

      <div className="fv-abil-toolbar">
        <Segmented label="Método" options={METHODS} value={method} onChange={changeMethod} />
        {method === 'pointbuy' && (
          <span className={'fv-points' + (pointsLeft < 0 ? ' is-over' : '')}>
            <b>{pointsLeft}</b> pontos
          </span>
        )}
        {method === 'roll' && (
          <button type="button" className={rolled ? 'fv-btn-ghost' : 'fv-btn-gold'} onClick={rollAll}>
            {rolled ? '🎲 Rolar de novo' : '🎲 Rolar os atributos'}
          </button>
        )}
        <small className="fv-abil-hint">{METHOD_HINT[method]}</small>
      </div>

      {rolled && (
        <ol className="fv-abil-rolls" aria-label="Rolagens de 4d6">
          {char.abilityRolls!.map((dice, i) => {
            const low = dice.indexOf(Math.min(...dice));
            return (
              <li key={i}>
                <b>{rollTotal(dice)}</b>
                <span>
                  {dice.map((d, j) => (j === low ? <s key={j}>{d}</s> : <i key={j}>{d}</i>))}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="fv-abil-list">
        {ABILITY_KEYS.map((key) => {
          const baseVal = base[key];
          const racial = racialBonusFor(key, char.raceId, char.subraceId, char.raceAbilityChoice, char.customOrigin?.asi);
          const total = baseVal + racial;
          const isRec = recommended.includes(key);
          const isBg = bg.suggestedAbilities.includes(key);
          return (
            <div key={key} className={'fv-abil' + (isRec ? ' is-rec' : '')} style={{ ['--abil-color' as string]: ABILITY_COLORS[key] }}>
              <div className="fv-abil-name">
                <b>{ABILITY_SHORT[key]}</b>
                <span>{ABILITY_LABELS[key]}</span>
                {(isRec || isBg) && <em title={isRec ? `Importante para ${cls.label}` : `Combina com ${bg.label}`}>{isRec ? cls.label : bg.label}</em>}
              </div>

              <div className="fv-abil-ctrl">
                {method === 'array' || method === 'roll' ? (
                  <select aria-label={`Valor de ${ABILITY_LABELS[key]}`} value={baseVal} disabled={method === 'roll' && !rolled} onChange={(e) => assignArrayValue(key, Number(e.target.value))}>
                    {(method === 'roll' && !rolled ? [baseVal] : pool).map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <button type="button" aria-label={`Diminuir ${ABILITY_LABELS[key]}`} onClick={() => step(key, -1)}>−</button>
                    <span className="fv-abil-base">{baseVal}</span>
                    <button type="button" aria-label={`Aumentar ${ABILITY_LABELS[key]}`} onClick={() => step(key, 1)}>+</button>
                  </>
                )}
              </div>

              <div className="fv-abil-total" title={racial ? `${baseVal} + ${racial} da linhagem` : undefined}>
                {total}
                {racial > 0 && <small>+{racial}</small>}
              </div>
              <div className="fv-abil-mod">{modStr(abilityModifier(total))}</div>
            </div>
          );
        })}
      </div>
      <p className="fv-step-note">O total já soma o bônus da linhagem; o número grande é o modificador que vai nos testes.</p>
    </div>
  );
}
