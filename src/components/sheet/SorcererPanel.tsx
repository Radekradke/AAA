import { useState } from 'react';
import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { SLOT_COST, sorcererState } from '@/engine/sorcerer';
import type { MetamagicOption } from '@/engine/sorcerer';
import { syncSlotPools } from '@/engine/spellcasting';
import { hasMark } from '@/engine/damageExtras';
import { useCharacterStore } from '@/store/characterStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { useWildSurge } from '@/components/spells/useWildSurge';
import { toast } from '@/store/feedbackStore';

/**
 * Feiticeiro na mesa: Pontos de Feitiçaria à vista, Fonte de Magia (espaço ↔
 * pontos, ação bônus), Metamagia que gasta pontos de verdade e o que a origem
 * liga (Afinidade Elemental, Presença Dracônica; Marés do Caos, Surto,
 * Distorcer o Destino).
 */
export function SorcererPanel({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const store = useCharacterStore();
  const { rollDice } = useDiceRoller();
  const wildSurge = useWildSurge(char);
  const so = sorcererState(char, derived.proficiency, derived.abilities.cha.mod);
  const pools = syncSlotPools(char);
  const slots = (['spellcasting', 'pact'] as const).flatMap((pool) => Object.entries(pools[pool]).map(([lv, s]) => ({ key: `${pool}:${lv}`, pool, lv: Number(lv), max: s.max, used: s.used }))).sort((a, b) => a.lv - b.lv);
  const [slotChoice, setSlotChoice] = useState<string | null>(null);
  const [twinCircle, setTwinCircle] = useState(1);
  if (!so) return null;
  const turn = char.combat.turn;
  const spendPoints = (n: number) => store.setResource(char.id, 'sorcery', so.points - n);
  const act = (kind: 'action' | 'bonus' | 'reaction') => store.useTurn(char.id, kind);
  const cur = slots.find((s) => s.key === slotChoice) ?? slots[0];
  const lv = cur?.lv ?? null;
  const cost = lv ? SLOT_COST[lv] : undefined;
  const btn = (key: string, label: string, sub: string, title: string, disabled: boolean, run: () => void) => (
    <button key={key} type="button" className="fv-rage-go is-steel" disabled={disabled} onClick={run} title={title}>
      {label} <small>{sub}</small>
    </button>
  );
  const metaCost = (m: MetamagicOption) => (m.cost === 'circle' ? twinCircle : m.cost);
  const ward = hasMark(char, 'draconicWard');

  return (
    <section className="fv-rage fv-sorcerer" aria-label="Feiticeiro">
      <div className="fv-monk-ki">
        <b>Pontos de Feitiçaria {so.points}/{so.pointsMax}</b>
        <small>voltam no descanso longo{so.restoration ? ' · Restauração Feiticeira: +4 no descanso curto' : ''} · CD {so.dc}</small>
      </div>
      {so.pointsMax > 0 && slots.length > 0 && (
        <div className="fv-sorc-font">
          <span>Fonte de Magia</span>
          <select className="fv-input" aria-label="Círculo da Fonte de Magia" value={cur?.key ?? ''} onChange={(e) => setSlotChoice(e.target.value)}>
            {slots.map((s) => <option key={s.key} value={s.key}>{s.lv}º círculo · {s.pool === 'pact' ? 'Pacto' : 'Conjuração'} ({s.max - s.used}/{s.max})</option>)}
          </select>
          {btn('toPoints', 'Espaço → pontos', `+${lv} · ação bônus`, 'Gaste um espaço de magia e ganhe pontos iguais ao círculo (sem passar do máximo).', !cur || cur.used >= cur.max || so.points >= so.pointsMax || turn.bonus, () => {
            if (store.fontOfMagic(char.id, 'toPoints', lv!, cur?.pool)) {
              act('bonus');
              toast(`Fonte de Magia: espaço de ${lv}º virou ${lv} ponto${lv! > 1 ? 's' : ''} de feitiçaria.`, { tone: 'ok' });
            }
          })}
          {btn('toSlot', 'Pontos → espaço', cost ? `−${cost} · ação bônus` : 'só até o 5º', 'Gaste pontos para recuperar um espaço comum gasto (1º: 2, 2º: 3, 3º: 5, 4º: 6, 5º: 7 pontos). Escolha Conjuração; esta ação não recupera espaços de Pacto.', !cost || !cur || cur.pool === 'pact' || cur.used <= 0 || so.points < cost || turn.bonus, () => {
            if (store.fontOfMagic(char.id, 'toSlot', lv!, cur?.pool)) {
              act('bonus');
              toast(`Fonte de Magia: ${cost} pontos viraram um espaço de ${lv}º círculo.`, { tone: 'ok' });
            }
          })}
        </div>
      )}
      {so.metamagic.length > 0 && (
        <div className="fv-rage-start" aria-label="Metamagia">
          {so.metamagic.map((m) =>
            btn(m.id, m.label, m.cost === 'circle' ? `${twinCircle} ponto${twinCircle > 1 ? 's' : ''} (círculo)` : `${m.cost} ponto${m.cost > 1 ? 's' : ''}`, m.desc, so.points < metaCost(m), () => {
              const n = metaCost(m);
              spendPoints(n);
              toast(`Metamagia · ${m.label} (−${n}): ${m.desc}`, { tone: 'ok' });
            }),
          )}
          {so.metamagic.some((m) => m.cost === 'circle') && (
            <select className="fv-input fv-sorc-twin" aria-label="Círculo da Magia Gêmea" value={twinCircle} onChange={(e) => setTwinCircle(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => <option key={c} value={c}>{c === 1 ? 'Gêmea: truque ou 1º' : `Gêmea: ${c}º círculo`}</option>)}
            </select>
          )}
        </div>
      )}
      <div className="fv-rage-start">
        {so.affinity &&
          btn('ward', ward ? `Resistência a ${so.dragonType}` : 'Afinidade Elemental', ward ? 'ativa por 1 hora · toque para encerrar' : `1 ponto · resistência a ${so.dragonType}`, `Gaste 1 ponto de feitiçaria: resistência a dano de ${so.dragonType} por 1 hora.`, !ward && so.points < 1, () => {
            if (!ward) spendPoints(1);
            store.setMark(char.id, 'draconicWard', !ward);
            toast(ward ? 'Afinidade Elemental encerrada.' : `Afinidade Elemental: resistência a ${so.dragonType} por 1 hora (já nas resistências).`, { tone: 'ok' });
          })}
        {so.presence &&
          btn('presence', 'Presença Dracônica', 'ação · 5 pontos · concentração', 'Ação: aura de 18 m de fascínio ou medo por 1 minuto (concentração). Hostis que começam o turno nela fazem salvaguarda de SAB ou ficam enfeitiçados/amedrontados.', so.points < 5 || turn.action, () => {
            spendPoints(5);
            act('action');
            if (!char.combat.concentration) store.toggleConcentration(char.id);
            toast(`Presença Dracônica: aura de 18 m por 1 minuto — salvaguarda de SAB CD ${so.dc} ou enfeitiçado/amedrontado.`, { tone: 'ok' });
          })}
        {so.origin === 'wild' &&
          btn('tides', 'Marés do Caos', `vantagem · ${so.tidesLeft}/1`, 'Vantagem numa jogada de ataque, teste ou salvaguarda. Volta no descanso longo — ou quando acontece um Surto.', !so.tidesLeft, () => {
            store.setResource(char.id, 'tides', 0);
            toast('Marés do Caos: role com vantagem. O mestre pode pedir um Surto depois da sua próxima magia de 1º+ (e as Marés voltam).', { tone: 'ok' });
          })}
        {so.origin === 'wild' && btn('surgeCheck', 'Surto? (d20)', 'depois de magia de 1º+', 'O mestre pode pedir: role 1d20; no 1, acontece um Surto de Magia Selvagem.', false, wildSurge.check)}
        {so.origin === 'wild' && btn('surge', 'Rolar Surto (d100)', so.controlledChaos ? 'Caos Controlado: rola 2, escolha' : 'tabela do Surto', 'Rola na tabela de Surto de Magia Selvagem (também quando o mestre manda).', false, wildSurge.surge)}
        {so.bendLuck &&
          btn('bend', 'Distorcer o Destino', 'reação · 2 pontos · ±1d4', 'Reação: quando alguém que você vê faz uma jogada de ataque, teste ou salvaguarda, gaste 2 pontos e some ou subtraia 1d4.', so.points < 2 || turn.reaction, () => {
            const r = rollDice(4, { label: 'Distorcer o Destino' });
            spendPoints(2);
            act('reaction');
            toast(`Distorcer o Destino: ±${r.total} na jogada.`, { tone: 'info' });
          })}
      </div>
      <ul className="fv-rage-effects">
        {so.origin === 'draconic' && <li>Resiliência Dracônica: +1 PV por nível e CA 13 + DES sem armadura (já na ficha){so.dragonLabel ? ` · ${so.dragonLabel} (${so.dragonType})` : ' · escolha o ancestral em Escolhas pendentes'}.</li>}
        {so.affinity && <li>Afinidade Elemental: magias de {so.dragonType} somam CAR no dano (já no Conjurar).</li>}
        {so.wings && <li>Asas Dracônicas: ação bônus para abrir asas — voo igual ao deslocamento (não com armadura que não comporte).</li>}
        {so.bombardment && <li>Bombardeio de Magia: quando um dado de dano de magia dá o máximo, role-o de novo e some (1× por turno).</li>}
        {so.metamagic.length === 0 && so.level >= 3 && <li>Escolha as Metamagias em Escolhas pendentes.</li>}
      </ul>
    </section>
  );
}
