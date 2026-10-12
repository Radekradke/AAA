import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { getItem } from '@/data/items';
import { RACES } from '@/data/races';
import { itemToInventory, attunementBlock } from '../inventory';
import { resourceMaxMap } from '../classResources';
import { combatActions } from '@/store/character/combat';
import { progressionActions } from '@/store/character/progression';
import { inventoryActions } from '@/store/character/inventory';
import type { Character, EquippedSlots } from '@/types/character';
import type { StoreCtx } from '@/store/character/types';
import { defenseFor } from '../strike';
import { MONSTER_BY_ID } from '@/data/bestiary';
import { spellLearnState, learnBlock } from '../spellRules';
import { getSpell } from '@/data/spells';
import { changeSpellSelection, saveSlotPools, spellSelectionOf, syncSlotPools } from '../spellcasting';
import { syncHitDicePools } from '../hitDice';
import { spellsActions } from '@/store/character/spells';
import { attacksPerAction } from '../extraAttack';
import { heroDefenses } from '../heroDefenses';

function hero(classId = 'fighter', levels: Character['classLevels'] = [{ classId, level: 1 }], subclassId: string | null = null): Character {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 'regression', name: 'Regressão', classId }));
  c.customOrigin = { asi: {} };
  c.baseAbilities = { str: 16, dex: 16, con: 14, int: 16, wis: 14, cha: 18 };
  c.level = levels.reduce((sum, l) => sum + l.level, 0);
  c.classLevels = levels;
  c.subclassId = subclassId;
  c.inventory = [];
  c.equipped = { armor: null, shield: null, mainHand: null, offHand: null, ranged: null };
  c.choices = {};
  c.feats = [];
  c.hpCurrent = deriveCharacter(c).maxHp;
  c.combat.hitDiceRemaining = c.level;
  return c;
}
function give(c: Character, id: string, slot?: keyof EquippedSlots, attuned = true, worn = true) {
  const it = { ...itemToInventory(getItem(id)!), attuned, worn };
  c.inventory.push(it);
  if (slot) c.equipped[slot] = it.uid;
  return it;
}
function ctx(c: Character): StoreCtx {
  return { get: (() => ({ getCharacter: () => c })) as unknown as StoreCtx['get'], set: () => undefined, mutate: (_id, fn) => fn(c) };
}

describe('regressões de concentração e descanso (D&D 2014)', () => {
  it('conjuração concentrada inválida não consome espaço', () => {
    const c = hero('wizard');
    saveSlotPools(c, syncSlotPools(c, true));
    c.hpCurrent = 0;
    spellsActions(ctx(c)).castWithSlot(c.id, 1, true, 'spellcasting');
    expect(c.combat.slotPools?.spellcasting[1].used).toBe(0);
  });
  it('trocar a arma apaga a Língua de Fogo', () => {
    const c = hero();
    const flame = give(c, 'mw-flametongue', 'mainHand');
    flame.activated = true;
    const sword = give(c, 'w-longsword');
    inventoryActions(ctx(c)).toggleEquip(c.id, sword.uid);
    expect(flame.activated).toBe(false);
  });
  it('a mesa reconhece resistência de item e de Fúria na ficha do herói', () => {
    const c = hero('barbarian', [{ classId: 'barbarian', level: 3 }], 'berserker');
    const ring = give(c, 'm-ring-resist');
    ring.resistanceType = 'fogo';
    c.combat.marks = ['rage'];
    const defs = heroDefenses(c);
    expect(defenseFor('fogo', defs)).toBe('half');
    expect(defenseFor('cortante', defs)).toBe('half');
    const armor = give(c, 'a-plate', 'armor');
    expect(armor.armor?.category).toBe('pesada');
    expect(defenseFor('cortante', heroDefenses(c))).toBe('normal');
  });
  it('zero PV retira efeitos e marcas concentrados, preservando os independentes', () => {
    const c = hero();
    c.combat.concentration = true;
    c.combat.marks = ['hex', 'sacredWeapon'];
    c.combat.spellEffects = [{ spellId: 'sp-escudofe', name: 'Escudo da Fé', until: 'concentration', label: '+2 CA', ac: 2 }];
    combatActions(ctx(c)).applyDamage(c.id, c.hpCurrent);
    expect(c.combat.concentration).toBe(false);
    expect(c.combat.spellEffects).toEqual([]);
    expect(c.combat.marks).toEqual(['sacredWeapon']);
  });
  it.each(['Incapacitado', 'Inconsciente', 'Atordoado', 'Paralisado', 'Petrificado'])('%s encerra a concentração', (condition) => {
    const c = hero();
    c.combat.concentration = true;
    combatActions(ctx(c)).toggleCondition(c.id, condition);
    expect(c.combat.concentration).toBe(false);
  });
  it('romper concentração preserva Arma Sagrada', () => {
    const c = hero('paladin');
    c.combat.concentration = true;
    c.combat.marks = ['hex', 'sacredWeapon'];
    combatActions(ctx(c)).toggleConcentration(c.id);
    expect(c.combat.marks).toEqual(['sacredWeapon']);
  });
  it('descanso cura até o máximo final após Auxílio e exaustão', () => {
    const c = hero();
    const actions = combatActions(ctx(c));
    actions.applySpellEffect(c.id, { spellId: 'phb-aid', name: 'Auxílio', until: 'rest', label: '+5 PV', maxHp: 5 });
    actions.longRest(c.id);
    expect(c.hpCurrent).toBe(deriveCharacter(c).maxHp);
    c.combat.exhaustion = 4;
    c.hpCurrent = 1;
    actions.longRest(c.id);
    expect(c.combat.exhaustion).toBe(3);
    expect(c.hpCurrent).toBe(deriveCharacter(c).maxHp);
  });
  it('descanso não revive nem limpa as falhas de um morto', () => {
    const c = hero();
    c.hpCurrent = 0;
    c.combat.deathSaves.fail = 3;
    combatActions(ctx(c)).longRest(c.id);
    expect(c.hpCurrent).toBe(0);
    expect(c.combat.deathSaves.fail).toBe(3);
  });
});

describe('reservas e perfis independentes em multiclasse', () => {
  it('descanso curto recupera somente o pacto, mesmo no mesmo círculo', () => {
    const c = hero('wizard', [{ classId: 'wizard', level: 3 }, { classId: 'warlock', level: 3 }]);
    const spells = spellsActions(ctx(c));
    spells.castWithSlot(c.id, 2, false, 'spellcasting');
    spells.castWithSlot(c.id, 2, false, 'pact');
    spells.castWithSlot(c.id, 2, false, 'pact');
    combatActions(ctx(c)).shortRest(c.id);
    expect(c.combat.slotPools?.spellcasting[2]).toEqual({ max: 2, used: 1 });
    expect(c.combat.slotPools?.pact[2]).toEqual({ max: 2, used: 0 });
    expect(c.combat.spellSlots[2]).toEqual({ max: 4, used: 1 });
  });
  it('migração conservadora de espaços legados não recupera um espaço comum no descanso curto', () => {
    const c = hero('wizard', [{ classId: 'wizard', level: 3 }, { classId: 'warlock', level: 3 }]);
    c.combat.spellSlots = { 2: { max: 4, used: 1 } };
    combatActions(ctx(c)).shortRest(c.id);
    expect(c.combat.spellSlots[2].used).toBe(1);
  });
  it('magias e preparações de mago e clérigo ficam em seleções distintas', () => {
    const c = hero('cleric', [{ classId: 'cleric', level: 3 }, { classId: 'wizard', level: 3 }]);
    const before = [...c.preparedSpells];
    changeSpellSelection(c, 'wizard', (s) => { s.knownSpells.push('phb-invisibility'); });
    expect(c.preparedSpells).toEqual(before);
    expect(spellSelectionOf(c, 'wizard').knownSpells).toContain('phb-invisibility');
    expect(spellLearnState(c, 3, 'wizard')?.maxCircle).toBe(2);
    expect(spellLearnState(c, 2, 'cleric')?.maxCircle).toBe(2);
    expect(deriveCharacter(c).spellProfiles).toMatchObject({ wizard: { attack: 6, dc: 14 }, cleric: { attack: 5, dc: 13 } });
  });
  it('Bastão do Pacto empunhado beneficia somente a origem de bruxo', () => {
    const c = hero('sorcerer', [{ classId: 'sorcerer', level: 3 }, { classId: 'warlock', level: 1 }]);
    give(c, 'm-rod-pact1', 'mainHand');
    expect(deriveCharacter(c).spellProfiles).toMatchObject({ sorcerer: { attack: 6, dc: 14 }, warlock: { attack: 7, dc: 15 } });
  });
  it('segunda subclasse concede proficiências e Ataque Extra sem trocar a primeira', () => {
    const c = hero('wizard', [{ classId: 'wizard', level: 4, subclassId: 'evocation' }, { classId: 'bard', level: 6, subclassId: 'valor' }], 'evocation');
    expect(attacksPerAction(c).count).toBe(2);
    expect(deriveCharacter(c).weaponArmorProfs.armor).toContain('médias');
    expect(c.subclassId).toBe('evocation');
  });
  it('dados de vida preservam os tipos e recuperam somente metade do total', () => {
    const c = hero('fighter', [{ classId: 'fighter', level: 3 }, { classId: 'wizard', level: 3 }]);
    expect(syncHitDicePools(c)).toEqual({ 10: { max: 3, remaining: 3 }, 6: { max: 3, remaining: 3 } });
    const actions = combatActions(ctx(c));
    actions.spendHitDie(c.id, 6);
    actions.spendHitDie(c.id, 6);
    actions.spendHitDie(c.id, 10);
    actions.spendHitDie(c.id, 10);
    expect(c.combat.hitDiceRemaining).toBe(2);
    actions.longRest(c.id);
    expect(c.combat.hitDiceRemaining).toBe(5);
    expect(c.combat.hitDicePools).toEqual({ 10: { max: 3, remaining: 3 }, 6: { max: 3, remaining: 2 } });
  });
  it('evoluir mantém os espaços gastos e acrescenta o dado da classe correta', () => {
    const c = hero('wizard', [{ classId: 'wizard', level: 3 }, { classId: 'fighter', level: 1 }]);
    c.campaign.allowMulticlass = true;
    saveSlotPools(c, syncSlotPools(c));
    spellsActions(ctx(c)).castWithSlot(c.id, 2, false, 'spellcasting');
    const result = progressionActions(ctx(c)).levelUp(c.id, { classId: 'fighter', hpMethod: 'media', hpValue: 6 });
    expect(result.ok).toBe(true);
    expect(c.combat.slotPools?.spellcasting[2].used).toBe(1);
    expect(c.combat.hitDicePools?.[10].max).toBe(2);
    expect(c.combat.hitDiceRemaining).toBe(5);
  });
});

describe('regressões de equipamentos e identidade', () => {
  it('Camisão Élfico aplica o teto médio e concede proficiência a quem veste', () => {
    const c = hero('wizard');
    c.baseAbilities.dex = 20;
    give(c, 'ma-elven-chain', 'armor');
    const d = deriveCharacter(c);
    expect(d.ac).toBe(16);
    expect(d.breakdowns.ac.note).not.toContain('sem proficiência');
  });
  it('Cajado do Poder exige empunhadura além de sintonia', () => {
    const c = hero('wizard');
    const base = deriveCharacter(c).ac;
    const staff = give(c, 'm-staff-power');
    expect(deriveCharacter(c).ac).toBe(base);
    c.equipped.mainHand = staff.uid;
    expect(deriveCharacter(c).ac).toBe(base + 2);
  });
  it('Língua de Fogo exige sintonia e lâmina acesa', () => {
    const c = hero();
    const sword = give(c, 'mw-flametongue', 'mainHand', false);
    const damage = () => deriveCharacter(c).attacks[0].bonusDamage;
    expect(damage()).toBeUndefined();
    sword.attuned = true;
    expect(damage()).toBeUndefined();
    sword.activated = true;
    expect(damage()).toEqual({ dice: 2, die: 6, type: 'fogo' });
  });
  it('apelido da tiara guardada não a ativa', () => {
    const c = hero('wizard');
    const head = give(c, 'm-headband-intellect', undefined, true, false);
    const base = deriveCharacter(c).abilities.int.total;
    head.name = 'Faixa do sábio';
    expect(deriveCharacter(c).abilities.int.total).toBe(base);
  });
  it('edição cosmética mantém referência e deduplicação', () => {
    const c = hero();
    give(c, 'm-ring-prot');
    const base = deriveCharacter(c).ac;
    const second = give(c, 'm-ring-prot');
    inventoryActions(ctx(c)).updateInventoryItem(c.id, second.uid, { name: 'Anel da família' });
    expect(c.inventory[1].itemId).toBe('m-ring-prot');
    expect(deriveCharacter(c).ac).toBe(base);
    expect(attunementBlock(c, second)).toContain('cópia');
  });
  it('Anel de Resistência exige sintonia e aplica a gema selecionada', () => {
    const c = hero();
    const ring = give(c, 'm-ring-resist', undefined, false);
    ring.resistanceType = 'fogo';
    expect(getItem('m-ring-resist')?.attunement).toBe(true);
    expect(deriveCharacter(c).resistances.some((r) => r.value === 'fogo')).toBe(false);
    ring.attuned = true;
    expect(deriveCharacter(c).resistances.some((r) => r.value === 'fogo')).toBe(true);
  });
  it('Arma Sagrada modifica somente a arma escolhida', () => {
    const c = hero('paladin', [{ classId: 'paladin', level: 3 }], 'devotion');
    give(c, 'w-longsword', 'mainHand');
    give(c, 'w-longbow', 'ranged');
    const before = deriveCharacter(c).attacks.map((a) => a.attackBonus);
    combatActions(ctx(c)).setMark(c.id, 'sacredWeapon', true);
    const after = deriveCharacter(c).attacks.map((a) => a.attackBonus);
    expect(after).toEqual([before[0] + 4, before[1]]);
  });
});

describe('regressões de atributos, subclasses e catálogo', () => {
  it('Resiliência Dracônica cresce só pelo nível de feiticeiro', () => {
    const c = hero('sorcerer', [{ classId: 'sorcerer', level: 1 }, { classId: 'fighter', level: 9 }], 'draconic');
    const plain = { ...c, subclassId: null };
    expect(deriveCharacter(c).maxHp - deriveCharacter(plain).maxHp).toBe(1);
  });
  it('monge de armadura não recebe o dado de Artes Marciais', () => {
    const c = hero('monk', [{ classId: 'monk', level: 5 }]);
    give(c, 'a-chainmail', 'armor');
    expect(deriveCharacter(c).attacks.find((a) => a.uid === 'monk-unarmed')).toBeUndefined();
  });
  it('Inspiração usa CAR efetivo com Pedra Ioun', () => {
    const c = hero('bard', [{ classId: 'bard', level: 5 }]);
    give(c, 'm-ioun-leadership');
    expect(resourceMaxMap(c).inspiration).toBe(5);
  });
  it('Canalizar Divindade conserva o maior máximo sem somar reservas', () => {
    const c = hero('cleric', [{ classId: 'cleric', level: 6 }, { classId: 'paladin', level: 4 }], 'life');
    expect(resourceMaxMap(c).channel).toBe(2);
    combatActions(ctx(c)).shortRest(c.id);
    expect(c.combat.resources.channel).toBe(2);
  });
  it('evolução conserva a subclasse principal e guarda a secundária', () => {
    const c = hero('fighter', [{ classId: 'fighter', level: 3 }], 'champion');
    c.campaign.allowMulticlass = true;
    const result = progressionActions(ctx(c)).levelUp(c.id, { classId: 'cleric', hpMethod: 'media', hpValue: 5, subclassId: 'life' });
    expect(result.ok).toBe(true);
    expect(c.subclassId).toBe('champion');
    expect(c.classLevels.find((cl) => cl.classId === 'cleric')?.subclassId).toBe('life');
  });
  it('outra versão de homebrew não muda os atributos desta ficha', () => {
    const a = hero();
    delete a.customOrigin;
    a.raceId = 'regression-race';
    a.customRace = { ...RACES[0], id: a.raceId, abilityBonus: { str: 1 }, updatedAt: 1 };
    const b = structuredClone(a);
    b.customRace = { ...a.customRace, abilityBonus: { str: 4 }, updatedAt: 2 };
    const before = deriveCharacter(a).abilities.str.total;
    deriveCharacter(b);
    expect(deriveCharacter(a).abilities.str.total).toBe(before);
  });
  it('defesas abreviadas de Espectro e Lobisomem reconhecem dano físico', () => {
    expect(defenseFor('cortante', { resist: MONSTER_BY_ID.specter.resist })).toBe('half');
    expect(defenseFor('cortante', { immune: MONSTER_BY_ID.werewolf.immune })).toBe('zero');
    expect(defenseFor('cortante', { immune: MONSTER_BY_ID.werewolf.immune }, true)).toBe('normal');
    expect(defenseFor('força', { immune: 'energia' })).toBe('zero');
  });
  it('mago 3 / clérigo 3 não aprende magias de terceiro círculo', () => {
    const c = hero('wizard', [{ classId: 'wizard', level: 3 }, { classId: 'cleric', level: 3 }]);
    const state = spellLearnState(c, 3)!;
    expect(learnBlock(c, state, getSpell('sp-bolafogo')!)).not.toBeNull();
  });
});
