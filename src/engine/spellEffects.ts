import type { ActiveSpellEffect } from '@/types/character';
import type { Spell } from '@/types/dnd';
import { parseDice } from './spellCast';

/**
 * O que acontece em você ao conjurar (PHB 2014). A ficha aplica sozinha:
 * PV temporários, PV máximo, CA, deslocamento — e tira quando acaba.
 * `self`: a magia é Pessoal (sempre em você); `choose`: pode ser em você
 * ou em outro alvo (a ficha pergunta).
 */
export interface SpellOutcome {
  target: 'self' | 'choose';
  /** PV temporários ao conjurar: dados + fixo. */
  tempHp?: { dice?: string; flat: number };
  /** Efeito que fica ativo (sem ele, é instantâneo). */
  effect?: Omit<ActiveSpellEffect, 'spellId' | 'name'>;
  /** Lembrete mostrado no aviso de conjuração. */
  reminder?: string;
}

const conc = (sp: Spell) => (sp.concentration ? 'concentration' : 'rest') as ActiveSpellEffect['until'];

export function spellOutcome(sp: Spell, slotLevel: number, castMod: number): SpellOutcome | null {
  const above = Math.max(0, slotLevel - sp.level);
  switch (sp.id) {
    case 'phb-false-life':
      return { target: 'self', tempHp: { dice: '1d4', flat: 4 + 5 * above } };
    case 'phb-armor-agathys': {
      const n = 5 * Math.max(1, slotLevel);
      return {
        target: 'self',
        tempHp: { flat: n },
        effect: { until: 'rest', label: `${n} de frio em quem acertar corpo a corpo (enquanto houver PV temp.)` },
      };
    }
    case 'sp-heroismo': {
      const n = Math.max(0, castMod);
      return {
        target: 'choose',
        tempHp: { flat: n },
        effect: { until: 'concentration', label: `imune a medo · +${n} PV temp. a cada turno`, tempPerTurn: n },
      };
    }
    case 'phb-aid': {
      const n = 5 * Math.max(1, slotLevel - 1);
      return { target: 'choose', effect: { until: 'rest', label: `+${n} PV máximo e atual`, maxHp: n } };
    }
    case 'sp-armaduraarcana':
      return { target: 'choose', effect: { until: 'rest', label: 'CA 13 + DES (sem armadura)', acBase: 13 } };
    case 'sp-escudo':
      return { target: 'self', effect: { until: 'turn', label: '+5 CA até o seu próximo turno', ac: 5 }, reminder: 'Vale contra o ataque que disparou a reação; anula Mísseis Mágicos.' };
    case 'sp-escudofe':
      return { target: 'choose', effect: { until: conc(sp), label: '+2 CA', ac: 2 } };
    case 'sp-hipnose': // Acelerar
      return {
        target: 'choose',
        effect: { until: 'concentration', label: '+2 CA · deslocamento dobrado · ação extra', ac: 2, speedDouble: true },
        reminder: 'Ao acabar, o alvo fica sem se mover nem agir até o fim do próximo turno.',
      };
    case 'phb-longstrider':
      return { target: 'choose', effect: { until: 'rest', label: '+3 m de deslocamento', speed: 3 } };
    case 'phb-barkskin':
      return { target: 'choose', effect: { until: 'concentration', label: 'CA mínima 16', acMin: 16 } };
    case 'sp-bencao':
      return { target: 'choose', effect: { until: 'concentration', label: '+1d4 em ataques e salvaguardas' } };
    default:
      return null;
  }
}

/** Rola os PV temporários de um resultado (Vitalidade Falsa: 1d4 + 4 + 5/círculo). */
export function rollTempHp(t: { dice?: string; flat: number }, rand: () => number = Math.random): number {
  const d = parseDice(t.dice);
  let sum = t.flat;
  if (d) for (let i = 0; i < d.count; i++) sum += 1 + Math.floor(rand() * d.sides);
  return sum;
}

/** Economia de ação pelo tempo de conjuração. */
export function castTurnKey(castingTime: string | undefined): 'action' | 'bonus' | 'reaction' | null {
  const t = (castingTime ?? '').toLowerCase();
  if (t.includes('bônus')) return 'bonus';
  if (t.includes('reação')) return 'reaction';
  if (/^1 ação/.test(t)) return 'action';
  return null; // 1 minuto, 10 minutos… (fora do combate)
}
