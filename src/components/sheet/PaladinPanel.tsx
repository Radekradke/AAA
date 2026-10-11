import { useState } from 'react';
import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { paladinState } from '@/engine/paladin';
import { useCharacterStore } from '@/store/characterStore';
import { toast } from '@/store/feedbackStore';

/**
 * Paladino na mesa: Cura pelas Mãos gasta a reserva e cura de verdade,
 * Sentido Divino, Canalizar Divindade do juramento (Arma Sagrada e Voto de
 * Inimizade ficam ligados no ataque), Toque Purificador e a forma do 20º.
 */
export function PaladinPanel({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const store = useCharacterStore();
  const pal = paladinState(char, derived.proficiency, derived.abilities.cha.mod);
  const [amount, setAmount] = useState(5);
  if (!pal) return null;
  const turn = char.combat.turn;
  const n = Math.max(1, Math.min(amount || 1, pal.layLeft));
  const lost = derived.maxHp - char.hpCurrent;
  const poisoned = char.combat.conditions.includes('Envenenado');

  const useAction = (kind: 'action' | 'bonus') => store.useTurn(char.id, kind);
  const layOnHands = (who: 'self' | 'ally') => {
    if (!pal.layLeft || turn.action) return;
    const heal = who === 'self' ? Math.min(n, Math.max(0, lost)) : n;
    if (heal <= 0) return void toast('Você já está com os PV cheios.', { tone: 'info' });
    store.setResource(char.id, 'layhands', pal.layLeft - heal);
    useAction('action');
    if (who === 'self') store.heal(char.id, heal);
    toast(`Cura pelas Mãos: ${who === 'self' ? `+${heal} PV em você` : `${heal} PV para o aliado`} (sobram ${pal.layLeft - heal}).`, { tone: 'ok' });
  };
  const cure = () => {
    if (pal.layLeft < 5 || turn.action) return;
    store.setResource(char.id, 'layhands', pal.layLeft - 5);
    useAction('action');
    if (poisoned) store.toggleCondition(char.id, 'Envenenado');
    toast(`Cura pelas Mãos: 5 pontos curam uma doença ou um veneno${poisoned ? ' (Envenenado removido)' : ''}.`, { tone: 'ok' });
  };

  return (
    <section className="fv-rage fv-paladin" aria-label="Paladino">
      <div className="fv-monk-ki">
        <b>Cura pelas Mãos {pal.layLeft}/{pal.layMax}</b>
        <small>CD {pal.dc}{pal.auraBonus ? ` · Aura de Proteção +${pal.auraBonus} nas salvaguardas (${pal.auraRange} m)` : ''}</small>
      </div>
      <div className="fv-pal-lay">
        <label className="fv-pal-amt">
          <span>PV</span>
          <input type="number" min={1} max={pal.layLeft} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Pontos de Cura pelas Mãos" className="fv-input" />
        </label>
        <button type="button" className="fv-rage-go is-steel" disabled={!pal.layLeft || turn.action || lost <= 0} onClick={() => layOnHands('self')} title="Ação: toque em você e cure da reserva.">
          Curar a mim <small>{lost > 0 ? `+${Math.min(n, lost)} PV · ação` : 'PV cheios'}</small>
        </button>
        <button type="button" className="fv-rage-go is-steel" disabled={!pal.layLeft || turn.action} onClick={() => layOnHands('ally')} title="Ação: toque num aliado e cure da reserva (a ficha dele recebe a cura pelo mestre ou pela mesa).">
          Curar aliado <small>{n} PV · ação</small>
        </button>
        <button type="button" className="fv-rage-go is-steel" disabled={pal.layLeft < 5 || turn.action} onClick={cure} title="5 pontos da reserva curam uma doença ou neutralizam um veneno.">
          Doença ou veneno <small>5 pontos{poisoned ? ' · remove Envenenado' : ''}</small>
        </button>
      </div>
      <div className="fv-rage-start">
        <button type="button" className="fv-rage-go is-steel" disabled={!pal.senseLeft || turn.action} onClick={() => {
          store.setResource(char.id, 'divineSense', pal.senseLeft - 1);
          useAction('action');
          toast('Sentido Divino: até o fim do seu próximo turno, você sente celestiais, corruptores e mortos-vivos a 18 m (sem cobertura total).', { tone: 'ok' });
        }} title="Ação: sente celestiais, corruptores, mortos-vivos e lugares consagrados/profanados a 18 m.">
          Sentido Divino <small>ação · {pal.senseLeft}/{pal.senseMax}</small>
        </button>
        {pal.channelOptions.map((o) => {
          const on = !!o.mark && (char.combat.marks ?? []).includes(o.mark);
          const kind = o.id === 'vow' ? 'bonus' : 'action';
          return (
            <button key={o.id} type="button" className="fv-rage-go is-steel" disabled={!pal.channelLeft || turn[kind] || on} onClick={() => {
              store.setResource(char.id, 'channel', pal.channelLeft - 1);
              useAction(kind);
              if (o.mark) store.setMark(char.id, o.mark, true);
              toast(`Canalizar Divindade · ${o.label}: ${o.desc}${o.save ? ` CD ${pal.dc}.` : ''}`, { tone: 'ok' });
            }} title={o.desc}>
              {o.label} <small>Canalizar · {kind === 'bonus' ? 'ação bônus' : 'ação'}{o.save ? ` · ${o.save} CD ${pal.dc}` : ''}{on ? ' · ativo' : ` · ${pal.channelLeft}/1`}</small>
            </button>
          );
        })}
        {pal.cleansingMax > 0 && (
          <button type="button" className="fv-rage-go is-steel" disabled={!pal.cleansingLeft || turn.action} onClick={() => {
            store.setResource(char.id, 'cleansing', pal.cleansingLeft - 1);
            useAction('action');
            toast('Toque Purificador: uma magia em você ou numa criatura voluntária termina.', { tone: 'ok' });
          }} title="Ação: encerra uma magia em você ou numa criatura voluntária que você toca.">
            Toque Purificador <small>ação · {pal.cleansingLeft}/{pal.cleansingMax}</small>
          </button>
        )}
        {pal.avatar && (
          <button type="button" className="fv-rage-go is-steel" disabled={!pal.avatar.left || turn.action} onClick={() => {
            store.setResource(char.id, 'oathAvatar', 0);
            useAction('action');
            toast(`${pal.avatar!.label}: ${pal.avatar!.desc}.`, { tone: 'ok' });
          }} title={pal.avatar.desc}>
            {pal.avatar.label} <small>ação · {pal.avatar.left}/1 por descanso longo</small>
          </button>
        )}
      </div>
      <ul className="fv-rage-effects">
        <li>Destruição Divina fica no dano do ataque corpo a corpo (escolha o espaço){pal.level >= 11 ? '; a Aprimorada soma +1d8 radiante sozinha' : ''}.</li>
        {pal.level >= 10 && <li>Aura de Coragem: a ficha não deixa marcar Amedrontado{char.subclassId === 'devotion' && pal.level >= 7 ? '; Aura de Devoção: nem Enfeitiçado' : ''}.</li>}
        {pal.undyingLeft > 0 && <li>Sentinela Imortal: ao cair a 0 PV, a ficha deixa você com 1 PV (1× por descanso longo).</li>}
      </ul>
    </section>
  );
}
