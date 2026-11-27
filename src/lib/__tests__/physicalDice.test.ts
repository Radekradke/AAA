import { describe, it, expect } from 'vitest';
import { roll, rollCheck, rollDie } from '@/engine/dice';
import { diceNeeded, groupDice, runWithValues, spreadTotal } from '../physicalDice';

describe('dado físico', () => {
  it('descobre os dados que a rolagem pede, sem sortear', () => {
    expect(diceNeeded(() => rollCheck('Atletismo', 5))).toEqual([20]);
    expect(diceNeeded(() => rollCheck('Atletismo', 5, { advantage: true }))).toEqual([20, 20]);
    expect(diceNeeded(() => roll(6, { count: 3, modifier: 2 }))).toEqual([6, 6, 6]);
  });

  it('agrupa dados iguais seguidos', () => {
    expect(groupDice([8, 8, 6])).toEqual([{ sides: 8, count: 2 }, { sides: 6, count: 1 }]);
    expect(groupDice([20, 20])).toEqual([{ sides: 20, count: 2 }]);
  });

  it('o d20 do jogador + os bônus da ficha, com crítico e falha', () => {
    const r = runWithValues(() => rollCheck('Ataque', 7), [14]).result;
    expect(r.total).toBe(21);
    expect(r.rolls).toEqual([14]);
    expect(runWithValues(() => rollCheck('Ataque', 7), [20]).result.crit).toBe(true);
    expect(runWithValues(() => rollCheck('Ataque', 7), [1]).result.fail).toBe(true);
    // Campeão: crítico no 19
    expect(runWithValues(() => rollCheck('Ataque', 7, { critMin: 19 }), [19]).result.crit).toBe(true);
  });

  it('vantagem e desvantagem escolhem entre os dois d20 digitados', () => {
    expect(runWithValues(() => rollCheck('x', 2, { advantage: true }), [4, 17]).result.total).toBe(19);
    expect(runWithValues(() => rollCheck('x', 2, { disadvantage: true }), [4, 17]).result.total).toBe(6);
  });

  it('o total do grupo, somado na mão, vira valores por dado', () => {
    expect(spreadTotal({ sides: 6, count: 3 }, 11)).toEqual([4, 4, 3]);
    expect(spreadTotal({ sides: 6, count: 3 }, 99)).toEqual([6, 6, 6]);
    expect(spreadTotal({ sides: 6, count: 3 }, 0)).toEqual([1, 1, 1]);
    const r = runWithValues(() => roll(6, { count: 3, modifier: 2 }), spreadTotal({ sides: 6, count: 3 }, 11)).result;
    expect(r.total).toBe(13);
  });

  it('a regra pede dado a mais no meio: volta em extra', () => {
    // rola de novo o que vier 1 ou 2 (como o Combate com Armas Grandes)
    const gwf = () => {
      const a = rollDie(8);
      return a <= 2 ? rollDie(8) : a;
    };
    expect(runWithValues(gwf, [6])).toEqual({ result: 6, extra: [] });
    expect(runWithValues(gwf, [2]).extra).toEqual([8]);
    expect(runWithValues(gwf, [2, 7])).toEqual({ result: 7, extra: [] });
  });

  it('fora do modo físico o sorteio continua normal', () => {
    for (let i = 0; i < 50; i++) {
      const v = rollDie(6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
});
