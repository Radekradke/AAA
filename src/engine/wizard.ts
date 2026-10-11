import type { Character } from '@/types/character';
import type { Spell } from '@/types/dnd';
import { characterResources } from './classResources';
import { levelIn } from './damageExtras';

/**
 * Mago (PHB 2014) na mesa: Recuperação Arcana (espaços até metade do nível,
 * nenhum de 6º+), Domínio de Magia e Magias de Assinatura (conjuram sem
 * espaço) e o que cada escola liga — Barreira Arcana, Portento, Evocação
 * Poderosa, Sobrecarga, Colheita Sinistra…
 */
export type WizardSchool = 'abjuration' | 'conjuration' | 'divination' | 'enchantment' | 'evocation' | 'illusion' | 'necromancy' | 'transmutation';

export interface WizardState {
  level: number;
  /** CD das magias: 8 + prof + INT. */
  dc: number;
  school: WizardSchool | null;
  /** Recuperação Arcana: níveis de espaço recuperáveis (metade do nível, para cima) e se ainda há uso hoje. */
  recovery: { budget: number; left: number };
  /** Barreira Arcana (Abjuração 2º): PV atuais, máximo e se já foi erguida hoje. */
  ward: { hp: number; max: number; up: boolean } | null;
  /** Portento (Adivinhação 2º): d20 guardados e quantos (2; 3 no 14º). */
  portent: { rolls: number[]; count: number } | null;
  /** Evocação Poderosa (10º): + INT numa rolagem de dano de evocação de mago. */
  empoweredEvocation: boolean;
  /** Sobrecarga (Evocação 14º): usos desde o descanso longo. */
  overchannel: { uses: number } | null;
  left: Record<'benignTransposition' | 'illusorySelf', number>;
}

const SCHOOLS: WizardSchool[] = ['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation'];
/** Escola da magia → id da subclasse do mago. */
export const SCHOOL_OF: Record<string, WizardSchool> = {
  'Abjuração': 'abjuration', 'Conjuração': 'conjuration', 'Adivinhação': 'divination', 'Encantamento': 'enchantment',
  'Evocação': 'evocation', 'Ilusão': 'illusion', 'Necromancia': 'necromancy', 'Transmutação': 'transmutation',
};

export function wizardState(char: Character, prof: number, intMod: number): WizardState | null {
  const level = levelIn(char, 'wizard');
  if (!level) return null;
  const res = Object.fromEntries(characterResources(char).map((r) => [r.id, r]));
  const left = (id: string) => (res[id] ? Math.min(res[id].max, char.combat?.resources?.[id] ?? res[id].max) : 0);
  const school = SCHOOLS.includes(char.subclassId as WizardSchool) ? (char.subclassId as WizardSchool) : null;
  const marks = char.combat?.marks ?? [];
  return {
    level,
    dc: 8 + prof + intMod,
    school,
    recovery: { budget: Math.ceil(level / 2), left: left('recovery') },
    ward: res.arcaneWard ? { hp: left('arcaneWard'), max: res.arcaneWard.max, up: marks.includes('arcaneWard') } : null,
    portent: school === 'divination' && level >= 2 ? { rolls: char.combat?.portent ?? [], count: level >= 14 ? 3 : 2 } : null,
    empoweredEvocation: school === 'evocation' && level >= 10,
    overchannel: school === 'evocation' && level >= 14 ? { uses: char.combat?.overchannel ?? 0 } : null,
    left: { benignTransposition: left('benignTransposition'), illusorySelf: left('illusorySelf') },
  };
}

/** Recuperação Arcana válida? soma ≤ metade do nível (para cima), só até o 5º círculo, só espaços gastos. */
export function validRecovery(char: Character, picks: Record<number, number>, slots: Record<number, { max: number; used: number }>): boolean {
  const budget = Math.ceil(levelIn(char, 'wizard') / 2);
  let total = 0;
  for (const [lv, n] of Object.entries(picks)) {
    const l = Number(lv);
    if (!n) continue;
    if (l >= 6 || n < 0 || n > (slots[l]?.used ?? 0)) return false;
    total += l * n;
  }
  return total > 0 && total <= budget;
}

/** Domínio de Magia (18º) e Magias de Assinatura (20º): como esta magia conjura sem espaço. */
export function wizardFreeCast(char: Character, spellId: string): { kind: 'mastery' } | { kind: 'signature'; resId: string; left: number } | null {
  const lv = levelIn(char, 'wizard');
  if (lv >= 18 && ['wizard.spellMastery1', 'wizard.spellMastery2'].some((k) => (char.choices?.[k] ?? []).includes(spellId))) return { kind: 'mastery' };
  if (lv >= 20 && (char.choices?.['wizard.signature'] ?? []).includes(spellId)) {
    const resId = `signature-${spellId}`;
    return { kind: 'signature', resId, left: Math.min(1, char.combat?.resources?.[resId] ?? 1) };
  }
  return null;
}

/** Evocação Poderosa: + INT no dano de magia de evocação de mago (Evocação 10º). */
export function empoweredEvocation(char: Character, sp: Spell, intMod: number): number {
  if (char.subclassId !== 'evocation' || levelIn(char, 'wizard') < 10 || !sp.damage || sp.school !== 'Evocação') return 0;
  if (sp.classes && !sp.classes.includes('wizard')) return 0;
  return Math.max(0, intMod);
}

/** Sobrecarga: depois do 1º uso no dia, 2d12 necrótico por círculo, +1d12 por círculo a cada uso a mais. */
export function overchannelBacklash(uses: number, slotLevel: number): number {
  return uses <= 0 ? 0 : (uses + 1) * slotLevel;
}

/** Colheita Sinistra (Necromancia 2º): matar com magia de 1º+ cura 2 × círculo (3 × se for necromancia). */
export function grimHarvest(slotLevel: number, necromancy: boolean): number {
  return slotLevel < 1 ? 0 : slotLevel * (necromancy ? 3 : 2);
}
