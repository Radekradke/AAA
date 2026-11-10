import { useMemo, useState } from 'react';
import type { AbilityKey } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import type { AsiChoice, Character } from '@/types/character';
import { CLASSES, getClass } from '@/data/classes';
import { subclassesFor } from '@/data/subclasses';
import { isAsiLevel } from '@/data/classFeatures';
import { FEATS, getFeat } from '@/data/feats';
import { ABILITY_SHORT } from '@/data/skills';
import { finalizeCharacter } from '@/engine/characterBuilder';
import { averageHp, classLevelOf, effectiveAbilities, featPrereqIssue, featuresGained, subclassLevelFor, ABILITY_CAP, type LevelUpPlan } from '@/engine/levelUp';
import { autoPlan, autoTrail, runTrail, type TrailStep } from '@/engine/levelTrail';
import { chosenFor, groupSpecs, specsAt } from '@/engine/classChoices';
import { subclassOf } from '@/engine/characterClasses';
import { rollDie } from '@/engine/dice';
import { STEP_TRAIL } from '@/engine/creationSummary';
import { ChoicePicker } from '@/components/sheet/ChoicePicker';
import { StepHeader } from './creatorUi';
import type { StepProps } from './stepTypes';
import '@/styles/session.css';

/**
 * Trilha de níveis: herói que começa acima do 1º. Cada nível pede o mesmo
 * que a aba Evoluir (PV, subclasse, aumento/talento, escolhas da classe);
 * "Escolher por mim" completa um nível ou a trilha toda. No Despertar, os
 * planos são aplicados em ordem — a ficha sai igual à de quem subiu nível a nível.
 */
export function StepTrail({ char, update }: StepProps) {
  const target = char.startLevel ?? 1;
  const plans = char.levelPlans ?? [];
  const base = useMemo(() => {
    const c = finalizeCharacter({ ...char, level: 1, classLevels: [{ classId: char.classId, level: 1 }] });
    delete c.startLevel;
    delete c.levelPlans;
    return c;
  }, [char]);
  const trail = useMemo(() => runTrail(base, plans, target), [base, plans, target]);
  const [open, setOpen] = useState<number | null>(null);
  const openLevel = open ?? trail.steps.find((s) => s.errors.length)?.level ?? null;

  const setPlan = (level: number, plan: LevelUpPlan | undefined) =>
    update((c) => {
      const next = [...(c.levelPlans ?? [])];
      next[level - 2] = plan;
      c.levelPlans = next;
    });
  const fillAll = () => update((c) => void (c.levelPlans = autoTrail(base, target, c.levelPlans ?? [])));

  return (
    <div className="fv-step">
      <StepHeader step={STEP_TRAIL} char={char} subtitle={`Do 2º ao ${target}º nível. Na ficha, as magias novas você escolhe na aba Magias (ela mostra quantas faltam).`} />
      <div className="fv-trail-top">
        <p>
          <b>{trail.reached === target ? `Pronto: ${getClass(char.classId).label} nível ${target}.` : `Faltam ${target - trail.reached} nível(is).`}</b> Cada nível usa as mesmas regras da aba Evoluir.
        </p>
        <button type="button" className="fv-btn-gold" onClick={fillAll}>Escolher tudo por mim</button>
      </div>
      <ol className="fv-trail">
        {trail.steps.map((st) => (
          <TrailLevel
            key={st.level}
            step={st}
            open={openLevel === st.level}
            onToggle={() => setOpen(openLevel === st.level ? -1 : st.level)}
            onChange={(p) => setPlan(st.level, p)}
            onAuto={() => setPlan(st.level, autoPlan(st.before, st.plan?.classId ?? st.before.classId, st.plan ?? {}))}
          />
        ))}
      </ol>
    </div>
  );
}

type AsiMode = 'plus2' | 'plus11' | 'feat';

function TrailLevel({ step, open, onToggle, onChange, onAuto }: { step: TrailStep; open: boolean; onToggle: () => void; onChange: (p: LevelUpPlan) => void; onAuto: () => void }) {
  const { level, before: char, plan, errors } = step;
  const classId = plan?.classId ?? char.classId;
  const cls = getClass(classId);
  const classLevel = classLevelOf(char, classId) + 1;
  const needSub = classLevel >= subclassLevelFor(classId) && !subclassOf(char, classId);
  const asiHere = isAsiLevel(classId, classLevel);
  const p: LevelUpPlan = plan ?? { classId, hpMethod: 'media', hpValue: averageHp(cls.hitDie) };
  const set = (patch: Partial<LevelUpPlan>) => onChange({ ...p, ...patch });
  const sub = p.subclassId ?? subclassOf(char, classId);
  const groups = groupSpecs(char, specsAt(classId, classLevel, sub, { ...(char.choices ?? {}), ...(p.choices ?? {}) }));
  const ok = !!plan && errors.length === 0;
  const blocked = !plan && errors.length === 0;
  const status = ok ? 'pronto' : blocked ? 'depois do anterior' : errors[0];
  const gains = featuresGained(classId, classLevel, sub ?? null);
  const allowMulti = !!char.campaign?.allowMulticlass;

  return (
    <li className={`fv-trail-level${ok ? ' is-ok' : ''}${blocked ? ' is-blocked' : ''}`}>
      <button type="button" className="fv-trail-head" aria-expanded={open} onClick={onToggle} disabled={blocked}>
        <b>{level}º nível</b>
        <span>{cls.label} {classLevel}{p.subclassId ? ` · ${subclassesFor(classId).find((s) => s.id === p.subclassId)?.label}` : ''}</span>
        <small className={ok ? 'is-ok' : ''}>{status}</small>
      </button>
      {open && !blocked && (
        <div className="fv-trail-body">
          {gains.length > 0 && <p className="fv-trail-gains">Ganha: {gains.join(', ')}</p>}
          <div className="fv-trail-row">
            {allowMulti && (
              <label>Classe
                <select className="fv-input" value={classId} onChange={(e) => onChange({ classId: e.target.value, hpMethod: 'media', hpValue: averageHp(getClass(e.target.value).hitDie) })}>
                  {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
            )}
            <label>Pontos de vida (d{cls.hitDie})
              <span className="fv-live-seg">
                <button type="button" className={p.hpMethod === 'media' ? 'is-on' : ''} onClick={() => set({ hpMethod: 'media', hpValue: averageHp(cls.hitDie) })}>Média {averageHp(cls.hitDie)}</button>
                <button type="button" className={p.hpMethod === 'rolagem' ? 'is-on' : ''} onClick={() => set({ hpMethod: 'rolagem', hpValue: rollDie(cls.hitDie) })}>{p.hpMethod === 'rolagem' ? `Rolou ${p.hpValue} · rolar de novo` : 'Rolar'}</button>
              </span>
            </label>
            {needSub && (
              <label>Subclasse
                <select className="fv-input" aria-label={`Subclasse no ${level}º nível`} value={p.subclassId ?? ''} onChange={(e) => set({ subclassId: e.target.value || undefined, choices: undefined })}>
                  <option value="">Escolha…</option>
                  {subclassesFor(classId).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
            )}
          </div>
          {asiHere && <AsiPicker char={char} value={p.asi} onChange={(asi) => set({ asi })} />}
          {groups.map(({ spec, need, options }) => (
            <ChoicePicker
              key={spec.storeKey}
              label={spec.label}
              hint={spec.hint}
              source={`${spec.source} · nível ${spec.classLevel}`}
              options={options}
              taken={chosenFor(char, spec.storeKey)}
              need={need}
              value={p.choices?.[spec.storeKey] ?? []}
              onChange={(next) => set({ choices: { ...(p.choices ?? {}), [spec.storeKey]: next } })}
            />
          ))}
          {plan && errors.length > 0 && (
            <ul className="fv-hb-warn" aria-label={`Falta no ${level}º nível`}>
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          <button type="button" className="fv-btn-ghost" onClick={onAuto}>Escolher por mim</button>
        </div>
      )}
    </li>
  );
}

function AsiPicker({ char, value, onChange }: { char: Character; value: AsiChoice | undefined; onChange: (a: AsiChoice | undefined) => void }) {
  const totals = effectiveAbilities(char);
  const initial: AsiMode | null = !value ? null : value.kind === 'feat' ? 'feat' : Object.values(value.increases).some((v) => v === 2) ? 'plus2' : 'plus11';
  const [mode, setMode] = useState<AsiMode | null>(initial);
  const picks = value?.kind === 'asi' ? (Object.keys(value.increases) as AbilityKey[]) : [];
  const choose = (m: AsiMode) => {
    setMode(m);
    onChange(m === 'feat' ? { kind: 'feat', featId: '' } : undefined);
  };
  const pick = (k: AbilityKey) => {
    if (mode === 'plus2') return onChange({ kind: 'asi', increases: { [k]: 2 } });
    const next = picks.includes(k) ? picks.filter((x) => x !== k) : [...picks, k].slice(-2);
    onChange(next.length ? { kind: 'asi', increases: Object.fromEntries(next.map((x) => [x, 1])) } : undefined);
  };
  const feats = FEATS.filter((f) => !char.feats.includes(f.id));
  const feat = value?.kind === 'feat' ? getFeat(value.featId) : undefined;
  return (
    <div className="fv-trail-asi">
      <span className="fv-live-seg" role="radiogroup" aria-label="Aumento de atributo ou talento">
        {([['plus2', '+2 em um'], ['plus11', '+1 em dois'], ['feat', 'Talento']] as const).map(([m, l]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'is-on' : ''} onClick={() => choose(m)}>{l}</button>
        ))}
      </span>
      {mode && mode !== 'feat' && (
        <div className="fv-trail-abil">
          {ABILITY_KEYS.map((k) => {
            const inc = mode === 'plus2' ? 2 : 1;
            const over = totals[k] + inc > ABILITY_CAP;
            return (
              <button key={k} type="button" disabled={over} aria-pressed={picks.includes(k)} className={picks.includes(k) ? 'is-on' : ''} onClick={() => pick(k)}>
                {ABILITY_SHORT[k]} {totals[k]}{picks.includes(k) ? ` → ${totals[k] + inc}` : ''}
              </button>
            );
          })}
        </div>
      )}
      {mode === 'feat' && (
        <div className="fv-trail-row">
          <select className="fv-input" aria-label="Talento" value={value?.kind === 'feat' ? value.featId : ''} onChange={(e) => onChange({ kind: 'feat', featId: e.target.value })}>
            <option value="">Escolha um talento…</option>
            {feats.map((f) => <option key={f.id} value={f.id} disabled={!!featPrereqIssue(char, f)}>{f.label}{featPrereqIssue(char, f) ? ' (pré-requisito)' : ''}</option>)}
          </select>
          {feat?.abilityChoice && (
            <select className="fv-input" aria-label="+1 do talento em" value={value?.kind === 'feat' ? value.ability ?? '' : ''} onChange={(e) => onChange({ kind: 'feat', featId: feat.id, ability: (e.target.value || undefined) as AbilityKey | undefined })}>
              <option value="">+1 em…</option>
              {feat.abilityChoice.map((k) => <option key={k} value={k}>{ABILITY_SHORT[k]}</option>)}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
