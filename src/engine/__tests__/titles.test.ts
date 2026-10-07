import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { addDeed } from '../deeds';
import { availableTitles, heroTitle, heroTitleDef, heroTitleTip, TITLE_BY_ID, TITLES, titleDeed, titleName, titleProgress, titlesFor } from '../titles';
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

  it('todo título diz o que o herói fez (no passado) e como liberar', () => {
    expect(TITLES.length).toBeGreaterThanOrEqual(100);
    for (const t of TITLES) {
      expect(t.did.trim(), t.id).not.toBe('');
      expect(t.hint.trim(), t.id).not.toBe('');
      if (t.have) expect(t.need, t.id).toBeGreaterThan(0);
    }
  });

  it('caçadas, espécies e nêmesis liberam alcunhas de caçador', () => {
    const hunt = (n: number) => ({ n, first: '2026-01-01T00:00:00Z', last: '2026-01-02T00:00:00Z' });
    const hunts = { goblin: hunt(6), hobgoblin: hunt(3), bugbear: hunt(1), wolf: hunt(25), troll: hunt(1) };
    const c = hero({ deeds: { counts: {}, unlocked: {}, hunts } });
    const ids = availableTitles(c).map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(['flagelo-dos-goblins', 'pele-de-lobo', 'fim-de-linhagem']));
    expect(ids).not.toContain('queima-trolls');
    expect(ids).not.toContain('grande-cacador');
    expect(titleProgress(TITLE_BY_ID['queima-trolls'], c)).toEqual({ have: 1, need: 3 });
    expect(titleProgress(TITLE_BY_ID['naturalista'], c)).toEqual({ have: 5, need: 10 });
  });

  it('bolsa: riqueza em PO e o pé-rapado secreto', () => {
    const rich = hero({ coins: { pp: 50, gp: 520, ep: 0, sp: 0, cp: 0 } });
    expect(availableTitles(rich).map((t) => t.id)).toContain('bolsa-pesada');
    expect(availableTitles(rich).map((t) => t.id)).not.toContain('principe-mercador');
    const broke = hero({ level: 6, coins: { pp: 0, gp: 0, ep: 0, sp: 3, cp: 5 } });
    expect(availableTitles(broke).map((t) => t.id)).toContain('pe-rapado');
    expect(availableTitles(hero({ coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 } })).map((t) => t.id)).not.toContain('pe-rapado'); // nível 1 não conta
  });

  it('alcunhas de povo só para a raça do herói', () => {
    const elf = hero({ raceId: 'elf', level: 8 });
    expect(titlesFor(elf).map((t) => t.id)).toContain('race-elf');
    expect(titlesFor(elf).map((t) => t.id)).not.toContain('race-dwarf');
    expect(availableTitles(elf).map((t) => t.id)).toContain('race-elf');
    expect(availableTitles(hero({ raceId: 'elf', level: 7 })).map((t) => t.id)).not.toContain('race-elf');
  });

  it('o que fez para merecer: frase no passado, com o total quando passou da meta', () => {
    const deeds = addDeed(undefined, 'kills', 34).deeds;
    const c = hero({ deeds, title: 'carniceiro', gender: 'fem' });
    expect(heroTitleDef(c)?.id).toBe('carniceiro');
    expect(titleDeed(TITLE_BY_ID['carniceiro'], c)).toBe('Deu 25 golpes finais — já são 34.');
    expect(titleDeed(TITLE_BY_ID['coracao-de-dragao'], c)).toBe('Derrubou um dragão.');
    expect(heroTitleTip(c)).toContain('Como conquistou: Deu 25 golpes finais');
    expect(heroTitleDef({ ...c, title: 'ceifador' })).toBeNull();
    expect(heroTitleTip(undefined)).toBeUndefined();
  });
});
