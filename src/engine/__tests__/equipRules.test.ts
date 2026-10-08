import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { containerOf, isEquipped, itemIsActive, itemToInventory, moveItemTo } from '../inventory';
import { bodySlotOf } from '../bodySlots';
import { itemGrantedSpells } from '../spellcasting';
import { previewEquip } from '../equipPreview';
import { getItem } from '@/data/items';
import type { Character } from '@/types/character';

function hero(classId = 'fighter'): Character {
  const c = finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'Teste', classId, raceId: 'human' }));
  c.inventory = [];
  c.equipped = { armor: null, shield: null, mainHand: null, offHand: null, ranged: null };
  return c;
}
function add(c: Character, id: string, attuned = false) {
  const it = itemToInventory(getItem(id)!);
  it.attuned = attuned;
  c.inventory.push(it);
  return it;
}

describe('itens vestidos: anéis, capa, botas, amuleto', () => {
  it('cada item sabe onde se veste', () => {
    const slot = (id: string) => bodySlotOf(itemToInventory(getItem(id)!));
    expect(slot('m-ring-prot')).toBe('anel');
    expect(slot('m-cloak-prot')).toBe('manto');
    expect(slot('m-robe-archmagi')).toBe('veste');
    expect(slot('m-boots-speed')).toBe('pes');
    expect(slot('m-gauntlets-ogre')).toBe('maos');
    expect(slot('m-bracers-defense')).toBe('bracos');
    expect(slot('m-headband-intellect')).toBe('cabeca');
    expect(slot('m-amulet-health')).toBe('pescoco');
    expect(slot('m-belt-hill')).toBe('cintura');
    expect(slot('m-ioun-protection')).toBe('orbita');
    expect(slot('m-wand-missiles')).toBeNull();
    expect(slot('w-longsword')).toBeNull();
  });

  it('dá para vestir anel e amuleto; até 2 anéis, 1 capa', () => {
    const c = hero();
    const r1 = add(c, 'm-ring-prot', true);
    const r2 = add(c, 'm-ring-warmth', true);
    const r3 = add(c, 'm-ring-swimming');
    expect(moveItemTo(c, r1.uid, 'equipado').ok).toBe(true);
    expect(moveItemTo(c, r2.uid, 'equipado').ok).toBe(true);
    const third = moveItemTo(c, r3.uid, 'equipado');
    expect(third.ok).toBe(false);
    expect(!third.ok && third.reason).toMatch(/2 anéis/);
    expect(containerOf(c, r1)).toBe('equipado');

    const cloak1 = add(c, 'm-cloak-prot', true);
    const cloak2 = add(c, 'm-cloak-elvenkind', true);
    expect(moveItemTo(c, cloak1.uid, 'equipado').ok).toBe(true);
    const r = moveItemTo(c, cloak2.uid, 'equipado');
    expect(!r.ok && r.reason).toMatch(/uma capa/);

    const amulet = add(c, 'm-amulet-health', true);
    expect(moveItemTo(c, amulet.uid, 'equipado').ok).toBe(true);
    expect(deriveCharacter(c).abilities.con.total).toBe(19);
  });

  it('anel só vale vestido E sintonizado', () => {
    const c = hero();
    const base = deriveCharacter(c).ac;
    const ring = add(c, 'm-ring-prot');
    ring.worn = false;
    ring.attuned = true;
    expect(deriveCharacter(c).ac).toBe(base); // sintonizado, mas no bolso
    ring.worn = true;
    ring.attuned = false;
    expect(deriveCharacter(c).ac).toBe(base); // vestido, sem sintonia
    ring.attuned = true;
    expect(deriveCharacter(c).ac).toBe(base + 1);
    expect(previewEquip(c, ring.uid)).toBeNull(); // já vestido
  });

  it('ficha antiga: anel sintonizado nunca marcado como vestido continua valendo', () => {
    const c = hero();
    const base = deriveCharacter(c).ac;
    const ring = add(c, 'm-ring-prot', true);
    delete ring.worn;
    expect(isEquipped(c, ring)).toBe(true);
    expect(deriveCharacter(c).ac).toBe(base + 1);
  });

  it('dois itens iguais não somam (dois Anéis de Proteção = +1)', () => {
    const c = hero();
    const base = deriveCharacter(c).ac;
    const a = add(c, 'm-ring-prot', true);
    const b = add(c, 'm-ring-prot', true);
    moveItemTo(c, a.uid, 'equipado');
    moveItemTo(c, b.uid, 'equipado');
    expect(deriveCharacter(c).ac).toBe(base + 1);
  });

  it('vestir item que pede sintonia avisa que ainda não funciona', () => {
    const c = hero();
    const boots = add(c, 'm-boots-speed');
    const r = moveItemTo(c, boots.uid, 'equipado');
    expect(r.ok && r.note).toMatch(/sintonizado/);
    expect(itemIsActive(c, boots)).toBe(false);
  });

  it('a prévia mostra o ganho antes de vestir (Manoplas de Força do Ogro)', () => {
    const c = hero();
    const g = add(c, 'm-gauntlets-ogre', true);
    const p = previewEquip(c, g.uid)!;
    expect(p.deltas.some((d) => d.label === 'FOR' && d.to === '19')).toBe(true);
  });
});

describe('mãos: escudo, duas mãos e duas armas', () => {
  it('escudo tira a arma de duas mãos', () => {
    const c = hero();
    const axe = add(c, 'w-greataxe');
    const shield = add(c, 's-shield');
    moveItemTo(c, axe.uid, 'equipado');
    const r = moveItemTo(c, shield.uid, 'equipado');
    expect(r.ok && r.note).toMatch(/duas mãos/);
    expect(c.equipped.mainHand).toBeNull();
    expect(c.equipped.shield).toBe(shield.uid);
  });

  it('duas armas leves: a segunda vai para a mão secundária, sem atributo no dano', () => {
    const c = hero();
    c.baseAbilities = { ...c.baseAbilities, str: 16 };
    const a = add(c, 'w-shortsword');
    const b = add(c, 'w-dagger');
    moveItemTo(c, a.uid, 'equipado');
    const r = moveItemTo(c, b.uid, 'equipado');
    expect(r.ok && r.note).toMatch(/mão secundária/);
    expect(c.equipped.mainHand).toBe(a.uid);
    expect(c.equipped.offHand).toBe(b.uid);
    const d = deriveCharacter(c);
    const main = d.attacks.find((x) => x.uid === a.uid)!;
    const off = d.attacks.find((x) => x.uid === b.uid)!;
    expect(main.damageBonus).toBeGreaterThan(0);
    expect(off.damageBonus).toBe(0);
    expect(off.note).toMatch(/mão secundária/);
    // Estilo de Luta com Duas Armas devolve o atributo ao dano da secundária
    c.choices = { ...(c.choices ?? {}), 'fighter.fightingStyle': ['twf'] };
    expect(deriveCharacter(c).attacks.find((x) => x.uid === b.uid)!.damageBonus).toBe(main.damageBonus);
  });

  it('arma não leve troca a principal; escudo tira a mão secundária; tirar a principal promove a secundária', () => {
    const c = hero();
    const a = add(c, 'w-shortsword');
    const b = add(c, 'w-dagger');
    const sword = add(c, 'w-longsword');
    moveItemTo(c, a.uid, 'equipado');
    moveItemTo(c, b.uid, 'equipado');
    moveItemTo(c, a.uid, 'mochila');
    expect(c.equipped.mainHand).toBe(b.uid);
    expect(c.equipped.offHand).toBeNull();
    moveItemTo(c, sword.uid, 'equipado');
    expect(c.equipped.mainHand).toBe(sword.uid);
    expect(c.equipped.offHand).toBeNull();
  });

  it('Combatente com Duas Armas: não leves em cada mão e +1 de CA', () => {
    const c = hero();
    c.feats = [...(c.feats ?? []), 'dual-wielder'];
    const base = deriveCharacter(c).ac;
    const a = add(c, 'w-longsword');
    const b = add(c, 'w-battleaxe');
    moveItemTo(c, a.uid, 'equipado');
    moveItemTo(c, b.uid, 'equipado');
    expect(c.equipped.offHand).toBe(b.uid);
    expect(deriveCharacter(c).ac).toBe(base + 1);
  });
});

describe('varinhas e cajados', () => {
  it('Varinha de Mísseis Mágicos (sem sintonia) funciona na mochila; no Baú, não', () => {
    const c = hero('wizard');
    const wand = add(c, 'm-wand-missiles');
    expect(containerOf(c, wand)).toBe('mochila');
    expect(itemGrantedSpells(c).map((s) => s.itemUid)).toContain(wand.uid);
    moveItemTo(c, wand.uid, 'bau');
    expect(itemGrantedSpells(c)).toHaveLength(0);
  });
});
