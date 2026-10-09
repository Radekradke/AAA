import type { Character } from '@/types/character';
import { getSubrace, raceOf } from '@/data/races';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { SKILL_BY_KEY, ABILITY_SHORT } from '@/data/skills';
import { toolLabel } from '@/data/tools';
import { abilityModifier, racialBonusFor, totalAbilities } from './modifiers';
import { characterResources } from './classResources';
import { ABILITY_KEYS } from '@/types/dnd';
import { languagePicks, raceSkillProfs, skillBudget } from './originChoices';
import { creationChoices } from './classChoices';
import { subclassLevelFor } from './levelUp';
import { castsAtCreation, creationSpellPending } from './creationSpells';

/**
 * Resumo vivo da criação: o que cada escolha coloca na ficha ("Na ficha")
 * e o que ainda falta para concluir. Puro — a UI só exibe; o motor de
 * regras continua sendo a fonte de verdade.
 */
export interface PendingItem {
  label: string;
  /** Índice da etapa onde resolver (CREATION_STEPS). */
  step: number;
}

/**
 * Ordem das etapas da criação (estilo BG3: primeiro quem você é no mundo,
 * depois os números, e o nome por último, no Despertar).
 */
export const CREATION_STEPS = [
  { id: 'origem', label: 'Origem', title: 'Origem', subtitle: 'Sua linhagem: corpo, sentidos e herança.' },
  { id: 'caminho', label: 'Caminho', title: 'Caminho', subtitle: 'Sua classe: como você enfrenta o perigo.' },
  { id: 'dons', label: 'Dons', title: 'Dons', subtitle: 'O que torna o seu herói único já no 1º nível.' },
  { id: 'passado', label: 'Passado', title: 'Passado', subtitle: 'Quem você era antes da aventura.' },
  { id: 'atributos', label: 'Atributos', title: 'Atributos', subtitle: 'Os seis pilares do herói.' },
  { id: 'pericias', label: 'Perícias', title: 'Perícias', subtitle: 'No que você é treinado.' },
  { id: 'magias', label: 'Magias', title: 'Magias', subtitle: 'Truques e magias do 1º nível.' },
  { id: 'equipamento', label: 'Equipamento', title: 'Equipamento', subtitle: 'O que você carrega na primeira aventura.' },
  { id: 'despertar', label: 'Despertar', title: 'Despertar', subtitle: 'Dê nome e alma ao herói.' },
] as const;

export const STEP_RACE = 0;
export const STEP_CLASS = 1;
export const STEP_GIFTS = 2;
export const STEP_BACKGROUND = 3;
export const STEP_ABILITIES = 4;
export const STEP_SKILLS = 5;
export const STEP_SPELLS = 6;
export const STEP_GEAR = 7;
export const STEP_IDENTITY = 8;

/** Etapas que este herói percorre: "Magias" só para quem conjura no 1º nível. */
export function visibleSteps(char: Character): number[] {
  return CREATION_STEPS.map((_, i) => i).filter((i) => (i !== STEP_SPELLS || castsAtCreation(char)) && (i !== STEP_GIFTS || giftsAtCreation(char)));
}

/** Há algo a decidir no capítulo Dons (subclasse do 1º nível, escolhas da classe ou da raça)? */
export function giftsAtCreation(char: Character): boolean {
  return subclassAtCreation(char) || creationChoices(char).length > 0;
}

/** Nome da subclasse de 1º nível de cada classe (Clérigo, Feiticeiro, Bruxo). */
export const SUBCLASS_TITLE: Record<string, string> = {
  cleric: 'Domínio Divino',
  sorcerer: 'Origem de Feitiçaria',
  warlock: 'Patrono Transcendental',
};

/** A classe escolhe a subclasse já no 1º nível (e ela ainda não foi escolhida)? */
export function subclassAtCreation(char: Character): boolean {
  return subclassLevelFor(char.classId) <= 1;
}

/** Um fato concreto que a escolha coloca na ficha ("Na ficha"). */
export interface Fact {
  label: string;
  value: string;
}

export function raceFacts(char: Character): Fact[] {
  const race = raceOf(char);
  const sub = getSubrace(char.raceId, char.subraceId);
  const bonus = Object.fromEntries(ABILITY_KEYS.map((k) => [k, racialBonusFor(k, char.raceId, char.subraceId, char.raceAbilityChoice, char.customOrigin?.asi)]));
  const bonusLine = ABILITY_KEYS.filter((k) => bonus[k]).map((k) => `+${bonus[k]} ${ABILITY_SHORT[k]}`).join(' · ');
  const facts: Fact[] = [{ label: 'Atributos', value: race.abilityChoice || char.customOrigin?.asi ? bonusLine : [race.bonus, sub && Object.keys(sub.abilityBonus ?? {}).length ? sub.bonus : ''].filter(Boolean).join(' · ') }];
  facts.push({ label: 'Deslocamento', value: `${String(race.speed + (sub?.speedBonus ?? 0)).replace('.', ',')} m` });
  const dark = sub?.darkvision ?? race.darkvision;
  if (dark) facts.push({ label: 'Visão no escuro', value: `${dark} m` });
  const res = [...(race.resistances ?? []), ...(sub?.resistances ?? [])];
  if (res.length) facts.push({ label: 'Resistência', value: res.join(', ') });
  const rSkills = raceSkillProfs(char);
  if (rSkills.length) facts.push({ label: 'Perícia', value: rSkills.map((k) => SKILL_BY_KEY[k].label).join(', ') });
  if (race.extraSkillPicks) facts.push({ label: 'Perícias livres', value: `${race.extraSkillPicks} à escolha` });
  if (sub?.hpPerLevel) facts.push({ label: 'Vida extra', value: `+${sub.hpPerLevel} PV por nível` });
  const langs = [...(race.languages ?? []), ...(sub?.languages ?? [])].map((l) => char.customOrigin?.langSwap?.[l] ?? l);
  if (langs.length) facts.push({ label: 'Idiomas', value: langs.join(', ') });
  const traits = [...race.traits, ...(sub?.traits ?? [])];
  if (traits.length) facts.push({ label: 'Traços', value: traits.join(', ') });
  return facts;
}

export function classFacts(char: Character): Fact[] {
  const cls = getClass(char.classId);
  const conMod = abilityModifier(totalAbilities(char.baseAbilities, char.raceId, char.subraceId, char.raceAbilityChoice, char.customOrigin?.asi).con);
  const facts: Fact[] = [
    { label: 'Vida', value: `d${cls.hitDie} · ${cls.hitDie + conMod} PV no nível 1` },
    { label: 'Salvaguardas', value: cls.savingThrows.map((k) => ABILITY_SHORT[k]).join(' e ') },
    { label: 'Perícias', value: `${cls.skillPicks} à escolha` },
  ];
  // o que a classe tem de verdade no nível atual (Surto de Ação, Ki… só chegam no 2º)
  const res = characterResources({ ...char, classLevels: [] }).filter((r) => !['breath', 'relentless'].includes(r.id));
  if (res.length) facts.push({ label: 'Recursos', value: res.map((r) => r.label).join(', ') });
  if (cls.spellcasting) facts.push({ label: 'Magia', value: `conjura com ${ABILITY_SHORT[cls.spellAbility ?? cls.prim]}` });
  if (cls.tools?.length) facts.push({ label: 'Ferramentas', value: cls.tools.map(toolLabel).join(', ') });
  // o que se decide no capítulo Dons (logo a seguir)
  const gifts = [
    ...(subclassAtCreation(char) ? [SUBCLASS_TITLE[char.classId] ?? 'Subclasse'] : []),
    ...creationChoices(char, 'class').map((c) => c.spec.label),
  ];
  if (gifts.length) facts.push({ label: 'Dons (1º nível)', value: gifts.join(', ') });
  return facts;
}

export function backgroundFacts(char: Character): Fact[] {
  const bg = getBackground(char.backgroundId);
  const facts: Fact[] = [{ label: 'Perícias', value: bg.skills.map((k) => SKILL_BY_KEY[k].label).join(' e ') }];
  if (bg.tools?.length) facts.push({ label: 'Ferramentas', value: bg.tools.map(toolLabel).join(', ') });
  if (bg.languagesCount) facts.push({ label: 'Idiomas', value: `+${bg.languagesCount} à escolha` });
  if (bg.startingGold) facts.push({ label: 'Ouro', value: `${bg.startingGold} po` });
  if (bg.equipment?.length) facts.push({ label: 'Itens', value: bg.equipment.join(', ') });
  return facts;
}

export function creationPending(char: Character): PendingItem[] {
  const pending: PendingItem[] = [];
  const cls = getClass(char.classId);

  if (!char.name.trim()) pending.push({ label: 'Dê um nome ao herói', step: STEP_IDENTITY });

  const budget = skillBudget(char);
  if (budget.classLeft > 0) {
    pending.push({ label: `Escolha ${budget.classLeft} perícia${budget.classLeft > 1 ? 's' : ''} de ${cls.label}`, step: STEP_SKILLS });
  }
  if (budget.freeLeft > 0) {
    pending.push({ label: `Escolha ${budget.freeLeft} perícia${budget.freeLeft > 1 ? 's' : ''} livre${budget.freeLeft > 1 ? 's' : ''}`, step: STEP_SKILLS });
  }
  const ch = raceOf(char).abilityChoice;
  const picked = (char.raceAbilityChoice ?? []).filter((k) => !ch?.exclude?.includes(k)).length;
  if (ch && picked > 0 && picked < ch.count) {
    pending.push({ label: `Escolha mais ${ch.count - picked} atributo${ch.count - picked > 1 ? 's' : ''} da raça`, step: 0 });
  }
  if (subclassAtCreation(char) && !char.subclassId) {
    pending.push({ label: `Escolha o ${SUBCLASS_TITLE[char.classId] ?? 'caminho'} (${cls.label})`, step: STEP_GIFTS });
  }
  for (const c of creationChoices(char)) {
    if (c.missing > 0) pending.push({ label: `Escolha: ${c.spec.label}${c.missing > 1 ? ` (faltam ${c.missing})` : ''}`, step: STEP_GIFTS });
  }
  const langs = languagePicks(char);
  if (langs.left > 0) {
    pending.push({ label: `Escolha ${langs.left} idioma${langs.left > 1 ? 's' : ''}`, step: STEP_BACKGROUND });
  }
  for (const label of creationSpellPending(char)) pending.push({ label, step: STEP_SPELLS });

  return pending;
}
