import { useEffect, useRef, useState } from 'react';
import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { ABILITY_LABELS } from '@/data/skills';
import { isTypingTarget, SHORTCUT_HELP, shortcutFor, type ShortcutAction } from '@/engine/shortcuts';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { useUiStore } from '@/store/uiStore';
import { Modal } from '@/components/ui/Modal';
import { useInitiativeRoll } from './InitiativeButton';

/** Teclado físico e mouse (PC): no celular os atalhos ficam desligados. */
const hasKeyboard = () => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

/** Algum modal aberto? Atalho não rola por trás dele. */
const modalOpen = () => !!document.querySelector('[aria-modal="true"]');

/** Clica no botão da tela quando ele está visível (mesmo caminho do mouse: munição, popups, último resultado). */
function clickVisible(selector: string): boolean {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el || !el.offsetParent || (el as HTMLButtonElement).disabled) return false;
  el.click();
  return true;
}

/**
 * Atalhos de rolagem na ficha (PC): I iniciativa, A ataque, 1–6 testes,
 * Alt+1–6 salvaguardas, P/F perícias, D d20, Shift = vantagem, ? = ajuda.
 * Não age com o foco num campo de texto, com modal aberto ou no celular.
 */
export function useRollShortcuts(char: Character, derived: DerivedCharacter) {
  const on = useUiStore((s) => s.shortcuts);
  const [help, setHelp] = useState(false);
  const { checkFor, attack, checkD20 } = useDiceRoller();
  const rollInitiative = useInitiativeRoll(char, derived);
  // sempre a ficha mais nova, sem religar o listener a cada mudança
  const latest = useRef({ char, derived, rollInitiative });
  latest.current = { char, derived, rollInitiative };

  useEffect(() => {
    if (!on || !hasKeyboard()) return;
    const run = (action: ShortcutAction) => {
      const { char: c, derived: d, rollInitiative: init } = latest.current;
      switch (action.kind) {
        case 'help':
          return setHelp(true);
        case 'initiative':
          return clickVisible('.fv-init-btn') || init();
        case 'attack': {
          const atk = d.attacks[0];
          if (!atk) return;
          return clickVisible(`[data-attack-hit="${CSS.escape(atk.uid)}"]`) || attack(atk);
        }
        case 'check': {
          const a = d.abilities[action.ability];
          return checkFor(c, 'check', action.ability, `Teste de ${ABILITY_LABELS[action.ability]}`, a.mod);
        }
        case 'save': {
          const a = d.abilities[action.ability];
          return checkFor(c, 'save', action.ability, `Resist. de ${ABILITY_LABELS[action.ability]}`, a.save);
        }
        case 'skill': {
          const sk = d.skills.find((s) => s.key === action.skill);
          if (!sk) return;
          return checkFor(c, 'check', sk.ability, sk.label, sk.bonus, { skill: sk.key, proficient: sk.proficient, speed: d.speed });
        }
        case 'd20': {
          const mode = useUiStore.getState().rollMode;
          return checkD20({ label: 'd20', advantage: mode === 'advantage', disadvantage: mode === 'disadvantage' });
        }
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTypingTarget(e.target as HTMLElement) || modalOpen()) return;
      const hit = shortcutFor(e);
      if (!hit) return;
      e.preventDefault();
      // Shift = vantagem só nesta rolagem (sem mexer no modo escolhido nem na inspiração preparada)
      const prev = useUiStore.getState().rollMode;
      if (hit.advantage) useUiStore.setState({ rollMode: 'advantage' });
      try {
        run(hit.action);
      } finally {
        if (hit.advantage) useUiStore.setState({ rollMode: prev });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [on, checkFor, attack, checkD20]);

  return { help, closeHelp: () => setHelp(false) };
}

/** Liga os atalhos na ficha aberta e mostra o painel "?" quando pedido. */
export function SheetShortcuts({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const { help, closeHelp } = useRollShortcuts(char, derived);
  return help ? <ShortcutsHelp onClose={closeHelp} /> : null;
}

/** Painel "?" com a lista de atalhos. */
export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Atalhos de teclado" icon="help" onClose={onClose} maxWidth={440}>
      <ShortcutList />
      <p className="fv-live-hint">Não funcionam enquanto você digita num campo ou com uma janela aberta. Desligue em Configurações.</p>
    </Modal>
  );
}

export function ShortcutList() {
  return (
    <dl className="fv-keys">
      {SHORTCUT_HELP.map((s) => (
        <div key={s.keys}>
          <dt><kbd>{s.keys}</kbd></dt>
          <dd>{s.what}</dd>
        </div>
      ))}
    </dl>
  );
}
