import type { Character } from '@/types/character';
import { ABILITY_KEYS } from '@/types/dnd';
import { toolLabel } from '@/data/tools';
import { getFeat } from '@/data/feats';
import { deriveCharacter } from '@/engine/dndRules';
import { saveSlotPools, changeSpellSelection } from '@/engine/spellcasting';
import { saveHitDicePools } from '@/engine/hitDice';
import { gainsSpellSwap } from '@/engine/spellRules';
import { syncResources } from '@/engine/classResources';
import { applyChoicePicks } from '@/engine/classChoices';
import { grantChoiceEffects, withSubclassTools } from '@/engine/choiceEffects';
import { ensureCharacterV2, validateLevelUp, classLevelOf, featuresGained, type LevelUpPlan } from '@/engine/levelUp';
import { subclassOf } from '@/engine/characterClasses';

/**
 * Sobe UM nível no rascunho `c` (já validado). É o mesmo código da aba
 * Evoluir e da Trilha de níveis da criação — por isso criar no nível 5 e
 * subir do 1 ao 5 dão a mesma ficha.
 */
export function applyLevelUp(c: Character, plan: LevelUpPlan): void {
  Object.assign(c, ensureCharacterV2(c));
  const newClassLevel = classLevelOf(c, plan.classId) + 1;
  const newLevel = c.level + 1;
  saveHitDicePools(c);
  saveSlotPools(c);
  c.level = newLevel;
  const entry = c.classLevels.find((x) => x.classId === plan.classId);
  if (entry) entry.level += 1;
  else c.classLevels.push({ classId: plan.classId, level: 1 });

  if (plan.subclassId) {
    c.classLevels.find((cl) => cl.classId === plan.classId)!.subclassId = plan.subclassId;
    if (plan.classId === c.classId) c.subclassId = plan.subclassId;
  }
  // ferramentas da subclasse (Assassino) entram ao chegar no nível dela
  c.toolProfs = withSubclassTools(c).toolProfs ?? c.toolProfs;
  // magias conhecidas: ao subir de nível pode trocar uma (PHB 2014)
  if (gainsSpellSwap(c, plan.classId)) changeSpellSelection(c, plan.classId, (s) => { s.spellSwaps = (s.spellSwaps ?? 0) + 1; });
  if (plan.asi?.kind === 'asi') {
    for (const k of ABILITY_KEYS) {
      const inc = plan.asi.increases[k] ?? 0;
      if (inc) c.asiBonuses[k] = (c.asiBonuses[k] ?? 0) + inc;
    }
  }
  if (plan.asi?.kind === 'feat') {
    c.feats.push(plan.asi.featId);
    // talentos que dão proficiência com ferramenta (Chef, Envenenador)
    const featDef = getFeat(plan.asi.featId);
    for (const tid of featDef?.tools ?? []) {
      if (!c.toolProfs.some((t) => t.id === tid)) c.toolProfs.push({ id: tid, label: toolLabel(tid), source: featDef!.label });
    }
    if (plan.asi.ability) {
      c.asiBonuses[plan.asi.ability] = (c.asiBonuses[plan.asi.ability] ?? 0) + 1;
    }
  }

  // escolhas de classe (Metamagia, Estilo de Luta, Manobras…) e seus efeitos na ficha
  if (plan.choices || plan.replace) {
    applyChoicePicks(c, plan.choices ?? {}, plan.replace ?? {});
    grantChoiceEffects(c, plan.choices ?? {});
  }

  c.levelHistory.push({
    level: newLevel,
    classId: plan.classId,
    classLevel: newClassLevel,
    hpMethod: plan.hpMethod,
    hpValue: plan.hpValue,
    features: featuresGained(plan.classId, newClassLevel, plan.subclassId ?? subclassOf(c, plan.classId)),
    asi: plan.asi,
    subclassId: plan.subclassId,
    choices: plan.choices && Object.keys(plan.choices).length ? plan.choices : undefined,
    at: Date.now(),
  });

  // dados de vida, espaços de magia e recursos acompanham o novo nível
  saveHitDicePools(c);
  saveSlotPools(c);
  c.combat.resources = syncResources(c, c.combat.resources, true);
}

/** Versão pura: valida, sobe o nível numa cópia e o PV atual acompanha o novo máximo. */
export function levelUpCharacter(source: Character, plan: LevelUpPlan): { char: Character; errors: string[] } {
  const char = ensureCharacterV2(structuredClone(source));
  const errors = validateLevelUp(char, plan);
  if (errors.length) return { char: source, errors };
  const beforeMax = deriveCharacter(char).maxHp;
  applyLevelUp(char, plan);
  const afterMax = deriveCharacter(char).maxHp;
  const gain = Math.max(0, afterMax - beforeMax);
  if (gain) char.hpCurrent = Math.min(afterMax, char.hpCurrent + gain);
  return { char, errors: [] };
}
