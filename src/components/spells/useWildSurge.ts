import { useCallback } from 'react';
import type { Character } from '@/types/character';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { useCharacterStore } from '@/store/characterStore';
import { toast } from '@/store/feedbackStore';
import { wildSurgeEffect } from '@/engine/sorcerer';
import { levelIn } from '@/engine/damageExtras';

/**
 * Magia Selvagem (Feiticeiro 1º): depois de conjurar magia de 1º círculo ou
 * mais, o mestre pode pedir 1d20 — no 1, rola 1d100 na tabela de Surto. Um
 * surto devolve as Marés do Caos. Caos Controlado (14º) rola duas vezes.
 */
export function useWildSurge(char: Character) {
  const { rollDice } = useDiceRoller();
  const setResource = useCharacterStore((s) => s.setResource);
  const surge = useCallback(() => {
    const twice = levelIn(char, 'sorcerer') >= 14;
    const a = rollDice(100, { label: 'Surto de Magia Selvagem' }).total;
    const b = twice ? rollDice(100, { label: 'Surto de Magia Selvagem (Caos Controlado)' }).total : null;
    setResource(char.id, 'tides', 1);
    const text = b === null ? `${a}: ${wildSurgeEffect(a)}` : `escolha um — ${a}: ${wildSurgeEffect(a)} | ${b}: ${wildSurgeEffect(b)}`;
    toast(`Surto de Magia Selvagem ${text} (Marés do Caos voltou).`, { tone: 'info' });
  }, [char, rollDice, setResource]);
  const check = useCallback(() => {
    const r = rollDice(20, { label: 'Magia Selvagem (d20: no 1, surto)' });
    if (r.total === 1) surge();
    else toast(`Magia Selvagem: ${r.total} — sem surto.`, { tone: 'info' });
  }, [rollDice, surge]);
  return { surge, check, wild: char.subclassId === 'wild' && levelIn(char, 'sorcerer') >= 1 };
}
