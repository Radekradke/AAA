import type { Character } from '@/types/character';
import { useCharacterStore } from '@/store/characterStore';

const UNTIL: Record<string, string> = { turn: 'até seu próximo turno', concentration: 'concentração', rest: 'até o descanso longo' };
const MARKS: Record<string, string> = { hex: 'Bruxaria · +1d6 necrótico', huntersMark: 'Marca do Caçador · +1d6', rage: 'Fúria' };

/** Magias e efeitos ligados agora — a ficha já está somando; × encerra. */
export function ActiveEffects({ char }: { char: Character }) {
  const store = useCharacterStore();
  const effects = char.combat.spellEffects ?? [];
  const marks = char.combat.marks ?? [];
  if (!effects.length && !marks.length) return null;
  return (
    <div className="fv-spell-effects" aria-label="Efeitos ativos">
      {effects.map((e) => (
        <span key={e.spellId} className="fv-spell-effect" title={UNTIL[e.until]}>
          <b>{e.name}</b> {e.label} <small>{UNTIL[e.until]}</small>
          <button type="button" onClick={() => store.removeSpellEffect(char.id, e.spellId)} aria-label={`Encerrar ${e.name}`}>×</button>
        </span>
      ))}
      {marks.map((m) => (
        <span key={m} className="fv-spell-effect">
          <b>{MARKS[m]}</b>
          <button type="button" onClick={() => store.setMark(char.id, m, false)} aria-label={`Encerrar ${MARKS[m]}`}>×</button>
        </span>
      ))}
    </div>
  );
}
