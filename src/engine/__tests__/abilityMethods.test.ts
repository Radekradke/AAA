import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { abilityMethodOf, abilityPending, assignByPriority, rollAbilityDice, rollTotal, rollsMatch } from '../abilityMethods';
import { creationPending } from '../creationSummary';

const draft = () => createDraftCharacter({ ownerId: 't', name: 'X', classId: 'wizard' });

describe('métodos de atributos (PHB 2014)', () => {
  it('4d6 descarta o menor dado', () => {
    expect(rollTotal([6, 1, 5, 4])).toBe(15);
    expect(rollTotal([3, 3, 3, 3])).toBe(9);
  });

  it('seis rolagens de quatro dados', () => {
    let n = 0;
    const dice = rollAbilityDice(() => (n++ % 6) + 1);
    expect(dice).toHaveLength(6);
    dice.forEach((d) => expect(d).toHaveLength(4));
  });

  it('o maior valor vai para o atributo principal da classe', () => {
    const a = assignByPriority('wizard', [10, 17, 8, 12, 14, 13]);
    expect(a.int).toBe(17);
    expect(Object.values(a).sort((x, y) => y - x)).toEqual([17, 14, 13, 12, 10, 8]);
  });

  it('fichas antigas: o método é deduzido dos números', () => {
    const c = draft();
    expect(abilityMethodOf(c)).toBe('array');
    c.baseAbilities = { str: 8, dex: 14, con: 14, int: 15, wis: 12, cha: 8 };
    expect(abilityMethodOf(c)).toBe('pointbuy');
    c.baseAbilities = { str: 18, dex: 14, con: 14, int: 15, wis: 12, cha: 8 };
    expect(abilityMethodOf(c)).toBe('manual');
  });

  it('compra de pontos acima de 27 trava o Despertar', () => {
    const c = draft();
    c.abilityMethod = 'pointbuy';
    c.baseAbilities = { str: 15, dex: 15, con: 15, int: 15, wis: 8, cha: 8 };
    expect(abilityPending(c)).toEqual(['Compra de pontos: tire 9 pontos']);
    expect(creationPending(c).some((p) => p.label.startsWith('Compra de pontos'))).toBe(true);
  });

  it('rolar 4d6 sem rolar ainda pede a rolagem; trocar valores entre atributos continua valendo', () => {
    const c = draft();
    c.abilityMethod = 'roll';
    expect(abilityPending(c)).toEqual(['Role os atributos (4d6)']);
    c.abilityRolls = [[6, 6, 5, 1], [5, 5, 4, 2], [4, 4, 4, 4], [3, 3, 2, 6], [2, 2, 2, 2], [1, 1, 1, 1]];
    c.baseAbilities = assignByPriority('wizard', c.abilityRolls.map(rollTotal));
    expect(rollsMatch(c)).toBe(true);
    const { str, int } = c.baseAbilities;
    c.baseAbilities = { ...c.baseAbilities, str: int, int: str };
    expect(rollsMatch(c)).toBe(true);
    c.baseAbilities = { ...c.baseAbilities, str: 18 };
    expect(rollsMatch(c)).toBe(false);
  });
});

describe('Especialização do Ladino na criação', () => {
  it('sem as 2 escolhas o Despertar fica travado; perícia perdida também avisa', () => {
    const c = createDraftCharacter({ ownerId: 't', name: 'X', classId: 'rogue' });
    expect(creationPending(c).some((p) => p.label === 'Escolha 2 especializações')).toBe(true);
    c.skillExpertise = ['athletics']; // Soldado dá Atletismo
    expect(creationPending(c).some((p) => p.label === 'Escolha 1 especialização')).toBe(true);
    c.backgroundId = 'sage'; // não dá mais Atletismo
    expect(creationPending(c).some((p) => p.label.startsWith('Especialização em Atletismo sem a perícia'))).toBe(true);
  });
});

describe('truques da linhagem na etapa Magias', () => {
  it('Drow Mago: Globos de Luz já vem pronto e não ocupa vaga de truque', async () => {
    const { creationSpellPlan } = await import('../creationSpells');
    const c = createDraftCharacter({ ownerId: 't', name: 'X', classId: 'wizard', raceId: 'elf' });
    c.subraceId = 'drow';
    const plan = creationSpellPlan(c)!;
    expect(plan.free.some((f) => f.id === 'phb-dancing-lights' && f.source === 'Magia Drow')).toBe(true);
    expect(plan.cantrips.pool.some((s) => s.id === 'phb-dancing-lights')).toBe(false);
  });
});
