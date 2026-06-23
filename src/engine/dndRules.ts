import type { AbilityKey, SkillKey } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import type { Character, InventoryItem } from '@/types/character';
import { abilityModifier, proficiencyBonus, totalAbilities } from './modifiers';
import { getClass } from '@/data/classes';
import { getRace, getSubrace } from '@/data/races';
import { getBackground } from '@/data/backgrounds';
import { SKILLS } from '@/data/skills';
import { getItem } from '@/data/items';
import { spellSlotsForClass } from './progression';

export interface DerivedAbility {
  key: AbilityKey;
  total: number;
  mod: number;
  save: number;
  saveProf: boolean;
}

export interface DerivedSkill {
  key: SkillKey;
  label: string;
  ability: AbilityKey;
  bonus: number;
  proficient: boolean;
}

export interface DerivedAttack {
  uid: string;
  name: string;
  note: string;
  attackBonus: number;
  damageDice: number;
  damageDie: number;
  damageBonus: number;
  damageType: string;
  versatileDie?: number;
}

export interface DerivedCharacter {
  abilities: Record<AbilityKey, DerivedAbility>;
  abilityList: DerivedAbility[];
  proficiency: number;
  maxHp: number;
  ac: number;
  initiative: number;
  speed: number;
  passivePerception: number;
  skills: DerivedSkill[];
  attacks: DerivedAttack[];
  hitDiceMax: number;
  hitDie: number;
  isCaster: boolean;
  spellDC: number | null;
  spellAttack: number | null;
  carriedWeight: number;
  carryCapacity: number;
}

/** Resolve um item da mochila (instância pode trazer dados embutidos ou referenciar o catálogo). */
function resolveItemData(it: InventoryItem) {
  const base = getItem(it.itemId);
  return {
    weapon: it.weapon ?? base?.weapon,
    armor: it.armor ?? base?.armor,
    acBonus: it.acBonus ?? base?.acBonus,
  };
}

function findEquipped(char: Character, uid: string | null): InventoryItem | undefined {
  if (!uid) return undefined;
  return char.inventory.find((i) => i.uid === uid);
}

/** Calcula todos os valores derivados de um personagem a partir das regras de D&D 5e. */
export function deriveCharacter(char: Character): DerivedCharacter {
  const cls = getClass(char.classId);
  const race = getRace(char.raceId);
  const subrace = getSubrace(char.raceId, char.subraceId);
  const bg = getBackground(char.backgroundId);
  const skillProfs = new Set([...char.skillProfs, ...bg.skills]);
  const totals = totalAbilities(char.baseAbilities, char.raceId, char.subraceId);
  const prof = proficiencyBonus(char.level);

  const abilities = {} as Record<AbilityKey, DerivedAbility>;
  const abilityList: DerivedAbility[] = ABILITY_KEYS.map((key) => {
    const total = totals[key];
    const mod = abilityModifier(total);
    const saveProf = char.savingThrowProfs.includes(key);
    const save = mod + (saveProf ? prof : 0);
    const d: DerivedAbility = { key, total, mod, save, saveProf };
    abilities[key] = d;
    return d;
  });

  const dexMod = abilities.dex.mod;

  // ---- CA: base 10 + DES, ou armadura equipada; soma escudo e bônus de itens ----
  let ac = 10 + dexMod;
  const armor = resolveItemData(findEquipped(char, char.equipped.armor) ?? ({} as InventoryItem)).armor;
  if (armor) {
    if (armor.addDex) {
      const cap = typeof armor.maxDexBonus === 'number' ? Math.min(dexMod, armor.maxDexBonus) : dexMod;
      ac = armor.baseAC + cap;
    } else {
      ac = armor.baseAC;
    }
  }
  const shield = resolveItemData(findEquipped(char, char.equipped.shield) ?? ({} as InventoryItem)).acBonus;
  if (char.equipped.shield && shield) ac += shield;
  // bônus de CA por itens equipados/sintonizados (ex.: Anel de Proteção)
  for (const it of char.inventory) {
    if (!it.attuned) continue;
    const data = resolveItemData(it);
    if (data.acBonus && it.category === 'ring') ac += data.acBonus;
  }

  // ---- PV máximo: nível 1 = dado máx + CON; demais níveis = média + CON ----
  const conMod = abilities.con.mod;
  const avgPerLevel = Math.floor(cls.hitDie / 2) + 1;
  const lineageHp = (subrace?.hpPerLevel ?? 0) * char.level;
  const maxHp = cls.hitDie + conMod + (char.level - 1) * (avgPerLevel + conMod) + lineageHp;

  // ---- Perícias ----
  const skills: DerivedSkill[] = SKILLS.map((sk) => {
    const proficient = skillProfs.has(sk.key);
    const bonus = abilities[sk.ability].mod + (proficient ? prof : 0);
    return { key: sk.key, label: sk.label, ability: sk.ability, bonus, proficient };
  });
  const perception = skills.find((s) => s.key === 'perception');
  const passivePerception = 10 + (perception ? perception.bonus : abilities.wis.mod);

  // ---- Ataques a partir das armas equipadas ----
  const attacks: DerivedAttack[] = [];
  const weaponSlots = [char.equipped.mainHand, char.equipped.offHand, char.equipped.ranged];
  const seen = new Set<string>();
  for (const slot of weaponSlots) {
    const it = findEquipped(char, slot);
    if (!it || seen.has(it.uid)) continue;
    seen.add(it.uid);
    const w = resolveItemData(it).weapon;
    if (!w) continue;
    // Acuidade ou arma à distância: usa o melhor entre FOR e DES (acuidade) ou DES (distância).
    let abilMod = abilities.str.mod;
    if (w.range === 'ranged') abilMod = abilities.dex.mod;
    else if (w.finesse) abilMod = Math.max(abilities.str.mod, abilities.dex.mod);
    const magicBonus = w.properties.some((p) => p.includes('+1')) ? 1 : 0;
    attacks.push({
      uid: it.uid,
      name: it.name,
      note: `${w.range === 'ranged' ? (w.rangeLabel ?? 'à distância') : 'corpo a corpo'}${w.properties.length ? ' · ' + w.properties.join(', ') : ''}`,
      attackBonus: abilMod + prof + magicBonus,
      damageDice: w.damageDice,
      damageDie: w.damageDie,
      damageBonus: abilMod + magicBonus,
      damageType: w.damageType,
      versatileDie: w.versatileDie,
    });
  }

  // ---- Conjuração ----
  const isCaster = !!cls.spellcasting && Object.keys(spellSlotsForClass(char.classId, char.level)).length > 0;
  const castMod = abilities[cls.prim].mod;
  const spellDC = isCaster ? 8 + prof + castMod : null;
  const spellAttack = isCaster ? prof + castMod : null;

  // ---- Carga ----
  const carriedWeight = char.inventory.reduce((sum, it) => sum + it.weight * it.quantity, 0);
  const carryCapacity = totals.str * 7.5; // ~15 lb por ponto de Força → kg aproximado

  return {
    abilities,
    abilityList,
    proficiency: prof,
    maxHp: Math.max(1, maxHp),
    ac,
    initiative: dexMod,
    speed: race.speed + (subrace?.speedBonus ?? 0),
    passivePerception,
    skills,
    attacks,
    hitDiceMax: char.level,
    hitDie: cls.hitDie,
    isCaster,
    spellDC,
    spellAttack,
    carriedWeight,
    carryCapacity,
  };
}
