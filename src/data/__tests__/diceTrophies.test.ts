import { describe, expect, it } from 'vitest';
import { DICE_TROPHIES, diceTrophy, heroDice } from '../diceTrophies';

const hero = (p: Record<string, unknown> = {}) => ({ level: 1, deeds: { counts: {}, unlocked: {} }, sessions: [], diceSkin: null, ...p }) as Parameters<typeof heroDice>[0] & object;

describe('dados conquistados', () => {
  it('ids únicos e skins completas', () => {
    expect(new Set(DICE_TROPHIES.map((t) => t.id)).size).toBe(DICE_TROPHIES.length);
    for (const t of DICE_TROPHIES) {
      expect(t.skin.body[0]).toMatch(/^#[0-9A-F]{6}$/i);
      expect(t.skin.ink[0]).toMatch(/^#[0-9A-F]{6}$/i);
      expect(t.hint.length).toBeGreaterThan(5);
    }
  });

  it('cada um sai de uma conquista', () => {
    const open = (p: Record<string, unknown>) => DICE_TROPHIES.filter((t) => t.unlocked(hero(p))).map((t) => t.id);
    expect(open({})).toEqual([]);
    expect(open({ level: 5 })).toEqual(['errante']);
    expect(open({ deeds: { counts: { dragons: 1, kills: 25 }, unlocked: {} } })).toEqual(['ceifador', 'dragao']);
    expect(open({ deeds: { counts: {}, unlocked: {}, hunts: { goblin: { n: 10, first: '', last: '' } } } })).toEqual(['cacador']);
    expect(open({ sessions: Array.from({ length: 10 }, (_, i) => ({ id: String(i), name: '', at: '' })) })).toEqual(['vitral']);
  });

  it('o escolhido só vale se ainda estiver liberado', () => {
    expect(heroDice(hero({ level: 5, diceSkin: 'errante' }))?.skin.label).toBe('Bordão do Errante');
    expect(heroDice(hero({ level: 4, diceSkin: 'errante' }))).toBeUndefined();
    expect(heroDice(hero({ level: 20, diceSkin: 'inventado' }))).toBeUndefined();
    expect(heroDice(null)).toBeUndefined();
    expect(diceTrophy(42)).toBeUndefined();
  });
});
