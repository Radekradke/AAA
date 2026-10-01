import type { Character } from '@/types/character';
import { getSubrace, raceOf } from '@/data/races';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { SKILL_BY_KEY, ABILITY_SHORT } from '@/data/skills';
import { toolLabel } from '@/data/tools';
import { abilityModifier, totalAbilities } from './modifiers';
import { languagePicks, skillBudget } from './originChoices';

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
  { id: 'passado', label: 'Passado', title: 'Passado', subtitle: 'Quem você era antes da aventura.' },
  { id: 'atributos', label: 'Atributos', title: 'Atributos', subtitle: 'Os seis pilares do herói.' },
  { id: 'pericias', label: 'Perícias', title: 'Perícias', subtitle: 'No que você é treinado.' },
  { id: 'equipamento', label: 'Equipamento', title: 'Equipamento', subtitle: 'O que você carrega na primeira aventura.' },
  { id: 'despertar', label: 'Despertar', title: 'Despertar', subtitle: 'Dê nome e alma ao herói.' },
] as const;

export const STEP_BACKGROUND = 2;
export const STEP_SKILLS = 4;
export const STEP_GEAR = 5;
export const STEP_IDENTITY = 6;

/** Um fato concreto que a escolha coloca na ficha ("Na ficha"). */
export interface Fact {
  label: string;
  value: string;
}

export function raceFacts(char: Character): Fact[] {
  const race = raceOf(char);
  const sub = getSubrace(char.raceId, char.subraceId);
  const facts: Fact[] = [{ label: 'Atributos', value: [race.bonus, sub?.bonus].filter(Boolean).join(' · ') }];
  facts.push({ label: 'Deslocamento', value: `${String(race.speed + (sub?.speedBonus ?? 0)).replace('.', ',')} m` });
  const dark = sub?.darkvision ?? race.darkvision;
  if (dark) facts.push({ label: 'Visão no escuro', value: `${dark} m` });
  const res = [...(race.resistances ?? []), ...(sub?.resistances ?? [])];
  if (res.length) facts.push({ label: 'Resistência', value: res.join(', ') });
  if (race.skillProfs?.length) facts.push({ label: 'Perícia', value: race.skillProfs.map((k) => SKILL_BY_KEY[k].label).join(', ') });
  if (race.extraSkillPicks) facts.push({ label: 'Perícias livres', value: `${race.extraSkillPicks} à escolha` });
  if (sub?.hpPerLevel) facts.push({ label: 'Vida extra', value: `+${sub.hpPerLevel} PV por nível` });
  if (race.languages?.length) facts.push({ label: 'Idiomas', value: race.languages.join(', ') });
  const traits = [...race.traits, ...(sub?.traits ?? [])];
  if (traits.length) facts.push({ label: 'Traços', value: traits.join(', ') });
  return facts;
}

export function classFacts(char: Character): Fact[] {
  const cls = getClass(char.classId);
  const conMod = abilityModifier(totalAbilities(char.baseAbilities, char.raceId, char.subraceId).con);
  const facts: Fact[] = [
    { label: 'Vida', value: `d${cls.hitDie} · ${cls.hitDie + conMod} PV no nível 1` },
    { label: 'Resistências', value: cls.savingThrows.map((k) => ABILITY_SHORT[k]).join(' e ') },
    { label: 'Perícias', value: `${cls.skillPicks} à escolha` },
  ];
  if (cls.resources?.length) facts.push({ label: 'Recursos', value: cls.resources.map((r) => r.label).join(', ') });
  if (cls.spellcasting) facts.push({ label: 'Magia', value: `conjura com ${ABILITY_SHORT[cls.spellAbility ?? cls.prim]}` });
  if (cls.tools?.length) facts.push({ label: 'Ferramentas', value: cls.tools.map(toolLabel).join(', ') });
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
  const langs = languagePicks(char);
  if (langs.left > 0) {
    pending.push({ label: `Escolha ${langs.left} idioma${langs.left > 1 ? 's' : ''}`, step: STEP_BACKGROUND });
  }

  return pending;
}
