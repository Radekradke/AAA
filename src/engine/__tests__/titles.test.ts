import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { addDeed } from '../deeds';
import { availableTitles, heroTitle, TITLES, titleName, titlesFor } from '../titles';
import type { Character } from '@/types/character';

const hero = (patch: Partial<Character> = {}): Character => ({ ...finalizeCharacter(createDraftCharacter({ ownerId: 'u', name: 'Lyra', classId: 'wizard' })), ...patch });

describe('títulos do personagem', () => {
  it('ids únicos; nenhum título repete o nome de um feito', async () => {
    const { DEEDS } = await import('../deeds');
    expect(new Set(TITLES.map((t) => t.id)).size).toBe(TITLES.length);
    const deedNames = new Set(DEEDS.map((d) => d.name.toLowerCase()));
    for (const t of TITLES) expect(deedNames.has(t.m.toLowerCase())).toBe(false);
  });

  it('forma masculina e feminina pelo gênero da ficha', () => {
    const t = TITLES.find((x) => x.id === 'imperador-da-loucura')!;
    expect(titleName(t, 'masc')).toBe('o Imperador da Loucura');
    expect(titleName(t, 'fem')).toBe('a Imperatriz da Loucura');
    expect(titleName(TITLES.find((x) => x.id === 'cls-warlock')!, 'fem')).toBe('Baba Yaga');
  });

  it('libera pelos feitos, pelo nível e pela classe; só vale o título liberado', () => {
    const deeds = addDeed(undefined, 'dragons', 1).deeds;
    const c = hero({ deeds, level: 10, classLevels: [{ classId: 'wizard', level: 10 }], title: 'coracao-de-dragao' });
    const ids = availableTitles(c).map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(['coracao-de-dragao', 'heroi-da-estrada', 'cls-wizard']));
    expect(ids).not.toContain('deus-da-guerra');
    expect(heroTitle(c)).toBe('Coração de Dragão');
    expect(heroTitle({ ...c, gender: 'fem', title: 'cls-wizard' })).toBe('a Arquimaga');
    expect(heroTitle({ ...c, title: 'deus-da-guerra' })).toBeNull(); // ainda não liberado
    expect(heroTitle({ ...c, title: 'id-que-nao-existe' })).toBeNull();
    expect(heroTitle(undefined)).toBeNull();
  });

  it('cicatrizes, sessões, montaria e item lendário', () => {
    const c = hero({
      scars: [1, 2, 3].map((i) => ({ id: `s${i}`, text: 'x', date: '2026-01-01', by: 'jogador' as const })),
      sessions: Array.from({ length: 10 }, (_, i) => ({ id: `x${i}`, name: 'S', at: '2026-01-01' })),
      allies: [{ id: 'a', kind: 'montaria', name: 'Trovão', beastId: 'warhorse' }],
    });
    const ids = availableTitles(c).map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(['marcado', 'veterano', 'cavaleiro-errante']));
    expect(ids).not.toContain('mil-cicatrizes');
  });

  it('a lista de títulos só traz as alcunhas das classes do herói', () => {
    const ids = titlesFor(hero()).map((t) => t.id);
    expect(ids).toContain('cls-wizard');
    expect(ids).not.toContain('cls-barbarian');
    expect(titlesFor(hero({ classLevels: [{ classId: 'wizard', level: 3 }, { classId: 'warlock', level: 2 }] })).map((t) => t.id)).toContain('cls-warlock');
  });
});
