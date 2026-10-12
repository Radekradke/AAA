import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { FIEND_RESILIENCE_TYPES, warlockState } from '@/engine/warlock';
import { useCharacterStore } from '@/store/characterStore';
import { historyFor, useUiStore } from '@/store/uiStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { toast } from '@/store/feedbackStore';

/**
 * Bruxo na mesa: espaços de pacto à vista, Mestre Místico que devolve os
 * espaços e as habilidades do patrono como botões que gastam o uso certo.
 */
export function WarlockPanel({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const store = useCharacterStore();
  const { rollDice } = useDiceRoller();
  const history = useUiStore((s) => s.history);
  const wl = warlockState(char, derived.proficiency, derived.abilities.cha.mod);
  if (!wl) return null;
  const turn = char.combat.turn;
  const lastCheck = historyFor(history, char.id).find((r) => r.sides === 20 && !r.damage && !/Sorte do Tinhoso/.test(r.label));
  const spend = (id: string, n: number) => store.setResource(char.id, id, n - 1);
  const act = (kind: 'action' | 'bonus' | 'reaction') => store.useTurn(char.id, kind);
  const btn = (key: string, label: string, sub: string, title: string, disabled: boolean, run: () => void) => (
    <button key={key} type="button" className="fv-rage-go is-steel" disabled={disabled} onClick={run} title={title}>
      {label} <small>{sub}</small>
    </button>
  );
  const L = wl.left;

  return (
    <section className="fv-rage fv-warlock" aria-label="Bruxo">
      <div className="fv-monk-ki">
        <b>Magia de Pacto {wl.pactMax - wl.pactUsed}/{wl.pactMax}</b>
        <small>espaços de {wl.pactCircle}º círculo · voltam no descanso curto · CD {wl.dc}</small>
      </div>
      <div className="fv-rage-start">
        {wl.level >= 20 &&
          btn('master', 'Mestre Místico', `recupera os espaços de pacto · ${L.eldritchMaster}/1`, '1 minuto suplicando ao patrono: todos os espaços de Magia de Pacto voltam. 1× por descanso longo.', !L.eldritchMaster || wl.pactUsed === 0, () => {
            store.restorePactSlots(char.id);
            spend('eldritchMaster', L.eldritchMaster);
            toast(`Mestre Místico: os ${wl.pactMax} espaços de pacto voltaram.`, { tone: 'ok' });
          })}
        {wl.blessingTemp !== null &&
          btn('blessing', 'Bênção do Tinhoso', `+${wl.blessingTemp} PV temporários`, 'Quando você reduz uma criatura hostil a 0 PV, ganha CAR + nível de bruxo em PV temporários.', false, () => {
            store.gainTempHp(char.id, wl.blessingTemp!);
            toast(`Bênção do Tinhoso: ${wl.blessingTemp} PV temporários.`, { tone: 'ok' });
          })}
        {wl.patron === 'fiend' && wl.level >= 6 &&
          btn('luck', 'Sorte do Tinhoso', `${lastCheck ? `+1d10 em ${lastCheck.label.split(' · ')[0]} (${lastCheck.total})` : 'faça um teste ou salvaguarda'} · ${L.darkLuck}/1`, 'Soma 1d10 a um teste de atributo ou salvaguarda que você acabou de rolar. Volta no descanso curto.', !L.darkLuck || !lastCheck, () => {
            const r = rollDice(10, { label: 'Sorte do Tinhoso' });
            spend('darkLuck', L.darkLuck);
            toast(`Sorte do Tinhoso: ${lastCheck!.label.split(' · ')[0]} ${lastCheck!.total} + ${r.total} = ${lastCheck!.total + r.total}.`, { tone: 'ok' });
          })}
        {wl.patron === 'fiend' && wl.level >= 14 &&
          btn('hurl', 'Arremesso pelo Inferno', `10d10 psíquico · ${L.hurlHell}/1`, 'Ao acertar uma criatura: ela some até o fim do seu próximo turno e, se não for corruptor, sofre 10d10 psíquico ao voltar. 1× por descanso longo.', !L.hurlHell, () => {
            const r = rollDice(10, { count: 10, label: 'Arremesso pelo Inferno (psíquico)', damage: true });
            spend('hurlHell', L.hurlHell);
            toast(`Arremesso pelo Inferno: ${r.total} de dano psíquico (não afeta corruptores).`, { tone: 'info' });
          })}
        {wl.patron === 'archfey' &&
          btn('fey', 'Presença Feérica', `ação · SAB CD ${wl.dc} · ${L.feyPresence}/1`, 'Ação: criaturas num cubo de 3 m fazem salvaguarda de SAB ou ficam enfeitiçadas ou amedrontadas (à sua escolha) até o fim do seu próximo turno.', !L.feyPresence || turn.action, () => {
            spend('feyPresence', L.feyPresence);
            act('action');
            toast(`Presença Feérica: cubo de 3 m, salvaguarda de SAB CD ${wl.dc} ou enfeitiçadas/amedrontadas até o fim do seu próximo turno.`, { tone: 'info' });
          })}
        {wl.patron === 'archfey' && wl.level >= 6 &&
          btn('misty', 'Fuga Enevoada', `reação ao sofrer dano · ${L.mistyEscape}/1`, 'Reação ao sofrer dano: você fica invisível e teleporta até 18 m; a invisibilidade dura até o início do seu próximo turno ou até atacar/conjurar.', !L.mistyEscape || turn.reaction, () => {
            spend('mistyEscape', L.mistyEscape);
            act('reaction');
            toast('Fuga Enevoada: invisível e teleportado até 18 m.', { tone: 'ok' });
          })}
        {wl.patron === 'archfey' && wl.level >= 14 &&
          btn('delirium', 'Delírio Sombrio', `ação · SAB CD ${wl.dc} · ${L.darkDelirium}/1`, 'Ação: uma criatura a 18 m faz salvaguarda de SAB ou fica enfeitiçada ou amedrontada num reino ilusório por 1 minuto (concentração).', !L.darkDelirium || turn.action, () => {
            spend('darkDelirium', L.darkDelirium);
            act('action');
            toast(`Delírio Sombrio: salvaguarda de SAB CD ${wl.dc}.`, { tone: 'info' });
          })}
        {wl.patron === 'oldone' && wl.level >= 6 &&
          btn('ward', 'Escudo Entrópico', `reação · ${L.entropicWard}/1`, 'Reação quando alguém ataca você: o ataque tem desvantagem. Se errar, você tem vantagem no próximo ataque contra essa criatura.', !L.entropicWard || turn.reaction, () => {
            spend('entropicWard', L.entropicWard);
            act('reaction');
            toast('Escudo Entrópico: o ataque contra você tem desvantagem; se errar, sua próxima jogada contra ele tem vantagem.', { tone: 'ok' });
          })}
      </div>
      {wl.patron === 'fiend' && wl.level >= 10 && (
        <label className="fv-warlock-res">
          <span>Resiliência Infernal (troque no descanso)</span>
          <select
            className="fv-input"
            value={wl.resilience ?? ''}
            onChange={(e) => store.editCharacter(char.id, { choices: { ...(char.choices ?? {}), 'warlock.fiendResilience': e.target.value ? [e.target.value] : [] } })}
            aria-label="Tipo de dano da Resiliência Infernal"
          >
            <option value="">— escolha um tipo de dano —</option>
            {FIEND_RESILIENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      )}
      <ul className="fv-rage-effects">
        {wl.patron === 'oldone' && wl.level >= 10 && <li>Escudo Mental: resistência a dano psíquico (já nas resistências).</li>}
        {wl.patron === 'archfey' && wl.level >= 10 && <li>Defesas Encantadoras: a ficha não deixa marcar Enfeitiçado.</li>}
        {wl.patron === 'oldone' && <li>Mente Desperta: telepatia com criaturas a 9 m que entendam um idioma.</li>}
      </ul>
    </section>
  );
}
