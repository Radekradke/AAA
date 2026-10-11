import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { KI_BASICS, monkState } from '@/engine/monk';
import type { KiAction } from '@/engine/monk';
import { useCharacterStore } from '@/store/characterStore';
import { historyFor, useUiStore } from '@/store/uiStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { toast } from '@/store/feedbackStore';

/**
 * Monge na mesa: cada uso de ki gasta o ponto e a ação certa — Rajada de
 * Golpes, Defesa Paciente (Esquivar de verdade), Passo do Vento (Disparada),
 * Mente Tranquila, Alma de Diamante, Corpo Vazio e as técnicas das tradições.
 */
export function MonkPanel({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const store = useCharacterStore();
  const { rollDice, check } = useDiceRoller();
  const history = useUiStore((s) => s.history);
  const monk = monkState(char, derived.proficiency, derived.abilities.wis.mod, derived.abilities.dex.mod);
  if (!monk || monk.level < 2) return null;
  const turn = char.combat.turn;
  const busy = (uses: KiAction['uses']) => (uses === 'bonus' ? turn.bonus : uses === 'action' ? turn.action : uses === 'reaction' ? turn.reaction : false);
  const lastSave = historyFor(history, char.id).find((r) => /^Resist\. de /.test(r.label) && !/Alma de Diamante|Indomável/.test(r.label));
  const mindBlock = char.combat.conditions.filter((c) => c === 'Enfeitiçado' || c === 'Amedrontado');

  /** Gasta o ki e a ação; devolve false se não der. */
  const spend = (cost: number, uses: KiAction['uses']) => {
    if (monk.kiLeft < cost || busy(uses)) return false;
    if (cost) store.setResource(char.id, 'ki', monk.kiLeft - cost);
    if (uses) store.useTurn(char.id, uses);
    return true;
  };
  const kiBtn = (a: KiAction, run: () => void, extra?: string) => (
    <button
      key={a.id}
      type="button"
      className="fv-rage-go is-steel"
      disabled={monk.kiLeft < a.cost || busy(a.uses)}
      onClick={() => spend(a.cost, a.uses) && run()}
      title={a.desc}
    >
      {a.label} <small>{a.cost ? `${a.cost} ki` : 'sem ki'}{a.uses ? ` · ${a.uses === 'bonus' ? 'ação bônus' : a.uses === 'action' ? 'ação' : 'reação'}` : ''}{extra ? ` · ${extra}` : ''}</small>
    </button>
  );
  const [flurry, patient, step] = KI_BASICS;

  return (
    <section className="fv-rage fv-monk" aria-label="Monge">
      <div className="fv-monk-ki" aria-live="polite">
        <b>Ki {monk.kiLeft}/{monk.kiMax}</b>
        <small>CD de ki {monk.dc} · Artes Marciais 1d{monk.maDie} · volta no descanso curto</small>
      </div>
      <div className="fv-rage-start">
        {kiBtn(flurry, () =>
          toast(
            `Rajada de Golpes: dois golpes desarmados (1d${monk.maDie} cada).${monk.openHand ? ` Mão Aberta: a cada acerto, DES CD ${monk.dc} ou cai, FOR CD ${monk.dc} ou é empurrado 4,5 m, ou fica sem reações.` : ''}`,
            { tone: 'ok' },
          ),
        )}
        {kiBtn(patient, () => {
          store.setMark(char.id, 'dodge', true);
          toast('Defesa Paciente: você está Esquivando até o seu próximo turno.', { tone: 'ok' });
        })}
        {kiBtn(step, () => {
          store.dash(char.id, 'bonus');
          toast('Passo do Vento: deslocamento dobrado neste turno (ou use como Desengajar).', { tone: 'ok' });
        }, 'Disparada ou Desengajar')}
        {monk.stillness && (
          <button type="button" className="fv-rage-go is-steel" disabled={!mindBlock.length || turn.action} onClick={() => {
            for (const c of mindBlock) store.toggleCondition(char.id, c);
            store.useTurn(char.id, 'action');
            toast(`Mente Tranquila: ${mindBlock.join(' e ').toLowerCase()} encerrado.`, { tone: 'ok' });
          }} title="Ação: encerra em você um efeito que o deixa enfeitiçado ou amedrontado.">
            Mente Tranquila <small>{mindBlock.length ? `encerra ${mindBlock.join(', ').toLowerCase()}` : 'sem enfeitiçado/amedrontado'} · ação</small>
          </button>
        )}
        {monk.diamondSoul && (
          <button type="button" className="fv-rage-go is-steel" disabled={monk.kiLeft < 1 || !lastSave} onClick={() => {
            if (!lastSave || !spend(1, null)) return;
            check(`${lastSave.label.split(' · ')[0]} · Alma de Diamante`, lastSave.modifier);
          }} title="Gaste 1 ki para rolar de novo uma salvaguarda que falhou (fica com o novo resultado).">
            Alma de Diamante <small>{lastSave ? `rolar de novo: ${lastSave.label.split(' · ')[0]} (${lastSave.total})` : 'faça uma salvaguarda primeiro'} · 1 ki</small>
          </button>
        )}
        {monk.emptyBody && kiBtn({ id: 'empty', label: 'Corpo Vazio', cost: 4, uses: 'action', desc: 'Ação, 4 ki: invisível por 1 minuto e resistência a todo dano, exceto de força. (8 ki: Projeção Astral, sem componentes.)' }, () =>
          toast('Corpo Vazio: invisível por 1 minuto, com resistência a todo dano exceto força.', { tone: 'ok' }),
        )}
        {monk.wholenessHeal && (
          <button type="button" className="fv-rage-go is-steel" disabled={!(char.combat.resources.wholeness ?? 1) || turn.action} onClick={() => {
            store.setResource(char.id, 'wholeness', 0);
            store.useTurn(char.id, 'action');
            store.heal(char.id, monk.wholenessHeal!);
            toast(`Integridade do Corpo: +${monk.wholenessHeal} PV.`, { tone: 'ok' });
          }} title="Ação: recupera 3 × nível de monge em PV. Volta no descanso longo.">
            Integridade do Corpo <small>+{monk.wholenessHeal} PV · ação · {(char.combat.resources.wholeness ?? 1) ? '1/1' : '0/1'}</small>
          </button>
        )}
        {monk.quiveringPalm && kiBtn({ id: 'palm', label: 'Palma Trêmula', cost: 3, uses: null, desc: 'Ao acertar um golpe desarmado, gaste 3 ki. Depois, com uma ação, o alvo faz salvaguarda de CON: falha cai a 0 PV; sucesso sofre 10d10 necrótico.' }, () => {
          const r = rollDice(10, { count: 10, label: `Palma Trêmula (CON CD ${monk.dc}: falha = 0 PV)`, damage: true });
          toast(`Palma Trêmula: CON CD ${monk.dc}. Falha: o alvo cai a 0 PV. Sucesso: ${r.total} de dano necrótico.`, { tone: 'info' });
        }, `CON CD ${monk.dc}`)}
        {monk.shadowArts && kiBtn({ id: 'shadow', label: 'Artes das Sombras', cost: 2, uses: 'action', desc: 'Ação, 2 ki: escuridão, visão no escuro, passos sem pegadas ou silêncio, sem componentes materiais.' }, () =>
          toast('Artes das Sombras: conjure escuridão, visão no escuro, passos sem pegadas ou silêncio.', { tone: 'ok' }),
        )}
        {monk.shadowStep && (
          <button type="button" className="fv-rage-go is-steel" disabled={turn.bonus} onClick={() => {
            store.useTurn(char.id, 'bonus');
            toast('Passo das Sombras: teleporte até 18 m entre sombras; vantagem no próximo ataque corpo a corpo deste turno.', { tone: 'ok' });
          }} title="Ação bônus, na penumbra ou escuridão: teleporta até 18 m para outra sombra e ganha vantagem no primeiro ataque corpo a corpo antes do fim do turno.">
            Passo das Sombras <small>ação bônus · teleporte 18 m</small>
          </button>
        )}
        {monk.disciplines.map((d) =>
          kiBtn(d, () => {
            const dmg = d.damage ? rollDice(d.damage.die, { count: d.damage.count, label: `${d.label} (${d.damage.type})`, damage: true }) : null;
            toast(`${d.label}: ${d.desc.replace(/\.$/, '')}. CD ${monk.dc}.${dmg ? ` Dano: ${dmg.total} de ${d.damage!.type}.` : ''}`, { tone: 'info' });
          }, `CD ${monk.dc}`),
        )}
      </div>
      <ul className="fv-rage-effects">
        {monk.deflectBonus !== null && <li>Defletir Projéteis{monk.slowFall ? ' e Queda Lenta ficam' : ' fica'} no “Aplicar dano” (reação).</li>}
        {monk.stunning && <li>Golpe Atordoante: no dano de um ataque corpo a corpo (1 ki, CON CD {monk.dc}).</li>}
        {monk.disciplines.length > 0 && <li>Disciplinas: até {monk.maxKiPerDiscipline} ki por uso.</li>}
        {monk.purity && <li>Pureza do Corpo: imune a doenças e veneno (a ficha não deixa marcar Envenenado).</li>}
      </ul>
    </section>
  );
}
