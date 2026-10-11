import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { clericState, lifeHealing } from '@/engine/cleric';
import type { ClericChannel } from '@/engine/cleric';
import { divineStrike } from '@/engine/damageExtras';
import { useCharacterStore } from '@/store/characterStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { toast } from '@/store/feedbackStore';

const COST_LABEL = { action: 'ação', bonus: 'ação bônus', reaction: 'reação', free: 'junto da rolagem' } as const;

/**
 * Clérigo na mesa: Canalizar Divindade (Expulsar Mortos-Vivos e o poder do
 * domínio) gasta o uso e o turno certo, Intervenção Divina rola o d100 e as
 * reações do domínio (Labareda Protetora, Ira da Tempestade, Sacerdote da
 * Guerra) ficam a um toque.
 */
export function ClericPanel({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const store = useCharacterStore();
  const { rollDice } = useDiceRoller();
  const cl = clericState(char, derived.proficiency, derived.abilities.wis.mod);
  if (!cl) return null;
  const turn = char.combat.turn;
  const spend = (id: string, n: number) => store.setResource(char.id, id, n - 1);
  const act = (kind: 'action' | 'bonus' | 'reaction') => store.useTurn(char.id, kind);
  const btn = (key: string, label: string, sub: string, title: string, disabled: boolean, run: () => void) => (
    <button key={key} type="button" className="fv-rage-go is-steel" disabled={disabled} onClick={run} title={title}>
      {label} <small>{sub}</small>
    </button>
  );
  const strike = divineStrike(char);
  const life = lifeHealing(char, 1);

  const channel = (c: ClericChannel) => {
    spend('channel', cl.channelLeft);
    if (c.cost !== 'free') act(c.cost);
    if (c.roll) {
      const r = rollDice(c.roll.die, { count: c.roll.count, modifier: c.roll.bonus, label: `${c.label} (${c.roll.type})`, damage: true });
      toast(`${c.label}: ${r.total} de dano ${c.roll.type} — salvaguarda de ${c.save} CD ${cl.dc} para metade (${Math.floor(r.total / 2)}).`, { tone: 'info' });
      return;
    }
    if (c.id === 'preserveLife') {
      // Preservar a Vida: em você, só até a metade dos PV máximos
      const cap = Math.floor(derived.maxHp / 2);
      const self = Math.min(cl.preserveLife ?? 0, Math.max(0, cap - char.hpCurrent));
      toast(`Preservar a Vida: ${cl.preserveLife} PV para dividir entre criaturas a 9 m (cada uma até a metade dos PV máximos).`, {
        tone: 'ok',
        action: self > 0 ? { label: `Em mim (+${self})`, run: () => store.heal(char.id, self) } : undefined,
      });
      return;
    }
    toast(`Canalizar Divindade · ${c.label}: ${c.desc}`, { tone: 'ok' });
  };

  return (
    <section className="fv-rage fv-cleric" aria-label="Clérigo">
      <div className="fv-monk-ki">
        <b>Canalizar Divindade {cl.channelLeft}/{cl.channelMax}</b>
        <small>
          volta no descanso curto · CD {cl.dc}
          {cl.destroyCr ? ` · Destruir Mortos-Vivos: ND ${cl.destroyCr} ou menos` : ''}
        </small>
      </div>
      <div className="fv-rage-start">
        {cl.channels.map((c) =>
          btn(
            c.id,
            c.label,
            `Canalizar · ${COST_LABEL[c.cost]}${c.save ? ` · ${c.save} CD ${cl.dc}` : ''}${c.roll ? ` · ${c.roll.count}d${c.roll.die} + ${c.roll.bonus}` : ''}`,
            c.desc,
            !cl.channelLeft || (c.cost !== 'free' && turn[c.cost]),
            () => channel(c),
          ),
        )}
        {cl.max.wardingFlare > 0 &&
          btn('flare', 'Labareda Protetora', `reação · ${cl.left.wardingFlare}/${cl.max.wardingFlare}`, `Reação: quem ataca ${cl.level >= 6 ? 'você ou um aliado' : 'você'} a 9 m tem desvantagem no ataque (não funciona em quem não pode ser cegado).`, !cl.left.wardingFlare || turn.reaction, () => {
            spend('wardingFlare', cl.left.wardingFlare);
            act('reaction');
            toast('Labareda Protetora: o ataque tem desvantagem.', { tone: 'ok' });
          })}
        {cl.max.wrathStorm > 0 &&
          btn('storm', 'Ira da Tempestade', `reação · 2d8 · ${cl.left.wrathStorm}/${cl.max.wrathStorm}`, 'Reação ao ser atingido por uma criatura a 1,5 m: 2d8 elétrico ou trovejante, salvaguarda de DES para metade.', !cl.left.wrathStorm || turn.reaction, () => {
            const r = rollDice(8, { count: 2, label: 'Ira da Tempestade (elétrico ou trovejante)', damage: true });
            spend('wrathStorm', cl.left.wrathStorm);
            act('reaction');
            toast(`Ira da Tempestade: ${r.total} de dano — salvaguarda de DES CD ${cl.dc} para metade.`, { tone: 'info' });
          })}
        {cl.max.warPriest > 0 &&
          btn('priest', 'Sacerdote da Guerra', `ataque bônus · ${cl.left.warPriest}/${cl.max.warPriest}`, 'Depois de usar a ação de Ataque, faça um ataque com arma como ação bônus.', !cl.left.warPriest || turn.bonus, () => {
            spend('warPriest', cl.left.warPriest);
            act('bonus');
            toast('Sacerdote da Guerra: faça mais um ataque com arma (o botão de acerto fica nos Ataques).', { tone: 'ok' });
          })}
        {cl.domain === 'trickery' &&
          btn('trickster', 'Bênção do Trapaceiro', 'ação · toque', 'Uma criatura voluntária (não você) tem vantagem em Furtividade por 1 hora ou até você usar de novo.', turn.action, () => {
            act('action');
            toast('Bênção do Trapaceiro: o aliado tem vantagem em Furtividade por 1 hora.', { tone: 'ok' });
          })}
        {cl.intervention &&
          btn('intervention', 'Intervenção Divina', `ação · d100 ≤ ${cl.intervention.chance} · ${cl.intervention.left}/1`, 'Implore pela ajuda da divindade: funciona se o d100 der até o seu nível de clérigo (no 20º, sempre). Se funcionar, só de novo em 7 dias; se falhar, depois de um descanso longo.', !cl.intervention.left || turn.action, () => {
            const r = rollDice(100, { label: 'Intervenção Divina' });
            spend('intervention', cl.intervention!.left);
            act('action');
            const ok = cl.level >= 20 || r.total <= cl.intervention!.chance;
            toast(
              ok
                ? 'Intervenção Divina: a divindade responde! O mestre escolhe o milagre. Só de novo em 7 dias.'
                : `Intervenção Divina: ${r.total} > ${cl.intervention!.chance} — sem resposta. Tente de novo depois de um descanso longo.`,
              { tone: ok ? 'ok' : 'info' },
            );
          })}
      </div>
      <ul className="fv-rage-effects">
        {life && <li>Discípulo da Vida: magias de cura de 1º+ curam +2 + círculo{life.blessed ? '; Curandeiro Abençoado cura você ao curar outros' : ''}{life.supreme ? '; Cura Suprema: dados no máximo' : ''} (já no Conjurar).</li>}
        {strike && <li>Golpe Divino: +{strike.dice}d8 {strike.type} num acerto com arma por turno (no dano do ataque).</li>}
        {cl.level >= 8 && (cl.domain === 'light' || cl.domain === 'knowledge') && <li>Conjuração Potente: + SAB no dano dos truques de clérigo (já no Conjurar).</li>}
        {cl.domain === 'tempest' && cl.level >= 6 && <li>Golpe Trovejante: dano elétrico seu empurra criaturas Grandes ou menores até 3 m.</li>}
        {cl.domain === 'tempest' && cl.level >= 17 && <li>Nascido da Tempestade: deslocamento de voo igual ao de caminhada ao ar livre.</li>}
        {cl.domain === 'nature' && cl.level >= 6 && <li>Amortecer Elementos: reação para dar resistência a ácido, elétrico, fogo, frio ou trovejante a quem sofre esse dano a 9 m.</li>}
        {cl.domain === 'nature' && cl.level >= 17 && <li>Senhor da Natureza: comanda as feras e plantas enfeitiçadas pelo seu Canalizar (ação bônus).</li>}
        {cl.domain === 'light' && cl.level >= 17 && <li>Coroa de Luz: ação, 1 minuto — luz solar de 18 m; inimigos nela têm desvantagem contra magias de fogo e radiante.</li>}
        {cl.domain === 'war' && cl.level >= 17 && <li>Avatar da Batalha: resistência a dano de armas não mágicas (já nas resistências).</li>}
        {cl.domain === 'knowledge' && cl.level >= 17 && <li>Visões do Passado: meditando 1 minuto, vê o passado recente de um objeto ou lugar (1× por descanso curto).</li>}
        {cl.domain === 'trickery' && cl.level >= 17 && <li>Duplicidade Aprimorada: o Invocar Duplicidade cria até 4 cópias.</li>}
      </ul>
    </section>
  );
}
