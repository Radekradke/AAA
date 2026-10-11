import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { bardState } from '@/engine/bard';
import { useCharacterStore } from '@/store/characterStore';
import { historyFor, useUiStore } from '@/store/uiStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { toast } from '@/store/feedbackStore';

/**
 * Bardo na mesa: a Inspiração de Bardo à vista e gastável (dar a um aliado,
 * Palavras Cortantes, Habilidade Incomparável), Canção de Descanso no
 * descanso curto e Contraencanto.
 */
export function BardPanel({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const store = useCharacterStore();
  const { rollDice } = useDiceRoller();
  const history = useUiStore((s) => s.history);
  const bd = bardState(char, derived.proficiency, derived.abilities.cha.mod);
  if (!bd) return null;
  const turn = char.combat.turn;
  const d = `1d${bd.die}`;
  const spend = () => store.setResource(char.id, 'inspiration', bd.left - 1);
  const act = (kind: 'action' | 'bonus' | 'reaction') => store.useTurn(char.id, kind);
  const lastCheck = historyFor(history, char.id).find((r) => r.sides === 20 && !r.damage && !/Habilidade Incomparável/.test(r.label));
  const btn = (key: string, label: string, sub: string, title: string, disabled: boolean, run: () => void) => (
    <button key={key} type="button" className="fv-rage-go is-steel" disabled={disabled} onClick={run} title={title}>
      {label} <small>{sub}</small>
    </button>
  );
  const giveText = bd.combatInspiration
    ? `o aliado soma ${d} a um teste, ataque ou salvaguarda — ou ao dano de uma arma, ou à CA contra um ataque (Inspiração de Combate)`
    : `o aliado soma ${d} a um teste, ataque ou salvaguarda nos próximos 10 minutos`;

  return (
    <section className="fv-rage fv-bard" aria-label="Bardo">
      <div className="fv-monk-ki">
        <b>Inspiração de Bardo {bd.left}/{bd.max}</b>
        <small>{d} · volta no descanso {bd.shortRest ? 'curto (Fonte de Inspiração)' : 'longo'} · CD {bd.dc}</small>
      </div>
      <div className="fv-rage-start">
        {btn('give', 'Dar Inspiração', `ação bônus · ${d} · 18 m`, `Ação bônus: uma criatura (não você) que te ouça a 18 m ganha um dado de Inspiração; ${giveText}.`, !bd.left || turn.bonus, () => {
          spend();
          act('bonus');
          toast(`Inspiração de Bardo: ${giveText}.`, { tone: 'ok' });
        })}
        {bd.cuttingWords &&
          btn('cutting', 'Palavras Cortantes', `reação · −${d}`, 'Reação: quando uma criatura a 18 m faz uma jogada de ataque, teste de atributo ou de dano, subtraia o dado de Inspiração (depois de ver o d20, antes do resultado).', !bd.left || turn.reaction, () => {
            const r = rollDice(bd.die, { label: 'Palavras Cortantes' });
            spend();
            act('reaction');
            toast(`Palavras Cortantes: −${r.total} na jogada da criatura.`, { tone: 'info' });
          })}
        {bd.peerless &&
          btn('peerless', 'Habilidade Incomparável', lastCheck ? `+${d} em ${lastCheck.label.split(' · ')[0]} (${lastCheck.total})` : 'faça um teste antes', 'Gaste uma Inspiração para somar o dado a um teste de atributo seu (depois de rolar, antes do resultado).', !bd.left || !lastCheck, () => {
            const r = rollDice(bd.die, { label: 'Habilidade Incomparável' });
            spend();
            toast(`Habilidade Incomparável: ${lastCheck!.label.split(' · ')[0]} ${lastCheck!.total} + ${r.total} = ${lastCheck!.total + r.total}.`, { tone: 'ok' });
          })}
        {bd.songDie &&
          btn('song', 'Canção de Descanso', `descanso curto · +1d${bd.songDie}`, 'No descanso curto, quem gastar Dados de Vida e te ouvir recupera mais 1 dado de PV (uma vez por descanso).', false, () => {
            const r = rollDice(bd.songDie!, { label: 'Canção de Descanso' });
            toast(`Canção de Descanso: +${r.total} PV para cada aliado que gastou Dados de Vida neste descanso.`, {
              tone: 'ok',
              action: char.hpCurrent < derived.maxHp ? { label: `Em mim (+${r.total})`, run: () => store.heal(char.id, r.total) } : undefined,
            });
          })}
        {bd.countercharm &&
          btn('counter', 'Contraencanto', 'ação · até o fim do próximo turno', 'Ação: você e aliados a 9 m que te ouçam têm vantagem contra ficar amedrontados ou enfeitiçados.', turn.action, () => {
            act('action');
            toast('Contraencanto: vantagem contra amedrontado e enfeitiçado a 9 m até o fim do seu próximo turno.', { tone: 'ok' });
          })}
      </div>
      <ul className="fv-rage-effects">
        {bd.jack !== null && <li>Pau pra Toda Obra: +{bd.jack} nos testes sem proficiência e na iniciativa (já nas perícias).</li>}
        {bd.level >= 3 && <li>Aptidão: escolha as perícias com o bônus dobrado em Ficha → Perícias.</li>}
        {bd.battleMagic && <li>Magia de Batalha: ao conjurar com uma ação, faça um ataque com arma como ação bônus.</li>}
        {bd.superior && <li>Inspiração Superior: sem Inspiração ao rolar iniciativa, a ficha devolve 1.</li>}
      </ul>
    </section>
  );
}
