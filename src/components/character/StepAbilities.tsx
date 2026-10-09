import { useState } from 'react';
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

type Method = 'array' | 'pointbuy' | 'manual';

const POINT_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const POINT_BUDGET = 27;

const METHODS: { id: Method; label: string }[] = [
  { id: 'array', label: 'Valores padrão' },
  { id: 'pointbuy', label: 'Compra de pontos' },
  { id: 'manual', label: 'Livre' },
];

/** Capítulo IV — Atributos: seis linhas, um controle cada. */
export function StepAbilities({ char, update }: StepProps) {
  const [method, setMethod] = useState<Method>('array');
  const base = char.baseAbilities;
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

  const pointsLeft = POINT_BUDGET - ABILITY_KEYS.reduce((sum, k) => sum + (POINT_COST[base[k]] ?? 0), 0);

  const changeMethod = (m: Method) => {
    setMethod(m);
    if (m === 'array') update((c) => { c.baseAbilities = standardArrayFor(c.classId); });
    if (m === 'pointbuy') update((c) => {
      const reset = {} as typeof c.baseAbilities;
      for (const k of ABILITY_KEYS) reset[k] = 8;
      c.baseAbilities = reset;
    });
  };

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
      </div>

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
                {method === 'array' ? (
                  <select aria-label={`Valor de ${ABILITY_LABELS[key]}`} value={baseVal} onChange={(e) => assignArrayValue(key, Number(e.target.value))}>
                    {STANDARD_ARRAY.map((v) => (
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
