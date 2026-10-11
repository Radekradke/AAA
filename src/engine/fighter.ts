import type { Character } from '@/types/character';
import type { AbilityKey } from '@/types/dnd';
import { characterResources } from './classResources';
import { levelIn } from './damageExtras';
import { MANEUVERS } from '@/data/classChoices';

/**
 * Manobras do Mestre de Batalha (PHB 2014) que somam o dado de superioridade
 * ao dano de um acerto com arma. `save` = salvaguarda do alvo (CD = 8 + prof.
 * + FOR ou DES); `effect` = o que acontece além do dano.
 */
export const DAMAGE_MANEUVERS: Record<string, { save?: AbilityKey; effect: string }> = {
  trip: { save: 'str', effect: 'o alvo (Grande ou menor) cai' },
  pushing: { save: 'str', effect: 'o alvo (Grande ou menor) é empurrado até 4,5 m' },
  disarming: { save: 'str', effect: 'o alvo solta um item que segura' },
  menacing: { save: 'wis', effect: 'o alvo fica amedrontado até o fim do seu próximo turno' },
  goading: { save: 'wis', effect: 'o alvo tem desvantagem para atacar outros que não você até o fim do seu próximo turno' },
  distracting: { effect: 'o próximo ataque de outra criatura contra o alvo tem vantagem' },
  feinting: { effect: 'ação bônus antes do ataque: vantagem nele' },
  lunging: { effect: '+1,5 m de alcance neste ataque' },
  maneuvering: { effect: 'um aliado usa a reação para se mover metade do deslocamento sem provocar ataques de oportunidade' },
  riposte: { effect: 'reação quando uma criatura erra você: um ataque corpo a corpo' },
};

export interface BattleMasterState {
  /** Faces do dado de superioridade (8, 10 ou 12). */
  die: number;
  left: number;
  max: number;
  /** CD das manobras. */
  dc: number;
  /** Manobras escolhidas que somam o dado ao dano. */
  damage: { id: string; label: string; save?: AbilityKey; effect: string }[];
  precision: boolean;
}

export function battleMasterState(char: Character, prof: number, strMod: number, dexMod: number): BattleMasterState | null {
  const res = characterResources(char).find((r) => r.id === 'superiority');
  if (!res) return null;
  const known = char.choices?.['fighter.maneuver'] ?? [];
  const die = Number(String(res.die ?? 'd8').slice(1));
  return {
    die,
    left: Math.min(res.max, char.combat?.resources?.superiority ?? res.max),
    max: res.max,
    dc: 8 + prof + Math.max(strMod, dexMod),
    damage: known
      .filter((id) => DAMAGE_MANEUVERS[id])
      .map((id) => ({ id, label: MANEUVERS.find((m) => m.id === id)?.label ?? id, ...DAMAGE_MANEUVERS[id] })),
    precision: known.includes('precision'),
  };
}

/** Sobrevivente (Campeão 18º): no início do turno, com PV ≤ metade (e > 0), recupera 5 + CON. */
export function survivorHeal(char: Character, maxHp: number, conMod: number): number {
  if (char.subclassId !== 'champion' || levelIn(char, 'fighter') < 18) return 0;
  if (char.hpCurrent <= 0 || char.hpCurrent > Math.floor(maxHp / 2)) return 0;
  return Math.max(0, 5 + conMod);
}
