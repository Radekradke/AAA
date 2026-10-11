import { useState } from 'react';
import type { Character } from '@/types/character';
import type { DerivedCharacter } from '@/engine/dndRules';
import { grimHarvest, overchannelBacklash, validRecovery, wizardState } from '@/engine/wizard';
import { syncSpellSlots } from '@/engine/spellcasting';
import { hasMark } from '@/engine/damageExtras';
import { useCharacterStore } from '@/store/characterStore';
import { useDiceRoller } from '@/components/dice/useDiceRoller';
import { toast } from '@/store/feedbackStore';

const SCHOOL_NOTES: Record<string, (lv: number) => string[]> = {
  abjuration: (lv) => [lv >= 10 ? 'Abjuração Aprimorada: soma proficiência nos testes de contramágica e dissipar magia.' : '', lv >= 14 ? 'Resistência a Magia: vantagem nas salvaguardas contra magias e resistência ao dano delas (já nas resistências).' : ''],
  divination: (lv) => [lv >= 6 ? 'Adivinhação Especialista: conjurar adivinhação de 2º+ devolve um espaço gasto de círculo menor (até o 5º).' : '', lv >= 10 ? 'O Terceiro Olho: ação — visão no escuro 18 m, ver o Plano Etéreo, ler idiomas ou ver o invisível a 3 m.' : ''],
  evocation: (lv) => ['Esculpir Magias: escolha 1 + círculo criaturas que passam automaticamente e não sofrem dano.', lv >= 6 ? 'Truque Potente: alvo que passa na salvaguarda do seu truque ainda sofre metade do dano.' : '', lv >= 10 ? 'Evocação Poderosa: + INT no dano de evocação (já no Conjurar).' : ''],
  conjuration: (lv) => ['Conjuração Menor: ação — cria um objeto não mágico de até 1,5 kg por 1 hora.', lv >= 10 ? 'Conjuração Focada: dano não quebra sua concentração em magia de conjuração.' : '', lv >= 14 ? 'Invocações Duráveis: criaturas que você conjura têm 30 PV temporários.' : ''],
  enchantment: (lv) => [lv >= 10 ? 'Dividir Encantamento: magia de encantamento de um alvo pode mirar uma segunda criatura.' : '', lv >= 14 ? 'Alterar Memórias: o alvo encantado não percebe; pode fazê-lo esquecer horas do encantamento.' : ''],
  illusion: (lv) => ['Ilusão Menor Aprimorada: ilusão menor cria som e imagem ao mesmo tempo.', lv >= 6 ? 'Ilusões Maleáveis: ação para mudar uma ilusão sua de 1 minuto ou mais.' : '', lv >= 14 ? 'Realidade Ilusória: ação bônus para tornar real um objeto inanimado da sua ilusão por 1 minuto.' : ''],
  necromancy: (lv) => [lv >= 6 ? 'Servos Mortos-Vivos: animar mortos cria um morto-vivo a mais; os seus somam seu nível aos PV e proficiência ao dano.' : '', lv >= 10 ? 'Acostumado à Morte-Vida: resistência a necrótico (já nas resistências).' : '', lv >= 14 ? 'Comandar Mortos-Vivos: ação — um morto-vivo a 18 m faz salvaguarda de CAR ou fica sob seu controle.' : ''],
  transmutation: (lv) => ['Alquimia Menor: 10 minutos para transformar madeira, pedra, ferro, cobre ou prata entre si.', lv >= 6 ? 'Pedra do Transmutador: visão no escuro 18 m, +3 m de deslocamento, proficiência em CON ou resistência a um tipo elemental.' : '', lv >= 10 ? 'Metamorfo: metamorfose em si mesmo sem espaço (fera de ND 1 ou menos), 1× por descanso curto.' : '', lv >= 14 ? 'Mestre Transmutador: consome a pedra para um grande efeito (cura total, rejuvenescer, ressuscitar…).' : ''],
};

/**
 * Mago na mesa: Recuperação Arcana escolhe os espaços (até metade do nível,
 * nenhum de 6º+), e cada escola ganha seus botões — Barreira Arcana, Portento,
 * Sobrecarga, Transposição Benigna, Olhar Hipnótico, Eu Ilusório, Colheita
 * Sinistra.
 */
export function WizardPanel({ char, derived }: { char: Character; derived: DerivedCharacter }) {
  const store = useCharacterStore();
  const { rollDice } = useDiceRoller();
  const wz = wizardState(char, derived.proficiency, derived.abilities.int.mod);
  const slots = syncSpellSlots(char);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [harvest, setHarvest] = useState({ lv: 1, necro: false });
  if (!wz) return null;
  const turn = char.combat.turn;
  const act = (kind: 'action' | 'bonus' | 'reaction') => store.useTurn(char.id, kind);
  const btn = (key: string, label: string, sub: string, title: string, disabled: boolean, run: () => void) => (
    <button key={key} type="button" className="fv-rage-go is-steel" disabled={disabled} onClick={run} title={title}>
      {label} <small>{sub}</small>
    </button>
  );
  const usedLevels = Object.entries(slots).map(([lv, s]) => ({ lv: Number(lv), used: s.used })).filter((s) => s.lv <= 5 && s.used > 0);
  const total = Object.entries(picks).reduce((n, [lv, k]) => n + Number(lv) * k, 0);
  const canRecover = wz.recovery.left > 0 && validRecovery(char, picks, slots);
  const pick = (lv: number, d: number, max: number) => setPicks((p) => ({ ...p, [lv]: Math.max(0, Math.min(max, (p[lv] ?? 0) + d)) }));
  const over = hasMark(char, 'overchannel');

  return (
    <section className="fv-rage fv-wizard" aria-label="Mago">
      <div className="fv-monk-ki">
        <b>Mago · CD {wz.dc}</b>
        <small>Recuperação Arcana {wz.recovery.left}/1 · até {wz.recovery.budget} níveis de espaço, nenhum de 6º+ (num descanso curto)</small>
      </div>
      {wz.recovery.left > 0 && (
        <div className="fv-wiz-recovery">
          {usedLevels.length === 0 ? (
            <small>Nenhum espaço gasto para recuperar.</small>
          ) : (
            usedLevels.map((s) => (
              <span key={s.lv} className="fv-wiz-pick">
                <span>{s.lv}º</span>
                <button type="button" aria-label={`Menos um espaço de ${s.lv}º`} onClick={() => pick(s.lv, -1, s.used)}>−</button>
                <b aria-label={`Espaços de ${s.lv}º a recuperar`}>{picks[s.lv] ?? 0}</b>
                <button type="button" aria-label={`Mais um espaço de ${s.lv}º`} onClick={() => pick(s.lv, 1, s.used)}>+</button>
              </span>
            ))
          )}
          {usedLevels.length > 0 &&
            btn('recover', 'Recuperar espaços', `${total}/${wz.recovery.budget} níveis`, 'Uma vez por dia, num descanso curto: recupere espaços gastos somando até metade do seu nível de mago (para cima), nenhum de 6º círculo ou mais.', !canRecover, () => {
              store.recoverSlots(char.id, picks);
              store.setResource(char.id, 'recovery', 0);
              setPicks({});
              toast(`Recuperação Arcana: ${Object.entries(picks).filter(([, n]) => n).map(([lv, n]) => `${n}× ${lv}º`).join(', ')} de volta.`, { tone: 'ok' });
            })}
        </div>
      )}
      <div className="fv-rage-start">
        {wz.ward &&
          btn('ward', wz.ward.up ? `Barreira Arcana ${wz.ward.hp}/${wz.ward.max}` : 'Erguer Barreira Arcana', wz.ward.up ? 'absorve o dano antes dos PV' : 'conjure abjuração de 1º+ (ou toque aqui)', 'A barreira surge na sua primeira abjuração de 1º+ após o descanso longo (PV = 2 × nível + INT). Cada abjuração seguinte devolve 2 × círculo. O dano cai nela primeiro.', wz.ward.up, () => {
            store.chargeWard(char.id, 1);
            toast(`Barreira Arcana erguida: ${wz.ward!.max} PV.`, { tone: 'ok' });
          })}
        {wz.portent && wz.portent.rolls.length === 0 &&
          btn('portent', 'Rolar Portento', `${wz.portent.count}d20 do dia`, 'Ao terminar o descanso longo, role os d20 do Portento e guarde. Troque qualquer jogada que você veja por um deles (antes do resultado).', false, () => {
            const rolls = Array.from({ length: wz.portent!.count }, () => rollDice(20, { label: 'Portento' }).total);
            store.setPortent(char.id, rolls);
            toast(`Portento: ${rolls.join(', ')}.`, { tone: 'ok' });
          })}
        {wz.portent?.rolls.map((r, i) =>
          btn(`portent-${i}`, `Portento ${r}`, 'usar nesta jogada', 'Substitui um ataque, teste ou salvaguarda seu ou de uma criatura que você vê por este número.', false, () => {
            store.setPortent(char.id, wz.portent!.rolls.filter((_, j) => j !== i));
            toast(`Portento: a jogada vira ${r}.`, { tone: 'info' });
          }),
        )}
        {wz.overchannel &&
          btn('over', over ? 'Sobrecarga ligada' : 'Sobrecarga', over ? 'próxima magia de 1º–5º: dano máximo' : wz.overchannel.uses ? `custa ${overchannelBacklash(wz.overchannel.uses, 1)}d12 necrótico por círculo` : 'grátis hoje', 'A próxima magia de mago de 1º a 5º círculo que causa dano causa o máximo. Do 2º uso até o descanso longo, você sofre 2d12 necrótico por círculo (+1d12 por círculo a cada uso).', false, () => {
            store.setMark(char.id, 'overchannel', !over);
          })}
        {wz.school === 'conjuration' && wz.level >= 6 &&
          btn('transpose', 'Transposição Benigna', `ação · ${wz.left.benignTransposition}/1`, 'Ação: teleporte até 9 m, ou troque de lugar com uma criatura voluntária Pequena ou Média. Volta no descanso longo ou ao conjurar conjuração de 1º+.', !wz.left.benignTransposition || turn.action, () => {
            store.setResource(char.id, 'benignTransposition', 0);
            act('action');
            toast('Transposição Benigna: teleporte de até 9 m.', { tone: 'ok' });
          })}
        {wz.school === 'enchantment' &&
          btn('gaze', 'Olhar Hipnótico', `ação · SAB CD ${wz.dc}`, 'Ação: uma criatura a 1,5 m que veja você faz salvaguarda de SAB ou fica enfeitiçada (incapacitada, deslocamento 0) até o fim do seu próximo turno; mantenha com sua ação.', turn.action, () => {
            act('action');
            toast(`Olhar Hipnótico: salvaguarda de SAB CD ${wz.dc}.`, { tone: 'info' });
          })}
        {wz.school === 'enchantment' && wz.level >= 6 &&
          btn('charm', 'Charme Instintivo', `reação · SAB CD ${wz.dc}`, 'Reação: quando uma criatura a 9 m ataca você, ela faz salvaguarda de SAB ou desvia o ataque para outra criatura (ou erra).', turn.reaction, () => {
            act('reaction');
            toast(`Charme Instintivo: salvaguarda de SAB CD ${wz.dc} ou o ataque vai para outro alvo.`, { tone: 'info' });
          })}
        {wz.school === 'illusion' && wz.level >= 10 &&
          btn('self', 'Eu Ilusório', `reação · ${wz.left.illusorySelf}/1`, 'Reação: uma duplicata ilusória faz um ataque contra você errar automaticamente. Volta no descanso curto.', !wz.left.illusorySelf || turn.reaction, () => {
            store.setResource(char.id, 'illusorySelf', 0);
            act('reaction');
            toast('Eu Ilusório: o ataque erra.', { tone: 'ok' });
          })}
      </div>
      {wz.school === 'necromancy' && (
        <div className="fv-wiz-recovery">
          <span>Colheita Sinistra</span>
          <select className="fv-input" aria-label="Círculo da magia que matou" value={harvest.lv} onChange={(e) => setHarvest((h) => ({ ...h, lv: Number(e.target.value) }))}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => <option key={c} value={c}>{c}º círculo</option>)}
          </select>
          <label className="fv-wiz-check">
            <input type="checkbox" checked={harvest.necro} onChange={(e) => setHarvest((h) => ({ ...h, necro: e.target.checked }))} /> necromancia
          </label>
          {btn('harvest', 'Curar', `+${grimHarvest(harvest.lv, harvest.necro)} PV`, 'Uma vez por turno, quando sua magia de 1º+ mata uma criatura (não constructo nem morto-vivo), você recupera 2 × círculo (3 × se for necromancia).', char.hpCurrent >= derived.maxHp, () => {
            const n = grimHarvest(harvest.lv, harvest.necro);
            store.heal(char.id, n);
            toast(`Colheita Sinistra: +${n} PV.`, { tone: 'ok' });
          })}
        </div>
      )}
      <ul className="fv-rage-effects">
        {wz.ward && wz.level >= 6 && <li>Barreira Projetada: reação — a sua barreira absorve o dano de uma criatura a 9 m.</li>}
        {(wz.school ? SCHOOL_NOTES[wz.school](wz.level) : []).filter(Boolean).map((t) => <li key={t}>{t}</li>)}
        {wz.level >= 18 && <li>Domínio de Magia: as magias escolhidas ganham um "Usar" sem espaço na aba Magias.</li>}
        {wz.level >= 20 && <li>Magias de Assinatura: sempre preparadas; 1× por descanso curto sem espaço (aba Magias).</li>}
      </ul>
    </section>
  );
}
