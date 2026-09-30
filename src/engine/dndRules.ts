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
import { casterOf } from './spellcasting';
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
  /** Dano extra de outro tipo (ex.: +2d6 fogo), sem modificador de atributo. */
  bonusDamage?: { dice: number; die: number; type: string };
  /** Menor resultado natural do d20 que conta como crítico (20 padrão; 19/18 com Campeão). */
  critMin: number;
  /** Dados de arma extras no crítico (Crítico Brutal do Bárbaro). */
  critExtraDice?: number;
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
  /** Investigação passiva = 10 + bônus de Investigação (Observador soma +5). */
  passiveInvestigation: number;
  /** Intuição passiva = 10 + bônus de Intuição. */
  passiveInsight: number;
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
  /** Proficiências concedidas pela subclasse (exibição). */
  grantedProficiencies: string[];
  /** Menor natural do d20 que é crítico (20 padrão; 19/18 com Campeão). */
  critMin: number;
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
  const subBonus = subclass?.bonuses;
  const feats = (char.feats ?? []).map(getFeat).filter((f): f is NonNullable<typeof f> => !!f);
  const prof = proficiencyBonus(char.level);
  // nível na classe da subclasse (monoclasse: nível do personagem)
  const subClassLevel = (char.classLevels ?? []).find((c) => c.classId === subclass?.classId)?.level ?? char.level;
  // limiar de crítico: 20, reduzido por subclasse (Campeão: 19 no nv3, 18 no nv15)
  let critMin = 20;
  if (subBonus?.critRange) {
    for (const [lvl, threshold] of Object.entries(subBonus.critRange)) {
      if (subClassLevel >= Number(lvl)) critMin = Math.min(critMin, threshold);
    }
  }

  // Resiliente (talento): concede proficiência na salvaguarda do atributo escolhido
  const resilientSave = (char.levelHistory ?? []).find(
    (r) => r.asi?.kind === 'feat' && r.asi.featId === 'resilient' && r.asi.ability,
  )?.asi as { kind: 'feat'; featId: string; ability?: AbilityKey } | undefined;
  const saveProfs = new Set<AbilityKey>(char.savingThrowProfs);
  if (resilientSave?.ability) saveProfs.add(resilientSave.ability);
  const levelIn = (id: string) => (char.classLevels?.find((c) => c.classId === id)?.level ?? (char.classId === id ? char.level : 0));
  // Alma de Diamante (Monge 14º): proficiência em todas as salvaguardas
  if (levelIn('monk') >= 14) ABILITY_KEYS.forEach((k) => saveProfs.add(k));
  // Mente Escorregadia (Ladino 15º): proficiência em salvaguarda de SAB
  if (levelIn('rogue') >= 15) saveProfs.add('wis');
  // Campeão Primal (Bárbaro 20º): FOR e CON +4, teto 24
  const primalChampion = levelIn('barbarian') >= 20;

  // ---- Atributos: base + raça + sub-raça + ASI/talentos (teto 20) ----
  const raceTotals = totalAbilities(char.baseAbilities, char.raceId, char.subraceId);
  const abilityBreakdowns = {} as Record<AbilityKey, Breakdown>;
  const abilities = {} as Record<AbilityKey, DerivedAbility>;
  const abilityList: DerivedAbility[] = ABILITY_KEYS.map((key) => {
    const asi = char.asiBonuses?.[key] ?? 0;
    const primal = primalChampion && (key === 'str' || key === 'con') ? 4 : 0;
    const cap = primal ? 24 : ABILITY_CAP;
    const raw = Math.min(ABILITY_CAP, raceTotals[key] + asi) + primal;
    const total = Math.min(cap, raw);
    const bd = breakdown(
      [
        mod(key, char.baseAbilities[key], 'Valores de criação', 'base'),
        mod(key, race.abilityBonus[key] ?? 0, race.label, 'race'),
        subrace ? mod(key, subrace.abilityBonus?.[key] ?? 0, subrace.label, 'subrace') : null,
        asi ? mod(key, asi, 'Aumentos de nível', 'asi') : null,
        primal ? mod(key, primal, 'Campeão Primal', 'class', { label: 'Bárbaro 20º (teto 24)' }) : null,
      ],
      raceTotals[key] + asi > ABILITY_CAP ? `limitado ao teto de ${ABILITY_CAP}` : undefined,
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

  // Aura de Proteção (Paladino 6º): soma CAR (mín. +1) a todas as salvaguardas
  if (levelIn('paladin') >= 6) {
    const aura = Math.max(1, abilities.cha.mod);
    for (const a of abilityList) a.save += aura;
  }

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
  } else if (subBonus?.unarmoredAC) {
    // Defesa sem armadura da subclasse (ex.: Resiliência Dracônica = 13 + DES)
    const u = subBonus.unarmoredAC;
    acParts.push(mod('ac', u.base, subclass!.label, 'subclass', { label: 'CA sem armadura' }));
    acParts.push(mod('ac', abilities[u.ability].mod, ABILITY_LABELS[u.ability], 'ability', { label: `modificador de ${u.ability.toUpperCase()}` }));
  } else {
    acParts.push(mod('ac', 10, 'Sem armadura', 'base'));
    acParts.push(mod('ac', dexMod, 'Destreza', 'ability', { label: 'modificador de DES' }));
    // Defesa sem Armadura (PHB 2014): Bárbaro soma CON; Monge soma SAB
    // (o Monge perde o traço se usar escudo; o Bárbaro pode usar escudo).
    if (char.classId === 'barbarian') {
      acParts.push(mod('ac', conMod, 'Constituição', 'ability', { label: 'Defesa sem Armadura' }));
    } else if (char.classId === 'monk' && !char.equipped.shield) {
      acParts.push(mod('ac', abilities.wis.mod, 'Sabedoria', 'ability', { label: 'Defesa sem Armadura' }));
    }
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
  if (subBonus?.acBonus) acParts.push(mod('ac', subBonus.acBonus, subclass!.label, 'subclass'));
  // Estilo de Luta (Guerreiro 1º, Paladino/Patrulheiro 2º, Campeão 10º) — escolhido na aba Evoluir
  const styles = new Set(
    Object.entries(char.choices ?? {})
      .filter(([k]) => k.endsWith('.fightingStyle'))
      .flatMap(([, ids]) => ids),
  );
  if (styles.has('defense') && armor) acParts.push(mod('ac', 1, 'Estilo de Luta: Defesa', 'class', { label: 'usando armadura' }));
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
  if (subBonus?.hpPerLevel) {
    hpParts.push(mod('hp', subBonus.hpPerLevel * char.level, subclass!.label, 'subclass', { label: 'PV por nível' }));
  }
  const hpBd = breakdown(hpParts);
  const maxHp = Math.max(1, hpBd.total);
  hpBd.total = maxHp;

  // ---- Deslocamento: raça + sub-raça + talentos + classe ----
  const monkLv = levelIn('monk');
  // dado de Artes Marciais: d4 → d6 (5º) → d8 (11º) → d10 (17º)
  const maDie = monkLv >= 17 ? 10 : monkLv >= 11 ? 8 : monkLv >= 5 ? 6 : 4;
  const monkMove = monkLv >= 18 ? 9 : monkLv >= 14 ? 7.5 : monkLv >= 10 ? 6 : monkLv >= 6 ? 4.5 : monkLv >= 2 ? 3 : 0;
  const speedBd = breakdown([
    mod('speed', race.speed, race.label, 'race', { unit: 'm', label: 'deslocamento base' }),
    subrace?.speedBonus ? mod('speed', subrace.speedBonus, subrace.label, 'subrace', { unit: 'm', label: 'Pés Ligeiros' }) : null,
    ...feats.map((f) => (f.speedBonus ? mod('speed', f.speedBonus, f.label, 'feat', { unit: 'm' }) : null)),
    subBonus?.speedBonus ? mod('speed', subBonus.speedBonus, subclass!.label, 'subclass', { unit: 'm' }) : null,
    // Movimento Rápido (Bárbaro 5º): +3 m sem armadura pesada
    levelIn('barbarian') >= 5 && armor?.category !== 'pesada'
      ? mod('speed', 3, 'Movimento Rápido', 'class', { unit: 'm', label: 'Bárbaro 5º, sem armadura pesada' })
      : null,
    // Movimento sem Armadura (Monge 2º+): sem armadura e sem escudo
    monkMove && !armor && !char.equipped.shield
      ? mod('speed', monkMove, 'Movimento sem Armadura', 'class', { unit: 'm', label: 'Monge, sem armadura nem escudo' })
      : null,
  ]);

  // ---- Iniciativa: DES + talentos ----
  // Meia proficiência em testes sem proficiência (não acumulam; vale o maior):
  // Pau pra Toda Obra (Bardo 2º, arredonda para baixo, qualquer atributo) e
  // Atleta Notável (Campeão 7º, arredonda para cima, só FOR/DES/CON).
  const jackOfAllTrades = levelIn('bard') >= 2;
  const remarkableAthlete = char.subclassId === 'champion' && levelIn('fighter') >= 7;
  const halfProfFor = (ability: AbilityKey): { value: number; label: string } | null => {
    const ra = remarkableAthlete && (ability === 'str' || ability === 'dex' || ability === 'con') ? Math.ceil(prof / 2) : 0;
    const jack = jackOfAllTrades ? Math.floor(prof / 2) : 0;
    if (!ra && !jack) return null;
    return ra >= jack ? { value: ra, label: 'Atleta Notável' } : { value: jack, label: 'Pau pra Toda Obra' };
  };
  const initHalf = halfProfFor('dex');
  const initBd = breakdown([
    mod('initiative', dexMod, 'Destreza', 'ability', { label: 'modificador de DES' }),
    initHalf ? mod('initiative', initHalf.value, initHalf.label, 'class', { label: 'meia proficiência' }) : null,
    ...feats.map((f) => (f.initiativeBonus ? mod('initiative', f.initiativeBonus, f.label, 'feat') : null)),
    subBonus?.initiativeBonus ? mod('initiative', subBonus.initiativeBonus, subclass!.label, 'subclass') : null,
  ]);

  // ---- Perícias (proficiências: escolhas + antecedente + raça; expertise dobra) ----
  const skillProfs = new Set<SkillKey>([...char.skillProfs, ...bg.skills, ...(race.skillProfs ?? [])]);
  // perícias vindas de escolhas de classe: Colégio do Conhecimento (3) e Influência Enganadora
  for (const [k, ids] of Object.entries(char.choices ?? {})) {
    if (/\.(loreSkills|knowledgeSkills|natureSkill)$/.test(k)) ids.forEach((id) => skillProfs.add(id as SkillKey));
    if (k.endsWith('.invocation') && ids.includes('beguilingInfluence')) {
      skillProfs.add('deception');
      skillProfs.add('persuasion');
    }
  }
  const expertiseSet = new Set<SkillKey>(char.skillExpertise ?? []);
  // Bênçãos do Conhecimento: proficiência dobrada nas duas perícias escolhidas
  for (const [k, ids] of Object.entries(char.choices ?? {})) {
    if (k.endsWith('.knowledgeSkills')) ids.forEach((id) => expertiseSet.add(id as SkillKey));
  }
  const skills: DerivedSkill[] = SKILLS.map((sk) => {
    const proficient = skillProfs.has(sk.key);
    const expertise = proficient && expertiseSet.has(sk.key);
    const half = proficient ? null : halfProfFor(sk.ability);
    const bonus = abilities[sk.ability].mod + (expertise ? prof * 2 : proficient ? prof : half?.value ?? 0);
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
  // Investigação/Intuição passivas (10 + bônus; Observador soma +5 na Investigação também)
  const featPassive = feats.reduce((s, f) => s + (f.passivePerceptionBonus ?? 0), 0);
  const investigation = skills.find((s) => s.key === 'investigation')!;
  const insight = skills.find((s) => s.key === 'insight')!;
  const passiveInvestigation = 10 + investigation.bonus + featPassive;
  const passiveInsight = 10 + insight.bonus;

  // ---- Ataques (armas equipadas) ----
  // Crítico Brutal (Bárbaro 9º/13º/17º): dados extras de arma no crítico corpo a corpo
  const barbLv = levelIn('barbarian');
  const brutal = barbLv >= 17 ? 3 : barbLv >= 13 ? 2 : barbLv >= 9 ? 1 : 0;
  const attacks: DerivedAttack[] = [];
  const seen = new Set<string>();
  for (const slot of [char.equipped.mainHand, char.equipped.offHand, char.equipped.ranged]) {
    const it = findEquipped(char, slot);
    if (!it || seen.has(it.uid)) continue;
    seen.add(it.uid);
    const w = resolveItemData(it).weapon;
    if (!w) continue;
    let abilKey: AbilityKey = 'str';
    // Artes Marciais: armas de monge (espada curta e armas simples corpo a corpo sem Duas mãos/Pesada) usam FOR ou DES
    const monkWeapon = monkLv >= 1 && !armor && !char.equipped.shield && w.range === 'melee' &&
      (/espada curta/i.test(it.name) || (w.type === 'simple' && !w.properties.includes('Duas mãos') && !w.properties.includes('Pesada')));
    if (w.range === 'ranged') abilKey = 'dex';
    else if (w.finesse || monkWeapon) abilKey = abilities.dex.mod > abilities.str.mod ? 'dex' : 'str';
    const abilMod = abilities[abilKey].mod;
    const magic = weaponMagicBonus(w);
    const srcType = it.homebrew ? 'homebrew' : 'item';
    // Duelo: arma corpo a corpo numa mão só, sem outra arma empunhada
    const heldWeapons = [char.equipped.mainHand, char.equipped.offHand]
      .map((u) => findEquipped(char, u))
      .filter((x, i, arr) => x && arr.findIndex((y) => y?.uid === x.uid) === i && resolveItemData(x).weapon);
    const dueling =
      styles.has('dueling') && w.range === 'melee' && !w.properties.includes('Duas mãos') && heldWeapons.length === 1;
    const hitBd = breakdown([
      mod('attack', abilMod, ABILITY_LABELS[abilKey], 'ability'),
      mod('attack', prof, 'Bônus de proficiência', 'proficiency'),
      magic ? mod('attack', magic, it.name, srcType, { label: `Mágica +${magic}` }) : null,
      styles.has('archery') && w.range === 'ranged' ? mod('attack', 2, 'Estilo de Luta: Arquearia', 'class') : null,
    ]);
    const bonusDamage = w.bonusDamage && w.bonusDamage.dice > 0
      ? { dice: w.bonusDamage.dice, die: w.bonusDamage.die, type: w.bonusDamage.type }
      : undefined;
    const dmgBd = breakdown(
      [
        mod('damage', abilMod, ABILITY_LABELS[abilKey], 'ability'),
        magic ? mod('damage', magic, it.name, srcType, { label: `Mágica +${magic}` }) : null,
        dueling ? mod('damage', 2, 'Estilo de Luta: Duelo', 'class') : null,
      ],
      `${w.damageDice}d${w.damageDie} ${w.damageType}${bonusDamage ? ` + ${bonusDamage.dice}d${bonusDamage.die} ${bonusDamage.type}` : ''} + modificadores`,
    );
    attacks.push({
      uid: it.uid,
      name: it.name,
      note: `${w.range === 'ranged' ? (w.rangeLabel ?? 'à distância') : 'corpo a corpo'}${w.properties.length ? ' · ' + w.properties.join(', ') : ''}${brutal && w.range === 'melee' ? ` · Crítico Brutal +${brutal} dado${brutal > 1 ? 's' : ''}` : ''}`,
      attackBonus: hitBd.total,
      damageDice: w.damageDice,
      // Artes Marciais: usa o dado do monge se for maior que o da arma
      damageDie: monkWeapon && w.damageDice === 1 ? Math.max(w.damageDie, maDie) : w.damageDie,
      damageBonus: dmgBd.total,
      damageType: w.damageType,
      versatileDie: w.versatileDie,
      bonusDamage,
      critMin,
      critExtraDice: w.range === 'melee' && brutal ? brutal : undefined,
      hitBreakdown: hitBd,
      damageBreakdown: dmgBd,
    });
  }

  // Golpe desarmado do Monge (Artes Marciais): FOR ou DES, dado de artes marciais
  if (monkLv >= 1) {
    const k: AbilityKey = abilities.dex.mod > abilities.str.mod ? 'dex' : 'str';
    const hitBd = breakdown([
      mod('attack', abilities[k].mod, ABILITY_LABELS[k], 'ability'),
      mod('attack', prof, 'Bônus de proficiência', 'proficiency'),
    ]);
    const dmgBd = breakdown([mod('damage', abilities[k].mod, ABILITY_LABELS[k], 'ability')], `1d${maDie} concussão + modificador`);
    attacks.push({
      uid: 'monk-unarmed',
      name: 'Golpe Desarmado',
      note: `corpo a corpo · Artes Marciais (1d${maDie})${monkLv >= 6 ? ' · conta como mágico' : ''} · ação bônus após Atacar`,
      attackBonus: hitBd.total,
      damageDice: 1,
      damageDie: maDie,
      damageBonus: dmgBd.total,
      damageType: 'concussão',
      critMin,
      hitBreakdown: hitBd,
      damageBreakdown: dmgBd,
    });
  }

  // ---- Conjuração ----
  // conjura pela classe ou pela subclasse (Cavaleiro Arcano / Trapaceiro Arcano → INT)
  const caster = casterOf(char);
  const isCaster = !!caster && Object.keys(caster.slots).length > 0;
  // atributo de conjuração pode diferir do primário (ex.: Patrulheiro → SAB)
  const castAbility = caster?.ability ?? cls.spellAbility ?? cls.prim;
  const castMod = abilities[castAbility].mod;
  const dcBd = isCaster
    ? breakdown([
        mod('spellDC', 8, 'Base', 'base'),
        mod('spellDC', prof, 'Bônus de proficiência', 'proficiency'),
        mod('spellDC', castMod, ABILITY_LABELS[castAbility], 'ability'),
      ])
    : undefined;
  const atkBd = isCaster
    ? breakdown([
        mod('spellAttack', prof, 'Bônus de proficiência', 'proficiency'),
        mod('spellAttack', castMod, ABILITY_LABELS[castAbility], 'ability'),
      ])
    : undefined;

  // ---- Sentidos, idiomas, resistências (origem rastreável) ----
  const darkRange = Math.max(subrace?.darkvision ?? 0, race.darkvision ?? 0);
  const darkvision = darkRange
    ? { range: darkRange, source: subrace?.darkvision && subrace.darkvision >= (race.darkvision ?? 0) ? subrace.label : race.label }
    : null;
  const languages = Array.from(
    new Set([
      ...(race.languages ?? ['Comum']),
      ...(subBonus?.languages ?? []),
      ...(char.extraLanguages ?? []),
      ...Object.entries(char.choices ?? {}).filter(([k]) => k.endsWith('.knowledgeLanguages')).flatMap(([, v]) => v),
    ]),
  );
  const resistances = [
    ...(race.resistances ?? []).map((value) => ({ value, source: race.label })),
    ...(subrace?.resistances ?? []).map((value) => ({ value, source: subrace!.label })),
    ...(subBonus?.resistances ?? []).map((value) => ({ value, source: subclass!.label })),
    // Acostumado à Morte-Vida (Necromante 10º) e Avatar da Batalha (Guerra 17º)
    ...(char.subclassId === 'necromancy' && levelIn('wizard') >= 10 ? [{ value: 'necrótico', source: 'Acostumado à Morte-Vida' }] : []),
    ...(char.subclassId === 'war' && levelIn('cleric') >= 17 ? [{ value: 'concussão, cortante e perfurante (armas não mágicas)', source: 'Avatar da Batalha' }] : []),
  ];
  const grantedProficiencies = subBonus?.proficiencies ?? [];

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
    passiveInvestigation,
    passiveInsight,
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
    grantedProficiencies,
    critMin,
    subclassLabel: subclass?.label ?? null,
  };
}
