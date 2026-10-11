import type { Character } from '@/types/character';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { castDiceLabel, rollCastDice } from '@/components/spells/castRoll';

const UNTIL: Record<string, string> = { turn: 'até seu próximo turno', concentration: 'concentração', rest: 'até o descanso longo' };
const MARKS: Record<string, string> = { hex: 'Bruxaria · +1d6 necrótico', huntersMark: 'Marca do Caçador · +1d6', rage: 'Fúria', frenzy: 'Frenesi (exaustão ao fim)', reckless: 'Imprudente · inimigos com vantagem em você' };

/**
 * Magias e efeitos ligados agora — a ficha já está somando; × encerra.
 * Efeito com dano depois de conjurar (Raio Lunar, Destruição) traz o botão
 * para rolar esse dano quando acontecer, sem conjurar de novo.
 */
export function ActiveEffects({ char }: { char: Character }) {
  const store = useCharacterStore();
  const pushRoll = useUiStore((s) => s.pushRoll);
  const effects = char.combat.spellEffects ?? [];
  const marks = char.combat.marks ?? [];
  if (!effects.length && !marks.length) return null;
  return (
    <div className="fv-spell-effects" aria-label="Efeitos ativos">
      {effects.map((e) => (
        <span key={e.spellId} className="fv-spell-effect" title={e.roll ? `${e.roll.when} · ${UNTIL[e.until]}` : UNTIL[e.until]}>
          <b>{e.name}</b> {e.label} <small>{UNTIL[e.until]}</small>
          {e.roll && (
            <button
              type="button"
              className="fv-spell-effect-roll"
              onClick={() => {
                const r = rollCastDice(e.roll!);
                if (r) pushRoll(r);
              }}
              aria-label={`Rolar ${castDiceLabel(e.roll)} de ${e.name} (${e.roll.when})`}
              title={e.roll.when}
            >
              🎲 {castDiceLabel(e.roll)}
            </button>
          )}
          <button type="button" onClick={() => store.removeSpellEffect(char.id, e.spellId)} aria-label={`Encerrar ${e.name}`}>×</button>
        </span>
      ))}
      {marks.map((m) => (
        <span key={m} className="fv-spell-effect">
          <b>{MARKS[m]}</b>
          <button type="button" onClick={() => (m === 'rage' || m === 'frenzy' ? store.endRage(char.id) : store.setMark(char.id, m, false))} aria-label={`Encerrar ${MARKS[m]}`}>×</button>
        </span>
      ))}
    </div>
  );
}
