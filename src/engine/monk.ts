import type { Character } from '@/types/character';
import { characterResources } from './classResources';
import { levelIn } from './damageExtras';
import { ELEMENTAL_DISCIPLINES } from '@/data/classChoices';

/**
 * Monge (PHB 2014) na mesa: ki, CD de ki e o que cada nível e tradição ligam.
 * A ficha usa isto no painel do Monge (Combate), no "Aplicar dano"
 * (Defletir Projéteis, Queda Lenta) e no dano do ataque (Golpe Atordoante).
 */
export interface KiAction {
  id: string;
  label: string;
  cost: number;
  /** Ação gasta (bônus, ação, reação ou nenhuma). */
  uses: 'bonus' | 'action' | 'reaction' | null;
  desc: string;
  /** Dano rolado ao usar (ex.: 3d10 do Punho do Ar Inquebrável). */
  damage?: { count: number; die: number; type: string; perExtraKi?: boolean };
}

export interface MonkState {
  level: number;
  kiLeft: number;
  kiMax: number;
  /** CD de ki: 8 + proficiência + SAB. */
  dc: number;
  maDie: number;
  /** Defletir Projéteis (3º): reduz 1d10 + DES + nível. */
  deflectBonus: number | null;
  /** Queda Lenta (4º): reduz 5 × nível do dano de queda. */
  slowFall: number | null;
  stunning: boolean;
  stillness: boolean;
  purity: boolean;
  diamondSoul: boolean;
  emptyBody: boolean;
  /** Mão Aberta: Técnica (3º), Integridade do Corpo (6º, PV), Palma Trêmula (17º). */
  openHand: boolean;
  wholenessHeal: number | null;
  quiveringPalm: boolean;
  /** Sombra: Artes das Sombras (3º) e Passo das Sombras (6º). */
  shadowArts: boolean;
  shadowStep: boolean;
  /** Quatro Elementos: disciplinas escolhidas e o máximo de ki por disciplina. */
  disciplines: KiAction[];
  maxKiPerDiscipline: number;
}

const DISCIPLINE_COST: Record<string, number> = {
  fangs: 1, fourThunders: 2, unbrokenAir: 2, galeSpirits: 2, flowingRiver: 1, cinderStrike: 2, waterWhip: 2,
  northWind: 3, gong: 3, phoenix: 4, mistStance: 4, rideWind: 4, winter: 6, mountain: 5, hungryFlame: 5, rollingEarth: 6,
};
const DISCIPLINE_DAMAGE: Record<string, KiAction['damage']> = {
  unbrokenAir: { count: 3, die: 10, type: 'concussão', perExtraKi: true },
  waterWhip: { count: 3, die: 10, type: 'concussão', perExtraKi: true },
  fangs: { count: 1, die: 10, type: 'fogo' },
};

export function monkState(char: Character, prof: number, wisMod: number, dexMod: number): MonkState | null {
  const level = levelIn(char, 'monk');
  if (!level) return null;
  const sub = char.subclassId;
  const ki = characterResources(char).find((r) => r.id === 'ki');
  const kiMax = ki?.max ?? 0;
  const kiLeft = Math.min(kiMax, char.combat?.resources?.ki ?? kiMax);
  const picked = sub === 'elements' && level >= 3 ? char.choices?.['monk.discipline'] ?? [] : [];
  const disciplines = picked
    .map((id) => ELEMENTAL_DISCIPLINES.find((d) => d.id === id))
    .filter((d): d is (typeof ELEMENTAL_DISCIPLINES)[number] => !!d)
    .map((d) => ({ id: d.id, label: d.label, cost: DISCIPLINE_COST[d.id] ?? 2, uses: (d.id === 'waterWhip' ? 'bonus' : d.id === 'fangs' ? null : 'action') as KiAction['uses'], desc: d.desc, damage: DISCIPLINE_DAMAGE[d.id] }));
  return {
    level,
    kiLeft,
    kiMax,
    dc: 8 + prof + wisMod,
    maDie: level >= 17 ? 10 : level >= 11 ? 8 : level >= 5 ? 6 : 4,
    deflectBonus: level >= 3 ? dexMod + level : null,
    slowFall: level >= 4 ? 5 * level : null,
    stunning: level >= 5,
    stillness: level >= 7,
    purity: level >= 10,
    diamondSoul: level >= 14,
    emptyBody: level >= 18,
    openHand: sub === 'openhand' && level >= 3,
    wholenessHeal: sub === 'openhand' && level >= 6 ? 3 * level : null,
    quiveringPalm: sub === 'openhand' && level >= 17,
    shadowArts: sub === 'shadow' && level >= 3,
    shadowStep: sub === 'shadow' && level >= 6,
    disciplines,
    maxKiPerDiscipline: level >= 17 ? 6 : level >= 13 ? 5 : level >= 9 ? 4 : level >= 5 ? 3 : 2,
  };
}

/** Ações de ki básicas (2º): Rajada de Golpes, Defesa Paciente, Passo do Vento. */
export const KI_BASICS: KiAction[] = [
  { id: 'flurry', label: 'Rajada de Golpes', cost: 1, uses: 'bonus', desc: 'Depois de Atacar: dois golpes desarmados como ação bônus.' },
  { id: 'patient', label: 'Defesa Paciente', cost: 1, uses: 'bonus', desc: 'Esquivar como ação bônus: ataques contra você têm desvantagem e você tem vantagem em salvaguardas de DES até o seu próximo turno.' },
  { id: 'step', label: 'Passo do Vento', cost: 1, uses: 'bonus', desc: 'Disparada ou Desengajar como ação bônus; o salto dobra neste turno.' },
];
