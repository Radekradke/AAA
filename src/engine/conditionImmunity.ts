import { subclassOf } from './characterClasses';
import type { Character } from '@/types/character';
import { levelIn } from './damageExtras';

/**
 * Condições que a classe não deixa marcar (PHB 2014):
 * · Pureza do Corpo (Monge 10º): imune a doenças e veneno (Envenenado).
 * · Guarda da Natureza (Druida da Terra 10º): imune a veneno e doenças.
 * · Aura de Coragem (Paladino 10º): não pode ficar Amedrontado.
 * · Aura de Devoção (Juramento de Devoção 7º): não pode ficar Enfeitiçado.
 * · Defesas Encantadoras (Arquifada 10º): não pode ficar Enfeitiçado.
 * Devolve o motivo, ou null se a condição pode ser marcada.
 */
export function conditionImmunity(char: Character, cond: string): string | null {
  if (cond === 'Envenenado' && levelIn(char, 'monk') >= 10) return 'Pureza do Corpo';
  if (cond === 'Envenenado' && subclassOf(char, 'druid') === 'land' && levelIn(char, 'druid') >= 10) return 'Guarda da Natureza';
  const pal = levelIn(char, 'paladin');
  if (cond === 'Amedrontado' && pal >= 10) return 'Aura de Coragem';
  if (cond === 'Enfeitiçado' && pal >= 7 && subclassOf(char, 'paladin') === 'devotion') return 'Aura de Devoção';
  if (cond === 'Enfeitiçado' && subclassOf(char, 'warlock') === 'archfey' && levelIn(char, 'warlock') >= 10) return 'Defesas Encantadoras';
  return null;
}
