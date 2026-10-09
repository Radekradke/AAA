import { describe, expect, it } from 'vitest';
import type { JournalEntry } from '@/types/character';
import { diaryOf, entryBody, entrySession, findMentions, knownPlaces, placeTags, printableNotes, QUEST_COLUMNS, questProgress, CLUE_STATUS, clueImageCount, cluesForQuest, diaryTexts, MAX_CLUE_IMAGES, diaryItems, sectionHits, whereMentioned, personKey, sessionDigest, splitMentions } from '../diary';
import type { Mentionable } from '../diary';

const people: Mentionable[] = [
  { key: 'npc:1', kind: 'npc', name: 'Mara Pedrafria', role: 'Taverneira' },
  { key: 'npc:2', kind: 'npc', name: 'Mara' },
  { key: 'hero:3', kind: 'hero', name: 'Brenna Aço' },
];

const legacy: JournalEntry = { id: 'j1', title: 'A ponte', date: 'Sessão 3', summary: 'Caímos numa emboscada.', npcs: 'Mara', locations: 'Ponte velha', quests: '', treasure: '30 po', notes: '' };

describe('Diário', () => {
  it('rabiscos: as anotações rápidas antigas viram um rabisco fixado', () => {
    const d = diaryOf({ notes: 'Desconfiar do prefeito', diary: undefined });
    expect(d.notes).toHaveLength(1);
    expect(d.notes[0]).toMatchObject({ text: 'Desconfiar do prefeito', pinned: true });
    expect(diaryOf({ notes: '', diary: undefined }).notes).toEqual([]);
  });

  it('sessões antigas: os campos viram um texto só e o número sai de "Sessão 3"', () => {
    expect(entryBody(legacy)).toBe('Caímos numa emboscada.\n\nNPCs: Mara\n\nLugares: Ponte velha\n\nTesouros: 30 po');
    expect(entrySession(legacy, 9)).toBe(3);
    expect(entryBody({ ...legacy, body: 'novo texto' })).toBe('novo texto');
  });

  it('lugares com #: palavras com maiúscula, com de/da/do no meio', () => {
    expect(placeTags('Fomos à #Torre de Vigia e depois ao #Porto Sombrio, onde #Waterdeep foi citada.')).toEqual(['Torre de Vigia', 'Porto Sombrio', 'Waterdeep']);
    expect(placeTags('#tag minúscula não conta')).toEqual([]);
  });

  it('menções: nome inteiro, o mais longo primeiro e sem pedaço de palavra', () => {
    expect(findMentions(['@Mara Pedrafria serviu cerveja'], people).map((p) => p.key)).toEqual(['npc:1', 'npc:2']);
    expect(findMentions(['Amarante chegou'], people)).toEqual([]);
    const pieces = splitMentions('Falei com @Mara Pedrafria e @Brenna Aço em #Porto Sombrio.', people);
    expect(pieces.filter((p) => p.kind === 'mention').map((p) => (p.kind === 'mention' ? p.target.key : ''))).toEqual(['npc:1', 'hero:3']);
    expect(pieces.find((p) => p.kind === 'place')).toEqual({ kind: 'place', text: 'Porto Sombrio' });
  });

  it('resumo da sessão: quem apareceu e por onde passamos', () => {
    const d = sessionDigest('@Brenna Aço salvou o dia na #Ponte Velha', people);
    expect(d.people.map((p) => p.name)).toEqual(['Brenna Aço']);
    expect(d.places).toEqual(['Ponte Velha']);
  });

  it('lugares conhecidos vêm de todo o diário, sem repetir', () => {
    const char = { notes: '', journal: [{ ...legacy, body: '#Porto Sombrio de novo' }], diary: { notes: [{ id: 'n', text: 'voltar ao #Porto Sombrio e à #Mina Funda', at: 1 }], quests: [], clues: [], people: {} } };
    expect(knownPlaces(char).map((p) => p.name)).toEqual(['Mina Funda', 'Porto Sombrio']);
  });

  it('impressão: rabiscos em aberto, fixados primeiro, sem @ e #', () => {
    const char = { notes: '', diary: { notes: [
      { id: 'a', text: 'velho', at: 1 },
      { id: 'b', text: 'falar com @Mara', at: 2, pinned: true },
      { id: 'c', text: 'resolvido', at: 3, done: true },
    ], quests: [], clues: [], people: {} } };
    expect(printableNotes(char)).toBe('falar com Mara\n\nvelho');
  });

  it('Quadro da Guilda: colunas na ordem da missão e progresso dos objetivos', () => {
    expect(QUEST_COLUMNS.map((c) => c.id)).toEqual(['rumor', 'active', 'done', 'failed']);
    expect(questProgress({ objectives: [] })).toEqual({ done: 0, total: 0 });
    expect(questProgress({ objectives: [{ id: 'a', text: 'achar o mapa', done: true }, { id: 'b', text: 'voltar', done: false }] })).toEqual({ done: 1, total: 2 });
  });

  it('missões entram na busca e nos lugares conhecidos', () => {
    const char = { notes: '', journal: [], diary: { notes: [], quests: [{ id: 'q', title: 'Resgate', status: 'active' as const, giver: '@Mara', objectives: [{ id: 'o', text: 'entrar na #Mina Funda', done: false }], at: 1 }], clues: [], people: {} } };
    expect(knownPlaces(char).map((p) => p.name)).toEqual(['Mina Funda']);
  });

  it('Pistas: situações, limite de imagens e ligação com missões', () => {
    expect(CLUE_STATUS.map((c) => c.id)).toEqual(['unverified', 'confirmed', 'false']);
    expect(MAX_CLUE_IMAGES).toBe(30);
    const clues = [
      { id: 'a', title: 'Bilhete', text: 'na #Mina Funda', status: 'confirmed' as const, image: 'data:image/webp;base64,AA', questId: 'q', verdict: '@Mara confirmou', at: 1 },
      { id: 'b', title: 'Boato', text: '', status: 'unverified' as const, handoutImage: 'mesa/x.webp', at: 2 },
    ];
    expect(clueImageCount(clues)).toBe(1); // a do mestre não pesa na ficha
    expect(cluesForQuest(clues, 'q').map((c) => c.id)).toEqual(['a']);
    const char = { notes: '', journal: [], diary: { notes: [], quests: [], clues, people: {} } };
    expect(diaryTexts(char).join('\n')).toContain('@Mara confirmou');
    expect(knownPlaces(char).map((p) => p.name)).toEqual(['Mina Funda']);
  });

  describe('Pessoas, busca e ligações', () => {
    const char = {
      notes: '',
      journal: [{ ...legacy, id: 's1', title: 'A ponte', body: '@Mara Pedrafria nos traiu na ponte.', session: 3 }],
      diary: {
        notes: [{ id: 'n1', text: 'Perguntar à @Mara Pedrafria sobre o selo', at: 1 }],
        quests: [{ id: 'q1', title: 'Achar o selo', status: 'active' as const, giver: '@Brenna Aço', objectives: [{ id: 'o', text: 'falar com Mara Pedrafria', done: false }], at: 1 }],
        clues: [{ id: 'c1', title: 'Selo partido', text: 'Achado na ponte', status: 'unverified' as const, at: 1 }],
        people: {},
      },
    };

    it('todos os itens do diário, com seção e título', () => {
      expect(diaryItems(char).map((i) => `${i.section}:${i.id}:${i.title}`)).toEqual(['notes:n1:Perguntar à @Mara Pedrafria sobre o selo', 'chronicle:s1:A ponte', 'board:q1:Achar o selo', 'clues:c1:Selo partido']);
    });

    it('a busca conta resultados em todas as seções', () => {
      expect(sectionHits(char, 'selo')).toEqual({ notes: 1, chronicle: 0, board: 1, clues: 1 });
      expect(sectionHits(char, 'ponte')).toEqual({ notes: 0, chronicle: 1, board: 0, clues: 1 });
      expect(sectionHits(char, '  ')).toEqual({ notes: 0, chronicle: 0, board: 0, clues: 0 });
    });

    it('onde alguém aparece (com @ ou o nome inteiro)', () => {
      expect(whereMentioned(char, { name: 'Mara Pedrafria' }).map((i) => i.id)).toEqual(['n1', 's1', 'q1']);
      expect(whereMentioned(char, { name: 'Brenna Aço' }).map((i) => i.id)).toEqual(['q1']);
      expect(personKey('Mára  Pedrafria ')).toBe(personKey('mara  pedrafria'));
    });
  });
});
