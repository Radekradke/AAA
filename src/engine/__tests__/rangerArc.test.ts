import { describe, expect, it } from 'vitest';
import { createDraftCharacter } from '../characterBuilder';
import { deriveCharacter } from '../dndRules';
import { rangerState } from '../ranger';
import { resolveExtras, weaponExtras } from '../damageExtras';
import { spellSlotsFor, spellsKnownOrPrepared } from '../spellcasting';
import { attacksPerAction } from '../extraAttack';
import { pendingChoices } from '../classChoices';
import { hasEvasion, hasUncannyDodge } from '../rogue';
import { companionOf } from '../companion';
import { itemToInventory } from '../inventory';
import { getItem } from '@/data/items';
import type { Character } from '@/types/character';

function ranger(level: number, subclassId: string | null = null, choices: Record<string, string[]> = {}): Character {
  const c = createDraftCharacter({ ownerId: 't', name: 'Kael', classId: 'ranger', raceId: 'human' });
  c.level = level;
  c.classLevels = [{ classId: 'ranger', level }];
  c.subclassId = subclassId;
  c.baseAbilities = { str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 8 };
  c.choices = choices;
  const bow = itemToInventory(getItem('w-longbow')!);
  c.inventory = [bow];
  c.equipped = { armor: null, shield: null, mainHand: null, offHand: null, ranged: bow.uid };
  c.combat = { ...c.combat, resources: {}, marks: [], conditions: [] };
  return c;
}
const st = (c: Character) => {
  const d = deriveCharacter(c);
  return rangerState(c, d.proficiency, d.abilities.wis.mod)!;
};
const bow = (c: Character) => deriveCharacter(c).attacks[0];

describe('Patrulheiro do 1 ao 20 (PHB 2014)', () => {
  it('Inimigo Favorito e Explorador Nato: escolhas no 1º, 6º, 10º e 14º, com os nomes no painel', () => {
    const keys = pendingChoices(ranger(1)).map((p) => p.spec.key);
    expect(keys).toEqual(expect.arrayContaining(['favoredEnemy', 'favoredTerrain']));
    const s = st(ranger(6, null, { 'ranger.favoredEnemy': ['beasts', 'undead'], 'ranger.favoredTerrain': ['forest'] }));
    expect(s.enemies).toEqual(['Bestas', 'Mortos-vivos']);
    expect(s.terrains).toEqual(['Floresta']);
  });

  it('Conjuração de meio conjurador (SAB) a partir do 2º: espaços e magias conhecidas', () => {
    expect(spellSlotsFor(ranger(1))).toEqual({});
    expect(spellSlotsFor(ranger(2))).toEqual({ 1: 2 });
    expect(spellSlotsFor(ranger(17))).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 });
    expect([2, 3, 5, 19].map((l) => spellsKnownOrPrepared('ranger', l, 2).count)).toEqual([2, 3, 4, 11]);
    expect(st(ranger(5)).dc).toBe(8 + 3 + 2);
  });

  it('Consciência Primitiva (3º), Ataque Extra (5º), Pés Ligeiros (8º), Esconder-se à Vista (10º), Desaparecer (14º), Sentidos Selvagens (18º)', () => {
    expect([st(ranger(2)).primeval, st(ranger(3)).primeval]).toEqual([false, true]);
    expect([attacksPerAction(ranger(4)).count, attacksPerAction(ranger(5)).count]).toEqual([1, 2]);
    expect(st(ranger(8)).landsStride).toBe(true);
    expect([st(ranger(9)).hidePlainSight, st(ranger(10)).hidePlainSight]).toEqual([false, true]);
    expect([st(ranger(13)).vanish, st(ranger(14)).vanish]).toEqual([false, true]);
    expect(st(ranger(18)).feralSenses).toBe(true);
  });

  it('Matador de Inimigos (20º): + SAB no dano, 1× por turno', () => {
    expect(st(ranger(19)).foeSlayer).toBeNull();
    const c = ranger(20);
    const avail = weaponExtras(c, bow(c));
    expect(avail.foeSlayer).toEqual({ bonus: 2, used: false });
    expect(resolveExtras(c, bow(c), avail, { foeSlayer: true }).flat).toBe(2);
    const used = { ...c, combat: { ...c.combat, turn: { ...c.combat.turn, foeSlayer: true } } };
    expect(resolveExtras(used, bow(used), weaponExtras(used, bow(used)), { foeSlayer: true }).flat).toBe(0);
  });

  it('Caçador: Matador de Colossos +1d8 1× por turno; Defesa Superior liga Evasão ou Esquiva Sobrenatural', () => {
    const c = ranger(3, 'hunter', { 'ranger.hunterPrey': ['colossus'] });
    const avail = weaponExtras(c, bow(c));
    expect(avail.colossus).toEqual({ used: false });
    expect(resolveExtras(c, bow(c), avail, { colossus: true }).dice.map((d) => [d.count, d.die, d.source])).toEqual([[1, 8, 'Matador de Colossos']]);
    expect(weaponExtras(ranger(3, 'hunter', { 'ranger.hunterPrey': ['giantKiller'] }), bow(c)).colossus).toBeNull();
    expect(hasEvasion(ranger(15, 'hunter', { 'ranger.hunterDefense': ['evasion'] }))).toBe(true);
    expect(hasUncannyDodge(ranger(15, 'hunter', { 'ranger.hunterDefense': ['uncannyDodge'] }))).toBe(true);
    const h = st(ranger(11, 'hunter', { 'ranger.hunterPrey': ['hordeBreaker'], 'ranger.hunterTactics': ['steelWill'], 'ranger.hunterMultiattack': ['volley'] })).hunter;
    expect(h).toEqual({ prey: 'hordeBreaker', tactics: 'steelWill', multiattack: 'volley', defense: null });
  });

  it('Mestre das Feras: companheiro (3º), ataques mágicos (7º) e Fúria Bestial (11º)', () => {
    const comp = (l: number) => companionOf(ranger(l, 'beastmaster', { 'ranger.companion': ['wolf'] }))!;
    expect(comp(3)).toBeTruthy();
    expect([comp(6).magical, comp(7).magical]).toEqual([false, true]);
    expect([comp(10).attacksPerAction, comp(11).attacksPerAction]).toEqual([1, 2]);
  });
});
