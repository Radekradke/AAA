import type { Character } from '@/types/character';
import { barbarianState } from '@/engine/barbarian';
import { useCharacterStore } from '@/store/characterStore';
import { toast } from '@/store/feedbackStore';

/**
 * Fúria do Bárbaro na mesa: entrar (gasta 1 uso e a ação bônus), ver o que
 * ela faz enquanto dura e encerrar. Também liga o Ataque Imprudente do turno.
 */
export function RagePanel({ char }: { char: Character }) {
  const store = useCharacterStore();
  const st = barbarianState(char);
  if (!st) return null;
  const uses = st.unlimited ? 'ilimitada' : `${st.usesLeft}/${st.usesMax}`;
  const noUses = !st.unlimited && st.usesLeft <= 0;

  const start = (frenzy = false) => {
    if (char.combat.concentration) toast('Em Fúria você não se concentra: a concentração acabou.', { tone: 'info' });
    if (char.combat.concentration) store.toggleConcentration(char.id);
    store.startRage(char.id, frenzy);
  };
  const end = () => {
    if (st.frenzy) toast('Frenesi: a Fúria acabou e você ganhou 1 nível de exaustão.', { tone: 'danger' });
    store.endRage(char.id);
  };

  return (
    <section className={'fv-rage' + (st.raging ? ' is-on' : '')} aria-label="Fúria do Bárbaro">
      {st.raging ? (
        <>
          <header className="fv-rage-head">
            <b>🔥 Em Fúria</b>
            <span>{st.frenzy ? 'com Frenesi · ' : ''}+{st.bonus} dano · usos {uses}</span>
          </header>
          <ul className="fv-rage-effects">
            {st.effects.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <button type="button" className="fv-rage-end" onClick={end}>
            Encerrar Fúria{st.frenzy ? ' (+1 exaustão)' : ''}
          </button>
        </>
      ) : (
        <div className="fv-rage-start">
          <button type="button" className="fv-rage-go" disabled={noUses} onClick={() => start(false)}>
            🔥 Entrar em Fúria <small>ação bônus · {noUses ? 'sem usos (descanso longo)' : `usos ${uses}`}</small>
          </button>
          {st.berserker && (
            <button type="button" className="fv-rage-go is-frenzy" disabled={noUses} onClick={() => start(true)} title="Frenesi: ataque corpo a corpo extra como ação bônus em cada turno; ao fim da Fúria, 1 nível de exaustão">
              com Frenesi <small>ataque bônus · exaustão no fim</small>
            </button>
          )}
        </div>
      )}
      {st.level >= 2 && (
        <button
          type="button"
          className={'fv-rage-reckless' + (st.reckless ? ' is-on' : '')}
          aria-pressed={st.reckless}
          onClick={() => store.setMark(char.id, 'reckless', !st.reckless)}
          title="No primeiro ataque do turno: vantagem nos seus ataques corpo a corpo com FOR neste turno, mas ataques contra você têm vantagem até o seu próximo turno."
        >
          {st.reckless ? '✓ ' : ''}Ataque Imprudente
          <small>{st.reckless ? 'vantagem nos seus ataques de FOR · inimigos com vantagem em você' : 'vantagem em ataques corpo a corpo com FOR neste turno'}</small>
        </button>
      )}
    </section>
  );
}
