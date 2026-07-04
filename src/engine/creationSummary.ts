import type { Character } from '@/types/character';
import { getRace, getSubrace } from '@/data/races';
import { getClass } from '@/data/classes';
import { getBackground } from '@/data/backgrounds';
import { SKILL_BY_KEY, ABILITY_SHORT } from '@/data/skills';
import { toolLabel } from '@/data/tools';
import { abilityModifier, totalAbilities } from './modifiers';
import { averageHp } from './levelUp';

/**
 * Resumo vivo da criação: o que cada escolha desbloqueia na ficha
 * ("Você desbloqueou…") e o que ainda falta para concluir. Puro —
 * a UI só exibe; o motor de regras continua sendo a fonte de verdade.
 */
export interface GainGroup {
  source: string;
  items: string[];
}

export interface PendingItem {
  label: string;
  /** Índice da etapa onde resolver (STEP_LABELS do criador). */
  step: number;
}

export function creationGains(char: Character): GainGroup[] {
  const race = getRace(char.raceId);
  const subrace = getSubrace(char.raceId, char.subraceId);
  const cls = getClass(char.classId);
  const bg = getBackground(char.backgroundId);
  const groups: GainGroup[] = [];

  // ---- linhagem ----
  const raceItems: string[] = [];
  if (race.bonus) raceItems.push(race.bonus);
  const dark = subrace?.darkvision ?? race.darkvision;
  if (dark) raceItems.push(`Visão no Escuro ${dark} m`);
  for (const sk of race.skillProfs ?? []) raceItems.push(`Proficiência: ${SKILL_BY_KEY[sk].label}`);
  for (const r of race.resistances ?? []) raceItems.push(`Resistência: ${r}`);
  for (const r of subrace?.resistances ?? []) raceItems.push(`Resistência: ${r}`);
  if (subrace?.speedBonus) raceItems.push(`+${String(subrace.speedBonus).replace('.', ',')} m de deslocamento`);
  if (subrace?.hpPerLevel) raceItems.push(`+${subrace.hpPerLevel} PV por nível`);
  if (race.extraSkillPicks) raceItems.push(`${race.extraSkillPicks} perícias à sua escolha`);
  if (race.languages?.length) raceItems.push(`Idiomas: ${race.languages.join(', ')}`);
  groups.push({ source: `${race.label}${subrace ? ` · ${subrace.label}` : ''}`, items: raceItems });

  // ---- vocação ----
  const conMod = abilityModifier(totalAbilities(char.baseAbilities, char.raceId, char.subraceId).con);
  const classItems: string[] = [
    `Dado de vida d${cls.hitDie} · PV inicial ${cls.hitDie + conMod}`,
    `Salvaguardas: ${cls.savingThrows.map((k) => ABILITY_SHORT[k]).join(' e ')}`,
    `${cls.skillPicks} perícias à escolha da classe`,
  ];
  for (const id of cls.tools ?? []) classItems.push(`Proficiência: ${toolLabel(id)}`);
  for (const res of cls.resources ?? []) classItems.push(`Recurso: ${res.label}`);
  if (cls.spellcasting) classItems.push(`Conjuração (${ABILITY_SHORT[cls.prim]}) · média d${cls.hitDie} = ${averageHp(cls.hitDie)}/nível`);
  groups.push({ source: cls.label, items: classItems });

  // ---- passado ----
  const bgItems: string[] = bg.skills.map((sk) => `Proficiência: ${SKILL_BY_KEY[sk].label}`);
  for (const id of bg.tools ?? []) bgItems.push(`Ferramenta: ${toolLabel(id)}`);
  if (bg.languagesCount) bgItems.push(`+${bg.languagesCount} idioma${bg.languagesCount > 1 ? 's' : ''} à escolha`);
  if (bg.equipment?.length) bgItems.push(`Equipamento inicial (${bg.equipment.length} itens)`);
  if (bg.startingGold) bgItems.push(`${bg.startingGold} po iniciais`);
  if (bg.featureName) bgItems.push(`Característica: ${bg.featureName}`);
  groups.push({ source: bg.label, items: bgItems });

  return groups.filter((g) => g.items.length > 0);
}

/** Etapas dos rótulos do criador (mantidas em sincronia com STEP_LABELS). */
export const STEP_IDENTITY = 0;
export const STEP_SKILLS = 4;

export function creationPending(char: Character): PendingItem[] {
  const pending: PendingItem[] = [];
  const cls = getClass(char.classId);
  const race = getRace(char.raceId);
  const bg = getBackground(char.backgroundId);

  if (!char.name.trim()) pending.push({ label: 'Dê um nome ao herói', step: STEP_IDENTITY });

  const granted = new Set([...bg.skills, ...(race.skillProfs ?? [])]);
  const classChosen = char.skillProfs.filter((k) => cls.skillChoices.includes(k) && !granted.has(k)).length;
  const classLeft = cls.skillPicks - classChosen;
  if (classLeft > 0) {
    pending.push({ label: `Escolha ${classLeft} perícia${classLeft > 1 ? 's' : ''} de ${cls.label}`, step: STEP_SKILLS });
  }
  const extraChosen = char.skillProfs.filter((k) => !cls.skillChoices.includes(k) && !granted.has(k)).length;
  const extraLeft = (race.extraSkillPicks ?? 0) - extraChosen;
  if (extraLeft > 0) {
    pending.push({ label: `Escolha ${extraLeft} perícia${extraLeft > 1 ? 's' : ''} livre${extraLeft > 1 ? 's' : ''} (${race.label})`, step: STEP_SKILLS });
  }

  return pending;
}
