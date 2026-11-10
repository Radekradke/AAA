import type { Character } from '@/types/character';
import type { AbilityKey, SkillKey } from '@/types/dnd';
import { CLASSES, getClass } from '@/data/classes';
import { RACES, getSubraces, raceOf } from '@/data/races';
import { BACKGROUNDS, getBackground } from '@/data/backgrounds';
import { SKILLS } from '@/data/skills';
import { getSpell, SPELLS } from '@/data/spells';
import { getSubclass, subclassesFor } from '@/data/subclasses';
import { randomName } from '@/data/names';
import { ALIGNMENTS } from './simpleSheet';
import { applyChoicePicks, catalogFor, chosenFor, creationChoices, pendingChoices } from './classChoices';
import { grantChoiceEffects } from './choiceEffects';
import { languagePicks, skillBudget } from './originChoices';
import { expertiseSlots, subclassLevelFor } from './levelUp';
import { applySelection, defaultSelection } from './loadout';
import { suggestCreationSpells } from './creationSpells';
import { autoTrail, finalizeWithTrail } from './levelTrail';
import { createDraftCharacter, finalizeCharacter } from './characterBuilder';
import { deriveCharacter } from './dndRules';
import { casterForClass, casterProfiles, changeSpellSelection, spellSelectionOf } from './spellcasting';
import { learnBlock, spellLearnState } from './spellRules';

/**
 * Herói rápido ("me dá um nível 3 jogável agora"): sorteia raça, classe,
 * antecedente e nome coerentes, faz as escolhas do 1º nível pelas regras da
 * criação, sobe pela Trilha de níveis (os planos da aba Evoluir) e completa
 * as magias até o que o nível permite. Com a mesma semente, sai o mesmo herói.
 */
export type QuickStyle = 'guardian' | 'mage' | 'explorer';

export interface QuickOptions {
  level: number;
  classId?: string;
  style?: QuickStyle;
  seed: number;
}

export const QUICK_STYLES: { id: QuickStyle; label: string; classes: string[] }[] = [
  { id: 'guardian', label: 'Proteger e resistir', classes: ['fighter', 'paladin', 'barbarian'] },
  { id: 'mage', label: 'Usar magia', classes: ['wizard', 'sorcerer', 'warlock', 'cleric', 'druid', 'bard'] },
  { id: 'explorer', label: 'Explorar em silêncio', classes: ['rogue', 'ranger', 'monk'] },
];

const BG_FOR: Record<string, string[]> = {
  barbarian: ['outlander', 'folk-hero', 'soldier'], bard: ['entertainer', 'noble', 'charlatan'], cleric: ['acolyte', 'sage', 'hermit'],
  druid: ['hermit', 'outlander', 'folk-hero'], fighter: ['soldier', 'folk-hero', 'noble'], monk: ['hermit', 'acolyte', 'urchin'],
  paladin: ['noble', 'acolyte', 'soldier'], ranger: ['outlander', 'folk-hero', 'sailor'], rogue: ['criminal', 'urchin', 'charlatan'],
  sorcerer: ['noble', 'hermit', 'sage'], warlock: ['charlatan', 'hermit', 'sage'], wizard: ['sage', 'hermit', 'guild-artisan'],
};
const LANGS = ['Élfico', 'Anão', 'Goblin', 'Dracônico', 'Halfling', 'Orc', 'Gigante', 'Gnômico', 'Celestial', 'Silvestre'];

/** Gerador com semente (mulberry32): o mesmo número, o mesmo herói. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pickOne = <T,>(list: T[], rand: () => number) => list[Math.floor(rand() * list.length)];
const shuffle = <T,>(list: T[], rand: () => number) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Quanto a raça/sub-raça soma no atributo principal da classe (para sortear raças que combinam). */
function fit(raceId: string, subraceId: string | null, prim: AbilityKey): number {
  const race = RACES.find((r) => r.id === raceId)!;
  const sub = getSubraces(raceId).find((s) => s.id === subraceId);
  return (race.abilityBonus[prim] ?? 0) + (sub?.abilityBonus?.[prim] ?? 0) + (race.abilityChoice && !race.abilityChoice.exclude?.includes(prim) ? 1 : 0);
}

/** Completa as magias conhecidas/preparadas até o limite do nível, uma a uma, pelas regras de aprendizado. */
export function fillSpells(c: Character, rand: () => number): void {
  for (const profile of casterProfiles(c)) {
    const classId = profile.classId;
    const d = deriveCharacter(c);
    const ability = casterForClass(c, classId)?.ability ?? getClass(classId).spellAbility ?? getClass(classId).prim;
    const mod = d.abilities[ability].mod;
    const listClass = casterForClass(c, classId, mod)?.listClass ?? classId;
    const isWizard = casterForClass(c, classId, mod)?.kind === 'spellbook';
    // os círculos mais altos primeiro: um herói de nível alto usa o que tem de melhor
    const pool = shuffle(SPELLS.filter((s) => (s.classes ?? []).includes(listClass as never) && !s.homebrew), rand).sort((a, b) => b.level - a.level);
    for (const sp of pool) {
      const st = spellLearnState(c, mod, classId);
      if (!st) break;
      const sel = spellSelectionOf(c, classId);
      if (sel.preparedSpells.includes(sp.id) || sel.knownSpells.includes(sp.id)) continue;
      if (learnBlock(c, st, sp, 'class')) continue;
      const field: 'knownSpells' | 'preparedSpells' = isWizard && sp.level >= 1 ? 'knownSpells' : 'preparedSpells';
      changeSpellSelection(c, classId, (s) => { s[field] = [...s[field], sp.id]; });
    }
    // mago: prepara do grimório até o limite (INT + nível)
    if (isWizard) {
      const book = shuffle(spellSelectionOf(c, classId).knownSpells, rand).sort((a, b) => (getSpell(b)?.level ?? 0) - (getSpell(a)?.level ?? 0));
      for (const id of book) {
        const st = spellLearnState(c, mod, classId);
        if (!st?.prepared || st.prepared.have >= st.prepared.max) break;
        if (spellSelectionOf(c, classId).preparedSpells.includes(id)) continue;
        changeSpellSelection(c, classId, (s) => { s.preparedSpells = [...s.preparedSpells, id]; });
      }
    }
  }
}

export interface QuickHero {
  char: Character;
  summary: { name: string; race: string; className: string; subclass: string | null; level: number; hp: number; ac: number; attack: string | null; spells: string[] };
}

export function quickHero(ownerId: string, opts: QuickOptions): QuickHero {
  const rand = seeded(opts.seed);
  const level = Math.max(1, Math.min(20, Math.round(opts.level)));
  const styleClasses = QUICK_STYLES.find((s) => s.id === opts.style)?.classes;
  const classId = opts.classId && CLASSES.some((c) => c.id === opts.classId) ? opts.classId : pickOne(styleClasses ?? CLASSES.map((c) => c.id), rand);
  const prim = getClass(classId).prim;

  // raça e sub-raça que somam no atributo principal (sem isso, qualquer uma)
  const combos = RACES.filter((r) => !r.homebrew).flatMap((r) => {
    const subs = getSubraces(r.id);
    return subs.length ? subs.map((s) => ({ raceId: r.id, subraceId: s.id as string | null })) : [{ raceId: r.id, subraceId: null }];
  });
  const good = combos.filter((x) => fit(x.raceId, x.subraceId, prim) >= 1);
  const { raceId, subraceId } = pickOne(good.length ? good : combos, rand);
  const backgroundId = pickOne((BG_FOR[classId] ?? BACKGROUNDS.map((b) => b.id)).filter((id) => BACKGROUNDS.some((b) => b.id === id)), rand);
  const gender = rand() < 0.5 ? 'masc' : 'fem';

  const d = createDraftCharacter({ ownerId, classId, raceId, backgroundId, gender, name: randomName(raceId, gender, rand) });
  d.subraceId = subraceId;
  const race = raceOf(d);
  if (race.abilityChoice) {
    const options = classAbilityPicks(classId).filter((k) => !race.abilityChoice!.exclude?.includes(k));
    d.raceAbilityChoice = options.slice(0, race.abilityChoice.count);
  }
  d.alignment = pickOne(ALIGNMENTS.filter((a) => !/Mau/.test(a)), rand);
  d.concept = `Herói rápido · ${getBackground(backgroundId).label}`;

  // subclasse do 1º nível (Clérigo, Feiticeiro, Bruxo): escolhida já na criação, como nos Dons
  if (subclassLevelFor(classId) <= 1) d.subclassId = pickOne(subclassesFor(classId), rand)?.id ?? null;
  // escolhas do 1º nível (estilo, totem, idiomas de domínio…): sorteadas entre as válidas;
  // algumas dependem de outras (idioma do inimigo favorito), então repete até fechar
  d.choices = {};
  for (let round = 0; round < 4; round++) {
    let changed = false;
    for (const group of creationChoices(d)) {
      if ((d.choices[group.spec.storeKey]?.length ?? 0) >= group.total) continue;
      d.choices[group.spec.storeKey] = shuffle(group.options, rand).slice(0, group.total).map((o) => o.id);
      changed = true;
    }
    if (!changed) break;
  }
  for (const skill of shuffle(getClass(classId).skillChoices, rand)) if (skillBudget(d).canPick(skill)) d.skillProfs.push(skill);
  for (const skill of shuffle(SKILLS.map((s) => s.key as SkillKey), rand)) if (skillBudget(d).freeLeft > 0 && skillBudget(d).canPick(skill)) d.skillProfs.push(skill);
  d.skillExpertise = d.skillProfs.slice(0, expertiseSlots(d));
  const langs = languagePicks(d);
  d.extraLanguages = shuffle(LANGS.filter((l) => !langs.fixed.includes(l)), rand).slice(0, langs.total);
  suggestCreationSpells(d);
  applySelection(d, defaultSelection(classId, d));

  // níveis acima do 1º: os mesmos planos da aba Evoluir, escolhidos por mim
  if (level > 1) {
    const base = finalizeCharacter({ ...d });
    base.hpCurrent = deriveCharacter(base).maxHp;
    d.startLevel = level;
    d.levelPlans = autoTrail(base, level);
  }
  const char = finalizeWithTrail(d);
  // escolhas que só aparecem pela soma dos níveis (idioma do 3º inimigo favorito…): completa
  for (let round = 0; round < 3; round++) {
    const pend = pendingChoices(char);
    if (!pend.length) break;
    const picks: Record<string, string[]> = {};
    for (const p of pend) {
      const taken = new Set(chosenFor(char, p.spec.storeKey));
      picks[p.spec.storeKey] = shuffle(catalogFor(p.spec, char).filter((o) => !taken.has(o.id)), rand).slice(0, p.missing).map((o) => o.id);
    }
    applyChoicePicks(char, picks);
    grantChoiceEffects(char, picks);
  }
  fillSpells(char, rand);
  char.hpCurrent = deriveCharacter(char).maxHp;

  const derived = deriveCharacter(char);
  const atk = derived.attacks[0];
  const spells = [...new Set([...char.preparedSpells, ...char.knownSpells])]
    .map((id) => getSpell(id))
    .filter((s) => !!s && s.level > 0)
    .sort((a, b) => b!.level - a!.level)
    .slice(0, 3)
    .map((s) => s!.name);
  const sub = getSubclass(char.subclassId)?.label ?? null;
  return {
    char,
    summary: {
      name: char.name,
      race: raceLabel(race.label, getSubraces(raceId).find((s) => s.id === subraceId)?.label),
      className: getClass(classId).label,
      subclass: sub,
      level: char.level,
      hp: derived.maxHp,
      ac: derived.ac,
      attack: atk ? `${atk.name} ${atk.attackBonus >= 0 ? '+' : ''}${atk.attackBonus} · ${atk.damageDice}d${atk.damageDie}${atk.damageBonus ? (atk.damageBonus > 0 ? `+${atk.damageBonus}` : atk.damageBonus) : ''}` : null,
      spells,
    },
  };
}

/** "Alto Elfo" já diz a raça; "Dragão Azul" vira "Draconato (Dragão Azul)". */
function raceLabel(race: string, sub?: string): string {
  if (!sub) return race;
  return sub.toLowerCase().includes(race.toLowerCase()) ? sub : `${race} (${sub})`;
}

/** Atributos que a classe quer (para o bônus racial à escolha do Meio-Elfo). */
function classAbilityPicks(classId: string): AbilityKey[] {
  const cls = getClass(classId);
  const rest: AbilityKey[] = ['con', 'dex', 'wis', 'str', 'int', 'cha'];
  return [cls.prim, ...(cls.spellAbility ? [cls.spellAbility] : []), ...rest].filter((k, i, a) => a.indexOf(k) === i);
}
