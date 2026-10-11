import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { characterResources } from '../classResources';
import { clericState, destroyUndeadCr, lifeHealing, potentSpellcasting, withLifeHealing } from '../cleric';
import { divineStrike, resolveExtras, weaponExtras } from '../damageExtras';
import { healRoll } from '../spellCast';
import { grantedSpells } from '../spellcasting';
import { itemToInventory } from '../inventory';
import { SPELL_BY_ID } from '@/data/spells';
import { getItem } from '@/data/items';
import type { Character } from '@/types/character';

function cleric(level: number, subclassId: string | null = null, extra: Partial<Character> = {}): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Irmã Odila', classId: 'cleric', raceId: 'human' });
  c.level = level;
  c.classLevels = [{ classId: 'cleric', level }];
  c.subclassId = subclassId;
  c.baseAbilities = { str: 14, dex: 10, con: 14, int: 10, wis: 16, cha: 12 };
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return { ...c, ...extra };
}
const st = (c: Character) => {
  const d = deriveCharacter(c);
  return clericState(c, d.proficiency, d.abilities.wis.mod)!;
};
const res = (c: Character) => Object.fromEntries(characterResources(c).map((r) => [r.id, r]));

describe('Clérigo do 1 ao 20 (PHB 2014)', () => {
  it('Canalizar Divindade 1/2/3 (2º/6º/18º) e Expulsar Mortos-Vivos sempre disponível', () => {
    expect(res(cleric(1)).channel).toBeUndefined();
    expect([2, 6, 18].map((l) => res(cleric(l)).channel.max)).toEqual([1, 2, 3]);
    expect(st(cleric(2)).channels.map((c) => c.id)).toEqual(['turnUndead']);
    expect(st(cleric(5)).dc).toBe(8 + 3 + 3);
  });

  it('Destruir Mortos-Vivos: ND 1/2, 1, 2, 3, 4 (5º, 8º, 11º, 14º, 17º)', () => {
    expect([4, 5, 8, 11, 14, 17].map(destroyUndeadCr)).toEqual([null, '1/2', '1', '2', '3', '4']);
  });

  it('Intervenção Divina no 10º (chance = nível) e garantida no 20º', () => {
    expect(st(cleric(9)).intervention).toBeNull();
    expect(st(cleric(10)).intervention).toEqual({ left: 1, chance: 10 });
    expect(st(cleric(20)).intervention?.chance).toBe(100);
  });

  it('Canalizar de cada domínio (2º e 6º)', () => {
    const ids = (sub: string, lv = 6) => st(cleric(lv, sub)).channels.map((c) => c.id).slice(1);
    expect(ids('life')).toEqual(['preserveLife']);
    expect(ids('light')).toEqual(['radiance']);
    expect(ids('tempest')).toEqual(['destructiveWrath']);
    expect(ids('war')).toEqual(['guidedStrike', 'warGodBlessing']);
    expect(ids('war', 5)).toEqual(['guidedStrike']);
    expect(ids('knowledge')).toEqual(['knowledgeAges', 'readThoughts']);
    expect(ids('nature')).toEqual(['charmAnimals']);
    expect(ids('trickery')).toEqual(['duplicity', 'cloakShadows']);
    expect(st(cleric(4, 'life')).preserveLife).toBe(20);
    expect(st(cleric(7, 'light')).channels[1].roll).toEqual({ count: 2, die: 10, bonus: 7, type: 'radiante' });
  });

  it('Vida: Discípulo da Vida (+2 + círculo), Curandeiro Abençoado (6º) e Cura Suprema (17º)', () => {
    const cure = SPELL_BY_ID['sp-curar'];
    const base = healRoll(cure, 2, 3)!;
    expect(withLifeHealing(base, lifeHealing(cleric(1, 'life'), 2)).bonus).toBe(3 + 4);
    expect(lifeHealing(cleric(5, 'life'), 2)?.blessed).toBe(0);
    expect(lifeHealing(cleric(6, 'life'), 3)?.blessed).toBe(5);
    const supreme = withLifeHealing(base, lifeHealing(cleric(17, 'life'), 2));
    expect([supreme.count, supreme.bonus]).toEqual([0, 2 * 8 + 3 + 4]);
    expect(lifeHealing(cleric(17, 'life'), 0)).toBeNull(); // truque não conta
    expect(lifeHealing(cleric(17, 'light'), 2)).toBeNull();
  });

  it('Conjuração Potente (Luz/Conhecimento 8º): + SAB no dano dos truques de clérigo', () => {
    const flame = SPELL_BY_ID['sp-chama'];
    expect(potentSpellcasting(cleric(7, 'light'), flame, 3)).toBe(0);
    expect(potentSpellcasting(cleric(8, 'light'), flame, 3)).toBe(3);
    expect(potentSpellcasting(cleric(8, 'knowledge'), flame, 3)).toBe(3);
    expect(potentSpellcasting(cleric(8, 'life'), flame, 3)).toBe(0);
  });

  it('Golpe Divino 1d8 → 2d8 (8º/14º) com o tipo do domínio, 1× por turno', () => {
    expect(divineStrike(cleric(7, 'life'))).toBeNull();
    expect(divineStrike(cleric(8, 'tempest'))).toEqual({ dice: 1, type: 'trovejante' });
    expect(divineStrike(cleric(14, 'trickery'))).toEqual({ dice: 2, type: 'veneno' });
    expect(divineStrike(cleric(14, 'light'))).toBeNull(); // Luz tem Conjuração Potente
    // Guerra: o tipo da arma; soma no dano e trava depois de usado no turno
    const c = cleric(8, 'war');
    const mace = itemToInventory(getItem('w-mace')!);
    c.inventory = [mace];
    c.equipped = { armor: null, shield: null, mainHand: mace.uid, offHand: null, ranged: null };
    const atk = deriveCharacter(c).attacks[0];
    const avail = weaponExtras(c, atk);
    expect(avail.divineStrike).toEqual({ dice: 1, type: 'concussão', used: false });
    expect(resolveExtras(c, atk, avail, { divineStrike: true }).dice.map((x) => x.source)).toEqual(['Golpe Divino']);
    const used = { ...c, combat: { ...c.combat, turn: { ...c.combat.turn, divineStrike: true } } };
    expect(weaponExtras(used, atk).divineStrike?.used).toBe(true);
  });

  it('Reações do domínio: Labareda, Ira da Tempestade e Sacerdote da Guerra (SAB por descanso longo)', () => {
    expect(st(cleric(1, 'light')).max.wardingFlare).toBe(3);
    expect(st(cleric(1, 'tempest')).max.wrathStorm).toBe(3);
    expect(st(cleric(1, 'war')).max.warPriest).toBe(3);
    expect(grantedSpells(cleric(1, 'light')).map((g) => g.id)).toContain('sp-luz');
    expect(deriveCharacter(cleric(17, 'war')).resistances.some((r) => r.source === 'Avatar da Batalha')).toBe(true);
  });
});
