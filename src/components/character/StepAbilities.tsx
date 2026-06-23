import { useState } from 'react';
import type { StepProps } from './stepTypes';
import { ChapterTitle } from './ChapterTitle';
import { ABILITY_KEYS } from '@/types/dnd';
import type { AbilityKey } from '@/types/dnd';
import { ABILITY_LABELS, ABILITY_SHORT, SKILL_BY_KEY } from '@/data/skills';
import { getBackground } from '@/data/backgrounds';
import { abilityModifier, proficiencyBonus, racialBonusFor } from '@/engine/modifiers';
import { standardArrayFor, STANDARD_ARRAY } from '@/engine/characterBuilder';
import { getClass } from '@/data/classes';
import { modStr } from '@/engine/dice';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { BackgroundPicker } from './BackgroundPicker';

type Method = 'array' | 'pointbuy' | 'manual';

const POINT_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const POINT_BUDGET = 27;

export function StepAbilities({ char, update }: StepProps) {
  const t = useTheme();
  const [method, setMethod] = useState<Method>('array');

  const base = char.baseAbilities;
  const bg = getBackground(char.backgroundId);
  const prof = proficiencyBonus(char.level);

  const setBase = (key: AbilityKey, value: number) =>
    update((c) => {
      c.baseAbilities = { ...c.baseAbilities, [key]: value };
    });

  // ---- Array Padrão: troca de valores garantindo unicidade ----
  const assignArrayValue = (key: AbilityKey, value: number) =>
    update((c) => {
      const next = { ...c.baseAbilities };
      const owner = ABILITY_KEYS.find((k) => next[k] === value && k !== key);
      if (owner) next[owner] = next[key];
      next[key] = value;
      c.baseAbilities = next;
    });

  const pointsSpent = ABILITY_KEYS.reduce((sum, k) => sum + (POINT_COST[base[k]] ?? 0), 0);
  const pointsLeft = POINT_BUDGET - pointsSpent;

  const methodTab = (m: Method, label: string) => {
    const active = method === m;
    return (
      <button
        key={m}
        onClick={() => {
          setMethod(m);
          if (m === 'array') update((c) => { c.baseAbilities = standardArrayFor(c.classId); });
          if (m === 'pointbuy') update((c) => {
            const reset = {} as typeof c.baseAbilities;
            for (const k of ABILITY_KEYS) reset[k] = 8;
            c.baseAbilities = reset;
          });
        }}
        style={{
          fontFamily: active ? "'Cinzel', serif" : "'Inter', sans-serif",
          fontSize: 13,
          padding: '8px 16px',
          borderRadius: 999,
          cursor: 'pointer',
          border: '1px solid ' + (active ? t.gold : t.line),
          color: active ? t.gold : t.muted,
          background: active ? hexA(t.gold, 0.1) : 'transparent',
          transition: '.2s',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="animate-riseIn">
      <ChapterTitle
        chapter="Capítulo IV"
        title="Atributos"
        subtitle="Escolha o passado e distribua os seis pilares do herói. Bônus raciais e perícias entram no cálculo automaticamente."
      />

      <div style={{ marginBottom: 16 }}>
        <BackgroundPicker char={char} update={update} />
      </div>

      <div style={{ display: 'flex', gap: 9, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {methodTab('array', 'Array Padrão')}
        {methodTab('pointbuy', 'Ponto de Compra')}
        {methodTab('manual', 'Manual')}
        {method === 'pointbuy' && (
          <span
            style={{
              fontFamily: "'Chakra Petch', monospace",
              fontSize: 13,
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid ' + (pointsLeft < 0 ? t.danger : t.line),
              color: pointsLeft < 0 ? t.danger : 'var(--ink)',
              alignSelf: 'center',
            }}
          >
            {pointsLeft} pontos
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 112px), 1fr))', gap: 12 }}>
        {ABILITY_KEYS.map((key) => {
          const baseVal = base[key];
          const racial = racialBonusFor(key, char.raceId, char.subraceId);
          const total = baseVal + racial;
          const mod = abilityModifier(total);
          const favored = bg.suggestedAbilities.includes(key);
          return (
            <div
              key={key}
              style={{
                position: 'relative',
                background: 'linear-gradient(170deg, var(--panel), var(--panel2))',
                border: '1px solid ' + (favored ? hexA(t.gold, 0.62) : 'var(--line)'),
                borderRadius: 15,
                padding: '15px 12px 14px',
                textAlign: 'center',
                boxShadow: favored
                  ? '0 0 22px ' + hexA(t.gold, 0.16) + ', inset 0 1px 0 rgba(255,255,255,.05)'
                  : 'inset 0 1px 0 rgba(255,255,255,.05)',
                overflow: 'hidden',
              }}
            >
              {favored && (
                <div
                  style={{
                    position: 'absolute',
                    top: 9,
                    right: 9,
                    fontSize: 9,
                    letterSpacing: '.1em',
                    color: '#140d04',
                    background: t.gold,
                    borderRadius: 999,
                    padding: '3px 6px',
                    fontWeight: 700,
                  }}
                >
                  BG
                </div>
              )}
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '.14em', color: 'var(--muted)' }}>
                {ABILITY_SHORT[key]}
              </div>
              <div
                style={{
                  fontFamily: "'Chakra Petch', monospace",
                  fontWeight: 700,
                  fontSize: 38,
                  lineHeight: 1,
                  color: 'var(--ink)',
                  margin: '6px 0 2px',
                }}
              >
                {modStr(mod)}
              </div>
              <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 13, color: 'var(--acc)' }}>{total}</div>

              {method === 'array' ? (
                <select
                  value={baseVal}
                  onChange={(e) => assignArrayValue(key, Number(e.target.value))}
                  style={{
                    marginTop: 10,
                    width: '100%',
                    background: 'rgba(0,0,0,.3)',
                    color: 'var(--ink)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '5px',
                    fontFamily: "'Chakra Petch', monospace",
                    fontSize: 13,
                  }}
                >
                  {STANDARD_ARRAY.map((v) => (
                    <option key={v} value={v} style={{ color: '#111' }}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <Stepper
                    onClick={() => {
                      const min = method === 'pointbuy' ? 8 : 3;
                      if (baseVal > min) setBase(key, baseVal - 1);
                    }}
                    sign="−"
                  />
                  <span style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 16, color: 'var(--ink)', minWidth: 22 }}>
                    {baseVal}
                  </span>
                  <Stepper
                    accent
                    onClick={() => {
                      const max = method === 'pointbuy' ? 15 : 20;
                      if (baseVal >= max) return;
                      if (method === 'pointbuy') {
                        const cost = (POINT_COST[baseVal + 1] ?? 99) - (POINT_COST[baseVal] ?? 0);
                        if (pointsLeft - cost < 0) return;
                      }
                      setBase(key, baseVal + 1);
                    }}
                    sign="+"
                  />
                </div>
              )}

              {racial > 0 ? (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 10.5,
                    color: 'var(--gold)',
                    background: hexA(t.gold, 0.12),
                    border: '1px solid ' + hexA(t.gold, 0.3),
                    borderRadius: 999,
                    padding: '2px 0',
                  }}
                >
                  {baseVal} +{racial} racial
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--muted)' }}>base {baseVal}</div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="fv-surface"
        style={{
          marginTop: 14,
          padding: 14,
          border: '1px solid ' + hexA(t.gold, 0.34),
          background: 'linear-gradient(160deg, rgba(0,0,0,.24), ' + hexA(t.gold, 0.08) + ')',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 9 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 15.5, color: 'var(--ink)' }}>
            Antecedente: {bg.label}
          </div>
          <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 12, color: 'var(--gold)' }}>
            proficiência +{prof}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 9 }}>
          {bg.skills.map((skillKey) => {
            const skill = SKILL_BY_KEY[skillKey];
            const total = base[skill.ability] + racialBonusFor(skill.ability, char.raceId, char.subraceId);
            const bonus = abilityModifier(total) + prof;
            return (
              <div
                key={skillKey}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 11px',
                  borderRadius: 11,
                  border: '1px solid var(--line)',
                  background: 'rgba(0,0,0,.22)',
                }}
              >
                <div>
                  <div style={{ color: 'var(--ink)', fontWeight: 700, fontSize: 13 }}>{skill.label}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 11, fontFamily: "'Chakra Petch', monospace" }}>
                    usa {ABILITY_SHORT[skill.ability]}
                  </div>
                </div>
                <div style={{ color: t.gold, fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 18 }}>
                  {modStr(bonus)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--muted)' }}>
        Dica: priorize <b style={{ color: 'var(--ink)' }}>{ABILITY_LABELS[getClass(char.classId).prim]}</b>, o
        atributo principal do {getClass(char.classId).label}, para ataques e magias mais certeiros.
      </p>
    </div>
  );
}

function Stepper({ sign, onClick, accent }: { sign: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        cursor: 'pointer',
        width: 30,
        height: 30,
        borderRadius: 8,
        border: '1px solid var(--line)',
        background: 'rgba(0,0,0,.26)',
        color: accent ? 'var(--acc)' : 'var(--muted)',
        fontWeight: 700,
        fontSize: 15,
      }}
    >
      {sign}
    </button>
  );
}
