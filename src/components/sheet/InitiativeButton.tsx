import { useState } from 'react';
import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { initiativeRules } from '@/engine/initiative';
import { modStr } from '@/engine/dice';
import { music } from '@/lib/music';
import { useSessionStore } from '@/store/sessionStore';
import { toast } from '@/store/feedbackStore';

/**
 * Rola a iniciativa já com o que a classe muda nela: vantagem do Instinto
 * Selvagem e recursos que voltam ao rolar (Implacável, Perfeição, Inspiração
 * Superior). Mostra o último resultado para lembrar a ordem na mesa.
 */
export function InitiativeButton({ char, derived, compact }: { char: Character; derived: DerivedCharacter; compact?: boolean }) {
  const { check } = useDiceRoller();
  const store = useCharacterStore();
  const [last, setLast] = useState<number | null>(null);
  const rules = initiativeRules(char);

  const roll = () => {
    const mode = useUiStore.getState().rollMode;
    // vantagem de classe + desvantagem da mesa se anulam (regra geral do d20)
    const adv = mode === 'advantage' || rules.advantage;
    const dis = mode === 'disadvantage';
    const label = rules.advantage ? `Iniciativa · ${rules.advantageSource}` : 'Iniciativa';
    const r = check(label, derived.initiative, { advantage: adv && !dis, disadvantage: dis && !adv });
    setLast(r.total);
    // com a trilha tocando, o combate ganha a música de batalha
    if (music.get().playing) music.setMood('combate');
    for (const f of rules.refills) store.setResource(char.id, f.resId, f.value);
    if (rules.secondTurn) toast(`Reflexos de Ladrão: na 1ª rodada você age de novo na iniciativa ${r.total - 10}.`, { tone: 'info' });
    // na mesa ao vivo, se este herói está no encontro, o valor vai para a ordem compartilhada
    void useSessionStore.getState().reportInitiative(char.id, r.total);
  };

  const tip = [
    `1d20 ${modStr(derived.initiative)}`,
    rules.advantage ? `vantagem (${rules.advantageSource})` : '',
    ...rules.refills.map((f) => f.label),
    rules.secondTurn ? '2º turno na 1ª rodada (−10)' : '',
  ].filter(Boolean).join(' · ');

  return (
    <button type="button" className={'fv-init-btn' + (compact ? ' is-compact' : '')} onClick={roll} title={tip} aria-label={`Rolar iniciativa (${tip})`}>
      <span className="fv-init-btn-icon" aria-hidden>⚔</span>
      <span className="fv-init-btn-text">
        <b>Rolar Iniciativa</b>
        <small>{modStr(derived.initiative)}{rules.advantage ? ' · vantagem' : ''}</small>
      </span>
      {last !== null && (
        <span className="fv-init-btn-last" title="Último resultado">
          {last}
        </span>
      )}
    </button>
  );
}
