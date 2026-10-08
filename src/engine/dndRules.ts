import type { AbilityKey, MagicEffects, SkillKey } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import type { Character, InventoryItem } from '@/types/character';
import { abilityModifier, proficiencyBonus, raceChoiceBonus, totalAbilities } from './modifiers';
import { getClass } from '@/data/classes';
import { getSubrace, raceOf } from '@/data/races';
import { getBackground } from '@/data/backgrounds';
import { getSubclass } from '@/data/subclasses';
import { getFeat } from '@/data/feats';
import { SKILLS, ABILITY_LABELS } from '@/data/skills';
import { getItem } from '@/data/items';
import { casterOf } from './spellcasting';
import { itemIsActive } from './inventory';
import { averageHp, ABILITY_CAP } from './levelUp';
import type { Breakdown, Modifier } from './effects';
import { breakdown, mod } from './effects';
import { languagePicks, languagesLeftText, raceSkillProfs } from './originChoices';
import { isArmorProficient, isWeaponProficient, proficienciesOf, proficiencySummary } from './proficiencies';

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
  /** Motivo de desvantagem automática (armadura, exaustão, condição). */
  disadvantage?: string;
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
  /** Corpo a corpo ou à distância (golpes desarmados contam como corpo a corpo). */
  range?: 'melee' | 'ranged';
  /** Atributo usado no ataque (Fúria só vale com FOR). */
  ability?: AbilityKey;
  /** Arma com Acuidade (Ataque Furtivo exige acuidade ou distância). */
  finesse?: boolean;
  /** Ataque com ARMA (não golpe desarmado/garras) — Furtivo/Destruição Divina/Marca. */
  weapon?: boolean;
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
  /** Proficiências com armaduras e armas (classe, multiclasse, subclasse, raça, talentos). */
  weaponArmorProfs: { armor: string; weapons: string };
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
  // item do catálogo: efeitos novos do catálogo valem também para cópias antigas já na mochila
  const magic = !it.homebrew && base?.magic ? { ...base.magic, ...it.magic } : it.magic ?? base?.magic;
  return {
    weapon: it.weapon ?? base?.weapon,
    armor: it.armor ?? base?.armor,
    acBonus: it.acBonus ?? base?.acBonus,
    magic,
    attunement: it.attunement ?? base?.attunement,
  };
}

/**
 * Itens mágicos valendo agora: os que pedem sintonia só sintonizados; os
 * outros só se estão com o personagem (no Baú não contam).
 */
function activeMagicItems(char: Character): { name: string; magic: MagicEffects }[] {
  const out: { name: string; magic: MagicEffects }[] = [];
  const seen = new Set<string>();
  for (const it of char.inventory) {
    const d = resolveItemData(it);
    if (!d.magic) continue;
    const on = itemIsActive(char, it, !!d.attunement);
    // o mesmo item mágico duas vezes não soma o efeito duas vezes (DMG: efeitos iguais não se acumulam)
    if (on && !seen.has(sameItemKey(it))) {
      seen.add(sameItemKey(it));
      out.push({ name: it.name, magic: d.magic });
    }
  }
  return out;
}

/** Chave de "mesmo item": catálogo (sem o +N) ou o nome. */
function sameItemKey(it: InventoryItem): string {
  return it.itemId ? it.itemId.replace(/-plus[123]$/, '') : it.name.trim().toLowerCase();
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
  const race = raceOf(char);
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

  const magicItems = activeMagicItems(char);
  const profs = proficienciesOf(char);
  // ---- Atributos: base + raça + sub-raça + ASI/talentos (teto 20) ----
  const raceTotals = totalAbilities(char.baseAbilities, char.raceId, char.subraceId, char.raceAbilityChoice, char.customOrigin?.asi);
  const raceChoice = raceChoiceBonus(char.raceId, char.raceAbilityChoice);
  const customAsi = char.customOrigin?.asi ?? null;
  const abilityBreakdowns = {} as Record<AbilityKey, Breakdown>;
  const abilities = {} as Record<AbilityKey, DerivedAbility>;
  const abilityList: DerivedAbility[] = ABILITY_KEYS.map((key) => {
    const asi = char.asiBonuses?.[key] ?? 0;
    const primal = primalChampion && (key === 'str' || key === 'con') ? 4 : 0;
    const cap = primal ? 24 : ABILITY_CAP;
    const raw = Math.min(ABILITY_CAP, raceTotals[key] + asi) + primal;
    const natural = Math.min(cap, raw);
    // Cinto Anão, Pedras Ioun…: +N no atributo até um teto (acima do teto não sobe nem desce)
    let boosted = natural;
    const addParts: Modifier[] = [];
    for (const m of magicItems) {
      const add = m.magic.addAbility?.[key];
      if (!add) continue;
      const next = Math.max(boosted, Math.min(add.max, boosted + add.bonus));
      if (next > boosted) addParts.push(mod(key, next - boosted, m.name, 'item', { label: `+${add.bonus} (máx. ${add.max})` }));
      boosted = next;
    }
    // Manoplas do Ogro, Amuleto da Saúde, Cintos de Gigante…: o atributo PASSA a valer X
    const setBy = magicItems
      .filter((m) => (m.magic.setAbility?.[key] ?? 0) > boosted)
      .sort((a, b) => b.magic.setAbility![key]! - a.magic.setAbility![key]!)[0];
    const total = setBy ? setBy.magic.setAbility![key]! : boosted;
    const bd = breakdown(
      [
        mod(key, char.baseAbilities[key], 'Valores de criação', 'base'),
        ...(customAsi
          ? [mod(key, customAsi[key] ?? 0, race.label, 'race', { label: 'origem personalizada (Tasha)' })]
          : [
              mod(key, race.abilityBonus[key] ?? 0, race.label, 'race'),
              subrace ? mod(key, subrace.abilityBonus?.[key] ?? 0, subrace.label, 'subrace') : null,
              race.abilityChoice ? mod(key, raceChoice[key] ?? 0, race.label, 'race', { label: 'atributo à escolha' }) : null,
            ]),
        asi ? mod(key, asi, 'Aumentos de nível', 'asi') : null,
        primal ? mod(key, primal, 'Campeão Primal', 'class', { label: 'Bárbaro 20º (teto 24)' }) : null,
        ...(setBy ? [] : addParts),
        setBy ? mod(key, total - natural, setBy.name, 'item', { label: `atributo passa a ${total}` }) : null,
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

  // Anel/Manto de Proteção, Pedra da Sorte…: + em todas as salvaguardas
  const saveMagic = magicItems.reduce((n, m) => n + (m.magic.saves ?? 0), 0);
  if (saveMagic) for (const a of abilityList) a.save += saveMagic;

  const dexMod = abilities.dex.mod;
  const conMod = abilities.con.mod;

  // ---- CA: armadura (com teto de DES) + escudo + itens sintonizados ----
  const armorItem = findEquipped(char, char.equipped.armor);
  // opções de CA sem armadura: a melhor vale (não acumulam)
  const featUnarmored = feats.find((f) => f.unarmoredAC);
  const spellEffects = char.combat.spellEffects ?? [];
  const mageArmor = spellEffects.find((e) => e.acBase);
  const altSources = [
    subBonus?.unarmoredAC ? { ...subBonus.unarmoredAC, source: subclass!.label, sourceType: 'subclass' as 'subclass' | 'feat' | 'spell' | 'item' } : null,
    featUnarmored ? { ...featUnarmored.unarmoredAC!, source: featUnarmored.label, sourceType: 'feat' as const } : null,
    // Armadura Arcana: CA base 13 + DES sem armadura
    mageArmor ? { base: mageArmor.acBase!, ability: 'dex' as AbilityKey, source: mageArmor.name, sourceType: 'spell' as const } : null,
    // Manto do Arquimago: CA base 15 + DES sem armadura
    ...magicItems.map((m) => (m.magic.unarmoredAC ? { ...m.magic.unarmoredAC, source: m.name, sourceType: 'item' as const } : null)),
  ]
    .filter((x): x is NonNullable<typeof x> => !!x)
    .map((x) => ({ ...x, total: x.base + abilities[x.ability].mod }));
  const unarmoredAlt = altSources.sort((a, b) => b.total - a.total)[0];
  // Defesa sem Armadura vem da classe que a concede (na multiclasse, a primeira obtida; não acumula)
  const unarmoredClass =
    char.classId === 'barbarian' || char.classId === 'monk' ? char.classId
    : levelIn('barbarian') ? 'barbarian'
    : levelIn('monk') ? 'monk'
    : null;
  const classUnarmored =
    unarmoredClass === 'barbarian' ? 10 + dexMod + conMod
    : unarmoredClass === 'monk' && !char.equipped.shield ? 10 + dexMod + abilities.wis.mod
    : 10 + dexMod;
  const armor = armorItem ? resolveItemData(armorItem).armor : undefined;
  const acParts = [];
  let acNote: string | undefined;
  if (armor && armorItem) {
    acParts.push(mod('ac', armor.baseAC, armorItem.name, 'item', { label: 'CA base da armadura' }));
    if (armor.magicBonus) acParts.push(mod('ac', Math.min(3, armor.magicBonus), armorItem.name, 'item', { label: `armadura mágica +${Math.min(3, armor.magicBonus)}` }));
    if (armor.addDex) {
      // Mestre em Armadura Média: teto de DES +3 em armadura média
      const dexCap = typeof armor.maxDexBonus === 'number' && armor.category === 'média' && feats.some((f) => f.id === 'medium-armor-master') ? 3 : armor.maxDexBonus;
      const cap = typeof dexCap === 'number' ? Math.min(dexMod, dexCap) : dexMod;
      acParts.push(mod('ac', cap, 'Destreza', 'ability', { label: 'modificador de DES' }));
      if (typeof dexCap === 'number' && dexMod > dexCap) {
        acNote = `armadura ${armor.category} limita DES a +${dexCap}`;
      }
    } else {
      acNote = 'armadura pesada não soma Destreza';
    }
  } else if (unarmoredAlt && unarmoredAlt.total >= classUnarmored) {
    // CA sem armadura alternativa: subclasse (Resiliência Dracônica) ou talento (Couro Dracônico) = 13 + DES
    const u = unarmoredAlt;
    acParts.push(mod('ac', u.base, u.source, u.sourceType, { label: 'CA sem armadura' }));
    acParts.push(mod('ac', abilities[u.ability].mod, ABILITY_LABELS[u.ability], 'ability', { label: `modificador de ${u.ability.toUpperCase()}` }));
  } else {
    acParts.push(mod('ac', 10, 'Sem armadura', 'base'));
    acParts.push(mod('ac', dexMod, 'Destreza', 'ability', { label: 'modificador de DES' }));
    // Defesa sem Armadura (PHB 2014): Bárbaro soma CON; Monge soma SAB
    // (o Monge perde o traço se usar escudo; o Bárbaro pode usar escudo).
    if (unarmoredClass === 'barbarian') {
      acParts.push(mod('ac', conMod, 'Constituição', 'ability', { label: 'Defesa sem Armadura' }));
    } else if (unarmoredClass === 'monk' && !char.equipped.shield) {
      acParts.push(mod('ac', abilities.wis.mod, 'Sabedoria', 'ability', { label: 'Defesa sem Armadura' }));
    }
  }
  const shieldItem = findEquipped(char, char.equipped.shield);
  // sem proficiência: a CA vale, mas há desvantagem em FOR/DES e não conjura (PHB 2014, cap. 5)
  const armorUntrained = [
    armor && !isArmorProficient(profs, armor.category) ? `armadura ${armor.category}` : '',
    shieldItem && !isArmorProficient(profs, 'escudo') ? 'escudo' : '',
  ].filter(Boolean);
  if (armorUntrained.length) {
    const warn = `sem proficiência (${armorUntrained.join(' e ')}): desvantagem em testes, salvaguardas e ataques de FOR e DES, e não conjura magias`;
    acNote = acNote ? `${acNote} · ${warn}` : warn;
  }
  if (shieldItem) {
    const bonus = resolveItemData(shieldItem).acBonus ?? 0;
    if (bonus) acParts.push(mod('ac', bonus, shieldItem.name, 'item', { label: 'escudo' }));
  }
  // anéis com bônus de CA (Anel de Proteção): vestidos e sintonizados; dois iguais não somam
  const ringSeen = new Set<string>();
  for (const it of char.inventory) {
    if (it.category !== 'ring') continue;
    const data = resolveItemData(it);
    if (!data.acBonus || !itemIsActive(char, it, !!data.attunement) || ringSeen.has(sameItemKey(it))) continue;
    ringSeen.add(sameItemKey(it));
    acParts.push(mod('ac', data.acBonus, it.name, it.homebrew ? 'homebrew' : 'item'));
  }
  // Combatente com Duas Armas: +1 de CA com uma arma corpo a corpo em cada mão
  const offHandItem = findEquipped(char, char.equipped.offHand);
  if (offHandItem && findEquipped(char, char.equipped.mainHand) && feats.some((f) => f.id === 'dual-wielder')) {
    acParts.push(mod('ac', 1, 'Combatente com Duas Armas', 'feat', { label: 'uma arma em cada mão' }));
  }
  for (const m of magicItems) {
    if (!m.magic.ac) continue;
    // Braçadeiras de Defesa: só sem armadura e sem escudo
    if (m.magic.unarmoredOnly && (armor || shieldItem)) continue;
    acParts.push(mod('ac', m.magic.ac, m.name, 'item', { label: 'item mágico' }));
  }
  if (subBonus?.acBonus) acParts.push(mod('ac', subBonus.acBonus, subclass!.label, 'subclass'));
  // Estilo de Luta (Guerreiro 1º, Paladino/Patrulheiro 2º, Campeão 10º) — escolhido na aba Evoluir
  const styles = new Set(
    Object.entries(char.choices ?? {})
      .filter(([k]) => k.endsWith('.fightingStyle'))
      .flatMap(([, ids]) => ids),
  );
  if (styles.has('defense') && armor) acParts.push(mod('ac', 1, 'Estilo de Luta: Defesa', 'class', { label: 'usando armadura' }));
  // magias ativas: Escudo (+5), Escudo da Fé (+2), Acelerar (+2)…
  for (const e of spellEffects) if (e.ac) acParts.push(mod('ac', e.ac, e.name, 'spell'));
  let acBd = breakdown(acParts, acNote);
  // Pele de Árvore: a CA não fica abaixo de 16
  const acFloor = spellEffects.filter((e) => e.acMin).sort((a, b) => b.acMin! - a.acMin!)[0];
  if (acFloor && acBd.total < acFloor.acMin!) {
    acBd = breakdown([...acParts, mod('ac', acFloor.acMin! - acBd.total, acFloor.name, 'spell', { label: `CA mínima ${acFloor.acMin}` })], acNote);
  }

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
    hpParts.push(mod('hp', subrace.hpPerLevel * char.level, subrace.label, 'subrace', { label: subrace.traits?.[0] ?? 'Vida extra' }));
  }
  for (const f of feats) {
    if (f.hpPerLevel) hpParts.push(mod('hp', f.hpPerLevel * char.level, f.label, 'feat'));
  }
  if (subBonus?.hpPerLevel) {
    hpParts.push(mod('hp', subBonus.hpPerLevel * char.level, subclass!.label, 'subclass', { label: 'PV por nível' }));
  }
  // Auxílio: +5 de PV máximo por círculo acima do 1º
  for (const e of spellEffects) if (e.maxHp) hpParts.push(mod('hp', e.maxHp, e.name, 'spell'));
  // Machado do Berserker: +1 PV máximo por nível enquanto sintonizado
  for (const m of magicItems) if (m.magic.hpPerLevel) hpParts.push(mod('hp', m.magic.hpPerLevel * char.level, m.name, 'item', { label: 'PV por nível' }));
  // Exaustão 4+ (PHB 2014): PV máximo pela metade
  const exhaustion = char.combat?.exhaustion ?? 0;
  if (exhaustion >= 4) {
    const before = breakdown(hpParts).total;
    hpParts.push(mod('hp', -Math.ceil(before / 2), 'Exaustão', 'base', { label: `nível ${exhaustion}: PV máximo pela metade` }));
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
    ...magicItems.map((m) => (m.magic.speed ? mod('speed', m.magic.speed, m.name, 'item', { unit: 'm' }) : null)),
    ...spellEffects.map((e) => (e.speed ? mod('speed', e.speed, e.name, 'spell', { unit: 'm' }) : null)),
    // armadura pesada sem a Força exigida: −3 m (anões não perdem deslocamento)
    armor?.strReq && abilities.str.total < armor.strReq && char.raceId !== 'dwarf'
      ? mod('speed', -3, armorItem!.name, 'item', { unit: 'm', label: `exige FOR ${armor.strReq}` })
      : null,
  ]);
  // Acelerar: deslocamento dobrado (depois de todos os bônus)
  const hasted = spellEffects.find((e) => e.speedDouble);
  if (hasted) {
    speedBd.parts.push(mod('speed', speedBd.total, hasted.name, 'spell', { unit: 'm', label: 'deslocamento dobrado' }));
    speedBd.total *= 2;
  }
  // Exaustão 2: metade do deslocamento; 5: zero. Condições que prendem: zero.
  const stuck = (char.combat?.conditions ?? []).find((x) => ['Agarrado', 'Impedido', 'Restringido', 'Atordoado', 'Paralisado', 'Petrificado', 'Inconsciente'].includes(x));
  if (stuck || exhaustion >= 5) {
    speedBd.parts.push(mod('speed', -speedBd.total, stuck ?? 'Exaustão', 'base', { unit: 'm', label: stuck ? 'condição: deslocamento 0' : `exaustão ${exhaustion}: deslocamento 0` }));
    speedBd.total = 0;
  } else if (exhaustion >= 2) {
    const half = speedBd.total / 2;
    speedBd.parts.push(mod('speed', half - speedBd.total, 'Exaustão', 'base', { unit: 'm', label: `nível ${exhaustion}: metade do deslocamento` }));
    speedBd.total = half;
  }

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
  // Pedra da Sorte: + em todo teste de atributo (iniciativa e perícias também)
  const checkItems = magicItems.filter((m) => m.magic.checks);
  const checkMagic = checkItems.reduce((n, m) => n + m.magic.checks!, 0);
  const initBd = breakdown([
    mod('initiative', dexMod, 'Destreza', 'ability', { label: 'modificador de DES' }),
    initHalf ? mod('initiative', initHalf.value, initHalf.label, 'class', { label: 'meia proficiência' }) : null,
    ...feats.map((f) => (f.initiativeBonus ? mod('initiative', f.initiativeBonus, f.label, 'feat') : null)),
    subBonus?.initiativeBonus ? mod('initiative', subBonus.initiativeBonus, subclass!.label, 'subclass') : null,
    ...checkItems.map((m) => mod('initiative', m.magic.checks!, m.name, 'item', { label: 'testes de atributo' })),
  ]);

  // ---- Perícias (proficiências: escolhas + antecedente + raça; expertise dobra) ----
  const skillProfs = new Set<SkillKey>([...char.skillProfs, ...bg.skills, ...raceSkillProfs(char)]);
  // perícias vindas de escolhas de classe: Colégio do Conhecimento (3) e Influência Enganadora
  for (const [k, ids] of Object.entries(char.choices ?? {})) {
    if (/\.(loreSkills|knowledgeSkills|natureSkill|squatSkill|prodigySkill|skillExpertSkill)$/.test(k)) ids.forEach((id) => skillProfs.add(id as SkillKey));
    if (k.endsWith('.invocation') && ids.includes('beguilingInfluence')) {
      skillProfs.add('deception');
      skillProfs.add('persuasion');
    }
  }
  // condições que dão desvantagem em testes de atributo (Envenenado, Amedrontado)
  const checkCondition = (char.combat?.conditions ?? []).find((x) => x === 'Envenenado' || x === 'Amedrontado');
  const expertiseSet = new Set<SkillKey>(char.skillExpertise ?? []);
  // Bênçãos do Conhecimento: proficiência dobrada nas duas perícias escolhidas
  for (const [k, ids] of Object.entries(char.choices ?? {})) {
    if (k.endsWith('.knowledgeSkills')) ids.forEach((id) => expertiseSet.add(id as SkillKey));
  }
  const skills: DerivedSkill[] = SKILLS.map((sk) => {
    const proficient = skillProfs.has(sk.key);
    const expertise = proficient && expertiseSet.has(sk.key);
    const half = proficient ? null : halfProfFor(sk.ability);
    const bonus = abilities[sk.ability].mod + (expertise ? prof * 2 : proficient ? prof : half?.value ?? 0) + checkMagic;
    const disadvantage =
      exhaustion >= 1 ? 'exaustão'
      : checkCondition ? checkCondition.toLowerCase()
      : sk.key === 'stealth' && armor?.stealthDisadvantage && !(armor.category === 'média' && feats.some((f) => f.id === 'medium-armor-master')) ? 'armadura atrapalha a furtividade'
      : armorUntrained.length && (sk.ability === 'str' || sk.ability === 'dex') ? 'armadura sem proficiência'
      : undefined;
    return { key: sk.key, label: sk.label, ability: sk.ability, bonus, proficient, expertise, disadvantage };
  });
  const perception = skills.find((s) => s.key === 'perception')!;
  const ppBd = breakdown([
    mod('pp', 10, 'Base', 'base'),
    mod('pp', abilities.wis.mod, 'Sabedoria', 'ability'),
    perception.proficient
      ? mod('pp', perception.expertise ? prof * 2 : prof, perception.expertise ? 'Percepção com expertise (×2)' : 'Percepção proficiente', 'proficiency')
      : null,
    ...feats.map((f) => (f.passivePerceptionBonus ? mod('pp', f.passivePerceptionBonus, f.label, 'feat') : null)),
    ...checkItems.map((m) => mod('pp', m.magic.checks!, m.name, 'item')),
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
    // só soma proficiência se o personagem for treinado na arma (Artes Marciais conta como treino)
    const weaponProf = monkWeapon || isWeaponProficient(profs, it, w.type, w.range);
    const hitBd = breakdown([
      mod('attack', abilMod, ABILITY_LABELS[abilKey], 'ability'),
      weaponProf ? mod('attack', prof, 'Bônus de proficiência', 'proficiency') : null,
      magic ? mod('attack', magic, it.name, srcType, { label: `Mágica +${magic}` }) : null,
      styles.has('archery') && w.range === 'ranged' ? mod('attack', 2, 'Estilo de Luta: Arquearia', 'class') : null,
    ]);
    const bonusDamage = w.bonusDamage && w.bonusDamage.dice > 0
      ? { dice: w.bonusDamage.dice, die: w.bonusDamage.die, type: w.bonusDamage.type }
      : undefined;
    // mão secundária (luta com duas armas, ação bônus): sem o atributo no dano,
    // a não ser negativo ou com o Estilo de Luta com Duas Armas
    const offHand = it.uid === char.equipped.offHand && it.uid !== char.equipped.mainHand;
    const dmgAbil = offHand && abilMod > 0 && !styles.has('twf') ? 0 : abilMod;
    const dmgBd = breakdown(
      [
        dmgAbil ? mod('damage', dmgAbil, ABILITY_LABELS[abilKey], 'ability') : null,
        magic ? mod('damage', magic, it.name, srcType, { label: `Mágica +${magic}` }) : null,
        dueling ? mod('damage', 2, 'Estilo de Luta: Duelo', 'class') : null,
      ],
      `${w.damageDice}d${w.damageDie} ${w.damageType}${bonusDamage ? ` + ${bonusDamage.dice}d${bonusDamage.die} ${bonusDamage.type}` : ''} + modificadores`,
    );
    attacks.push({
      uid: it.uid,
      name: it.name,
      note: `${offHand ? 'mão secundária · ação bônus · ' : ''}${weaponProf ? '' : 'sem proficiência · '}${w.range === 'ranged' ? (w.rangeLabel ?? 'à distância') : 'corpo a corpo'}${w.properties.length ? ' · ' + w.properties.join(', ') : ''}${brutal && w.range === 'melee' ? ` · Crítico Brutal +${brutal} dado${brutal > 1 ? 's' : ''}` : ''}`,
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
      range: w.range,
      ability: abilKey,
      finesse: !!w.finesse,
      weapon: true,
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
      range: 'melee',
      ability: k,
      hitBreakdown: hitBd,
      damageBreakdown: dmgBd,
    });
  }

  // Couro Dracônico (XGE): garras retráteis — golpe desarmado de 1d4 + FOR cortante
  if (feats.some((f) => f.id === 'dragon-hide') && monkLv < 1) {
    const hitBd = breakdown([mod('attack', abilities.str.mod, ABILITY_LABELS.str, 'ability'), mod('attack', prof, 'Bônus de proficiência', 'proficiency')]);
    const dmgBd = breakdown([mod('damage', abilities.str.mod, ABILITY_LABELS.str, 'ability')], '1d4 cortante + FOR');
    attacks.push({
      uid: 'dragon-claws',
      name: 'Garras Dracônicas',
      note: 'corpo a corpo · golpe desarmado (Couro Dracônico)',
      attackBonus: hitBd.total,
      damageDice: 1,
      damageDie: 4,
      damageBonus: dmgBd.total,
      damageType: 'cortante',
      critMin,
      range: 'melee',
      ability: 'str',
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
        ...magicItems.map((m) => (m.magic.spellDC ? mod('spellDC', m.magic.spellDC, m.name, 'item') : null)),
      ])
    : undefined;
  const atkBd = isCaster
    ? breakdown([
        mod('spellAttack', prof, 'Bônus de proficiência', 'proficiency'),
        mod('spellAttack', castMod, ABILITY_LABELS[castAbility], 'ability'),
        ...magicItems.map((m) => (m.magic.spellAttack ? mod('spellAttack', m.magic.spellAttack, m.name, 'item') : null)),
      ])
    : undefined;

  // ---- Sentidos, idiomas, resistências (origem rastreável) ----
  const darkRange = Math.max(subrace?.darkvision ?? 0, race.darkvision ?? 0);
  const darkvision = darkRange
    ? { range: darkRange, source: subrace?.darkvision && subrace.darkvision >= (race.darkvision ?? 0) ? subrace.label : race.label }
    : null;
  // "1 idioma à escolha" (raça/sub-raça) e os do antecedente viram escolhas reais
  const langPicks = languagePicks(char);
  const languages = Array.from(
    new Set([
      ...langPicks.fixed,
      ...(subBonus?.languages ?? []),
      ...(char.extraLanguages ?? []),
      ...Object.entries(char.choices ?? {}).filter(([k]) => /\.(knowledgeLanguages|prodigyLanguage)$/.test(k)).flatMap(([, v]) => v),
      ...feats.flatMap((f) => f.languages ?? []),
      ...(langPicks.left ? [languagesLeftText(langPicks.left)] : []),
    ]),
  );
  const resistances = [
    ...(race.resistances ?? []).map((value) => ({ value, source: race.label })),
    ...(subrace?.resistances ?? []).map((value) => ({ value, source: subrace!.label })),
    ...(subBonus?.resistances ?? []).map((value) => ({ value, source: subclass!.label })),
    ...feats.flatMap((f) => (f.resistances ?? []).map((value) => ({ value, source: f.label }))),
    ...magicItems.flatMap((m) => (m.magic.resistances ?? []).map((value) => ({ value, source: m.name }))),
    // Acostumado à Morte-Vida (Necromante 10º) e Avatar da Batalha (Guerra 17º)
    ...(char.subclassId === 'necromancy' && levelIn('wizard') >= 10 ? [{ value: 'necrótico', source: 'Acostumado à Morte-Vida' }] : []),
    ...(char.subclassId === 'war' && levelIn('cleric') >= 17 ? [{ value: 'concussão, cortante e perfurante (armas não mágicas)', source: 'Avatar da Batalha' }] : []),
  ];
  const grantedProficiencies = subBonus?.proficiencies ?? [];

  // parte do corpo (olho, braço…) não conta como carga
  const carriedWeight = char.inventory.reduce((sum, it) => (it.wear === 'body' ? sum : sum + it.weight * it.quantity), 0);

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
    weaponArmorProfs: proficiencySummary(profs),
    critMin,
    subclassLabel: subclass?.label ?? null,
  };
}
