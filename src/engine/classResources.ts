import type { Character } from '@/types/character';
import { ABILITY_KEYS } from '@/types/dnd';
import type { AbilityKey } from '@/types/dnd';
import { abilityModifier } from './modifiers';
import { effectiveAbilities } from './levelUp';

/**
 * Recursos de classe de um personagem — PHB 2014, calculados a partir do
 * nível de cada classe, dos atributos e da subclasse. É a fonte da verdade
 * para a tela (máximo), para os descansos (o que recarrega) e para a subida
 * de nível. Antes o máximo vinha fixo do cadastro (ex.: 2 Pontos de
 * Feitiçaria em qualquer nível).
 */
export interface ResourceState {
  id: string;
  label: string;
  desc: string;
  recharge: 'short' | 'long';
  /** Usos máximos (0 com `unlimited`). */
  max: number;
  /** Sem limite de usos (ex.: Fúria no 20º nível do Bárbaro). */
  unlimited?: boolean;
  /** Dado associado, quando houver (Inspiração de Bardo, Superioridade…). */
  die?: string;
}

type Mods = Record<AbilityKey, number>;

function mods(char: Character): Mods {
  const totals = effectiveAbilities(char);
  const out = {} as Mods;
  for (const k of ABILITY_KEYS) out[k] = abilityModifier(totals[k]);
  return out;
}

/** Recursos de UMA classe no nível dado (subclasse só vale para a classe dela). */
function classResources(classId: string, lv: number, m: Mods, subclassId: string | null): ResourceState[] {
  const out: ResourceState[] = [];
  const add = (r: ResourceState) => out.push(r);

  switch (classId) {
    case 'barbarian': {
      const uses = lv >= 17 ? 6 : lv >= 12 ? 5 : lv >= 6 ? 4 : lv >= 3 ? 3 : 2;
      const dmg = lv >= 16 ? 4 : lv >= 9 ? 3 : 2;
      add({ id: 'rage', label: 'Fúria', desc: `Vantagem em FOR, +${dmg} de dano corpo a corpo com FOR, resistência a concussão/cortante/perfurante`, recharge: 'long', max: lv >= 20 ? 0 : uses, unlimited: lv >= 20 });
      break;
    }
    case 'bard': {
      const die = lv >= 15 ? 'd12' : lv >= 10 ? 'd10' : lv >= 5 ? 'd8' : 'd6';
      // usos = modificador de Carisma (mín. 1); Fonte de Inspiração (5º) recupera no descanso curto
      add({ id: 'inspiration', label: 'Inspiração de Bardo', desc: `Um aliado soma 1${die} a um teste, ataque ou salvaguarda`, recharge: lv >= 5 ? 'short' : 'long', max: Math.max(1, m.cha), die });
      break;
    }
    case 'cleric': {
      if (lv >= 2) add({ id: 'channel', label: 'Canalizar Divindade', desc: 'Expulsar Mortos-Vivos ou o poder do seu domínio', recharge: 'short', max: lv >= 18 ? 3 : lv >= 6 ? 2 : 1 });
      if (lv >= 10) add({ id: 'intervention', label: 'Intervenção Divina', desc: `Chance de ${lv >= 20 ? '100%' : `${lv}%`} (d100 ≤ nível); se funcionar, 7 dias até poder de novo`, recharge: 'long', max: 1 });
      break;
    }
    case 'druid': {
      if (lv >= 2) add({ id: 'wildshape', label: 'Forma Selvagem', desc: `Vira uma fera de ND até ${lv >= 8 ? '1' : lv >= 4 ? '1/2 (sem voo)' : '1/4 (sem voo nem natação)'}`, recharge: 'short', max: lv >= 20 ? 0 : 2, unlimited: lv >= 20 });
      if (lv >= 2 && subclassId === 'land') add({ id: 'naturalRecovery', label: 'Recuperação Natural', desc: `Recupera espaços somando até ${Math.ceil(lv / 2)} níveis (nenhum de 6º+) num descanso curto`, recharge: 'long', max: 1 });
      break;
    }
    case 'fighter': {
      add({ id: 'secondWind', label: 'Fôlego', desc: `Ação bônus: recupera 1d10 + ${lv} PV`, recharge: 'short', max: 1 });
      if (lv >= 2) add({ id: 'surge', label: 'Surto de Ação', desc: 'Uma ação adicional no seu turno', recharge: 'short', max: lv >= 17 ? 2 : 1 });
      if (lv >= 9) add({ id: 'indomitable', label: 'Indomável', desc: 'Rola de novo uma salvaguarda que falhou', recharge: 'long', max: lv >= 17 ? 3 : lv >= 13 ? 2 : 1 });
      if (subclassId === 'battlemaster' && lv >= 3) {
        const die = lv >= 18 ? 'd12' : lv >= 10 ? 'd10' : 'd8';
        add({ id: 'superiority', label: 'Dados de Superioridade', desc: `Alimentam as manobras (${die})`, recharge: 'short', max: lv >= 15 ? 6 : lv >= 7 ? 5 : 4, die });
      }
      break;
    }
    case 'monk': {
      if (lv >= 2) add({ id: 'ki', label: 'Pontos de Ki', desc: 'Rajada de Golpes, Defesa Paciente, Passo do Vento…', recharge: 'short', max: lv });
      break;
    }
    case 'paladin': {
      add({ id: 'divineSense', label: 'Sentido Divino', desc: 'Detecta celestiais, corruptores e mortos-vivos a 18 m', recharge: 'long', max: 1 + Math.max(0, m.cha) });
      add({ id: 'layhands', label: 'Cura pelas Mãos', desc: 'Reserva de PV para curar pelo toque (5 pontos curam uma doença/veneno)', recharge: 'long', max: 5 * lv });
      if (lv >= 3) add({ id: 'channel', label: 'Canalizar Divindade', desc: 'Poder do seu juramento', recharge: 'short', max: 1 });
      if (lv >= 14) add({ id: 'cleansing', label: 'Toque Purificador', desc: 'Encerra uma magia em você ou numa criatura voluntária', recharge: 'long', max: Math.max(1, m.cha) });
      break;
    }
    case 'rogue': {
      if (lv >= 20) add({ id: 'strokeOfLuck', label: 'Golpe de Sorte', desc: 'Transforma um erro em acerto ou um teste em 20', recharge: 'short', max: 1 });
      break;
    }
    case 'sorcerer': {
      if (lv >= 2) add({ id: 'sorcery', label: 'Pontos de Feitiçaria', desc: 'Alimentam a Metamagia e viram espaços de magia (Fonte de Magia)', recharge: 'long', max: lv });
      if (subclassId === 'wild') add({ id: 'tides', label: 'Marés do Caos', desc: 'Vantagem num ataque, teste ou salvaguarda', recharge: 'long', max: 1 });
      break;
    }
    case 'warlock': {
      // Arcano Místico: uma magia de cada círculo 1×/descanso longo
      for (const [need, circle] of [[11, 6], [13, 7], [15, 8], [17, 9]] as const) {
        if (lv >= need) add({ id: `arcanum${circle}`, label: `Arcano Místico (${circle}º)`, desc: `Conjura sua magia de ${circle}º círculo sem gastar espaço`, recharge: 'long', max: 1 });
      }
      if (lv >= 20) add({ id: 'eldritchMaster', label: 'Mestre Místico', desc: 'Recupera todos os espaços de Magia de Pacto (1 minuto)', recharge: 'long', max: 1 });
      break;
    }
    case 'wizard': {
      add({ id: 'recovery', label: 'Recuperação Arcana', desc: `Recupera espaços somando até ${Math.ceil(lv / 2)} níveis (nenhum de 6º+) num descanso curto`, recharge: 'long', max: 1 });
      break;
    }
  }
  return out;
}

/** Recursos do personagem inteiro (todas as classes que ele tem). */
export function characterResources(char: Character): ResourceState[] {
  const m = mods(char);
  const levels = char.classLevels?.length ? char.classLevels : [{ classId: char.classId, level: char.level }];
  const out: ResourceState[] = [];
  for (const cl of levels) {
    // a subclasse registrada é a da classe principal
    const sub = cl.classId === char.classId ? char.subclassId ?? null : null;
    out.push(...classResources(cl.classId, Math.max(1, cl.level), m, sub));
  }
  return out;
}

/** Máximo de cada recurso (ilimitados ficam fora — não há o que gastar). */
export function resourceMaxMap(char: Character): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of characterResources(char)) if (!r.unlimited) out[r.id] = r.max;
  return out;
}

/**
 * Ajusta o estado atual dos recursos ao que o personagem tem agora:
 * novos recursos chegam cheios, os que sumiram saem e nenhum passa do máximo.
 * `refill` enche todos (subida de nível / descanso longo).
 */
export function syncResources(char: Character, current: Record<string, number>, refill = false): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, max] of Object.entries(resourceMaxMap(char))) {
    out[id] = refill || current[id] === undefined ? max : Math.min(Math.max(0, current[id]), max);
  }
  return out;
}
