import type { AbilityKey } from '@/types/dnd';
import type { AsiChoice, Character } from '@/types/character';
import { getClass } from '@/data/classes';
import { subclassesFor } from '@/data/subclasses';
import { isAsiLevel } from '@/data/classFeatures';
import { FEATS } from '@/data/feats';
import { averageHp, classLevelOf, effectiveAbilities, featPrereqIssue, subclassLevelFor, validateLevelUp, ABILITY_CAP, type LevelUpPlan } from './levelUp';
import { groupSpecs, specsAt, chosenFor } from './classChoices';
import { subclassOf } from './characterClasses';
import { classAbilityOrder } from './characterBuilder';
import { levelUpCharacter } from './levelUpApply';

/**
 * Trilha de níveis: criar o herói já num nível alto aplicando, em ordem, os
 * mesmos planos da aba Evoluir (do 2º ao nível inicial). "Escolher por mim"
 * monta um plano sensato para um nível.
 */

/** Plano automático para o próximo nível: PV pela média, 1ª subclasse do livro, aumento no atributo da classe, escolhas em ordem. */
export function autoPlan(char: Character, classId: string = char.classId, prefer: Partial<LevelUpPlan> = {}): LevelUpPlan {
  const newClassLevel = classLevelOf(char, classId) + 1;
  const needSub = newClassLevel >= subclassLevelFor(classId) && !subclassOf(char, classId);
  const options = subclassesFor(classId);
  // o que o jogador já escolheu (subclasse) fica; o resto completa
  const subclassId = needSub ? (options.find((s) => s.id === prefer.subclassId) ?? options[0])?.id : undefined;
  const plan: LevelUpPlan = { classId, hpMethod: 'media', hpValue: averageHp(getClass(classId).hitDie), subclassId };
  if (isAsiLevel(classId, newClassLevel)) plan.asi = autoAsi(char, classId);
  // escolhas que dependem umas das outras (Estilo → manobra): repete até fechar
  const picks: Record<string, string[]> = {};
  const sub = subclassId ?? subclassOf(char, classId);
  for (let round = 0; round < 4; round++) {
    let changed = false;
    for (const g of groupSpecs(char, specsAt(classId, newClassLevel, sub, { ...(char.choices ?? {}), ...picks }))) {
      if ((picks[g.spec.storeKey]?.length ?? 0) === g.need) continue;
      const taken = new Set(chosenFor(char, g.spec.storeKey));
      picks[g.spec.storeKey] = g.options.filter((o) => !taken.has(o.id)).slice(0, g.need).map((o) => o.id);
      changed = true;
    }
    if (!changed) break;
  }
  if (Object.keys(picks).length) plan.choices = picks;
  return plan;
}

/** +2 no atributo mais importante que ainda cabe; perto do teto, +1/+1; tudo no 20, um talento. */
export function autoAsi(char: Character, classId: string): AsiChoice {
  const totals = effectiveAbilities(char);
  const order = classAbilityOrder(classId);
  const two = order.find((k) => totals[k] + 2 <= ABILITY_CAP);
  const one = order.filter((k) => totals[k] + 1 <= ABILITY_CAP);
  if (two && order.indexOf(two) <= order.indexOf(one[0] ?? two)) return { kind: 'asi', increases: { [two]: 2 } as Partial<Record<AbilityKey, number>> };
  if (one.length >= 2) return { kind: 'asi', increases: { [one[0]]: 1, [one[1]]: 1 } as Partial<Record<AbilityKey, number>> };
  const feat = ['tough', 'alert', 'resilient', 'lucky'].map((id) => FEATS.find((f) => f.id === id)!).find((f) => f && !char.feats.includes(f.id) && !featPrereqIssue(char, f) && !f.abilityChoice);
  return feat ? { kind: 'feat', featId: feat.id } : { kind: 'asi', increases: { [order[0]]: 2 } as Partial<Record<AbilityKey, number>> };
}

export interface TrailStep {
  /** Nível que este plano alcança. */
  level: number;
  /** Ficha ANTES de subir (base para montar e validar o plano). */
  before: Character;
  plan: LevelUpPlan | undefined;
  errors: string[];
}

/** Regras da aba Evoluir + o que ela não deixa confirmar sem escolher (aumento/talento e o +1 do meio-talento). */
export function trailErrors(char: Character, plan: LevelUpPlan): string[] {
  const errors = validateLevelUp(char, plan);
  if (isAsiLevel(plan.classId, classLevelOf(char, plan.classId) + 1)) {
    if (!plan.asi) errors.push('Escolha o aumento de atributo ou um talento.');
    else if (plan.asi.kind === 'feat') {
      const featId = plan.asi.featId;
      if (FEATS.find((f) => f.id === featId)?.abilityChoice && !plan.asi.ability) errors.push('Escolha o +1 do talento.');
    }
  }
  return errors;
}

/** Aplica os planos em ordem a partir da ficha de 1º nível. Para no primeiro que falta ou não vale. */
export function runTrail(base: Character, plans: (LevelUpPlan | undefined)[], target: number): { char: Character; steps: TrailStep[]; reached: number } {
  let char = base;
  const steps: TrailStep[] = [];
  let blocked = false;
  for (let level = base.level + 1; level <= target; level++) {
    const plan = plans[level - 2];
    if (blocked || !plan) {
      steps.push({ level, before: char, plan, errors: blocked ? [] : ['Escolha este nível.'] });
      blocked = true;
      continue;
    }
    const errors = trailErrors(char, plan);
    steps.push({ level, before: char, plan, errors });
    if (errors.length) {
      blocked = true;
      continue;
    }
    char = levelUpCharacter(char, plan).char;
  }
  return { char, steps, reached: char.level };
}

/** "Escolher tudo por mim": planos do 2º ao nível alvo, cada um sobre o resultado do anterior. */
export function autoTrail(base: Character, target: number, keep: (LevelUpPlan | undefined)[] = []): LevelUpPlan[] {
  const plans: LevelUpPlan[] = [];
  let char = base;
  for (let level = base.level + 1; level <= target; level++) {
    const mine = keep[level - 2];
    const plan = mine && !trailErrors(char, mine).length ? mine : autoPlan(char, mine?.classId ?? char.classId, mine);
    plans.push(plan);
    const next = levelUpCharacter(char, plan);
    if (next.errors.length) break;
    char = next.char;
  }
  return plans;
}
