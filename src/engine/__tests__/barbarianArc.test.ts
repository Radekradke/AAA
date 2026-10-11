import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { itemToInventory } from '../inventory';
import { initiativeRules } from '../initiative';
import { barbarianState } from '../barbarian';
import { rollRule } from '../rollRules';
import { getItem } from '@/data/items';
import type { Character } from '@/types/character';

/** Bárbaro humano FOR 15, DES 14, CON 14, com machado grande na mão. */
function barb(level: number, extra: Partial<Character> = {}): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Grok', classId: 'barbarian', raceId: 'human' });
  c.level = level;
  c.classLevels = [{ classId: 'barbarian', level }];
  c.baseAbilities = { str: 15, dex: 14, con: 14, int: 8, wis: 10, cha: 10 };
  const axe = itemToInventory(getItem('w-greataxe')!);
  c.inventory = [axe];
  c.equipped = { armor: null, shield: null, mainHand: axe.uid, offHand: null, ranged: null };
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return { ...c, ...extra };
}

describe('Bárbaro do 1 ao 20 (PHB 2014)', () => {
  it('Fúria: usos e dano extra por nível; ilimitada no 20º', () => {
    const uses = [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6];
    const dmg = [2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4];
    for (let lv = 1; lv <= 19; lv++) {
      const st = barbarianState(barb(lv))!;
      expect([lv, st.usesMax]).toEqual([lv, uses[lv - 1]]);
      expect([lv, st.bonus]).toEqual([lv, dmg[lv - 1]]);
    }
    expect(barbarianState(barb(20))!.unlimited).toBe(true);
  });

  it('Defesa sem Armadura: 10 + DES + CON (com escudo também)', () => {
    // humano: +1 em tudo → DES 15 (+2), CON 15 (+2)
    expect(deriveCharacter(barb(1)).ac).toBe(14);
  });

  it('Movimento Rápido: +3 m a partir do 5º (sem armadura pesada)', () => {
    expect(deriveCharacter(barb(4)).speed).toBe(9);
    expect(deriveCharacter(barb(5)).speed).toBe(12);
  });

  it('Instinto Selvagem: vantagem na iniciativa no 7º', () => {
    expect(initiativeRules(barb(6)).advantage).toBe(false);
    expect(initiativeRules(barb(7)).advantage).toBe(true);
  });

  it('Crítico Brutal: +1/+2/+3 dados no crítico corpo a corpo (9º/13º/17º)', () => {
    const extra = (lv: number) => deriveCharacter(barb(lv)).attacks[0].critExtraDice ?? 0;
    expect([extra(8), extra(9), extra(13), extra(17)]).toEqual([0, 1, 2, 3]);
  });

  it('Campeão Primitivo: FOR e CON +4 no 20º (teto 24)', () => {
    const a19 = deriveCharacter(barb(19)).abilities;
    const a20 = deriveCharacter(barb(20)).abilities;
    expect(a20.str.total - a19.str.total).toBe(4);
    expect(a20.con.total - a19.con.total).toBe(4);
  });

  it('Fúria liga vantagem em testes e salvaguardas de FOR', () => {
    const calm = barb(3);
    const angry = barb(3, { combat: { ...calm.combat, marks: ['rage'] } });
    expect(rollRule(calm, 'check', 'str').advantage).toBe(false);
    expect(rollRule(angry, 'check', 'str')).toMatchObject({ advantage: true, sources: ['Fúria'] });
    expect(rollRule(angry, 'save', 'str').advantage).toBe(true);
    expect(rollRule(angry, 'check', 'dex').advantage).toBe(false);
  });

  it('Sentido de Perigo: vantagem em salvaguarda de DES (2º), não se estiver cego', () => {
    expect(rollRule(barb(1), 'save', 'dex').advantage).toBe(false);
    expect(rollRule(barb(2), 'save', 'dex')).toMatchObject({ advantage: true, sources: ['Sentido de Perigo'] });
    const blind = barb(2);
    blind.combat.conditions = ['Cego'];
    expect(rollRule(blind, 'save', 'dex').advantage).toBe(false);
  });

  it('Força Indomável: teste de FOR nunca abaixo do valor de FOR (18º)', () => {
    expect(rollRule(barb(17), 'check', 'str').floor).toBeUndefined();
    expect(rollRule(barb(18), 'check', 'str').floor).toEqual({ value: 16, source: 'Força Indomável' });
  });

  it('Fúria Implacável: CD 10 no 11º, +5 a cada uso', () => {
    expect(barbarianState(barb(10))!.relentlessDC).toBeNull();
    expect(barbarianState(barb(11))!.relentlessDC).toBe(10);
    const used = barb(11);
    used.combat.resources = { relentless: 2 };
    expect(barbarianState(used)!.relentlessDC).toBe(20);
  });

  it('Totem do Urso: resistência a todo dano menos psíquico; Furioso: Frenesi e Fúria Inconsciente', () => {
    const bear = barb(3, { subclassId: 'totem', choices: { 'barbarian.totemSpirit': ['bear'] } });
    expect(barbarianState(bear)!.resistance).toBe('todo dano, exceto psíquico');
    expect(barbarianState(barb(3))!.resistance).toBe('concussão, cortante e perfurante');
    const zerk = barb(6, { subclassId: 'berserker' });
    zerk.combat.marks = ['rage', 'frenzy'];
    const st = barbarianState(zerk)!;
    expect(st.berserker).toBe(true);
    expect(st.effects.join(' ')).toMatch(/Frenesi/);
    expect(st.effects.join(' ')).toMatch(/Fúria Inconsciente/);
  });
});
