import type { AbilityScores, Feat } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import type { AsiChoice, Character, LevelUpRecord } from '@/types/character';
import { DEFAULT_CAMPAIGN } from '@/types/character';
import { getClass } from '@/data/classes';
import { featuresAt, isAsiLevel, SUBCLASS_LEVEL } from '@/data/classFeatures';
import { getSubclass } from '@/data/subclasses';
import { getFeat } from '@/data/feats';
import { ABILITY_SHORT } from '@/data/skills';
import { totalAbilities } from './modifiers';

export const MAX_LEVEL = 20;
export const ABILITY_CAP = 20;

/** PV médio de um dado de vida (regra 2014: metade arredondada para cima +?; d10 → 6). */
export function averageHp(hitDie: number): number {
  return Math.floor(hitDie / 2) + 1;
}

/** Plano de evolução montado na aba Evoluir antes de confirmar. */
export interface LevelUpPlan {
  classId: string;
  hpMethod: 'media' | 'rolagem' | 'manual';
  /** Valor do dado (rolado/da média/manual), sem CON. */
  hpValue: number;
  asi?: AsiChoice;
  subclassId?: string;
}

/** Nível atual do personagem numa classe específica. */
export function classLevelOf(char: Character, classId: string): number {
  return char.classLevels?.find((c) => c.classId === classId)?.level ?? 0;
}

/** A subclasse é escolhida ao ATINGIR este nível de classe. */
export function subclassLevelFor(classId: string): number {
  return SUBCLASS_LEVEL[classId] ?? 3;
}

/** Valida um plano de evolução contra as regras 2014 + configurações da campanha. */
export function validateLevelUp(char: Character, plan: LevelUpPlan): string[] {
  const errors: string[] = [];
  const campaign = char.campaign ?? DEFAULT_CAMPAIGN;
  const cls = getClass(plan.classId);
  const newClassLevel = classLevelOf(char, plan.classId) + 1;

  if (char.level >= MAX_LEVEL) errors.push(`Nível máximo (${MAX_LEVEL}) já alcançado.`);
  if (plan.classId !== char.classId && !campaign.allowMulticlass) {
    errors.push('Multiclasse está desativada nas configurações da campanha.');
  }
  if (plan.hpValue < 1 || plan.hpValue > cls.hitDie) {
    errors.push(`PV do nível deve estar entre 1 e ${cls.hitDie} (dado de vida d${cls.hitDie}).`);
  }

  const asiHere = isAsiLevel(plan.classId, newClassLevel);
  if (plan.asi && !asiHere) {
    errors.push(`Aumento de atributo/talento não é concedido no nível ${newClassLevel} de ${cls.label} (2014).`);
  }
  if (plan.asi?.kind === 'feat') {
    const feat = getFeat(plan.asi.featId);
    if (!campaign.allowFeats) errors.push('Talentos estão desativados nas configurações da campanha.');
    else if (!feat) errors.push('Talento desconhecido.');
    else if (char.feats?.includes(plan.asi.featId)) errors.push('Este talento já foi escolhido (não acumula).');
    else {
      const issue = featPrereqIssue(char, feat);
      if (issue) errors.push(issue);
    }
  }
  if (plan.asi?.kind === 'asi') {
    const inc = plan.asi.increases;
    const totalPoints = ABILITY_KEYS.reduce((s, k) => s + (inc[k] ?? 0), 0);
    const perAbilityOk = ABILITY_KEYS.every((k) => (inc[k] ?? 0) >= 0 && (inc[k] ?? 0) <= 2);
    const shapeOk =
      totalPoints === 2 && perAbilityOk && ABILITY_KEYS.filter((k) => (inc[k] ?? 0) > 0).length <= 2;
    if (!shapeOk) errors.push('ASI inválido: use +2 em um atributo ou +1 em dois.');
    const totals = effectiveAbilities(char);
    for (const k of ABILITY_KEYS) {
      if ((inc[k] ?? 0) > 0 && totals[k] + (inc[k] ?? 0) > ABILITY_CAP) {
        errors.push(`${k.toUpperCase()} passaria de ${ABILITY_CAP} — não permitido sem regra especial.`);
      }
    }
  }

  const needSub = newClassLevel >= subclassLevelFor(plan.classId) && !char.subclassId && plan.classId === primaryClass(char);
  if (plan.subclassId) {
    const sub = getSubclass(plan.subclassId);
    if (!sub) errors.push('Subclasse desconhecida.');
    else if (sub.classId !== plan.classId) errors.push('Subclasse não pertence à classe escolhida.');
    else if (newClassLevel < subclassLevelFor(plan.classId)) {
      errors.push(`${cls.label} escolhe subclasse no nível ${subclassLevelFor(plan.classId)} (2014).`);
    }
  } else if (needSub && newClassLevel === subclassLevelFor(plan.classId)) {
    errors.push('Escolha a subclasse deste nível antes de confirmar.');
  }

  return errors;
}

export function primaryClass(char: Character): string {
  return char.classId;
}

/** Verifica os pré-requisitos de um talento; devolve a mensagem do problema ou null. */
export function featPrereqIssue(char: Character, feat: Feat): string | null {
  if (feat.prereqRaces && !feat.prereqRaces.includes(char.raceId)) {
    return `${feat.label} exige: ${feat.prereq ?? feat.prereqRaces.join(', ')}.`;
  }
  if (feat.prereqAbility) {
    const totals = effectiveAbilities(char);
    for (const k of ABILITY_KEYS) {
      const min = feat.prereqAbility[k];
      if (min && totals[k] < min) {
        return `${feat.label} exige ${ABILITY_SHORT[k]} ${min}+ (você tem ${totals[k]}).`;
      }
    }
  }
  if (feat.prereqCaster && !getClass(char.classId).spellcasting) {
    return `${feat.label} exige capacidade de conjurar magias.`;
  }
  return null;
}

/**
 * Vagas de expertise (PHB 2014): Ladino 2 no nível 1 e +2 no 6;
 * Bardo 2 no nível 3 e +2 no 10. Prodígio (XGE) concede +1.
 * Cada vaga vira uma perícia OU (Ladino) Ferramentas de Ladrão.
 */
export function expertiseSlots(char: Character): number {
  let slots = 0;
  for (const cl of char.classLevels ?? [{ classId: char.classId, level: char.level }]) {
    if (cl.classId === 'rogue') slots += (cl.level >= 1 ? 2 : 0) + (cl.level >= 6 ? 2 : 0);
    if (cl.classId === 'bard') slots += (cl.level >= 3 ? 2 : 0) + (cl.level >= 10 ? 2 : 0);
  }
  if (char.feats?.includes('prodigy')) slots += 1;
  return slots;
}

/** Vagas de expertise já usadas (perícias + ferramentas). */
export function expertiseUsed(char: Character): number {
  return (char.skillExpertise?.length ?? 0) + (char.toolProfs?.filter((t) => t.expertise).length ?? 0);
}

/** Atributos efetivos (base + raça + ASI/talentos), sem itens. */
export function effectiveAbilities(char: Character): AbilityScores {
  const totals = totalAbilities(char.baseAbilities, char.raceId, char.subraceId);
  for (const k of ABILITY_KEYS) {
    totals[k] = Math.min(ABILITY_CAP, totals[k] + (char.asiBonuses?.[k] ?? 0));
  }
  return totals;
}

/** Características ganhas ao atingir um nível de classe (classe + subclasse). */
export function featuresGained(classId: string, classLevel: number, subclassId: string | null): string[] {
  const base = featuresAt(classId, classLevel);
  const sub = getSubclass(subclassId ?? undefined);
  const subFeatures = sub && sub.classId === classId ? sub.features[classLevel] ?? [] : [];
  return [...base, ...subFeatures.map((f) => `${f} (${sub!.label})`)];
}

/** Sintetiza a linha do tempo (média de PV) para personagens antigos/importados. */
export function synthesizeHistory(char: Pick<Character, 'level' | 'classId' | 'subclassId'>): LevelUpRecord[] {
  const cls = getClass(char.classId);
  const records: LevelUpRecord[] = [];
  for (let lv = 1; lv <= Math.max(1, char.level); lv++) {
    records.push({
      level: lv,
      classId: char.classId,
      classLevel: lv,
      hpMethod: 'media',
      hpValue: lv === 1 ? cls.hitDie : averageHp(cls.hitDie),
      features: featuresGained(char.classId, lv, char.subclassId ?? null),
      subclassId: lv === subclassLevelFor(char.classId) && char.subclassId ? char.subclassId : undefined,
      synthetic: true,
      at: 0,
    });
  }
  return records;
}

/** Migração defensiva: garante os campos dos schemas v2/v3 num personagem antigo. */
export function ensureCharacterV2(c: Character): Character {
  if (c.schema === 3 && c.levelHistory?.length) return c;
  const migrated: Character = {
    ...c,
    schema: 3,
    classLevels: c.classLevels?.length ? c.classLevels : [{ classId: c.classId, level: c.level }],
    subclassId: c.subclassId ?? null,
    feats: c.feats ?? [],
    asiBonuses: c.asiBonuses ?? {},
    inspiration: c.inspiration ?? false,
    campaign: { ...DEFAULT_CAMPAIGN, ...(c.campaign ?? {}) },
    levelHistory: c.levelHistory?.length ? c.levelHistory : synthesizeHistory(c),
    // v3: expertise, ferramentas e idiomas
    skillExpertise: c.skillExpertise ?? [],
    toolProfs: c.toolProfs ?? [],
    extraLanguages: c.extraLanguages ?? [],
  };
  return migrated;
}
