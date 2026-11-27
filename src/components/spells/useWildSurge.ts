import { subclassOf } from '@/engine/characterClasses';
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
  const surge = useCallback(async () => {
    const twice = levelIn(char, 'sorcerer') >= 14;
    const ra = await rollDice(100, { label: 'Surto de Magia Selvagem' });
    if (!ra) return;
    const rb = twice ? await rollDice(100, { label: 'Surto de Magia Selvagem (Caos Controlado)' }) : null;
    if (twice && !rb) return;
    const a = ra.total;
    const b = rb ? rb.total : null;
    setResource(char.id, 'tides', 1);
    const text = b === null ? `${a}: ${wildSurgeEffect(a)}` : `escolha um — ${a}: ${wildSurgeEffect(a)} | ${b}: ${wildSurgeEffect(b)}`;
    toast(`Surto de Magia Selvagem ${text} (Marés do Caos voltou).`, { tone: 'info' });
  }, [char, rollDice, setResource]);
  const check = useCallback(async () => {
    const r = await rollDice(20, { label: 'Magia Selvagem (d20: no 1, surto)' });
    if (!r) return;
    if (r.total === 1) await surge();
    else toast(`Magia Selvagem: ${r.total} — sem surto.`, { tone: 'info' });
  }, [rollDice, surge]);
  return { surge, check, wild: subclassOf(char, 'sorcerer') === 'wild' && levelIn(char, 'sorcerer') >= 1 };
}
