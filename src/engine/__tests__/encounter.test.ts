import { describe, it, expect } from 'vitest';
import { groupLabel, healthState, initiativeRows, rollEnemyInitiatives, sortCombatants, stepTurn } from '../encounter';
import type { Combatant } from '@/types/session';

let n = 0;
const mk = (name: string, init: number | null, p: Partial<Combatant> = {}): Combatant => ({
  id: `c${++n}`, encounterId: 'e', sessionId: 's', campaignId: 'k', type: 'monster', sheetId: null, ownerId: null,
  monsterInstanceId: null, name, initiative: init, initiativeBonus: 0, turnOrder: 0, hpCurrent: 10, hpMax: 10,
  armorClass: 12, conditions: [], hidden: false, groupKey: null, monsterRef: null, ...p,
});

function scene() {
  const list = [
    mk('Kael', 21, { type: 'player', initiativeBonus: 4 }),
    mk('Goblin #1', 18, { groupKey: 'goblin', initiativeBonus: 2 }),
    mk('Goblin #2', 18, { groupKey: 'goblin', initiativeBonus: 2 }),
    mk('Ivar', 16, { type: 'player' }),
    mk('Ogro', 13),
    mk('Saelyra', 11, { type: 'player' }),
  ];
  return sortCombatants(list).map((c, i) => ({ ...c, turnOrder: i + 1 }));
}

describe('encontro: ordem, grupos e turnos (igual ao banco)', () => {
  it('ordem e linhas agrupadas', () => {
    const list = scene();
    expect(initiativeRows(list, null).map((r) => `${r.initiative} ${r.label}`)).toEqual(['21 Kael', '18 Goblins ×2', '16 Ivar', '13 Ogro', '11 Saelyra']);
  });

  it('próximo turno pula o grupo inteiro e vira a rodada', () => {
    const list = scene();
    const names = (id: string | null) => list.find((c) => c.id === id)?.name;
    let cur: string | null = null;
    const seq: string[] = [];
    let wraps = 0;
    for (let i = 0; i < 6; i++) {
      const s = stepTurn(list, cur, 1);
      cur = s.nextId;
      if (s.wrapped) wraps++;
      seq.push(names(cur)!);
    }
    expect(seq).toEqual(['Kael', 'Goblin #1', 'Ivar', 'Ogro', 'Saelyra', 'Kael']);
    expect(wraps).toBe(1);
  });

  it('monstro derrotado é pulado; jogador caído não', () => {
    const list = scene().map((c) => (c.name === 'Ogro' ? { ...c, hpCurrent: 0 } : c.name === 'Ivar' ? { ...c, hpCurrent: 0 } : c));
    const ivar = list.find((c) => c.name === 'Ivar')!;
    const next = stepTurn(list, ivar.id, 1);
    expect(list.find((c) => c.id === next.nextId)!.name).toBe('Saelyra');
    const g = list.find((c) => c.name === 'Goblin #1')!;
    expect(list.find((c) => c.id === stepTurn(list, g.id, 1).nextId)!.name).toBe('Ivar');
  });

  it('voltar do primeiro vai ao último com wrap', () => {
    const list = scene();
    const r = stepTurn(list, list[0].id, -1);
    expect([list.find((c) => c.id === r.nextId)!.name, r.wrapped]).toEqual(['Saelyra', true]);
  });

  it('grupo rola uma iniciativa só', () => {
    const vals = rollEnemyInitiatives(scene().map((c) => ({ ...c, initiative: null })), false, () => 0.5);
    const gob = vals.filter((v) => v.value === 13); // 1 + 10 + 2
    expect(gob.length).toBe(2);
    expect(vals.some((v) => v.value === 11)).toBe(true); // ogro: 1 + 10 + 0
  });

  it('rótulos e estado de vida', () => {
    expect(groupLabel([mk('Lobo 1', 1), mk('Lobo 2', 1), mk('Lobo 3', 1)])).toBe('Lobos ×3');
    expect(healthState(10, 10)).toBe('ileso');
    expect(healthState(7, 10)).toBe('ferido');
    expect(healthState(4, 10)).toBe('sangrando');
    expect(healthState(0, 10)).toBe('caído');
  });
});
