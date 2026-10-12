import type { Character } from '@/types/character';
export function effectState(c: Character) {
  return structuredClone({ hp: c.hpCurrent, effects: c.combat.spellEffects, marks: c.combat.marks, concentration: c.combat.concentration, exhaustion: c.combat.exhaustion, sacredWeaponUid: c.combat.sacredWeaponUid });
}
export function effectUndoGuard(c: Character) {
  return JSON.stringify({ effects: effectState(c), turn: c.combat.turn, temp: c.combat.hpTemp, conditions: c.combat.conditions, resources: c.combat.resources, wildShape: c.combat.wildShape, move: c.combat.moveUsed, slots: c.combat.slotPools ?? c.combat.spellSlots, cast: c.combat.castThisTurn, equipment: c.equipped, inventory: c.inventory, level: c.classLevels, abilities: c.baseAbilities, feats: c.feats });
}
/** Não apaga dano, novo turno, outro efeito ou uso de recurso ocorrido após a remoção. */
export function undoEffectRemoval(c: Character, before: ReturnType<typeof effectState>, afterGuard: string): boolean {
  if (effectUndoGuard(c) !== afterGuard) return false;
  c.hpCurrent = before.hp;
  c.combat.spellEffects = before.effects;
  c.combat.marks = before.marks;
  c.combat.concentration = before.concentration;
  c.combat.exhaustion = before.exhaustion;
  c.combat.sacredWeaponUid = before.sacredWeaponUid;
  return true;
}
