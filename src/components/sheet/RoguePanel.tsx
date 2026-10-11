import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { rogueState } from '@/engine/rogue';
import { useCharacterStore } from '@/store/characterStore';
import { historyFor, useUiStore } from '@/store/uiStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { toast } from '@/store/feedbackStore';

/**
 * Ladino na mesa: Ação Ardilosa (Disparada dobra o deslocamento, Esconder rola
 * Furtividade), Mãos Rápidas do Ladrão e o Golpe de Sorte no 20º.
 */
export function RoguePanel({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const store = useCharacterStore();
  const { checkFor } = useDiceRoller();
  const history = useUiStore((s) => s.history);
  const rogue = rogueState(char, derived.proficiency, derived.abilities.dex.mod);
  if (!rogue || (!rogue.cunning && !rogue.assassinate)) return null;
  const assassinating = (char.combat.marks ?? []).includes('assassinate');
  const bonusUsed = char.combat.turn.bonus;
  const skill = (key: string) => derived.skills.find((s) => s.key === key);
  // último teste d20 desta ficha (para o Golpe de Sorte)
  const lastCheck = historyFor(history, char.id).find((r) => r.sides === 20 && !r.damage && !/Golpe de Sorte/.test(r.label));

  const bonus = (label: string) => {
    store.useTurn(char.id, 'bonus');
    toast(`${label} (ação bônus).`, { tone: 'ok' });
  };
  const rollSkill = (key: 'stealth' | 'sleightOfHand', why: string) => {
    const sk = skill(key);
    if (!sk) return;
    store.useTurn(char.id, 'bonus');
    checkFor(char, 'check', sk.ability, `${sk.label} · ${why}`, sk.bonus, { skill: sk.key, proficient: sk.proficient, speed: derived.speed });
  };
  const stroke = () => {
    if (!rogue.strokeLeft || !lastCheck) return;
    store.setResource(char.id, 'strokeOfLuck', rogue.strokeLeft - 1);
    toast(`Golpe de Sorte: ${lastCheck.label.split(' · ')[0]} vira 20 no d20 (total ${20 + lastCheck.modifier}). Num ataque que errou: vira acerto.`, { tone: 'ok' });
  };

  return (
    <section className="fv-rage fv-rogue" aria-label="Ladino">
      {rogue.cunning && (
        <div className="fv-rage-start">
          <button type="button" className="fv-rage-go is-steel" disabled={bonusUsed} onClick={() => { store.dash(char.id, 'bonus'); toast('Disparada: o deslocamento deste turno dobrou (ação bônus).', { tone: 'ok' }); }} title="Ação Ardilosa: Disparada como ação bônus. O deslocamento do turno dobra.">
            Disparada <small>Ação Ardilosa · deslocamento ×2</small>
          </button>
          <button type="button" className="fv-rage-go is-steel" disabled={bonusUsed} onClick={() => bonus('Desengajar: seu movimento não provoca ataques de oportunidade neste turno')} title="Ação Ardilosa: Desengajar como ação bônus.">
            Desengajar <small>Ação Ardilosa · sem ataques de oportunidade</small>
          </button>
          <button type="button" className="fv-rage-go is-steel" disabled={bonusUsed} onClick={() => rollSkill('stealth', 'Esconder')} title="Ação Ardilosa: Esconder como ação bônus. Rola Furtividade contra a Percepção de quem procura.">
            Esconder <small>Furtividade {skill('stealth') ? (skill('stealth')!.bonus >= 0 ? '+' : '') + skill('stealth')!.bonus : ''}{rogue.supremeSneak ? ' · vantagem se andou ≤ metade' : ''}</small>
          </button>
          {rogue.fastHands && (
            <button type="button" className="fv-rage-go is-steel" disabled={bonusUsed} onClick={() => rollSkill('sleightOfHand', 'Mãos Rápidas')} title="Mãos Rápidas: Prestidigitação, ferramentas de ladrão ou Usar um Objeto como ação bônus.">
              Mãos Rápidas <small>Prestidigitação, ferramentas ou Usar Objeto</small>
            </button>
          )}
          {rogue.assassinate && (
            <button type="button" className={'fv-rage-reckless' + (assassinating ? ' is-on' : '')} aria-pressed={assassinating} onClick={() => store.setMark(char.id, 'assassinate', !assassinating)} title="Assassinar: vantagem nos ataques contra criaturas que ainda não agiram no combate. Vale até o próximo “Novo turno”.">
              {assassinating ? '✓ ' : ''}Assassinar <small>alvo ainda não agiu: vantagem neste turno</small>
            </button>
          )}
          {rogue.level >= 20 && (
            <button type="button" className="fv-rage-go is-steel" disabled={!rogue.strokeLeft || !lastCheck} onClick={stroke} title="Transforma um ataque que errou em acerto, ou o d20 de um teste em 20. Volta no descanso curto.">
              Golpe de Sorte <small>{lastCheck ? `${lastCheck.label.split(' · ')[0]} vira 20` : 'faça um teste primeiro'} · {rogue.strokeLeft}/1</small>
            </button>
          )}
        </div>
      )}
      <ul className="fv-rage-effects">
        {rogue.level >= 5 && <li>Esquiva Sobrenatural e{rogue.level >= 7 ? ' Evasão' : ''} ficam no “Aplicar dano”.</li>}
        {rogue.reliable && <li>Talento Confiável: em perícia com proficiência, o d20 nunca conta menos que 10.</li>}
        {rogue.assassinate && <li>Assassinar: vantagem contra quem ainda não agiu (no ataque); acerto em alvo surpreso é crítico{rogue.deathStrikeDC ? ` · Golpe Mortal: CON CD ${rogue.deathStrikeDC} ou dano dobrado` : ''}.</li>}
        {rogue.thiefsReflexes && <li>Reflexos de Ladrão: na 1ª rodada você age duas vezes (o 2º turno na sua iniciativa − 10).</li>}
      </ul>
    </section>
  );
}
