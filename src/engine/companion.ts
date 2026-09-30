import type { Character } from '@/types/character';
import type { AbilityKey } from '@/types/dnd';
import { ABILITY_KEYS } from '@/types/dnd';
import { getBeast } from '@/data/beasts';
import type { Beast } from '@/data/beasts';
import { abilityModifier, proficiencyBonus } from './modifiers';
import { breakdown, mod } from './effects';
import type { DerivedAttack } from './dndRules';

export interface CompanionView {
  beast: Beast;
  name: string;
  prof: number;
  maxHp: number;
  hp: number;
  ac: number;
  /** Ataques por comando (Fúria Bestial no 11º: dois). */
  attacksPerAction: number;
  /** Ataques contam como mágicos (Treinamento Excepcional, 7º). */
  magical: boolean;
  attacks: DerivedAttack[];
  saves: Record<AbilityKey, number>;
  skills: { label: string; bonus: number }[];
  perks: string[];
}

/**
 * Companheiro de Patrulheiro (PHB 2014): a fera escolhida + sua proficiência
 * na CA, ataques, dano e perícias; PV máximo = o dela ou 4 × nível de
 * patrulheiro, o que for maior.
 */
export function companionOf(char: Character): CompanionView | null {
  if (char.subclassId !== 'beastmaster') return null;
  const beast = getBeast(char.choices?.['ranger.companion']?.[0]);
  if (!beast) return null;
  const lv = char.classLevels?.find((c) => c.classId === 'ranger')?.level ?? (char.classId === 'ranger' ? char.level : 0);
  if (lv < 3) return null;
  const prof = proficiencyBonus(char.level);
  const maxHp = Math.max(beast.hp, 4 * lv);
  const hp = Math.max(0, Math.min(maxHp, char.companion?.hpCurrent ?? maxHp));
  const attacks: DerivedAttack[] = beast.attacks.map((a, i) => {
    const hitBd = breakdown([mod('attack', a.toHit, beast.label, 'base'), mod('attack', prof, 'Companheiro de Patrulheiro', 'class', { label: 'sua proficiência' })]);
    const dmgBd = breakdown([mod('damage', a.bonus, beast.label, 'base'), mod('damage', prof, 'Companheiro de Patrulheiro', 'class', { label: 'sua proficiência' })], a.note);
    return {
      uid: `companion-${i}`,
      name: `${char.companion?.name || beast.label} · ${a.name}`,
      note: [a.note, lv >= 7 ? 'mágico' : ''].filter(Boolean).join(' · '),
      attackBonus: hitBd.total,
      damageDice: a.dice,
      damageDie: a.die,
      damageBonus: dmgBd.total,
      damageType: a.type,
      critMin: 20,
      hitBreakdown: hitBd,
      damageBreakdown: dmgBd,
    };
  });
  const saves = {} as Record<AbilityKey, number>;
  for (const k of ABILITY_KEYS) saves[k] = abilityModifier(beast.abilities[k]);
  const perks = [
    'Age no seu turno: gaste sua ação para mandá-lo Atacar, Disparar, Desengajar, Esquivar ou Ajudar (sem comando, só se move e Esquiva).',
    lv >= 7 ? 'Treinamento Excepcional: com ação bônus, manda Disparar, Desengajar, Esquivar ou Ajudar; ataques dele são mágicos.' : '',
    lv >= 11 ? 'Fúria Bestial: ataca duas vezes quando você manda atacar.' : '',
    lv >= 15 ? 'Compartilhar Magias: magia que mira só você também pode afetá-lo se estiver a 9 m.' : '',
  ].filter(Boolean);
  return {
    beast,
    name: char.companion?.name || beast.label,
    prof,
    maxHp,
    hp,
    ac: beast.ac + prof,
    attacksPerAction: lv >= 11 ? 2 : 1,
    magical: lv >= 7,
    attacks,
    saves,
    skills: beast.skills.map((s) => ({ label: s.label, bonus: s.bonus + prof })),
    perks,
  };
}
