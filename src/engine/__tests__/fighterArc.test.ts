import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { itemToInventory } from '../inventory';
import { characterResources } from '../classResources';
import { attacksPerAction } from '../extraAttack';
import { battleMasterState, survivorHeal } from '../fighter';
import { rollDamage } from '../combat';
import { spellSlotsFor } from '../spellcasting';
import { getItem } from '@/data/items';
import type { Character } from '@/types/character';

function fighter(level: number, extra: Partial<Character> = {}, weapon = 'w-greatsword'): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Ser Aldo', classId: 'fighter', raceId: 'human' });
  c.level = level;
  c.classLevels = [{ classId: 'fighter', level }];
  c.baseAbilities = { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 };
  const w = itemToInventory(getItem(weapon)!);
  c.inventory = [w];
  c.equipped = { armor: null, shield: null, mainHand: w.uid, offHand: null, ranged: null };
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return { ...c, ...extra };
}
const res = (c: Character) => Object.fromEntries(characterResources(c).map((r) => [r.id, r]));

describe('Guerreiro do 1 ao 20 (PHB 2014)', () => {
  it('Retomar o Fôlego (1º), Surto de Ação 1→2 (2º/17º), Indomável 1/2/3 (9º/13º/17º)', () => {
    expect(res(fighter(1)).secondWind.max).toBe(1);
    expect(res(fighter(1)).surge).toBeUndefined();
    expect([res(fighter(2)).surge.max, res(fighter(17)).surge.max]).toEqual([1, 2]);
    expect(res(fighter(8)).indomitable).toBeUndefined();
    expect([9, 13, 17].map((l) => res(fighter(l)).indomitable.max)).toEqual([1, 2, 3]);
  });

  it('Ataque Extra: 2/3/4 ataques no 5º, 11º e 20º', () => {
    expect([4, 5, 11, 20].map((l) => attacksPerAction(fighter(l)).count)).toEqual([1, 2, 3, 4]);
  });

  it('Estilos: Defesa +1 CA com armadura; Arquearia +2 à distância; Duelo +2 dano', () => {
    const mail = itemToInventory(getItem('a-chainmail')!);
    const armored = fighter(1, { choices: { 'fighter.fightingStyle': ['defense'] } });
    armored.inventory.push(mail);
    armored.equipped.armor = mail.uid;
    expect(deriveCharacter(armored).ac).toBe(17);
    const bow = fighter(1, { choices: { 'fighter.fightingStyle': ['archery'] } }, 'w-longbow');
    const plain = fighter(1, {}, 'w-longbow');
    expect(deriveCharacter(bow).attacks[0].attackBonus - deriveCharacter(plain).attacks[0].attackBonus).toBe(2);
    const duel = fighter(1, { choices: { 'fighter.fightingStyle': ['dueling'] } }, 'w-longsword');
    const sword = fighter(1, {}, 'w-longsword');
    expect(deriveCharacter(duel).attacks[0].damageBonus - deriveCharacter(sword).attacks[0].damageBonus).toBe(2);
  });

  it('Combate com Armas Grandes: rola de novo 1 e 2 no dano (montante sempre; versátil só com as duas mãos)', () => {
    const gwf = deriveCharacter(fighter(1, { choices: { 'fighter.fightingStyle': ['gwf'] } })).attacks[0];
    expect(gwf.greatWeapon).toBe('always');
    const rand = Math.random;
    try {
      const seq = [0, 0.99, 0.99]; // 1, 6, 6 em d6 → os 1 viram 6
      let i = 0;
      Math.random = () => seq[i++ % seq.length];
      const r = rollDamage(gwf);
      expect(r.label).toMatch(/Armas Grandes/);
      expect(r.rolls.every((x) => x > 2)).toBe(true);
    } finally {
      Math.random = rand;
    }
    const versatile = deriveCharacter(fighter(1, { choices: { 'fighter.fightingStyle': ['gwf'] } }, 'w-longsword')).attacks[0];
    expect(versatile.greatWeapon).toBe('versatile');
  });

  it('Campeão: crítico em 19 (3º) e 18 (15º)', () => {
    const champ = (l: number) => deriveCharacter(fighter(l, { subclassId: 'champion' })).attacks[0].critMin;
    expect([champ(2), champ(3), champ(15)]).toEqual([20, 19, 18]);
  });

  it('Sobrevivente (Campeão 18º): 5 + CON abaixo da metade dos PV', () => {
    const c = fighter(18, { subclassId: 'champion' });
    c.hpCurrent = 10;
    expect(survivorHeal(c, 150, 2)).toBe(7);
    c.hpCurrent = 100;
    expect(survivorHeal(c, 150, 2)).toBe(0);
    c.hpCurrent = 0;
    expect(survivorHeal(c, 150, 2)).toBe(0);
    expect(survivorHeal({ ...c, hpCurrent: 10, subclassId: 'battlemaster' }, 150, 2)).toBe(0);
  });

  it('Mestre de Batalha: dados d8→d10→d12, 4→5→6, CD = 8 + prof + FOR/DES, manobras de dano', () => {
    const bm = (l: number) => battleMasterState(fighter(l, { subclassId: 'battlemaster', choices: { 'fighter.maneuver': ['trip', 'precision', 'parry'] } }), 2, 3, 1)!;
    expect([bm(3).die, bm(10).die, bm(18).die]).toEqual([8, 10, 12]);
    expect([bm(3).max, bm(7).max, bm(15).max]).toEqual([4, 5, 6]);
    expect(bm(3).dc).toBe(13);
    expect(bm(3).damage.map((m) => m.id)).toEqual(['trip']);
    expect(bm(3).precision).toBe(true);
  });

  it('Cavaleiro Arcano: conjurador de 1/3 (2 espaços de 1º no 3º, 4º círculo no 19º)', () => {
    const ek = (l: number) => spellSlotsFor(fighter(l, { subclassId: 'eldritch' }));
    expect(ek(2)).toEqual({});
    expect(ek(3)).toEqual({ 1: 2 });
    expect(Object.keys(ek(19)).map(Number).sort((a, b) => b - a)[0]).toBe(4);
  });
});
