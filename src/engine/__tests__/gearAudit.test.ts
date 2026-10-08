import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { attunementBlock, itemToInventory, slotForItem } from '../inventory';
import { itemGrantedSpells } from '../spellcasting';
import { chargeOptions, chargesLeft, rechargeAll } from '../itemCharges';
import { buildLoadout, defaultSelection, domainPending, expandKit, GOLD_KEY, kitForClass, kitItems, optionAllowed, wealthOf } from '../loadout';
import { materialCover, materialWarning } from '../spellFocus';
import { defenseFor } from '../strike';
import { baseWeaponId, isWeaponProficient, proficienciesOf } from '../proficiencies';
import { getItem } from '@/data/items';
import { getSpell } from '@/data/spells';
import type { Character, InventoryItem } from '@/types/character';

function hero(classId = 'wizard'): Character {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'Teste', classId, raceId: 'human' }));
  c.inventory = [];
  c.equipped = { armor: null, shield: null, mainHand: null, offHand: null, ranged: null };
  return c;
}
function add(c: Character, id: string, patch: Partial<InventoryItem> = {}) {
  const it = { ...itemToInventory(getItem(id)!), ...patch };
  c.inventory.push(it);
  return it;
}
const spend = (c: Character, uid: string, n: number) => ({ ...c, combat: { ...c.combat, itemCharges: { ...(c.combat.itemCharges ?? {}), [uid]: (c.combat.itemCharges?.[uid] ?? 0) + n } } });

describe('cargas de cajados e varinhas (Guia do Mestre)', () => {
  it('Cajado do Fogo: 10 cargas compartilhadas, custo por magia', () => {
    const c = hero('wizard');
    const staff = add(c, 'm-staff-fire', { attuned: true });
    const spells = itemGrantedSpells(c).filter((s) => s.itemUid === staff.uid);
    expect(spells.map((s) => [s.spell.name, s.cost])).toEqual([['Mãos Flamejantes', 1], ['Bola de Fogo', 3], ['Muralha de Fogo', 4]]);
    expect(spells.every((s) => s.charges?.max === 10 && s.charges.left === 10)).toBe(true);
    // gastou 8: Bola de Fogo (3) ainda não dá, Mãos Flamejantes (1) dá
    const low = spend(c, staff.uid, 8);
    const after = itemGrantedSpells(low).filter((s) => s.itemUid === staff.uid);
    expect(after.find((s) => s.spell.name === 'Bola de Fogo')!.options).toEqual([]);
    expect(after.find((s) => s.spell.name === 'Mãos Flamejantes')!.options).toEqual([{ level: 1, cost: 1 }]);
    expect(chargesLeft(low, staff)).toBe(2);
  });

  it('Cajado da Cura: Curar Ferimentos gasta 1 carga por círculo (até o 4º)', () => {
    const cure = itemGrantedSpells((() => { const c = hero('cleric'); add(c, 'm-staff-healing', { attuned: true }); return c; })()).find((s) => s.spell.name === 'Curar Ferimentos')!;
    expect(cure.options).toEqual([{ level: 1, cost: 1 }, { level: 2, cost: 2 }, { level: 3, cost: 3 }, { level: 4, cost: 4 }]);
  });

  it('Varinha de Bolas de Fogo: 1 carga no 3º, cada carga extra sobe um círculo; CD 15 fixa', () => {
    const grant = getItem('m-wand-fireballs')!.grantsSpells![0];
    expect(chargeOptions(grant, getSpell('sp-bolafogo')!, 3)).toEqual([{ level: 3, cost: 1 }, { level: 4, cost: 2 }, { level: 5, cost: 3 }]);
    expect(grant.dc).toBe(15);
  });

  it('Cajado do Poder: 20 cargas, Bola de Fogo de 5º por 5 cargas e +2 como bordão', () => {
    const p = getItem('m-staff-power')!;
    expect(p.charges?.max).toBe(20);
    expect(chargeOptions(p.grantsSpells!.find((g) => g.spellId === 'sp-bolafogo')!, getSpell('sp-bolafogo')!, 20)).toEqual([{ level: 5, cost: 5 }]);
    expect(p.weapon?.magicBonus).toBe(2);
  });

  it('Cajado do Gelo tem Muralha de Gelo', () => {
    expect(getItem('m-staff-frost')!.grantsSpells!.map((g) => g.spellId)).toContain('phb-wall-ice');
  });

  it('amanhecer: recupera os dados de recarga sem passar do máximo', () => {
    const c = hero('wizard');
    const wand = add(c, 'm-wand-missiles');
    const used = spend(c, wand.uid, 5);
    const r = rechargeAll(used, () => 3);
    expect(r.used[wand.uid]).toBe(2);
    expect(r.report[0]).toMatchObject({ regained: 3, left: 5, max: 7 });
    expect(rechargeAll(used, () => 99).used[wand.uid]).toBeUndefined(); // cheia de novo
  });

  it('cópia antiga na mochila (sem cargas salvas) ganha as cargas do catálogo', () => {
    const c = hero('wizard');
    add(c, 'm-staff-fire', { attuned: true, charges: undefined, grantsSpells: [{ spellId: 'sp-bolafogo', recharge: 'long', uses: 2 }] });
    expect(itemGrantedSpells(c).find((s) => s.spell.name === 'Bola de Fogo')!.cost).toBe(3);
  });
});

describe('cajados servem de bordão', () => {
  it('foco arcano e cajados mágicos vão para a mão e o mago é proficiente', () => {
    const c = hero('wizard');
    for (const id of ['g-focus-staff', 'g-druidic-staff', 'm-staff-healing', 'm-staff-power']) {
      const it = add(c, id);
      expect(slotForItem(it)).toBe('mainHand');
      expect(baseWeaponId(it)).toBe('w-quarterstaff');
      expect(isWeaponProficient(proficienciesOf(c), it, 'simple', 'melee')).toBe(true);
    }
  });

  it('Cajado do Poder sintonizado: ataque como bordão +2', () => {
    const c = hero('wizard');
    const staff = add(c, 'm-staff-power', { attuned: true });
    c.equipped.mainHand = staff.uid;
    const plain = hero('wizard');
    const qs = add(plain, 'w-quarterstaff');
    plain.equipped.mainHand = qs.uid;
    expect(deriveCharacter(c).attacks[0].attackBonus).toBe(deriveCharacter(plain).attacks[0].attackBonus + 2);
  });

  it('Adaga do Veneno conta como adaga (mago proficiente)', () => {
    const c = hero('wizard');
    expect(isWeaponProficient(proficienciesOf(c), add(c, 'mw-daggervenom'), 'simple', 'melee')).toBe(true);
  });
});

describe('sintonia restrita por classe', () => {
  it('Cajado da Cura só para bardo, clérigo ou druida', () => {
    const w = hero('wizard');
    expect(attunementBlock(w, add(w, 'm-staff-healing'))).toBe('Cajado da Cura só aceita sintonia de bardos, clérigos ou druidas.');
    const c = hero('cleric');
    expect(attunementBlock(c, add(c, 'm-staff-healing'))).toBeNull();
  });
  it('"conjurador": varinha da Teia aceita qualquer classe que conjure, não o guerreiro', () => {
    const f = hero('fighter');
    expect(attunementBlock(f, add(f, 'm-wand-web'))).toMatch(/conjuradores/);
    const p = hero('paladin');
    expect(attunementBlock(p, add(p, 'm-wand-web'))).toBeNull();
  });
  it('Anel de Resistência não pede sintonia (Guia do Mestre)', () => {
    expect(getItem('m-ring-resist')!.attunement).toBeFalsy();
  });
});

describe('outros itens nas contas', () => {
  it('Pedra da Sorte: +1 em perícias, iniciativa e Percepção passiva', () => {
    const c = hero('fighter');
    const base = deriveCharacter(c);
    add(c, 'm-stone-luck', { attuned: true });
    const d = deriveCharacter(c);
    expect(d.initiative).toBe(base.initiative + 1);
    expect(d.skills.find((s) => s.key === 'stealth')!.bonus).toBe(base.skills.find((s) => s.key === 'stealth')!.bonus + 1);
    expect(d.passivePerception).toBe(base.passivePerception + 1);
  });
  it('Machado do Berserker: +1 PV máximo por nível', () => {
    const c = hero('fighter');
    const base = deriveCharacter(c).maxHp;
    add(c, 'mw-berserker-axe', { attuned: true });
    expect(deriveCharacter(c).maxHp).toBe(base + c.level);
  });
  it('dano de frio: "gelo" antigo ainda bate com resistência a frio', () => {
    expect(defenseFor('gelo', { resist: 'frio' })).toBe('half');
    expect(getItem('mw-frostbrand')!.weapon!.bonusDamage!.type).toBe('frio');
  });
});

describe('kits iniciais do Livro do Jogador', () => {
  const ids = (classId: string, c: Character | null = null) => expandKit(kitItems(classId, defaultSelection(classId, c), c)).map(([id]) => id);

  it('cada classe monta o kit sem itens fora do catálogo', () => {
    for (const cls of ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard']) {
      const kit = kitForClass(cls);
      for (const choice of kit.choices) for (const o of choice.options) for (const [id] of o.items ?? []) expect(getItem(id), `${cls}: ${id}`).toBeTruthy();
      for (const [id] of kit.fixed) expect(getItem(id), `${cls}: ${id}`).toBeTruthy();
      expect(ids(cls).every((id) => !!getItem(id))).toBe(true);
    }
  });

  it('mago: grimório, foco ou bolsa e pacote aberto (não mais poção de cura)', () => {
    const k = ids('wizard');
    expect(k).toEqual(expect.arrayContaining(['g-spellbook', 'g-componentpouch', 'w-quarterstaff', 'g-backpack', 'g-book', 'g-parchment']));
    expect(k).not.toContain('p-heal');
    expect(k).not.toContain('g-pack-scholar'); // o pacote chega aberto
  });

  it('ladino: couro, duas adagas, ferramentas de ladrão, arco curto com 20 flechas', () => {
    const { inventory, equipped } = buildLoadout('rogue', defaultSelection('rogue'));
    const n = (id: string) => inventory.filter((i) => i.itemId === id).reduce((s, i) => s + i.quantity, 0);
    expect(n('w-dagger')).toBe(2);
    expect(n('g-thieves')).toBe(1);
    expect(n('g-arrows')).toBe(1);
    expect(inventory.find((i) => i.uid === equipped.armor)?.itemId).toBe('a-leather');
    expect(inventory.find((i) => i.uid === equipped.ranged)?.itemId).toBe('w-shortbow');
    expect(inventory.find((i) => i.uid === equipped.mainHand)?.itemId).toBe('w-rapier');
  });

  it('pacote de explorador: 10 tochas e 10 rações como itens', () => {
    const { inventory } = buildLoadout('barbarian', defaultSelection('barbarian'));
    expect(inventory.find((i) => i.itemId === 'g-torch')?.quantity).toBe(10);
    expect(inventory.find((i) => i.itemId === 'g-rations')?.quantity).toBe(10);
    expect(inventory.find((i) => i.itemId === 'w-javelin')?.quantity).toBe(4);
    expect(inventory.filter((i) => i.itemId === 'w-handaxe')).toHaveLength(2); // dois, um em cada mão
  });

  it('clérigo: martelo de guerra e cota de malha só com a proficiência', () => {
    const plain = hero('cleric');
    const k = kitForClass('cleric');
    const hammer = k.choices.find((c) => c.id === 'w1')!.options.find((o) => o.id === 'w-warhammer')!;
    expect(hammer.requires).toBe('martial');
    expect(ids('cleric', plain)).not.toContain('a-chainmail');
    expect(ids('cleric', plain)).toContain('g-holy-amulet');
  });

  it('arma de duas mãos não fica com o escudo empunhado', () => {
    const sel = { ...defaultSelection('fighter'), w1: { option: 'shield', picks: ['w-greatsword'] } };
    const { inventory, equipped } = buildLoadout('fighter', sel);
    expect(inventory.find((i) => i.uid === equipped.mainHand)?.itemId).toBe('w-greatsword');
    expect(equipped.shield).toBeNull();
    expect(inventory.some((i) => i.itemId === 's-shield')).toBe(true);
  });

  it('ficha nova (finalizeCharacter) usa o kit do livro e o equipamento do antecedente vira item de catálogo', () => {
    const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'K', classId: 'rogue', raceId: 'human', backgroundId: 'criminal' }));
    expect(c.inventory.some((i) => i.itemId === 'g-thieves')).toBe(true);
    expect(c.inventory.some((i) => i.itemId === 'g-crowbar')).toBe(true); // Pé de cabra do Criminoso
  });
});

describe('kits: revisão da tela de seleção', () => {
  it('ouro inicial: só o ouro do antecedente (Soldado: 10 po), não 25 fixos', () => {
    const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'K', classId: 'fighter', raceId: 'human', backgroundId: 'soldier' }));
    expect(c.coins.gp).toBe(10);
  });

  it('trocar o kit por ouro (regra do livro): sem itens da classe, ouro somado ao do antecedente', () => {
    expect(wealthOf('fighter')).toMatchObject({ formula: '5d4 × 10 po', average: 125 });
    expect(wealthOf('monk').formula).toBe('5d4 po');
    const d = createDraftCharacter({ ownerId: 't', name: 'K', classId: 'wizard', raceId: 'human', backgroundId: 'sage' });
    d.startingKit = { [GOLD_KEY]: { option: 'gold', picks: ['100'] } };
    const c = finalizeCharacter(d);
    expect(c.coins.gp).toBe(110); // 100 + 10 do Sábio
    expect(c.inventory.some((i) => i.itemId === 'g-spellbook')).toBe(false);
    expect(c.inventory.some((i) => i.itemId === 'g-ink')).toBe(true); // o antecedente continua
  });

  it('patrulheiro: as duas espadas curtas ficam uma em cada mão', () => {
    const { inventory, equipped } = buildLoadout('ranger', defaultSelection('ranger'));
    const name = (u: string | null) => inventory.find((i) => i.uid === u)?.itemId;
    expect(name(equipped.mainHand)).toBe('w-shortsword');
    expect(name(equipped.offHand)).toBe('w-shortsword');
    expect(equipped.mainHand).not.toBe(equipped.offHand);
  });

  it('"qualquer arma simples" do bruxo começa no bordão (não na maça)', () => {
    expect(defaultSelection('warlock').w2.picks).toEqual(['w-quarterstaff']);
    expect(defaultSelection('fighter').w1.picks).toEqual(['w-longsword']);
  });

  it('clérigo sem domínio ainda: cota de malha liberada com aviso; com domínio sem a proficiência, bloqueada', () => {
    const c = hero('cleric');
    const chain = kitForClass('cleric').choices.find((x) => x.id === 'armor')!.options.find((o) => o.id === 'a-chainmail')!;
    expect(domainPending(c)).toBe(true);
    expect(optionAllowed(c, chain)).toBe(true);
    const knowledge = { ...c, subclassId: 'knowledge' };
    expect(optionAllowed(knowledge, chain)).toBe(false);
  });
});

describe('componentes e foco', () => {
  it('sem foco nem bolsa: avisa nas magias com material sem custo', () => {
    const c = hero('wizard');
    const sleep = getSpell('sp-sono')!;
    expect(materialWarning(c, sleep).warn).toMatch(/foco/);
    add(c, 'g-focus-crystal');
    expect(materialCover(c)).toBe('Foco Arcano: Cristal');
    expect(materialWarning(c, sleep).warn).toBeUndefined();
  });
  it('material com preço sempre lembra (mesmo com foco)', () => {
    const c = hero('cleric');
    add(c, 'g-holy-amulet');
    expect(materialWarning(c, getSpell('sp-revigorar')!).line).toMatch(/300 po/);
  });
  it('foco errado para a classe não vale (cristal arcano não serve ao clérigo)', () => {
    const c = hero('cleric');
    add(c, 'g-focus-crystal');
    expect(materialCover(c)).toBeNull();
  });
});

describe('correções de dados das magias', () => {
  it('alcances, tempo e componentes conferidos com o livro', () => {
    expect(getSpell('sp-calorabrasante')!.range).toBe('36 m'); // Raio Ardente: 120 pés
    expect(getSpell('phb-cordon-arrows')!.range).toBe('1,5 m');
    expect(getSpell('phb-awaken')!.castingTime).toBe('8 horas');
    expect(getSpell('xge-summon-greater-demon')!.components).toBe('V, S, M');
    expect(getSpell('sp-aterrorizar')!.damage).toBeUndefined(); // Raio do Enfraquecimento não causa dano
    expect(getSpell('sp-criaragua')!.save).toBeUndefined();
    expect(getSpell('phb-augury')!.material).toMatch(/25 po/);
    expect(getSpell('tce-summon-beast')!.material).toMatch(/200 po/);
  });
});
