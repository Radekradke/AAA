import type { AbilityKey, SkillKey } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import type { Character, InventoryItem } from '@/types/character';
import { abilityModifier, proficiencyBonus, totalAbilities } from './modifiers';
import { getClass } from '@/data/classes';
import { getRace, getSubrace } from '@/data/races';
import { getBackground } from '@/data/backgrounds';
import { getSubclass } from '@/data/subclasses';
import { getFeat } from '@/data/feats';
import { SKILLS, ABILITY_LABELS } from '@/data/skills';
import { getItem } from '@/data/items';
import { spellSlotsForClass } from './progression';
import { averageHp, ABILITY_CAP } from './levelUp';
import type { Breakdown } from './effects';
import { breakdown, mod } from './effects';

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
  /** Expertise: bônus de proficiência em dobro (Ladino/Bardo). */
  expertise: boolean;
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
  hitBreakdown: Breakdown;
  damageBreakdown: Breakdown;
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
  /** Decomposição rastreável dos valores principais ("ver cálculo"). */
  breakdowns: {
    abilities: Record<AbilityKey, Breakdown>;
    ac: Breakdown;
    maxHp: Breakdown;
    speed: Breakdown;
    initiative: Breakdown;
    passivePerception: Breakdown;
    spellDC?: Breakdown;
    spellAttack?: Breakdown;
  };
  /** Sentidos/idiomas/resistências herdados com origem. */
  darkvision: { range: number; source: string } | null;
  languages: string[];
  resistances: { value: string; source: string }[];
  subclassLabel: string | null;
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

/**
 * Bônus mágico de arma: campo estruturado `magicBonus` tem prioridade;
 * propriedades em texto ("Mágica +1/+2/+3") seguem valendo por compatibilidade.
 */
function weaponMagicBonus(w: { magicBonus?: number; properties: string[] }): number {
  if (typeof w.magicBonus === 'number' && w.magicBonus > 0) return Math.min(3, w.magicBonus);
  let best = 0;
  for (const p of w.properties) {
    const m = p.match(/\+\s*(\d)/);
    if (m) best = Math.max(best, parseInt(m[1]));
  }
  return best;
}

/** Calcula todos os valores derivados de um personagem — D&D 5e 2014, com origem rastreável. */
export function deriveCharacter(char: Character): DerivedCharacter {
  const cls = getClass(char.classId);
  const race = getRace(char.raceId);
  const subrace = getSubrace(char.raceId, char.subraceId);
  const bg = getBackground(char.backgroundId);
  const subclass = getSubclass(char.subclassId ?? undefined);
  const feats = (char.feats ?? []).map(getFeat).filter((f): f is NonNullable<typeof f> => !!f);
  const prof = proficiencyBonus(char.level);

  // Resiliente (talento): concede proficiência na salvaguarda do atributo escolhido
  const resilientSave = (char.levelHistory ?? []).find(
    (r) => r.asi?.kind === 'feat' && r.asi.featId === 'resilient' && r.asi.ability,
  )?.asi as { kind: 'feat'; featId: string; ability?: AbilityKey } | undefined;
  const saveProfs = new Set<AbilityKey>(char.savingThrowProfs);
  if (resilientSave?.ability) saveProfs.add(resilientSave.ability);

  // ---- Atributos: base + raça + sub-raça + ASI/talentos (teto 20) ----
  const raceTotals = totalAbilities(char.baseAbilities, char.raceId, char.subraceId);
  const abilityBreakdowns = {} as Record<AbilityKey, Breakdown>;
  const abilities = {} as Record<AbilityKey, DerivedAbility>;
  const abilityList: DerivedAbility[] = ABILITY_KEYS.map((key) => {
    const asi = char.asiBonuses?.[key] ?? 0;
    const raw = raceTotals[key] + asi;
    const total = Math.min(ABILITY_CAP, raw);
    const bd = breakdown(
      [
        mod(key, char.baseAbilities[key], 'Valores de criação', 'base'),
        mod(key, race.abilityBonus[key] ?? 0, race.label, 'race'),
        subrace ? mod(key, subrace.abilityBonus?.[key] ?? 0, subrace.label, 'subrace') : null,
        asi ? mod(key, asi, 'Aumentos de nível', 'asi') : null,
      ],
      raw > ABILITY_CAP ? `limitado ao teto de ${ABILITY_CAP}` : undefined,
    );
    bd.total = total;
    abilityBreakdowns[key] = bd;
    const m = abilityModifier(total);
    const saveProf = saveProfs.has(key);
    const save = m + (saveProf ? prof : 0);
    const d: DerivedAbility = { key, total, mod: m, save, saveProf };
    abilities[key] = d;
    return d;
  });

  const dexMod = abilities.dex.mod;
  const conMod = abilities.con.mod;

  // ---- CA: armadura (com teto de DES) + escudo + itens sintonizados ----
  const armorItem = findEquipped(char, char.equipped.armor);
  const armor = armorItem ? resolveItemData(armorItem).armor : undefined;
  const acParts = [];
  let acNote: string | undefined;
  if (armor && armorItem) {
    acParts.push(mod('ac', armor.baseAC, armorItem.name, 'item', { label: 'CA base da armadura' }));
    if (armor.addDex) {
      const cap = typeof armor.maxDexBonus === 'number' ? Math.min(dexMod, armor.maxDexBonus) : dexMod;
      acParts.push(mod('ac', cap, 'Destreza', 'ability', { label: 'modificador de DES' }));
      if (typeof armor.maxDexBonus === 'number' && dexMod > armor.maxDexBonus) {
        acNote = `armadura ${armor.category} limita DES a +${armor.maxDexBonus}`;
      }
    } else {
      acNote = 'armadura pesada não soma Destreza';
    }
  } else {
    acParts.push(mod('ac', 10, 'Sem armadura', 'base'));
    acParts.push(mod('ac', dexMod, 'Destreza', 'ability', { label: 'modificador de DES' }));
  }
  const shieldItem = findEquipped(char, char.equipped.shield);
  if (shieldItem) {
    const bonus = resolveItemData(shieldItem).acBonus ?? 0;
    if (bonus) acParts.push(mod('ac', bonus, shieldItem.name, 'item', { label: 'escudo' }));
  }
  for (const it of char.inventory) {
    if (!it.attuned || it.category !== 'ring') continue;
    const data = resolveItemData(it);
    if (data.acBonus) acParts.push(mod('ac', data.acBonus, it.name, it.homebrew ? 'homebrew' : 'item'));
  }
  const acBd = breakdown(acParts, acNote);

  // ---- PV máximo: linha do tempo (rolagens/média) + CON×nível + linhagem + Durão ----
  const history = char.levelHistory ?? [];
  const hpParts = [];
  if (history.length) {
    const level1 = history.find((r) => r.level === 1);
    const rest = history.filter((r) => r.level > 1);
    if (level1) hpParts.push(mod('hp', level1.hpValue, `${getClass(level1.classId).label} nível 1 (dado cheio)`, 'class'));
    if (rest.length) {
      const sum = rest.reduce((s, r) => s + r.hpValue, 0);
      hpParts.push(mod('hp', sum, `Níveis 2–${char.level} (${rest.length} registros)`, 'class'));
    }
  } else {
    hpParts.push(mod('hp', cls.hitDie, `${cls.label} nível 1 (dado cheio)`, 'class'));
    if (char.level > 1) {
      hpParts.push(mod('hp', (char.level - 1) * averageHp(cls.hitDie), `Níveis 2–${char.level} (média)`, 'class'));
    }
  }
  hpParts.push(mod('hp', conMod * char.level, `Constituição ×${char.level} níveis`, 'ability'));
  if (subrace?.hpPerLevel) {
    hpParts.push(mod('hp', subrace.hpPerLevel * char.level, subrace.label, 'subrace', { label: 'Tenacidade Anã' }));
  }
  for (const f of feats) {
    if (f.hpPerLevel) hpParts.push(mod('hp', f.hpPerLevel * char.level, f.label, 'feat'));
  }
  const hpBd = breakdown(hpParts);
  const maxHp = Math.max(1, hpBd.total);
  hpBd.total = maxHp;

  // ---- Deslocamento: raça + sub-raça + talentos ----
  const speedBd = breakdown([
    mod('speed', race.speed, race.label, 'race', { unit: 'm', label: 'deslocamento base' }),
    subrace?.speedBonus ? mod('speed', subrace.speedBonus, subrace.label, 'subrace', { unit: 'm', label: 'Pés Ligeiros' }) : null,
    ...feats.map((f) => (f.speedBonus ? mod('speed', f.speedBonus, f.label, 'feat', { unit: 'm' }) : null)),
  ]);

  // ---- Iniciativa: DES + talentos ----
  const initBd = breakdown([
    mod('initiative', dexMod, 'Destreza', 'ability', { label: 'modificador de DES' }),
    ...feats.map((f) => (f.initiativeBonus ? mod('initiative', f.initiativeBonus, f.label, 'feat') : null)),
  ]);

  // ---- Perícias (proficiências: escolhas + antecedente + raça; expertise dobra) ----
  const skillProfs = new Set<SkillKey>([...char.skillProfs, ...bg.skills, ...(race.skillProfs ?? [])]);
  const expertiseSet = new Set<SkillKey>(char.skillExpertise ?? []);
  const skills: DerivedSkill[] = SKILLS.map((sk) => {
    const proficient = skillProfs.has(sk.key);
    const expertise = proficient && expertiseSet.has(sk.key);
    const bonus = abilities[sk.ability].mod + (expertise ? prof * 2 : proficient ? prof : 0);
    return { key: sk.key, label: sk.label, ability: sk.ability, bonus, proficient, expertise };
  });
  const perception = skills.find((s) => s.key === 'perception')!;
  const ppBd = breakdown([
    mod('pp', 10, 'Base', 'base'),
    mod('pp', abilities.wis.mod, 'Sabedoria', 'ability'),
    perception.proficient
      ? mod('pp', perception.expertise ? prof * 2 : prof, perception.expertise ? 'Percepção com expertise (×2)' : 'Percepção proficiente', 'proficiency')
      : null,
    ...feats.map((f) => (f.passivePerceptionBonus ? mod('pp', f.passivePerceptionBonus, f.label, 'feat') : null)),
  ]);

  // ---- Ataques (armas equipadas) ----
  const attacks: DerivedAttack[] = [];
  const seen = new Set<string>();
  for (const slot of [char.equipped.mainHand, char.equipped.offHand, char.equipped.ranged]) {
    const it = findEquipped(char, slot);
    if (!it || seen.has(it.uid)) continue;
    seen.add(it.uid);
    const w = resolveItemData(it).weapon;
    if (!w) continue;
    let abilKey: AbilityKey = 'str';
    if (w.range === 'ranged') abilKey = 'dex';
    else if (w.finesse) abilKey = abilities.dex.mod > abilities.str.mod ? 'dex' : 'str';
    const abilMod = abilities[abilKey].mod;
    const magic = weaponMagicBonus(w);
    const srcType = it.homebrew ? 'homebrew' : 'item';
    const hitBd = breakdown([
      mod('attack', abilMod, ABILITY_LABELS[abilKey], 'ability'),
      mod('attack', prof, 'Bônus de proficiência', 'proficiency'),
      magic ? mod('attack', magic, it.name, srcType, { label: `Mágica +${magic}` }) : null,
    ]);
    const dmgBd = breakdown(
      [
        mod('damage', abilMod, ABILITY_LABELS[abilKey], 'ability'),
        magic ? mod('damage', magic, it.name, srcType, { label: `Mágica +${magic}` }) : null,
      ],
      `${w.damageDice}d${w.damageDie} ${w.damageType} + modificadores`,
    );
    attacks.push({
      uid: it.uid,
      name: it.name,
      note: `${w.range === 'ranged' ? (w.rangeLabel ?? 'à distância') : 'corpo a corpo'}${w.properties.length ? ' · ' + w.properties.join(', ') : ''}`,
      attackBonus: hitBd.total,
      damageDice: w.damageDice,
      damageDie: w.damageDie,
      damageBonus: dmgBd.total,
      damageType: w.damageType,
      versatileDie: w.versatileDie,
      hitBreakdown: hitBd,
      damageBreakdown: dmgBd,
    });
  }

  // ---- Conjuração ----
  const isCaster = !!cls.spellcasting && Object.keys(spellSlotsForClass(char.classId, char.level)).length > 0;
  const castMod = abilities[cls.prim].mod;
  const dcBd = isCaster
    ? breakdown([
        mod('spellDC', 8, 'Base', 'base'),
        mod('spellDC', prof, 'Bônus de proficiência', 'proficiency'),
        mod('spellDC', castMod, ABILITY_LABELS[cls.prim], 'ability'),
      ])
    : undefined;
  const atkBd = isCaster
    ? breakdown([
        mod('spellAttack', prof, 'Bônus de proficiência', 'proficiency'),
        mod('spellAttack', castMod, ABILITY_LABELS[cls.prim], 'ability'),
      ])
    : undefined;

  // ---- Sentidos, idiomas, resistências (origem rastreável) ----
  const darkRange = Math.max(subrace?.darkvision ?? 0, race.darkvision ?? 0);
  const darkvision = darkRange
    ? { range: darkRange, source: subrace?.darkvision && subrace.darkvision >= (race.darkvision ?? 0) ? subrace.label : race.label }
    : null;
  const languages = [...(race.languages ?? ['Comum']), ...(char.extraLanguages ?? [])];
  const resistances = [
    ...(race.resistances ?? []).map((value) => ({ value, source: race.label })),
    ...(subrace?.resistances ?? []).map((value) => ({ value, source: subrace!.label })),
  ];

  const carriedWeight = char.inventory.reduce((sum, it) => sum + it.weight * it.quantity, 0);

  return {
    abilities,
    abilityList,
    proficiency: prof,
    maxHp,
    ac: acBd.total,
    initiative: initBd.total,
    speed: speedBd.total,
    passivePerception: ppBd.total,
    skills,
    attacks,
    hitDiceMax: char.level,
    hitDie: cls.hitDie,
    isCaster,
    spellDC: dcBd ? dcBd.total : null,
    spellAttack: atkBd ? atkBd.total : null,
    carriedWeight,
    carryCapacity: abilities.str.total * 7.5,
    breakdowns: {
      abilities: abilityBreakdowns,
      ac: acBd,
      maxHp: hpBd,
      speed: speedBd,
      initiative: initBd,
      passivePerception: ppBd,
      spellDC: dcBd,
      spellAttack: atkBd,
    },
    darkvision,
    languages,
    resistances,
    subclassLabel: subclass?.label ?? null,
  };
}
