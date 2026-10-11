import type { Character } from '@/types/character';
import { characterResources } from '@/engine/classResources';
import { levelIn } from '@/engine/damageExtras';
import { useCharacterStore } from '@/store/characterStore';
import { historyFor, useUiStore } from '@/store/uiStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { toast } from '@/store/feedbackStore';

/**
 * Guerreiro na mesa: Retomar o Fôlego (cura de verdade), Surto de Ação
 * (devolve a ação do turno) e Indomável (rola de novo a última salvaguarda).
 */
export function FighterPanel({ char }: { char: Character }) {
  const store = useCharacterStore();
  const { rollDice, check } = useDiceRoller();
  const history = useUiStore((s) => s.history);
  const lv = levelIn(char, 'fighter');
  if (!lv) return null;
  const res = Object.fromEntries(characterResources(char).map((r) => [r.id, r]));
  const left = (id: string) => Math.min(res[id]?.max ?? 0, char.combat.resources[id] ?? res[id]?.max ?? 0);
  const spend = (id: string) => store.setResource(char.id, id, left(id) - 1);
  // última salvaguarda desta ficha (para o Indomável)
  const lastSave = historyFor(history, char.id).find((r) => /^Resist\. de /.test(r.label) && !/Indomável/.test(r.label));

  const secondWind = () => {
    if (!left('secondWind')) return;
    const r = rollDice(10, { modifier: lv, label: 'Retomar o Fôlego' });
    spend('secondWind');
    store.heal(char.id, r.total);
    store.useTurn(char.id, 'bonus');
    toast(`Retomar o Fôlego: +${r.total} PV (ação bônus).`, { tone: 'ok' });
  };
  const surge = () => {
    if (!left('surge')) return;
    spend('surge');
    if (char.combat.turn.action) store.toggleTurn(char.id, 'action');
    toast('Surto de Ação: você tem mais uma ação neste turno.', { tone: 'ok' });
  };
  const indomitable = () => {
    if (!left('indomitable') || !lastSave) return;
    spend('indomitable');
    check(`${lastSave.label.split(' · ')[0]} · Indomável`, lastSave.modifier);
  };

  return (
    <section className="fv-rage fv-fighter" aria-label="Guerreiro">
      <div className="fv-rage-start">
        <button type="button" className="fv-rage-go is-steel" disabled={!left('secondWind')} onClick={secondWind} title="Ação bônus: recupera 1d10 + nível de guerreiro em PV. Volta no descanso curto.">
          Retomar o Fôlego <small>1d10 + {lv} PV · ação bônus · {left('secondWind')}/{res.secondWind?.max ?? 1}</small>
        </button>
        {res.surge && (
          <button type="button" className="fv-rage-go is-steel" disabled={!left('surge')} onClick={surge} title="Uma ação adicional neste turno. Volta no descanso curto.">
            Surto de Ação <small>+1 ação neste turno · {left('surge')}/{res.surge.max}</small>
          </button>
        )}
        {res.indomitable && (
          <button
            type="button"
            className="fv-rage-go is-steel"
            disabled={!left('indomitable') || !lastSave}
            onClick={indomitable}
            title="Rola de novo uma salvaguarda que falhou (fica com o novo resultado). Volta no descanso longo."
          >
            Indomável <small>{lastSave ? `rolar de novo: ${lastSave.label.split(' · ')[0]} (${lastSave.total})` : 'faça uma salvaguarda primeiro'} · {left('indomitable')}/{res.indomitable.max}</small>
          </button>
        )}
      </div>
    </section>
  );
}
