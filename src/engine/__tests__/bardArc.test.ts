import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { characterResources } from '../classResources';
import { bardState, inspirationDie, songOfRestDie } from '../bard';
import { expertiseSlots } from '../levelUp';
import { attacksPerAction } from '../extraAttack';
import { initiativeRules } from '../initiative';
import type { Character } from '@/types/character';

function bard(level: number, subclassId: string | null = null, extra: Partial<Character> = {}): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Lírio', classId: 'bard', raceId: 'human' });
  c.level = level;
  c.classLevels = [{ classId: 'bard', level }];
  c.subclassId = subclassId;
  c.baseAbilities = { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 };
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return { ...c, ...extra };
}
const st = (c: Character) => {
  const d = deriveCharacter(c);
  return bardState(c, d.proficiency, d.abilities.cha.mod)!;
};
const insp = (c: Character) => characterResources(c).find((r) => r.id === 'inspiration')!;

describe('Bardo do 1 ao 20 (PHB 2014)', () => {
  it('Inspiração de Bardo: CAR usos, d6 → d8 → d10 → d12 (5º/10º/15º); Fonte de Inspiração no 5º', () => {
    expect([1, 5, 10, 15].map(inspirationDie)).toEqual([6, 8, 10, 12]);
    expect(insp(bard(1)).max).toBe(3);
    expect([insp(bard(4)).recharge, insp(bard(5)).recharge]).toEqual(['long', 'short']);
    expect(st(bard(5)).dc).toBe(8 + 3 + 3);
  });

  it('Pau pra Toda Obra (2º): meia proficiência em perícias sem treino e na iniciativa', () => {
    const d1 = deriveCharacter(bard(1));
    const d2 = deriveCharacter(bard(2));
    const key = d1.skills.find((s) => !s.proficient)!.key;
    const bonus = (d: typeof d1) => d.skills.find((s) => s.key === key)!.bonus;
    expect(bonus(d2) - bonus(d1)).toBe(1);
    expect(d2.initiative - d1.initiative).toBe(1);
    expect(st(bard(9)).jack).toBe(2);
  });

  it('Canção de Descanso d6 → d8 → d10 → d12 (2º/9º/13º/17º)', () => {
    expect([1, 2, 9, 13, 17].map(songOfRestDie)).toEqual([null, 6, 8, 10, 12]);
  });

  it('Aptidão: 2 perícias no 3º e mais 2 no 10º', () => {
    expect([2, 3, 10].map((l) => expertiseSlots(bard(l)))).toEqual([0, 2, 4]);
  });

  it('Contraencanto (6º) e Inspiração Superior (20º: volta 1 ao rolar iniciativa)', () => {
    expect([st(bard(5)).countercharm, st(bard(6)).countercharm]).toEqual([false, true]);
    const empty = bard(20, null, {});
    empty.combat.resources = { inspiration: 0 };
    expect(initiativeRules(empty).refills.map((r) => r.resId)).toContain('inspiration');
  });

  it('Conhecimento: Palavras Cortantes (3º) e Habilidade Incomparável (14º)', () => {
    expect(st(bard(3, 'lore')).cuttingWords).toBe(true);
    expect([st(bard(13, 'lore')).peerless, st(bard(14, 'lore')).peerless]).toEqual([false, true]);
    expect(st(bard(3, 'valor')).cuttingWords).toBe(false);
  });

  it('Bravura: Inspiração de Combate (3º), Ataque Extra (6º) e Magia de Batalha (14º)', () => {
    expect(st(bard(3, 'valor')).combatInspiration).toBe(true);
    expect([attacksPerAction(bard(5, 'valor')).count, attacksPerAction(bard(6, 'valor')).count]).toEqual([1, 2]);
    expect(attacksPerAction(bard(6, 'lore')).count).toBe(1);
    expect(st(bard(14, 'valor')).battleMagic).toBe(true);
  });
});
