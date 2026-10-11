import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { itemToInventory, offHandCandidate, placeInOffHand } from '../inventory';
import { resolveExtras, weaponExtras } from '../damageExtras';
import { getItem } from '@/data/items';
import type { Character } from '@/types/character';

/** Guerreiro com as armas dadas: a primeira na mão principal; `shield` põe escudo. */
function hero(weapons: string[], opts: { feats?: string[]; shield?: boolean; offHand?: boolean } = {}): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Brakka', classId: 'fighter', raceId: 'human' });
  c.level = 5;
  c.classLevels = [{ classId: 'fighter', level: 5 }];
  c.baseAbilities = { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 8 };
  c.feats = opts.feats ?? [];
  const items = weapons.map((id) => itemToInventory(getItem(id)!));
  const shield = opts.shield ? itemToInventory(getItem('s-shield')!) : null;
  c.inventory = shield ? [...items, shield] : items;
  c.equipped = {
    armor: null,
    shield: shield?.uid ?? null,
    mainHand: items[0]?.uid ?? null,
    offHand: opts.offHand ? items[1]?.uid ?? null : null,
    ranged: items.find((i) => getItem(i.itemId)?.weapon?.range === 'ranged')?.uid ?? null,
  };
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return c;
}
const attacks = (c: Character) => deriveCharacter(c).attacks;

describe('Mestre em Armas Grandes e Atirador de Elite (−5 / +10)', () => {
  it('arma pesada corpo a corpo com proficiência libera o golpe poderoso; arma leve não', () => {
    expect(attacks(hero(['w-greatsword'], { feats: ['gwm'] }))[0].powerAttack).toBe('Mestre em Armas Grandes');
    expect(attacks(hero(['w-longsword'], { feats: ['gwm'] }))[0].powerAttack).toBeUndefined();
    expect(attacks(hero(['w-greatsword']))[0].powerAttack).toBeUndefined();
  });

  it('o ataque bônus do crítico/derrubar vale com qualquer arma corpo a corpo', () => {
    expect(attacks(hero(['w-longsword'], { feats: ['gwm'] }))[0].gwmBonus).toBe(true);
    expect(attacks(hero(['w-longbow'], { feats: ['gwm'] }))[0].gwmBonus).toBe(false);
  });

  it('+10 entra no dano só quando ligado', () => {
    const c = hero(['w-greatsword'], { feats: ['gwm'] });
    const atk = attacks(c)[0];
    const avail = weaponExtras(c, atk);
    expect(resolveExtras(c, atk, avail, { power: true }).flat).toBe(10);
    expect(resolveExtras(c, atk, avail, {}).flat).toBe(0);
  });

  it('Atirador de Elite faz o mesmo com arma à distância', () => {
    expect(attacks(hero(['w-longbow'], { feats: ['sharpshooter'] }))[0].powerAttack).toBe('Atirador de Elite');
  });
});

describe('Mestre em Hastes (ataque bônus com o cabo)', () => {
  it('glaive, alabarda, bordão e lança ganham o ataque de 1d4 concussão', () => {
    for (const id of ['w-glaive', 'w-halberd', 'w-quarterstaff', 'w-spear']) {
      const list = attacks(hero([id], { feats: ['polearm-master'] }));
      const butt = list.find((a) => a.uid.endsWith(':cabo'));
      expect(butt, id).toBeTruthy();
      expect([butt!.damageDice, butt!.damageDie, butt!.damageType]).toEqual([1, 4, 'concussão']);
      expect(butt!.attackBonus).toBe(list[0].attackBonus);
      expect(butt!.damageBonus).toBe(list[0].damageBonus);
    }
  });

  it('sem o talento, ou com outra arma, não aparece', () => {
    expect(attacks(hero(['w-glaive'])).some((a) => a.uid.endsWith(':cabo'))).toBe(false);
    expect(attacks(hero(['w-greatsword'], { feats: ['polearm-master'] })).some((a) => a.uid.endsWith(':cabo'))).toBe(false);
  });

  it('com escudo a lança ainda vale (só uma arma empunhada)', () => {
    expect(attacks(hero(['w-spear'], { feats: ['polearm-master'], shield: true })).some((a) => a.uid.endsWith(':cabo'))).toBe(true);
  });
});

describe('Versátil só com a outra mão livre', () => {
  it('espada longa sozinha pode usar as duas mãos', () => {
    expect(attacks(hero(['w-longsword']))[0].versatileDie).toBe(10);
  });
  it('com escudo ou segunda arma, não', () => {
    expect(attacks(hero(['w-longsword'], { shield: true }))[0].versatileDie).toBeUndefined();
    expect(attacks(hero(['w-longsword', 'w-dagger'], { offHand: true }))[0].versatileDie).toBeUndefined();
  });
});

describe('Equipar na segunda mão', () => {
  it('põe a arma ao lado da principal e tira o escudo', () => {
    const c = hero(['w-shortsword', 'w-dagger'], { shield: true });
    const dagger = c.inventory[1];
    expect(offHandCandidate(c, dagger)).toBe(true);
    const r = placeInOffHand(c, dagger);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.equipped.offHand).toBe(dagger.uid);
    expect(r.equipped.shield).toBeNull();
    expect(r.note).toMatch(/Escudo foi para a mochila/);
    const off = deriveCharacter({ ...c, equipped: r.equipped }).attacks.find((a) => a.uid === dagger.uid)!;
    expect(off.note).toMatch(/mão secundária · ação bônus/);
  });

  it('armas não leves: segura, mas avisa que não há ataque bônus', () => {
    const c = hero(['w-longsword', 'w-longsword']);
    const r = placeInOffHand(c, c.inventory[1]);
    expect(r.ok && r.note).toMatch(/sem ataque bônus/);
    if (!r.ok) return;
    const off = deriveCharacter({ ...c, equipped: r.equipped }).attacks.find((a) => a.uid === c.inventory[1].uid)!;
    expect(off.note).toMatch(/sem ataque bônus/);
    // com Combatente com Duas Armas vale
    const feat = hero(['w-longsword', 'w-longsword'], { feats: ['dual-wielder'] });
    const r2 = placeInOffHand(feat, feat.inventory[1]);
    expect(r2.ok && r2.note).not.toMatch(/sem ataque bônus/);
  });

  it('recusa arma de duas mãos ou com a principal de duas mãos', () => {
    const c = hero(['w-greatsword', 'w-dagger']);
    expect(offHandCandidate(c, c.inventory[1])).toBe(false);
    expect(placeInOffHand(c, c.inventory[1])).toMatchObject({ ok: false });
    const d = hero(['w-shortsword', 'w-greataxe']);
    expect(placeInOffHand(d, d.inventory[1])).toMatchObject({ ok: false });
  });
});
