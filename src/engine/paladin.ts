import type { Character } from '@/types/character';
import { characterResources } from './classResources';
import { levelIn } from './damageExtras';

/**
 * Paladino (PHB 2014) na mesa: reservas (Cura pelas Mãos, Sentido Divino,
 * Canalizar Divindade, Toque Purificador), as opções de Canalizar de cada
 * juramento e o que as auras fazem sozinhas.
 */
export interface ChannelOption {
  id: string;
  label: string;
  desc: string;
  /** Efeito que a ficha liga (Arma Sagrada soma CAR no ataque; Voto dá vantagem). */
  mark?: 'sacredWeapon' | 'vow';
  /** Salvaguarda que o alvo faz contra a sua CD. */
  save?: string;
}

export interface PaladinState {
  level: number;
  /** CD das magias e do Canalizar: 8 + prof + CAR. */
  dc: number;
  layLeft: number;
  layMax: number;
  senseLeft: number;
  senseMax: number;
  channelLeft: number;
  channelOptions: ChannelOption[];
  cleansingLeft: number;
  cleansingMax: number;
  /** Aura de Proteção (6º): + CAR (mín. 1) nas salvaguardas; alcance 3 m (9 m no 18º). */
  auraBonus: number | null;
  auraRange: number;
  /** Sentinela Imortal (Anciões 15º): usos restantes. */
  undyingLeft: number;
  avatar: { id: string; label: string; desc: string; left: number } | null;
}

const CHANNEL: Record<string, ChannelOption[]> = {
  devotion: [
    { id: 'sacredWeapon', label: 'Arma Sagrada', mark: 'sacredWeapon', desc: 'Ação, 1 minuto: soma CAR (mín. +1) às jogadas de ataque com a arma, que emite luz e conta como mágica.' },
    { id: 'turnUnholy', label: 'Expulsar o Profano', save: 'SAB', desc: 'Ação: corruptores e mortos-vivos a 9 m fazem salvaguarda de SAB ou ficam expulsos por 1 minuto.' },
  ],
  ancients: [
    { id: 'natureWrath', label: 'Ira da Natureza', save: 'FOR ou DES', desc: 'Ação: vinhas prendem uma criatura a 3 m — salvaguarda de FOR ou DES (à escolha dela) ou fica impedida (repete a cada turno).' },
    { id: 'turnFaithless', label: 'Expulsar os Infiéis', save: 'SAB', desc: 'Ação: fadas e corruptores a 9 m fazem salvaguarda de SAB ou ficam expulsos por 1 minuto (e mostram a forma verdadeira).' },
  ],
  vengeance: [
    { id: 'abjureEnemy', label: 'Repreender Inimigos', save: 'SAB', desc: 'Ação: uma criatura a 18 m faz salvaguarda de SAB (corruptores e mortos-vivos com desvantagem) ou fica amedrontada e com deslocamento 0 por 1 minuto.' },
    { id: 'vow', label: 'Voto de Inimizade', mark: 'vow', desc: 'Ação bônus, 1 minuto: vantagem nas jogadas de ataque contra uma criatura a 3 m.' },
  ],
};

const AVATAR_LABEL: Record<string, string> = { devotion: 'Nimbo Sagrado', ancients: 'Campeão Ancião', vengeance: 'Anjo Vingador' };

export function paladinState(char: Character, prof: number, chaMod: number): PaladinState | null {
  const level = levelIn(char, 'paladin');
  if (!level) return null;
  const res = Object.fromEntries(characterResources(char).map((r) => [r.id, r]));
  const left = (id: string) => (res[id] ? Math.min(res[id].max, char.combat?.resources?.[id] ?? res[id].max) : 0);
  const sub = char.subclassId;
  return {
    level,
    dc: 8 + prof + chaMod,
    layLeft: left('layhands'),
    layMax: res.layhands?.max ?? 0,
    senseLeft: left('divineSense'),
    senseMax: res.divineSense?.max ?? 0,
    channelLeft: left('channel'),
    channelOptions: level >= 3 && sub ? CHANNEL[sub] ?? [] : [],
    cleansingLeft: left('cleansing'),
    cleansingMax: res.cleansing?.max ?? 0,
    auraBonus: level >= 6 ? Math.max(1, chaMod) : null,
    auraRange: level >= 18 ? 9 : 3,
    undyingLeft: sub === 'ancients' && level >= 15 ? left('undyingSentinel') : 0,
    avatar: res.oathAvatar && sub ? { id: sub, label: AVATAR_LABEL[sub] ?? res.oathAvatar.label, desc: res.oathAvatar.desc, left: left('oathAvatar') } : null,
  };
}
