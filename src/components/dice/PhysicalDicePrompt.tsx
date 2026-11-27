import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { modStr } from '@/engine/dice';
import { groupLabel, groupRange } from '@/lib/physicalDice';
import type { DiceGroup } from '@/lib/physicalDice';
import { usePhysicalDiceStore } from '@/store/physicalDiceStore';
import type { DiceAsk } from '@/store/physicalDiceStore';
import '@/styles/physical-dice.css';

/**
 * "Quanto deu no dado?" — o jogador rolou na mesa e conta para a ficha.
 *
 * · d20: um teclado de 1 a 20 (no tablet é um toque); com vantagem ou
 *   desvantagem, os dois d20 — a ficha escolhe o maior ou o menor.
 * · Outros dados: o total do grupo, somado na mão ("2d8: 11"). Um dado só,
 *   até d12, também ganha teclado.
 * Quando tudo cabe em toques (o caso comum), a resposta sai sozinha no
 * último toque. "Rolar no app" sorteia só esta vez.
 */
export function PhysicalDicePrompt() {
  const ask = usePhysicalDiceStore((s) => s.current);
  const answer = usePhysicalDiceStore((s) => s.answer);
  if (!ask) return null;
  return <Prompt key={ask.id} ask={ask} answer={answer} />;
}

/** Cada d20 vai um a um (vantagem precisa dos dois); os outros, pelo total do grupo. */
const eachDie = (g: DiceGroup) => g.sides === 20;
/** Grupo que se responde com toques num teclado. */
const keypad = (g: DiceGroup) => eachDie(g) || (g.count === 1 && g.sides <= 12);
const slots = (g: DiceGroup) => (eachDie(g) ? g.count : 1);

function valid(g: DiceGroup, v: string): boolean {
  const n = Number(v);
  if (v.trim() === '' || !Number.isInteger(n)) return false;
  const [lo, hi] = eachDie(g) ? [1, g.sides] : groupRange(g);
  return n >= lo && n <= hi;
}

function Prompt({ ask, answer }: { ask: DiceAsk; answer: (a: number[][] | 'app' | null) => void }) {
  const [vals, setVals] = useState<string[][]>(() => ask.groups.map((g) => Array.from({ length: slots(g) }, () => '')));
  const allKeypad = ask.groups.every(keypad);
  const isComplete = (v: string[][]) => ask.groups.every((g, i) => v[i].every((x) => valid(g, x)));
  const complete = isComplete(vals);
  // mouse e teclado (PC): o primeiro campo já recebe o número; no toque, o teclado do sistema cobriria os botões
  const typing = useMemo(() => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches, []);

  const submit = (v = vals) => answer(v.map((g) => g.map(Number)));

  const withValue = (cur: string[][], gi: number, si: number, v: string) => cur.map((g, i) => (i === gi ? g.map((x, j) => (j === si ? v : x)) : g));
  const put = (gi: number, si: number, v: string) => setVals((cur) => withValue(cur, gi, si, v));
  /**
   * Toque no teclado: preenche o próximo espaço vazio do grupo. Se tudo se
   * responde com toques, o último toque já manda (digitar no campo, não:
   * "1" seria enviado antes do "7" de 17).
   */
  const tap = (gi: number, n: number) => {
    const si = Math.max(0, vals[gi].findIndex((v) => !valid(ask.groups[gi], v)));
    const next = withValue(vals, gi, si, String(n));
    setVals(next);
    if (allKeypad && isComplete(next)) submit(next);
  };

  const d20Pick = ask.mode === 'normal' ? null : ask.mode === 'advantage' ? 'o maior' : 'o menor';
  const title = ask.reroll ? 'Rolar de novo' : 'Rolar no dado físico';
  const formula = `${ask.groups.map(groupLabel).join(' + ')}${ask.modifier ? ` ${modStr(ask.modifier)}` : ''}`;

  const preview = (() => {
    if (!complete || ask.reroll) return null;
    const parts = ask.groups.map((g, i) => {
      const ns = vals[i].map(Number);
      if (eachDie(g) && ns.length === 2 && d20Pick) return ask.mode === 'advantage' ? Math.max(...ns) : Math.min(...ns);
      return ns.reduce((a, b) => a + b, 0);
    });
    return parts.reduce((a, b) => a + b, 0) + ask.modifier;
  })();

  return (
    <Modal
      title={title}
      icon="d20"
      onClose={() => answer(null)}
      maxWidth={440}
      dismissOnBackdrop={false}
      footer={
        <div className="fv-pdice-foot">
          <button type="button" className="fv-btn-ghost" onClick={() => answer('app')}>
            Rolar no app
          </button>
          <button type="button" className="fv-btn-gold" disabled={!complete} onClick={() => submit()}>
            Somar{preview !== null ? ` = ${preview}` : ''}
          </button>
        </div>
      }
    >
      <div className="fv-pdice">
        <p className="fv-pdice-what">
          <b>{ask.label}</b>
          <span>
            {formula}
            {d20Pick && ` · ${ask.mode === 'advantage' ? 'vantagem' : 'desvantagem'}: role dois d20, vale ${d20Pick}`}
          </span>
          {ask.reroll && <small>A regra manda rolar de novo estes dados (por exemplo, o 1 e o 2 do Combate com Armas Grandes).</small>}
        </p>

        {ask.groups.map((g, gi) => (
          <fieldset key={gi} className="fv-pdice-group">
            <legend>{eachDie(g) ? (g.count > 1 ? `Os ${g.count} d20` : 'O d20') : g.count > 1 ? `Total dos ${groupLabel(g)}` : `O ${groupLabel(g).slice(1)}`}</legend>
            <div className="fv-pdice-slots">
              {vals[gi].map((v, si) => (
                <label key={si} className={'fv-pdice-slot' + (valid(g, v) ? ' is-set' : '')}>
                  <span className="fv-sr-only">{eachDie(g) && slots(g) > 1 ? `${si + 1}º d20` : groupLabel(g)}</span>
                  <input
                    className="fv-input"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus={typing && gi === 0 && si === 0}
                    value={v}
                    placeholder={eachDie(g) ? (slots(g) > 1 ? `${si + 1}º` : 'd20') : `${groupRange(g)[0]}–${groupRange(g)[1]}`}
                    aria-invalid={v !== '' && !valid(g, v)}
                    onChange={(e) => put(gi, si, e.target.value.replace(/\D/g, '').slice(0, 3))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && complete) submit();
                    }}
                  />
                </label>
              ))}
            </div>
            {keypad(g) && (
              <div className={'fv-pdice-pad' + (g.sides === 20 ? ' is-d20' : '')} role="group" aria-label={`Teclado do ${groupLabel(g).slice(g.count > 1 ? 0 : 1)}`}>
                {Array.from({ length: g.sides }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" className={n === g.sides ? 'is-max' : n === 1 ? 'is-min' : ''} onClick={() => tap(gi, n)}>
                    {n}
                  </button>
                ))}
              </div>
            )}
          </fieldset>
        ))}
      </div>
    </Modal>
  );
}
