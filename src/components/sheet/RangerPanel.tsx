import { useState } from 'react';
import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { rangerState } from '@/engine/ranger';
import { syncSpellSlots } from '@/engine/spellcasting';
import { hasMark } from '@/engine/damageExtras';
import { useCharacterStore } from '@/store/characterStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { toast } from '@/store/feedbackStore';

const PREY_TEXT: Record<string, string> = {
  colossus: 'Matador de Colossos: +1d8 uma vez por turno contra alvo ferido (no dano do ataque).',
  hordeBreaker: 'Quebra-Hordas: uma vez por turno, ao atacar com arma, ataque outra criatura a 1,5 m do alvo.',
};
const TACTICS_TEXT: Record<string, string> = {
  escapeHorde: 'Escapar da Horda: ataques de oportunidade contra você têm desvantagem.',
  multiattackDefense: 'Defesa contra Ataques Múltiplos: depois que uma criatura acerta você, +4 de CA contra ela até o fim do turno dela.',
  steelWill: 'Vontade de Aço: vantagem nas salvaguardas contra ficar amedrontado.',
};
const MULTI_TEXT: Record<string, string> = {
  volley: 'Rajada: ação — um ataque à distância contra cada criatura a até 3 m de um ponto (munição para cada).',
  whirlwind: 'Ataque Giratório: ação — um ataque corpo a corpo contra cada criatura a 1,5 m de você.',
};

/**
 * Patrulheiro na mesa: Consciência Primitiva gasta o espaço escolhido,
 * Esconder-se à Vista liga o +10 em Furtividade, Desaparecer esconde como
 * ação bônus e as reações do Caçador ficam a um toque.
 */
export function RangerPanel({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const store = useCharacterStore();
  const { checkFor } = useDiceRoller();
  const rg = rangerState(char, derived.proficiency, derived.abilities.wis.mod);
  const slots = Object.entries(syncSpellSlots(char))
    .map(([lv, s]) => ({ lv: Number(lv), left: s.max - s.used }))
    .filter((s) => s.left > 0)
    .sort((a, b) => a.lv - b.lv);
  const [slot, setSlot] = useState<number | null>(null);
  if (!rg) return null;
  const turn = char.combat.turn;
  const act = (kind: 'action' | 'bonus' | 'reaction') => store.useTurn(char.id, kind);
  const camo = hasMark(char, 'camouflage');
  const stealth = derived.skills.find((s) => s.key === 'stealth')!;
  const hideKind = rg.vanish ? 'bonus' : 'action';
  const lv = slot && slots.some((s) => s.lv === slot) ? slot : slots[0]?.lv ?? null;
  const btn = (key: string, label: string, sub: string, title: string, disabled: boolean, run: () => void) => (
    <button key={key} type="button" className="fv-rage-go is-steel" disabled={disabled} onClick={run} title={title}>
      {label} <small>{sub}</small>
    </button>
  );
  const h = rg.hunter;

  return (
    <section className="fv-rage fv-ranger" aria-label="Patrulheiro">
      <div className="fv-monk-ki">
        <b>Patrulheiro · CD {rg.dc}</b>
        <small>
          Inimigos favoritos: {rg.enemies.join(', ') || '— escolha em Escolhas pendentes'} · Terrenos: {rg.terrains.join(', ') || '—'}
        </small>
      </div>
      <div className="fv-rage-start">
        {rg.primeval && (
          <span className="fv-ranger-primeval">
            {btn('primeval', 'Consciência Primitiva', lv ? `ação · espaço de ${lv}º · ${lv} min` : 'sem espaços livres', 'Gaste um espaço de magia: por 1 minuto por círculo, você sente se há aberrações, celestiais, dragões, elementais, fadas, corruptores ou mortos-vivos a 1,5 km (9 km no terreno favorito). Não diz onde nem quantos.', !lv || turn.action, () => {
              store.castWithSlot(char.id, lv!);
              act('action');
              toast(`Consciência Primitiva: por ${lv} minuto${lv! > 1 ? 's' : ''}, você sente aberrações, celestiais, dragões, elementais, fadas, corruptores e mortos-vivos a 1,5 km (9 km no terreno favorito).`, { tone: 'ok' });
            })}
            {slots.length > 1 && (
              <select className="fv-input" aria-label="Círculo do espaço da Consciência Primitiva" value={lv ?? ''} onChange={(e) => setSlot(Number(e.target.value))}>
                {slots.map((s) => <option key={s.lv} value={s.lv}>{s.lv}º círculo ({s.left})</option>)}
              </select>
            )}
          </span>
        )}
        {rg.hidePlainSight &&
          btn('camo', camo ? 'Camuflado' : 'Esconder-se à Vista', camo ? '+10 em Furtividade · toque ao se mover' : '1 minuto de preparo · +10 parado', 'Gaste 1 minuto se camuflando junto de uma superfície sólida: +10 em Furtividade enquanto ficar parado. Mover-se ou agir acaba com a camuflagem.', false, () => {
            store.setMark(char.id, 'camouflage', !camo);
            toast(camo ? 'Camuflagem desfeita.' : 'Camuflado: +10 em Furtividade enquanto não se mover.', { tone: 'ok' });
          })}
        {btn('hide', rg.vanish ? 'Desaparecer' : 'Esconder', `${hideKind === 'bonus' ? 'ação bônus' : 'ação'} · Furtividade ${stealth.bonus + (camo ? 10 : 0) >= 0 ? '+' : ''}${stealth.bonus + (camo ? 10 : 0)}`, rg.vanish ? 'Desaparecer: Esconder como ação bônus; você não pode ser rastreado por meios não mágicos (a não ser que queira).' : 'Ação Esconder: rola Furtividade contra a Percepção de quem procura.', turn[hideKind], () => {
          act(hideKind);
          checkFor(char, 'check', stealth.ability, `${stealth.label} · ${rg.vanish ? 'Desaparecer' : 'Esconder'}${camo ? ' (camuflado +10)' : ''}`, stealth.bonus + (camo ? 10 : 0), { skill: 'stealth', proficient: stealth.proficient, speed: derived.speed });
        })}
        {h?.prey === 'giantKiller' &&
          btn('giant', 'Matador de Gigantes', 'reação', 'Quando uma criatura Grande ou maior a 1,5 m ataca você (acertando ou não), você ataca de volta com a reação.', turn.reaction, () => {
            act('reaction');
            toast('Matador de Gigantes: faça um ataque contra a criatura (o botão de acerto fica nos Ataques).', { tone: 'ok' });
          })}
        {h?.defense === 'standTide' &&
          btn('tide', 'Resistir à Maré', 'reação', 'Quando uma criatura erra você corpo a corpo, força-a a repetir o ataque contra outra criatura (não ela mesma) à sua escolha.', turn.reaction, () => {
            act('reaction');
            toast('Resistir à Maré: a criatura repete o ataque contra outro alvo à sua escolha.', { tone: 'ok' });
          })}
      </div>
      <ul className="fv-rage-effects">
        <li>Inimigo Favorito: vantagem em Sobrevivência para rastreá-los e em testes de INT para lembrar deles.</li>
        <li>Explorador Nato: no terreno favorito, proficiência dobrada em testes de INT/SAB ligados a ele; o grupo não se perde nem é atrasado por terreno difícil.</li>
        {rg.landsStride && <li>Pés Ligeiros na Terra: terreno difícil não mágico não custa movimento extra; vantagem contra plantas mágicas que atrapalham.</li>}
        {rg.feralSenses && <li>Sentidos Selvagens: sem desvantagem para atacar quem você não vê; percebe criaturas invisíveis a 9 m.</li>}
        {rg.foeSlayer !== null && <li>Matador de Inimigos: +{rg.foeSlayer} uma vez por turno contra inimigo favorito (no dano do ataque).</li>}
        {h?.prey && PREY_TEXT[h.prey] && <li>{PREY_TEXT[h.prey]}</li>}
        {h?.tactics && <li>{TACTICS_TEXT[h.tactics]}</li>}
        {h?.multiattack && <li>{MULTI_TEXT[h.multiattack]}</li>}
        {(h?.defense === 'evasion' || h?.defense === 'uncannyDodge') && <li>Defesa Superior: {h.defense === 'evasion' ? 'Evasão' : 'Esquiva Sobrenatural'} já aparece ao aplicar dano (Combate → PV).</li>}
      </ul>
    </section>
  );
}
